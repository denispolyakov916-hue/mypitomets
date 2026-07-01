"""
API кабинета поставщика.

Supplier-facing endpoints работают только в рамках поставщика, к которому
пользователь привязан через SupplierUserAccess. Admin-facing endpoints
используются владельцем платформы для модерации заявок.
"""

import csv
import io
from types import SimpleNamespace
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Case, Count, Q, Sum, F, DecimalField, ExpressionWrapper, IntegerField, Value, When
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.text import slugify

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission, IsAdminUser
from rest_framework.response import Response

from apps.pets.models import (
    FoodRecipe,
    Supplier,
    SupplierCatalogSyncLog,
    SupplierOffer,
    SupplierProductSubmission,
    SupplierRawItem,
    SupplierUserAccess,
)
from apps.shop.models import Brand, Order, OrderItem, Product, ProductSKU, Return


SELLING_ORDER_STATUSES = ['processing', 'shipped', 'partially_delivered', 'delivered']
RECOMMENDATION_APPROVAL_CHECKLIST = [
    'identity_verified',
    'nutrition_verified',
    'ingredients_verified',
    'allergens_verified',
    'assortment_verified',
    'recommendation_flags_verified',
]


class SupplierPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class HasSupplierAccess(BasePermission):
    """Пользователь должен иметь активный доступ хотя бы к одному поставщику."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _is_admin_user(request.user):
            return Supplier.objects.filter(is_active=True).exists()
        return SupplierUserAccess.objects.filter(user=request.user, is_active=True).exists()


def _is_admin_user(user):
    return bool(
        getattr(user, 'is_staff', False) or
        getattr(user, 'is_superuser', False) or
        getattr(user, 'role', '') == 'admin'
    )


def _supplier_accesses(user):
    return SupplierUserAccess.objects.filter(
        user=user,
        is_active=True,
        supplier__is_active=True,
    ).select_related('supplier')


def _active_access(request):
    if _is_admin_user(request.user):
        supplier_id = request.query_params.get('supplier_id')
        if not supplier_id and hasattr(request, 'data'):
            supplier_id = request.data.get('supplier_id')
        suppliers = Supplier.objects.filter(is_active=True)
        supplier = suppliers.filter(id=supplier_id).first() if supplier_id else suppliers.order_by('name').first()
        if not supplier:
            return None
        return SimpleNamespace(
            supplier=supplier,
            role='admin',
            can_edit_catalog=True,
            can_view_finance=True,
            can_export_reports=True,
        )
    accesses = list(_supplier_accesses(request.user))
    if not accesses:
        return None
    supplier_id = request.query_params.get('supplier_id')
    if not supplier_id and hasattr(request, 'data'):
        supplier_id = request.data.get('supplier_id')
    if supplier_id:
        return next((a for a in accesses if str(a.supplier_id) == str(supplier_id)), None)
    return accesses[0]


def _date_bounds(request):
    today = timezone.localdate()
    period = request.query_params.get('period', '30d')
    date_from = parse_date(request.query_params.get('date_from') or '')
    date_to = parse_date(request.query_params.get('date_to') or '')
    if not date_to:
        date_to = today
    if not date_from:
        days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}.get(period, 30)
        date_from = date_to - timedelta(days=days - 1)
    start = timezone.make_aware(timezone.datetime.combine(date_from, timezone.datetime.min.time()))
    end = timezone.make_aware(timezone.datetime.combine(date_to, timezone.datetime.max.time()))
    return start, end, date_from, date_to


def _money(value):
    return float(value or Decimal('0.00'))


def _supplier_order_items(supplier):
    return OrderItem.objects.filter(
        Q(product__supplier=supplier) | Q(sku__supplier_offer__supplier=supplier)
    ).select_related('order', 'product', 'sku', 'sku__supplier_offer').distinct()


def _line_total_expr():
    return ExpressionWrapper(F('price') * F('quantity'), output_field=DecimalField(max_digits=15, decimal_places=2))


def _submission_title(submission):
    data = submission.data or {}
    return data.get('name') or data.get('recipe', {}).get('name') or str(submission.id)


def _submission_offers(data):
    offers = data.get('offers')
    if isinstance(offers, list):
        return offers
    recipe = data.get('recipe') or {}
    offers = recipe.get('offers')
    return offers if isinstance(offers, list) else []


def validate_supplier_submission_data(data):
    """Валидация черновика: отдельно для магазина и для подбора."""
    errors = {'shop': [], 'recommendation': [], 'warnings': []}
    required_shop = ['name', 'brand', 'species', 'food_form']
    for field in required_shop:
        if not data.get(field):
            errors['shop'].append(f'Не заполнено поле {field}')

    offers = _submission_offers(data)
    if not offers:
        errors['shop'].append('Добавьте минимум одну фасовку')
    for idx, offer in enumerate(offers, 1):
        prefix = f'Фасовка {idx}:'
        if not offer.get('article_number'):
            errors['shop'].append(f'{prefix} нет артикула')
        if not offer.get('package_weight_kg'):
            errors['shop'].append(f'{prefix} нет веса в кг')
        if offer.get('price') in (None, '', 0, '0'):
            errors['shop'].append(f'{prefix} нет цены')

    required_recommendation = [
        'species', 'food_form', 'life_stage', 'kcal_per_100g',
        'protein_percent', 'fat_percent', 'ingredients', 'allergens', 'main_protein',
    ]
    for field in required_recommendation:
        value = data.get(field)
        if value in (None, '', []):
            errors['recommendation'].append(f'Для подбора не заполнено поле {field}')

    if data.get('moisture_percent') in (None, ''):
        errors['warnings'].append('Желательно заполнить влажность')
    if data.get('name') and any(token in str(data.get('name')).lower() for token in (' кг', ' г', 'x85', 'х85')):
        errors['warnings'].append('Название рецепта похоже содержит фасовку')
    return errors


def validate_recommendation_approval_checklist(checklist):
    if not isinstance(checklist, dict):
        checklist = {}
    return [key for key in RECOMMENDATION_APPROVAL_CHECKLIST if not checklist.get(key)]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'code', 'name', 'supplier_type', 'is_active', 'website_url', 'payment_model', 'settlement_model']


class SupplierAccessSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)

    class Meta:
        model = SupplierUserAccess
        fields = [
            'id', 'supplier', 'role', 'can_edit_catalog',
            'can_view_finance', 'can_export_reports', 'is_active',
        ]


class SupplierProductSubmissionSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    source_raw_json = serializers.SerializerMethodField()
    source_raw_external_id = serializers.CharField(source='source_raw_item.external_id', read_only=True)
    source_raw_article_number = serializers.CharField(source='source_raw_item.article_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    submitted_by_email = serializers.CharField(source='submitted_by.email', read_only=True)
    reviewed_by_email = serializers.CharField(source='reviewed_by.email', read_only=True)

    class Meta:
        model = SupplierProductSubmission
        fields = [
            'id', 'supplier', 'supplier_name', 'source_raw_item', 'source_raw_external_id',
            'source_raw_article_number', 'source_raw_json', 'food_recipe', 'product',
            'status', 'title', 'data', 'validation_errors', 'changed_fields',
            'supplier_comment', 'review_comment', 'submitted_by', 'submitted_by_email',
            'reviewed_by', 'reviewed_by_email', 'created_at', 'updated_at',
            'submitted_at', 'reviewed_at',
        ]
        read_only_fields = [
            'supplier', 'source_raw_item', 'food_recipe', 'product', 'status',
            'validation_errors', 'changed_fields', 'submitted_by', 'reviewed_by',
            'created_at', 'updated_at', 'submitted_at', 'reviewed_at',
        ]

    def get_title(self, obj):
        return _submission_title(obj)

    def get_source_raw_json(self, obj):
        if not obj.source_raw_item_id:
            return None
        return obj.source_raw_item.raw_json


class AdminSupplierUserAccessSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = SupplierUserAccess
        fields = [
            'id', 'user', 'user_email', 'supplier', 'supplier_name', 'role',
            'can_edit_catalog', 'can_view_finance', 'can_export_reports',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class SupplierCatalogSyncLogSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = SupplierCatalogSyncLog
        fields = [
            'id', 'supplier', 'supplier_name', 'source', 'file_name', 'started_at',
            'finished_at', 'status', 'total_items', 'created_items', 'updated_items',
            'unchanged_items', 'failed_items', 'summary',
        ]


class SupplierProfileViewSet(viewsets.ViewSet):
    permission_classes = [HasSupplierAccess]

    @action(detail=False, methods=['get'])
    def me(self, request):
        if _is_admin_user(request.user):
            access = _active_access(request)
            accesses = []
            if access:
                accesses.append({
                    'id': 'admin',
                    'supplier': SupplierSerializer(access.supplier).data,
                    'role': access.role,
                    'can_edit_catalog': access.can_edit_catalog,
                    'can_view_finance': access.can_view_finance,
                    'can_export_reports': access.can_export_reports,
                    'is_active': True,
                })
        else:
            accesses = SupplierAccessSerializer(_supplier_accesses(request.user), many=True).data
        return Response({
            'user': {
                'id': str(request.user.id),
                'email': request.user.email,
                'role': request.user.role,
            },
            'accesses': accesses,
        })

    @action(detail=False, methods=['get'])
    def suppliers(self, request):
        if _is_admin_user(request.user):
            suppliers = Supplier.objects.filter(is_active=True).order_by('name')
        else:
            suppliers = [access.supplier for access in _supplier_accesses(request.user)]
        return Response({'suppliers': SupplierSerializer(suppliers, many=True).data})


class SupplierProductSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierProductSubmissionSerializer
    permission_classes = [HasSupplierAccess]
    pagination_class = SupplierPagination

    def _access(self):
        return _active_access(self.request)

    def get_queryset(self):
        access = self._access()
        if not access:
            return SupplierProductSubmission.objects.none()
        qs = SupplierProductSubmission.objects.filter(supplier=access.supplier).select_related(
            'supplier', 'source_raw_item', 'food_recipe', 'product', 'submitted_by', 'reviewed_by',
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        parse_status = self.request.query_params.get('parse_status')
        if parse_status:
            qs = qs.filter(Q(changed_fields__parse_status=parse_status) | Q(data__parse_status=parse_status))
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(data__name__icontains=search) |
                Q(data__brand__icontains=search) |
                Q(food_recipe__name__icontains=search) |
                Q(product__name__icontains=search)
            )
        return qs.annotate(
            status_rank=Case(
                When(status=SupplierProductSubmission.STATUS_APPROVED_FOR_RECOMMENDATION, then=Value(0)),
                When(status=SupplierProductSubmission.STATUS_APPROVED_FOR_SHOP, then=Value(1)),
                When(status=SupplierProductSubmission.STATUS_SUBMITTED, then=Value(2)),
                When(status=SupplierProductSubmission.STATUS_NEEDS_FIX, then=Value(3)),
                default=Value(4),
                output_field=IntegerField(),
            )
        ).order_by('status_rank', 'data__brand', 'data__name', '-updated_at')

    def perform_create(self, serializer):
        access = self._access()
        if not access or not access.can_edit_catalog:
            raise serializers.ValidationError('Нет прав на редактирование ассортимента')
        data = serializer.validated_data.get('data') or {}
        errors = validate_supplier_submission_data(data)
        serializer.save(supplier=access.supplier, validation_errors=errors)

    def perform_update(self, serializer):
        access = self._access()
        if not access or not access.can_edit_catalog:
            raise serializers.ValidationError('Нет прав на редактирование ассортимента')
        instance = self.get_object()
        # Обычным поставщикам нельзя править утверждённые/архивные заявки (нужно ревью).
        # Администратору/владельцу платформы разрешаем править любой статус — иначе
        # бОльшая часть каталога Динозаврика (approved_for_recommendation = 943 шт.)
        # просто не сохранялась, а фронт ошибку не показывал.
        if not _is_admin_user(self.request.user) and instance.status in [
            SupplierProductSubmission.STATUS_APPROVED_FOR_RECOMMENDATION,
            SupplierProductSubmission.STATUS_ARCHIVED,
        ]:
            raise serializers.ValidationError('Нельзя редактировать утверждённую или архивную заявку')
        data = serializer.validated_data.get('data', instance.data) or {}
        errors = validate_supplier_submission_data(data)
        serializer.save(validation_errors=errors)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        submission = self.get_object()
        errors = validate_supplier_submission_data(submission.data or {})
        submission.validation_errors = errors
        submission.save(update_fields=['validation_errors', 'updated_at'])
        return Response({'validation_errors': errors})

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        access = self._access()
        if not access or not access.can_edit_catalog:
            return Response({'detail': 'Нет прав на отправку заявки'}, status=status.HTTP_403_FORBIDDEN)
        submission = self.get_object()
        errors = validate_supplier_submission_data(submission.data or {})
        submission.validation_errors = errors
        if errors['shop']:
            submission.save(update_fields=['validation_errors', 'updated_at'])
            return Response({'detail': 'Есть блокирующие ошибки для магазина', 'validation_errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        submission.status = SupplierProductSubmission.STATUS_SUBMITTED
        submission.submitted_by = request.user
        submission.submitted_at = timezone.now()
        submission.save(update_fields=['status', 'submitted_by', 'submitted_at', 'validation_errors', 'updated_at'])
        return Response(SupplierProductSubmissionSerializer(submission).data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        access = self._access()
        if not access or not access.can_edit_catalog:
            return Response({'detail': 'Нет прав на архивирование'}, status=status.HTTP_403_FORBIDDEN)
        submission = self.get_object()
        submission.status = SupplierProductSubmission.STATUS_ARCHIVED
        submission.save(update_fields=['status', 'updated_at'])
        return Response(SupplierProductSubmissionSerializer(submission).data)


class SupplierDashboardViewSet(viewsets.ViewSet):
    permission_classes = [HasSupplierAccess]

    def _access_or_response(self, request, require_finance=False):
        access = _active_access(request)
        if not access:
            return None, Response({'detail': 'Нет доступа к поставщику'}, status=status.HTTP_403_FORBIDDEN)
        if require_finance and not access.can_view_finance:
            return None, Response({'detail': 'Нет доступа к финансовым данным'}, status=status.HTTP_403_FORBIDDEN)
        return access, None

    @action(detail=False, methods=['get'])
    def summary(self, request):
        access, error = self._access_or_response(request, require_finance=True)
        if error:
            return error
        start, end, date_from, date_to = _date_bounds(request)
        items = _supplier_order_items(access.supplier).filter(order__created_at__range=(start, end))
        sold_items = items.filter(order__status__in=SELLING_ORDER_STATUSES)
        line_total = _line_total_expr()
        aggregates = sold_items.aggregate(
            revenue=Sum(line_total),
            units=Sum('quantity'),
            orders=Count('order', distinct=True),
        )
        returns = Return.objects.filter(
            order_item__in=sold_items,
            requested_at__range=(start, end),
        )
        return_aggregates = returns.aggregate(
            amount=Sum('refund_amount'),
            units=Sum('quantity'),
            count=Count('id'),
        )
        revenue = aggregates['revenue'] or Decimal('0.00')
        refund_amount = return_aggregates['amount'] or Decimal('0.00')
        orders_count = aggregates['orders'] or 0
        sold_units = aggregates['units'] or 0
        returned_units = return_aggregates['units'] or 0
        return Response({
            'date_from': date_from.isoformat(),
            'date_to': date_to.isoformat(),
            'gross_revenue': _money(revenue),
            'net_revenue': _money(revenue - refund_amount),
            'orders_count': orders_count,
            'sold_units': sold_units,
            'average_order_value': _money(revenue / orders_count) if orders_count else 0,
            'returns_count': return_aggregates['count'] or 0,
            'returned_units': returned_units,
            'refunded_amount': _money(refund_amount),
            'return_rate': round((returned_units / sold_units) * 100, 2) if sold_units else 0,
            'drafts_needing_fix': SupplierProductSubmission.objects.filter(
                supplier=access.supplier,
                status__in=[
                    SupplierProductSubmission.STATUS_NEEDS_FIX,
                    SupplierProductSubmission.STATUS_DRAFT,
                ],
            ).count(),
            'submissions_in_review': SupplierProductSubmission.objects.filter(
                supplier=access.supplier,
                status=SupplierProductSubmission.STATUS_SUBMITTED,
            ).count(),
            'recommendable_recipes': FoodRecipe.objects.filter(
                offers__supplier=access.supplier,
                is_recommendable=True,
            ).distinct().count(),
            'active_offers': SupplierOffer.objects.filter(supplier=access.supplier, in_stock=True).count(),
        })

    @action(detail=False, methods=['get'], url_path='sales-trend')
    def sales_trend(self, request):
        access, error = self._access_or_response(request, require_finance=True)
        if error:
            return error
        start, end, _, _ = _date_bounds(request)
        items = _supplier_order_items(access.supplier).filter(
            order__created_at__range=(start, end),
            order__status__in=SELLING_ORDER_STATUSES,
        )
        line_total = _line_total_expr()
        rows = items.annotate(date=TruncDate('order__created_at')).values('date').annotate(
            revenue=Sum(line_total),
            orders=Count('order', distinct=True),
            units=Sum('quantity'),
        ).order_by('date')
        return Response({'results': [
            {
                'date': row['date'].isoformat(),
                'revenue': _money(row['revenue']),
                'orders': row['orders'] or 0,
                'units': row['units'] or 0,
            }
            for row in rows
        ]})

    @action(detail=False, methods=['get'], url_path='top-products')
    def top_products(self, request):
        access, error = self._access_or_response(request, require_finance=True)
        if error:
            return error
        start, end, _, _ = _date_bounds(request)
        limit = min(int(request.query_params.get('limit', 10)), 50)
        line_total = _line_total_expr()
        rows = _supplier_order_items(access.supplier).filter(
            order__created_at__range=(start, end),
            order__status__in=SELLING_ORDER_STATUSES,
        ).values('product_id', 'product_name').annotate(
            revenue=Sum(line_total),
            units=Sum('quantity'),
            orders=Count('order', distinct=True),
        ).order_by('-revenue')[:limit]
        return Response({'results': [
            {
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'revenue': _money(row['revenue']),
                'units': row['units'] or 0,
                'orders': row['orders'] or 0,
            }
            for row in rows
        ]})

    @action(detail=False, methods=['get'])
    def returns(self, request):
        access, error = self._access_or_response(request, require_finance=True)
        if error:
            return error
        start, end, _, _ = _date_bounds(request)
        rows = Return.objects.filter(
            order_item__in=_supplier_order_items(access.supplier),
            requested_at__range=(start, end),
        ).select_related('order', 'order_item', 'order_item__product', 'order_item__sku').order_by('-requested_at')[:100]
        return Response({'results': [
            {
                'id': str(ret.id),
                'order_id': str(ret.order_id),
                'order_item_id': ret.order_item_id,
                'product_name': ret.order_item.product_name,
                'sku_name': ret.order_item.sku_name,
                'quantity': ret.quantity,
                'reason': ret.reason,
                'status': ret.status,
                'refund_amount': _money(ret.refund_amount),
                'requested_at': ret.requested_at.isoformat() if ret.requested_at else None,
            }
            for ret in rows
        ]})

    @action(detail=False, methods=['get'])
    def export(self, request):
        access, error = self._access_or_response(request, require_finance=True)
        if error:
            return error
        if not access.can_export_reports:
            return Response({'detail': 'Нет прав на экспорт'}, status=status.HTTP_403_FORBIDDEN)
        start, end, _, _ = _date_bounds(request)
        line_total = _line_total_expr()
        rows = _supplier_order_items(access.supplier).filter(
            order__created_at__range=(start, end),
            order__status__in=SELLING_ORDER_STATUSES,
        ).values('product_name', 'sku_name').annotate(
            revenue=Sum(line_total),
            units=Sum('quantity'),
            orders=Count('order', distinct=True),
        ).order_by('-revenue')
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['Товар', 'SKU', 'Заказов', 'Продано', 'Выручка'])
        for row in rows:
            writer.writerow([row['product_name'], row['sku_name'] or '', row['orders'], row['units'], row['revenue'] or 0])
        response = HttpResponse(buffer.getvalue(), content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="supplier-sales.csv"'
        return response


class SupplierOrderViewSet(viewsets.ViewSet):
    permission_classes = [HasSupplierAccess]
    pagination_class = SupplierPagination

    def list(self, request):
        access = _active_access(request)
        if not access:
            return Response({'detail': 'Нет доступа к поставщику'}, status=status.HTTP_403_FORBIDDEN)
        start, end, _, _ = _date_bounds(request)
        qs = _supplier_order_items(access.supplier).filter(order__created_at__range=(start, end))
        status_filter = request.query_params.get('order_status')
        if status_filter:
            qs = qs.filter(order__status=status_filter)
        rows = qs.order_by('-order__created_at')[:200]
        return Response({'results': [
            {
                'order_id': str(item.order_id),
                'created_at': item.order.created_at.isoformat() if item.order.created_at else None,
                'status': item.order.status,
                'product_id': item.product_id,
                'product_name': item.product_name,
                'sku_id': item.sku_id,
                'sku_name': item.sku_name,
                'article_number': getattr(getattr(item.sku, 'supplier_offer', None), 'article_number', None),
                'quantity': item.quantity,
                'price': _money(item.price),
                'total': _money(item.get_total()),
            }
            for item in rows
        ]})


class SupplierReturnViewSet(viewsets.ViewSet):
    permission_classes = [HasSupplierAccess]

    def list(self, request):
        access = _active_access(request)
        if not access:
            return Response({'detail': 'Нет доступа к поставщику'}, status=status.HTTP_403_FORBIDDEN)
        start, end, _, _ = _date_bounds(request)
        qs = Return.objects.filter(
            order_item__in=_supplier_order_items(access.supplier),
            requested_at__range=(start, end),
        ).select_related('order_item', 'order').order_by('-requested_at')[:200]
        return Response({'results': [
            {
                'id': str(ret.id),
                'order_id': str(ret.order_id),
                'product_name': ret.order_item.product_name,
                'sku_name': ret.order_item.sku_name,
                'quantity': ret.quantity,
                'reason': ret.reason,
                'status': ret.status,
                'refund_amount': _money(ret.refund_amount),
                'requested_at': ret.requested_at.isoformat() if ret.requested_at else None,
                'admin_comment': ret.admin_comment,
            }
            for ret in qs
        ]})


class SupplierImportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SupplierCatalogSyncLogSerializer
    permission_classes = [HasSupplierAccess]
    pagination_class = SupplierPagination

    def get_queryset(self):
        access = _active_access(self.request)
        if not access:
            return SupplierCatalogSyncLog.objects.none()
        return SupplierCatalogSyncLog.objects.filter(supplier=access.supplier).order_by('-started_at')


class AdminSupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SupplierPagination
    search_fields = ['name', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        return qs


class AdminSupplierUserAccessViewSet(viewsets.ModelViewSet):
    queryset = SupplierUserAccess.objects.select_related('user', 'supplier').order_by('supplier__name', 'user__email')
    serializer_class = AdminSupplierUserAccessSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SupplierPagination


def _decimal_or_none(value):
    if value in (None, ''):
        return None
    return Decimal(str(value))


def _build_recipe_from_submission(submission):
    data = submission.data or {}
    recipe = submission.food_recipe or FoodRecipe()
    recipe.name = data.get('name') or recipe.name
    recipe.brand = data.get('brand') or recipe.brand
    recipe.line = data.get('line') or recipe.line
    recipe.recipe_key = data.get('recipe_key') or slugify(f"{recipe.brand}-{recipe.name}")[:255]
    recipe.species = data.get('species') or recipe.species
    recipe.food_form = data.get('food_form') or recipe.food_form
    recipe.life_stage = data.get('life_stage') or recipe.life_stage
    recipe.size_group = data.get('size_group') or recipe.size_group
    recipe.diet_purpose = data.get('diet_purpose') or []
    for field in [
        'is_sterilized', 'is_sensitive_digestion', 'is_urinary',
        'is_weight_control', 'is_grain_free', 'is_hypoallergenic',
    ]:
        setattr(recipe, field, data.get(field) if data.get(field) is not None else getattr(recipe, field))
    for src, dst in [
        ('kcal_per_100g', 'kcal_per_100g'),
        ('protein_percent', 'protein_percent'),
        ('fat_percent', 'fat_percent'),
        ('fiber_percent', 'fiber_percent'),
        ('ash_percent', 'ash_percent'),
        ('moisture_percent', 'moisture_percent'),
        ('calcium_percent', 'calcium_percent'),
        ('phosphorus_percent', 'phosphorus_percent'),
    ]:
        setattr(recipe, dst, _decimal_or_none(data.get(src)))
    recipe.ingredients = data.get('ingredients') or []
    recipe.allergens = data.get('allergens') or []
    recipe.main_protein = data.get('main_protein') or ''
    recipe.source = recipe.source or 'supplier_portal'
    recipe.parse_status = 'auto_parsed'
    recipe.field_confidence = {**(recipe.field_confidence or {}), 'supplier_portal': 'supplier'}
    recipe.nutrition_complete = bool(recipe.kcal_per_100g and recipe.protein_percent and recipe.fat_percent)
    recipe.review_status = 'manual_verified'
    recipe.recommend_block_reasons = []
    return recipe


def _sync_shop_product(submission, recipe):
    data = submission.data or {}
    brand_name = data.get('brand') or recipe.brand
    brand = None
    if brand_name:
        brand_slug = slugify(brand_name)[:255] or None
        brand, _ = Brand.objects.get_or_create(
            name=brand_name,
            defaults={'slug': brand_slug or f'brand-{timezone.now().timestamp()}'},
        )
    product = submission.product or Product()
    product.name = data.get('shop_name') or data.get('name') or recipe.name
    product.short_description = data.get('short_description') or product.short_description
    product.description = data.get('description') or product.description
    product.image_url = data.get('image_url') or product.image_url
    product.animal_type = recipe.species or data.get('species') or 'all'
    product.product_group = 'food'
    product.brand = brand
    product.supplier = submission.supplier
    product.food_recipe = recipe
    product.age_group = recipe.life_stage or None
    product.size_group = recipe.size_group or None
    product.is_grain_free = bool(recipe.is_grain_free)
    product.is_hypoallergenic = bool(recipe.is_hypoallergenic)
    product.is_veterinary = bool(recipe.diet_purpose)
    product.is_available = any(bool(offer.get('in_stock', True)) for offer in _submission_offers(data))
    product.status = 1
    offers = _submission_offers(data)
    if offers and offers[0].get('price') not in (None, ''):
        product.price = _decimal_or_none(offers[0].get('price')) or product.price
    product.save()
    return product


def _sync_offers_and_skus(submission, recipe, product):
    data = submission.data or {}
    for idx, offer_data in enumerate(_submission_offers(data), 1):
        article = str(offer_data.get('article_number') or '').strip()
        if not article:
            continue
        offer, _ = SupplierOffer.objects.update_or_create(
            supplier=submission.supplier,
            article_number=article,
            defaults={
                'food_recipe': recipe,
                'source': 'supplier_portal',
                'package_name': offer_data.get('package_name') or offer_data.get('name') or '',
                'price': _decimal_or_none(offer_data.get('price')),
                'package_weight_kg': _decimal_or_none(offer_data.get('package_weight_kg')),
                'agency_percent': _decimal_or_none(offer_data.get('agency_percent')),
                'barcode': offer_data.get('barcode') or '',
                'in_stock': bool(offer_data.get('in_stock', True)),
                'raw': offer_data,
            },
        )
        ProductSKU.objects.update_or_create(
            product=product,
            sku=article,
            defaults={
                'supplier_offer': offer,
                'name': offer.package_name or article,
                'price': offer.price or Decimal('0.00'),
                'available': offer.in_stock,
                'stock_quantity': offer_data.get('stock_quantity'),
                'weight_kg': offer.package_weight_kg,
                'weight_display': offer.package_name or '',
                'sort_order': idx,
                'is_default': idx == 1,
                'status': 1,
            },
        )


class AdminSupplierSubmissionViewSet(viewsets.ModelViewSet):
    queryset = SupplierProductSubmission.objects.select_related(
        'supplier', 'source_raw_item', 'food_recipe', 'product', 'submitted_by', 'reviewed_by',
    ).order_by('-updated_at')
    serializer_class = SupplierProductSubmissionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SupplierPagination

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        supplier_id = self.request.query_params.get('supplier')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

    @action(detail=True, methods=['post'], url_path='request-fixes')
    def request_fixes(self, request, pk=None):
        submission = self.get_object()
        submission.status = SupplierProductSubmission.STATUS_NEEDS_FIX
        submission.review_comment = request.data.get('comment') or ''
        submission.reviewed_by = request.user
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=['status', 'review_comment', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        submission = self.get_object()
        submission.status = SupplierProductSubmission.STATUS_REJECTED
        submission.review_comment = request.data.get('comment') or ''
        submission.reviewed_by = request.user
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=['status', 'review_comment', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'], url_path='approve-shop')
    def approve_shop(self, request, pk=None):
        submission = self.get_object()
        errors = validate_supplier_submission_data(submission.data or {})
        if errors['shop']:
            submission.validation_errors = errors
            submission.save(update_fields=['validation_errors', 'updated_at'])
            return Response({'detail': 'Есть ошибки для публикации в магазин', 'validation_errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            recipe = _build_recipe_from_submission(submission)
            recipe.is_recommendable = False
            recipe.review_status = 'unverified'
            recipe.save()
            product = _sync_shop_product(submission, recipe)
            _sync_offers_and_skus(submission, recipe, product)
            submission.food_recipe = recipe
            submission.product = product
            submission.status = SupplierProductSubmission.STATUS_APPROVED_FOR_SHOP
            submission.validation_errors = errors
            submission.review_comment = request.data.get('comment') or submission.review_comment
            submission.reviewed_by = request.user
            submission.reviewed_at = timezone.now()
            submission.save()
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'], url_path='approve-recommendation')
    def approve_recommendation(self, request, pk=None):
        submission = self.get_object()
        errors = validate_supplier_submission_data(submission.data or {})
        if errors['shop'] or errors['recommendation']:
            submission.validation_errors = errors
            submission.save(update_fields=['validation_errors', 'updated_at'])
            return Response({'detail': 'Есть ошибки для подбора', 'validation_errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        checklist = request.data.get('checklist') or {}
        missing_checklist = validate_recommendation_approval_checklist(checklist)
        if missing_checklist:
            return Response({
                'detail': 'Перед включением в подбор нужно отметить все пункты ручной проверки',
                'missing_checklist': missing_checklist,
            }, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            recipe = _build_recipe_from_submission(submission)
            recipe.is_recommendable = True
            recipe.review_status = 'manual_verified'
            recipe.save()
            product = _sync_shop_product(submission, recipe)
            _sync_offers_and_skus(submission, recipe, product)
            submission.food_recipe = recipe
            submission.product = product
            submission.status = SupplierProductSubmission.STATUS_APPROVED_FOR_RECOMMENDATION
            submission.validation_errors = errors
            submission.changed_fields = {
                **(submission.changed_fields or {}),
                'recommendation_approval_checklist': checklist,
                'recommendation_approved_at': timezone.now().isoformat(),
                'recommendation_approved_by': request.user.email,
            }
            submission.review_comment = request.data.get('comment') or submission.review_comment
            submission.reviewed_by = request.user
            submission.reviewed_at = timezone.now()
            submission.save()
        return Response(self.get_serializer(submission).data)


class AdminSupplierSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SupplierCatalogSyncLog.objects.select_related('supplier').order_by('-started_at')
    serializer_class = SupplierCatalogSyncLogSerializer
    permission_classes = [IsAdminUser]
    pagination_class = SupplierPagination
