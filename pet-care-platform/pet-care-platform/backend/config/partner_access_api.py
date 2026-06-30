"""
API заявок на доступ к партнёрским кабинетам Питомец+.

Залогиненный пользователь создаёт заявку (поставщик корма / специалист по
курсам) и видит её статус. Владелец платформы (is_superuser) рассматривает
заявки и одобряет/отклоняет — одобрение автоматически выдаёт доступ.

Маршруты (router basename='partner-access-requests'):
    POST /api/partner-access/requests/            — создать заявку (IsAuthenticated)
    GET  /api/partner-access/requests/my/         — свои заявки (IsAuthenticated)
    GET  /api/partner-access/requests/            — все заявки (owner only, ?status=)
    POST /api/partner-access/requests/<id>/approve/  — одобрить (owner only)
    POST /api/partner-access/requests/<id>/reject/   — отклонить (owner only)
"""

from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.pets.models import Supplier, SupplierUserAccess
from apps.users.models import PartnerAccessRequest


class IsPlatformOwner(BasePermission):
    """Только владелец платформы (суперпользователь) выдаёт доступы."""

    message = 'Доступ только для владельца платформы.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )


class PartnerAccessRequestPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PartnerAccessRequestSerializer(serializers.ModelSerializer):
    """Чтение заявки (свои заявки + список владельца)."""

    user_email = serializers.EmailField(source='user.email', read_only=True)
    requested_role_display = serializers.CharField(
        source='get_requested_role_display', read_only=True,
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    granted_supplier_name = serializers.CharField(
        source='granted_supplier.name', read_only=True, default=None,
    )
    reviewed_by_email = serializers.EmailField(
        source='reviewed_by.email', read_only=True, default=None,
    )

    class Meta:
        model = PartnerAccessRequest
        fields = [
            'id', 'user', 'user_email', 'requested_role', 'requested_role_display',
            'company_name', 'message', 'status', 'status_display',
            'granted_supplier', 'granted_supplier_name', 'review_reason',
            'reviewed_by', 'reviewed_by_email', 'reviewed_at', 'created_at',
        ]
        read_only_fields = fields


class PartnerAccessRequestCreateSerializer(serializers.ModelSerializer):
    """Создание заявки текущим пользователем."""

    class Meta:
        model = PartnerAccessRequest
        fields = ['requested_role', 'company_name', 'message']

    def validate(self, attrs):
        user = self.context['request'].user
        role = attrs['requested_role']

        # Нет дублирующих pending-заявок по той же роли.
        if PartnerAccessRequest.objects.filter(
            user=user,
            requested_role=role,
            status=PartnerAccessRequest.STATUS_PENDING,
        ).exists():
            raise ValidationError(
                {'requested_role': 'У вас уже есть заявка на рассмотрении по этой роли.'}
            )

        # Уже есть запрашиваемый доступ.
        if role == PartnerAccessRequest.ROLE_SUPPLIER:
            if SupplierUserAccess.objects.filter(user=user, is_active=True).exists():
                raise ValidationError(
                    {'requested_role': 'У вас уже есть доступ к кабинету поставщика.'}
                )
        elif role == PartnerAccessRequest.ROLE_COURSE_SPECIALIST:
            if getattr(user, 'role', None) == PartnerAccessRequest.COURSE_SPECIALIST_USER_ROLE:
                raise ValidationError(
                    {'requested_role': 'У вас уже есть доступ специалиста по курсам.'}
                )
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PartnerAccessRequestViewSet(viewsets.GenericViewSet):
    """
    Заявки на партнёрский доступ.

    create / my  — для любого аутентифицированного пользователя.
    list / approve / reject — только для владельца платформы (is_superuser).
    """

    queryset = PartnerAccessRequest.objects.select_related(
        'user', 'granted_supplier', 'reviewed_by',
    ).all()
    pagination_class = PartnerAccessRequestPagination

    def get_serializer_class(self):
        if self.action == 'create':
            return PartnerAccessRequestCreateSerializer
        return PartnerAccessRequestSerializer

    def get_permissions(self):
        if self.action in ('list', 'approve', 'reject'):
            return [IsPlatformOwner()]
        return [IsAuthenticated()]

    # ----------------------------------------------------------- user actions

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        out = PartnerAccessRequestSerializer(instance, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def my(self, request):
        qs = self.queryset.filter(user=request.user)
        serializer = PartnerAccessRequestSerializer(
            qs, many=True, context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    # ---------------------------------------------------------- owner actions

    def list(self, request, *args, **kwargs):
        qs = self.queryset
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        page = self.paginate_queryset(qs)
        serializer = PartnerAccessRequestSerializer(
            page if page is not None else qs,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        supplier = None
        supplier_id = request.data.get('supplier_id')
        if supplier_id:
            supplier = Supplier.objects.filter(id=supplier_id).first()
            if supplier is None:
                return Response(
                    {'supplier_id': 'Поставщик не найден.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        try:
            instance.approve(reviewer=request.user, supplier=supplier)
        except DjangoValidationError as exc:
            return Response(
                {'detail': '; '.join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        out = PartnerAccessRequestSerializer(instance, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        instance = self.get_object()
        reason = request.data.get('reason', '')
        instance.reject(reviewer=request.user, reason=reason)
        out = PartnerAccessRequestSerializer(instance, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_200_OK)
