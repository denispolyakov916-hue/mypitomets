import json
import logging
import urllib.error
import urllib.request
from datetime import timezone as datetime_timezone
from decimal import Decimal, InvalidOperation
from typing import Dict, Iterable, List, Optional

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.payments.models import Payment
from apps.pets.food_recipe_models import Supplier, SupplierCatalogSyncLog, SupplierOffer
from apps.shop.models import Order, Product, ProductSKU

from .auth import build_pitomets_signature, utc_timestamp
from .models import DistributorInboundEvent, DistributorOrder

logger = logging.getLogger('apps.integrations')


class IntegrationValidationError(Exception):
    def __init__(self, message, code='VALIDATION_ERROR', status_code=400, errors=None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.errors = errors or []


class DinozavrikAPIError(Exception):
    def __init__(self, message, status_code=None, error_code=None, payload=None):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.payload = payload or {}


def money_minor_to_decimal(value):
    try:
        return (Decimal(int(value)) / Decimal('100')).quantize(Decimal('0.01'))
    except (TypeError, ValueError, InvalidOperation):
        raise IntegrationValidationError('Некорректная цена в копейках', code='VALIDATION_ERROR')


def decimal_to_minor(value) -> int:
    return int((Decimal(value or 0).quantize(Decimal('0.01')) * 100).to_integral_value())


def parse_iso_datetime(value):
    if not value:
        return None
    dt = parse_datetime(value)
    if dt and timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone=datetime_timezone.utc)
    return dt


class CatalogSyncService:
    """Обновляет офферы, SKU и витринные товары по catalog.sync."""

    ALLOWED_MODES = {'delta', 'snapshot'}

    @classmethod
    @transaction.atomic
    def sync(cls, supplier: Supplier, payload: Dict) -> Dict:
        mode = payload.get('mode')
        if mode not in cls.ALLOWED_MODES:
            raise IntegrationValidationError('mode должен быть delta или snapshot', errors=[{'field': 'mode'}])

        items = payload.get('items')
        if not isinstance(items, list):
            raise IntegrationValidationError('items должен быть массивом', errors=[{'field': 'items'}])

        store_code = payload.get('store_code') or ''
        log = SupplierCatalogSyncLog.objects.create(
            supplier=supplier,
            source='dinozavrik_api',
            file_name=f'{mode}:{store_code}'[:255],
            started_at=timezone.now(),
            status=SupplierCatalogSyncLog.STATUS_RUNNING,
            total_items=len(items),
        )

        accepted = 0
        rejected = 0
        errors = []
        touched_product_ids = set()

        for raw_item in items:
            item_result = cls._sync_item(supplier, raw_item, store_code)
            if item_result.get('accepted'):
                accepted += 1
                touched_product_ids.update(item_result.get('product_ids') or [])
            else:
                rejected += 1
                errors.append(item_result['error'])

        cls._refresh_products(touched_product_ids)
        if touched_product_ids:
            cache.clear()

        log.finished_at = timezone.now()
        log.status = SupplierCatalogSyncLog.STATUS_SUCCESS
        log.updated_items = accepted
        log.failed_items = rejected
        log.summary = {
            'mode': mode,
            'store_code': store_code,
            'accepted': accepted,
            'rejected': rejected,
            'errors': errors[:100],
        }
        log.save(update_fields=[
            'finished_at', 'status', 'updated_items', 'failed_items', 'summary'
        ])

        return {
            'batch_id': str(log.id),
            'accepted': accepted,
            'rejected': rejected,
            'errors': errors,
        }

    @classmethod
    def _sync_item(cls, supplier: Supplier, raw_item: Dict, store_code: str) -> Dict:
        if not isinstance(raw_item, dict):
            return {'accepted': False, 'error': {'error_code': 'VALIDATION_ERROR', 'message': 'Позиция должна быть объектом'}}

        article_number = (raw_item.get('article_number') or '').strip()
        if not article_number:
            return {
                'accepted': False,
                'error': {'article_number': None, 'error_code': 'VALIDATION_ERROR', 'message': 'article_number обязателен'},
            }

        if 'quantity_available' not in raw_item:
            return {
                'accepted': False,
                'error': {'article_number': article_number, 'error_code': 'VALIDATION_ERROR', 'message': 'quantity_available обязателен'},
            }

        try:
            quantity = max(0, int(raw_item.get('quantity_available')))
        except (TypeError, ValueError):
            return {
                'accepted': False,
                'error': {'article_number': article_number, 'error_code': 'VALIDATION_ERROR', 'message': 'quantity_available должен быть числом'},
            }

        offer = SupplierOffer.objects.filter(supplier=supplier, article_number=article_number).first()
        if not offer:
            return {
                'accepted': False,
                'error': {
                    'article_number': article_number,
                    'error_code': 'OFFER_NOT_FOUND',
                    'message': 'Артикул не привязан к офферу',
                },
            }

        price = None
        compare_price = None
        update_price = 'price_minor' in raw_item and raw_item.get('price_minor') is not None
        update_compare_price = 'compare_price_minor' in raw_item

        if update_price:
            currency = raw_item.get('currency')
            if currency != 'RUB':
                return {
                    'accepted': False,
                    'error': {
                        'article_number': article_number,
                        'error_code': 'VALIDATION_ERROR',
                        'message': 'currency=RUB обязателен при передаче price_minor',
                    },
                }
            try:
                price = money_minor_to_decimal(raw_item.get('price_minor'))
            except IntegrationValidationError as exc:
                return {
                    'accepted': False,
                    'error': {'article_number': article_number, 'error_code': exc.code, 'message': str(exc)},
                }

        if update_compare_price and raw_item.get('compare_price_minor') not in (None, 0):
            try:
                compare_price = money_minor_to_decimal(raw_item.get('compare_price_minor'))
            except IntegrationValidationError as exc:
                return {
                    'accepted': False,
                    'error': {'article_number': article_number, 'error_code': exc.code, 'message': str(exc)},
                }

        offer.in_stock = quantity > 0
        offer.raw = offer.raw or {}
        offer.raw['last_catalog_sync'] = {
            'store_code': store_code,
            'quantity_available': quantity,
            'price_minor': raw_item.get('price_minor'),
            'compare_price_minor': raw_item.get('compare_price_minor'),
            'synced_at': timezone.now().isoformat(),
        }
        update_fields = ['in_stock', 'raw', 'updated_at']
        if update_price:
            offer.price = price
            update_fields.append('price')
        offer.save(update_fields=update_fields)

        skus = list(ProductSKU.objects.filter(supplier_offer=offer).select_related('product'))
        product_ids = set()
        for sku in skus:
            sku.available = quantity > 0
            sku.stock_quantity = quantity
            sku.features = sku.features or {}
            sku.features['supplier_inventory'] = {
                'store_code': store_code,
                'quantity_available': quantity,
                'synced_at': timezone.now().isoformat(),
            }
            fields = ['available', 'stock_quantity', 'features']
            if update_price:
                sku.price = price
                fields.append('price')
            if update_compare_price:
                sku.compare_price = compare_price
                fields.append('compare_price')
            sku.save(update_fields=fields)
            product_ids.add(sku.product_id)

        return {'accepted': True, 'product_ids': product_ids}

    @classmethod
    def _refresh_products(cls, product_ids: Iterable[int]):
        for product in Product.objects.filter(id__in=product_ids).prefetch_related('skus'):
            skus = list(product.skus.filter(status=1).order_by('sort_order', 'id'))
            if not skus:
                continue

            available_skus = [sku for sku in skus if sku.available]
            product.is_available = bool(available_skus)
            product.sku_count = len(skus)

            default_sku = next((sku for sku in skus if sku.is_default and sku.available), None)
            if not default_sku:
                default_sku = next((sku for sku in skus if sku.is_default), None)
            if not default_sku:
                candidates = available_skus or skus
                default_sku = sorted(candidates, key=lambda sku: (sku.price, sku.sort_order, sku.id))[0]

            product.price = default_sku.price
            product.compare_price = default_sku.compare_price
            product.save(update_fields=['is_available', 'sku_count', 'price', 'compare_price', 'updated_at'])


class FulfillmentWebhookService:
    EVENT_TO_DISTRIBUTOR_STATUS = {
        'order.confirmed': DistributorOrder.STATUS_ACCEPTED,
        'order.cancelled': DistributorOrder.STATUS_CANCELLED,
        'fulfillment.packed': DistributorOrder.STATUS_PACKED,
        'fulfillment.shipped': DistributorOrder.STATUS_SHIPPED,
        'fulfillment.delivered': DistributorOrder.STATUS_DELIVERED,
        'fulfillment.delivery_failed': DistributorOrder.STATUS_DELIVERY_FAILED,
    }

    EVENT_TO_ORDER_STATUS = {
        'order.confirmed': 'confirmed',
        'order.cancelled': 'cancelled',
        'fulfillment.packed': 'packed',
        'fulfillment.shipped': 'shipped',
        'fulfillment.delivered': 'delivered',
        'fulfillment.delivery_failed': 'delivery_failed',
    }

    @classmethod
    @transaction.atomic
    def process(cls, supplier: Supplier, payload: Dict, request_id: str = '') -> Dict:
        event_id = payload.get('event_id')
        event_type = payload.get('event_type')
        platform_order_id = payload.get('platform_order_id')
        data = payload.get('data') or {}

        if not event_id or not event_type or not platform_order_id:
            raise IntegrationValidationError(
                'event_id, event_type и platform_order_id обязательны',
                errors=[{'field': 'event_id/event_type/platform_order_id'}],
            )
        if event_type not in cls.EVENT_TO_DISTRIBUTOR_STATUS:
            raise IntegrationValidationError('Неизвестный тип события', errors=[{'field': 'event_type'}])

        existing = DistributorInboundEvent.objects.filter(event_id=event_id).first()
        if existing:
            return {
                'event_id': event_id,
                'status': 'duplicate',
                'processed': False,
            }

        event = DistributorInboundEvent.objects.create(
            supplier=supplier,
            event_id=event_id,
            event_type=event_type,
            platform_order_id=platform_order_id,
            request_id=request_id or '',
            occurred_at=parse_iso_datetime(payload.get('occurred_at')),
            payload=payload,
            status=DistributorInboundEvent.STATUS_PROCESSED,
        )

        try:
            order = Order.objects.get(id=platform_order_id)
        except Order.DoesNotExist:
            event.status = DistributorInboundEvent.STATUS_FAILED
            event.error_code = 'ORDER_NOT_FOUND'
            event.error_message = 'Заказ Питомец+ не найден'
            event.processed_at = timezone.now()
            event.save(update_fields=['status', 'error_code', 'error_message', 'processed_at'])
            raise IntegrationValidationError('Заказ Питомец+ не найден', code='ORDER_NOT_FOUND', status_code=404)

        distributor_order, _ = DistributorOrder.objects.get_or_create(
            order=order,
            defaults={'supplier': supplier},
        )
        distributor_order.supplier = supplier
        distributor_order.status = cls.EVENT_TO_DISTRIBUTOR_STATUS[event_type]
        distributor_order.last_event_id = event_id
        distributor_order.last_event_type = event_type
        distributor_order.response_payload = payload
        distributor_order.last_error = ''

        if data.get('distributor_order_ref'):
            distributor_order.distributor_order_ref = data['distributor_order_ref']
        if data.get('tracking_number'):
            distributor_order.tracking_number = data['tracking_number']
        if data.get('tracking_url'):
            distributor_order.tracking_url = data['tracking_url']
        if event_type == 'order.confirmed':
            distributor_order.confirmed_at = parse_iso_datetime(data.get('confirmed_at')) or timezone.now()
        if event_type == 'order.cancelled':
            distributor_order.cancelled_at = parse_iso_datetime(data.get('cancelled_at')) or timezone.now()

        distributor_order.save()

        new_order_status = cls.EVENT_TO_ORDER_STATUS[event_type]
        if order.status != new_order_status:
            order.status = new_order_status
            order.save(update_fields=['status', 'updated_at'])

        event.response_payload = {
            'order_id': str(order.id),
            'order_status': order.status,
            'distributor_status': distributor_order.status,
        }
        event.processed_at = timezone.now()
        event.save(update_fields=['response_payload', 'processed_at'])

        return {
            'event_id': event_id,
            'status': 'processed',
            'processed': True,
            'order_status': order.status,
        }


class DinozavrikOrderClient:
    """Исходящий клиент Питомец+ → Dinozavrik по ТЗ."""

    def __init__(self):
        self.base_url = (getattr(settings, 'DINOZAVRIK_API_BASE_URL', '') or '').rstrip('/')
        self.api_key = getattr(settings, 'DINOZAVRIK_PITOMETS_API_KEY', '') or ''
        self.secret = getattr(settings, 'DINOZAVRIK_PITOMETS_SECRET', '') or ''
        self.timeout = int(getattr(settings, 'DINOZAVRIK_API_TIMEOUT_SECONDS', 10))
        self.supplier_code = getattr(settings, 'DINOZAVRIK_SUPPLIER_CODE', 'dinozavrik') or 'dinozavrik'

    @property
    def is_configured(self):
        return bool(self.base_url and self.api_key and self.secret)

    def ping(self) -> Dict:
        return self._request('GET', '/ping', None)

    def create_order(self, order: Order, payment: Optional[Payment] = None) -> Dict:
        if not self.is_configured:
            raise DinozavrikAPIError('Dinozavrik API не настроен', error_code='SERVICE_UNAVAILABLE')

        supplier = Supplier.objects.get(code=self.supplier_code)
        payload = self.build_order_payload(order, payment, supplier)
        sync, _ = DistributorOrder.objects.get_or_create(order=order, defaults={'supplier': supplier})
        sync.supplier = supplier
        sync.attempts += 1
        sync.request_payload = payload
        sync.sent_at = timezone.now()
        sync.save(update_fields=['supplier', 'attempts', 'request_payload', 'sent_at', 'updated_at'])

        try:
            response = self._request('POST', '/orders', payload)
        except DinozavrikAPIError as exc:
            sync.status = DistributorOrder.STATUS_FAILED
            sync.last_error = str(exc)
            sync.response_payload = exc.payload
            sync.save(update_fields=['status', 'last_error', 'response_payload', 'updated_at'])
            raise

        data = response.get('data') or {}
        sync.distributor_order_ref = data.get('distributor_order_ref') or sync.distributor_order_ref
        sync.status = data.get('status') or DistributorOrder.STATUS_PENDING_ACCEPTANCE
        sync.response_payload = response
        sync.last_error = ''
        sync.save(update_fields=[
            'distributor_order_ref', 'status', 'response_payload', 'last_error', 'updated_at'
        ])
        return response

    def cancel_order(self, order: Order, reason_code='buyer_request', reason_text='') -> Dict:
        if not self.is_configured:
            raise DinozavrikAPIError('Dinozavrik API не настроен', error_code='SERVICE_UNAVAILABLE')

        payload = {
            'reason_code': reason_code,
            'reason_text': reason_text or None,
        }
        response = self._request('POST', f'/orders/{order.id}/cancel', payload)
        sync = getattr(order, 'distributor_sync', None)
        if sync:
            data = response.get('data') or {}
            sync.status = data.get('status') or sync.status
            sync.response_payload = response
            sync.cancelled_at = parse_iso_datetime(data.get('cancelled_at')) or sync.cancelled_at
            sync.save(update_fields=['status', 'response_payload', 'cancelled_at', 'updated_at'])
        return response

    def build_order_payload(self, order: Order, payment: Optional[Payment], supplier: Supplier) -> Dict:
        items = []
        order_items = order.items.select_related(
            'product', 'sku', 'sku__supplier_offer'
        ).prefetch_related('product__skus__supplier_offer')

        for item in order_items:
            if not item.product:
                continue
            article_number = self._article_number_for_item(item, supplier)
            if not article_number:
                raise DinozavrikAPIError(
                    f'Для позиции {item.id} не найден артикул Dinozavrik',
                    error_code='OFFER_NOT_FOUND',
                )
            items.append({
                'line_id': str(item.id),
                'article_number': article_number,
                'product_name': item.product_name,
                'quantity': item.quantity,
                'unit_price_minor': decimal_to_minor(item.price),
            })

        if not items:
            raise DinozavrikAPIError('В заказе нет товарных позиций Dinozavrik', error_code='VALIDATION_ERROR')

        paid_at = (payment.completed_at or timezone.now()) if payment else timezone.now()
        payment_collector = getattr(settings, 'DINOZAVRIK_PAYMENT_COLLECTOR', 'pitometsplus')
        settlement_model = getattr(settings, 'DINOZAVRIK_SETTLEMENT_MODEL', 'weekly_payout')

        delivery_type = 'pickup' if order.delivery_type == 'pickup' else 'courier'
        return {
            'platform_order_id': str(order.id),
            'created_at': order.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'items': items,
            'delivery': {
                'type': delivery_type,
                'address': order.shipping_address if delivery_type == 'courier' else None,
                'recipient_name': order.recipient_name or order.user.email,
                'recipient_phone': order.recipient_phone or getattr(order.user, 'phone', ''),
                'desired_date': order.delivery_date.isoformat() if order.delivery_date else None,
                'desired_interval': None,
                'comment': None,
            },
            'totals': {
                'delivery_cost_minor': decimal_to_minor(order.delivery_cost),
                'grand_total_minor': decimal_to_minor(order.total_amount),
                'currency': 'RUB',
            },
            'payment': {
                'status': 'paid',
                'payment_collector': payment_collector,
                'paid_at': paid_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'psp_reference': payment.external_payment_id if payment else None,
                'settlement_model': settlement_model,
                'settlement_comment': 'ПИТОМЕЦПЛЮС принимает оплату у клиента и рассчитывается с Dinozavrik отдельно по еженедельной сверке.',
            },
        }

    @staticmethod
    def _article_number_for_item(item, supplier: Supplier) -> Optional[str]:
        if item.sku and item.sku.supplier_offer and item.sku.supplier_offer.supplier_id == supplier.id:
            return item.sku.supplier_offer.article_number

        sku = item.product.skus.filter(
            supplier_offer__supplier=supplier,
            supplier_offer__article_number__isnull=False,
        ).exclude(supplier_offer__article_number='').order_by('-is_default', 'sort_order', 'id').first()
        if sku and sku.supplier_offer:
            return sku.supplier_offer.article_number
        return None

    def _request(self, method: str, path: str, payload: Optional[Dict]) -> Dict:
        if not self.is_configured:
            raise DinozavrikAPIError('Dinozavrik API не настроен', error_code='SERVICE_UNAVAILABLE')

        raw_body = b''
        if payload is not None:
            raw_body = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')

        timestamp = utc_timestamp()
        headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Pitomets-Api-Key': self.api_key,
            'X-Pitomets-Signature': build_pitomets_signature(self.secret, timestamp, raw_body),
            'X-Pitomets-Timestamp': timestamp,
            'X-Request-ID': f'req_{timezone.now().strftime("%Y%m%d%H%M%S%f")}',
        }
        request = urllib.request.Request(
            url=f'{self.base_url}{path}',
            data=raw_body if method != 'GET' else None,
            headers=headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read().decode('utf-8') or '{}'
                return json.loads(body)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode('utf-8') or '{}'
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                payload = {'raw': body}
            raise DinozavrikAPIError(
                payload.get('message') or payload.get('error') or f'Dinozavrik API вернул {exc.code}',
                status_code=exc.code,
                error_code=payload.get('error_code') or payload.get('code'),
                payload=payload,
            ) from exc
        except urllib.error.URLError as exc:
            raise DinozavrikAPIError(str(exc), error_code='SERVICE_UNAVAILABLE') from exc


class DinozavrikOrderService:
    @staticmethod
    def send_after_payment(payment: Payment):
        if not getattr(settings, 'DINOZAVRIK_ORDER_SYNC_ENABLED', False):
            return None

        if payment.payment_type not in {'shop_order', 'unified_checkout'}:
            return None

        order = Order.objects.filter(id=payment.object_id).first()
        if not order:
            logger.warning('Не найден заказ для отправки в Dinozavrik: payment=%s', payment.id)
            return None

        try:
            return DinozavrikOrderClient().create_order(order, payment)
        except Exception:
            logger.exception('Ошибка отправки заказа %s в Dinozavrik', order.id)
            raise
