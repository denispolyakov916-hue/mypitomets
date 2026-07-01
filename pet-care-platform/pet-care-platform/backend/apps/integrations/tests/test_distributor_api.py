import hashlib
import hmac
import json

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.integrations.models import DistributorInboundEvent, DistributorOrder
from apps.pets.food_recipe_models import Supplier, SupplierOffer
from apps.shop.models import Order, Product, ProductSKU


API_KEY = 'dk_test'
SECRET = 'test-secret'


def signed_headers(body=b'', timestamp='2026-06-30T10:00:00Z', signature_secret=SECRET):
    digest = hmac.new(
        signature_secret.encode('utf-8'),
        timestamp.encode('utf-8') + b'.' + body,
        hashlib.sha256,
    ).hexdigest()
    return {
        'HTTP_X_DISTRIBUTOR_API_KEY': API_KEY,
        'HTTP_X_DISTRIBUTOR_SIGNATURE': f'sha256={digest}',
        'HTTP_X_DISTRIBUTOR_TIMESTAMP': timestamp,
        'HTTP_X_REQUEST_ID': 'req_test',
    }


@override_settings(
    DINOZAVRIK_DISTRIBUTOR_API_KEY=API_KEY,
    DINOZAVRIK_DISTRIBUTOR_SECRET=SECRET,
    DINOZAVRIK_SUPPLIER_CODE='dinozavrik',
    DISTRIBUTOR_RATE_LIMIT_ENABLED=False,
    DISTRIBUTOR_SIGNATURE_MAX_DRIFT_SECONDS=10 * 365 * 24 * 60 * 60,
)
class DistributorApiTests(APITestCase):
    def setUp(self):
        self.supplier = Supplier.objects.create(
            code='dinozavrik',
            name='Dinozavrik',
            supplier_type='api',
            is_active=True,
        )

    def post_json(self, url, payload, secret=SECRET):
        body = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        return self.client.post(
            url,
            data=body,
            content_type='application/json',
            **signed_headers(body, signature_secret=secret),
        )

    def test_catalog_sync_updates_offer_sku_and_product(self):
        product = Product.objects.create(
            name='Dino food',
            slug='dino-food',
            price='100.00',
            animal_type='dog',
            product_group='food',
            supplier=self.supplier,
        )
        offer = SupplierOffer.objects.create(
            supplier=self.supplier,
            source='dinozavrik',
            article_number='DIN-001',
            price='100.00',
            in_stock=False,
        )
        sku = ProductSKU.objects.create(
            product=product,
            supplier_offer=offer,
            sku='DIN-001',
            price='100.00',
            available=False,
            stock_quantity=0,
            is_default=True,
        )

        response = self.post_json('/api/integrations/distributor/v1/catalog/sync', {
            'mode': 'delta',
            'store_code': 'msk',
            'items': [{
                'article_number': 'DIN-001',
                'quantity_available': 7,
                'price_minor': 12345,
                'compare_price_minor': 15000,
                'currency': 'RUB',
            }],
        })

        self.assertEqual(response.status_code, 202)
        sku.refresh_from_db()
        product.refresh_from_db()
        offer.refresh_from_db()
        self.assertEqual(sku.stock_quantity, 7)
        self.assertEqual(str(sku.price), '123.45')
        self.assertEqual(str(sku.compare_price), '150.00')
        self.assertTrue(sku.available)
        self.assertTrue(product.is_available)
        self.assertEqual(str(product.price), '123.45')
        self.assertTrue(offer.in_stock)

    def test_catalog_sync_rejects_invalid_signature(self):
        response = self.post_json('/api/integrations/distributor/v1/catalog/sync', {
            'mode': 'delta',
            'items': [],
        }, secret='wrong-secret')

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['code'], 'INVALID_SIGNATURE')

    def test_fulfillment_webhook_updates_order_and_deduplicates_event(self):
        user = get_user_model().objects.create_user(
            email='buyer@example.com',
            password='password',
            phone='+79001234567',
        )
        order = Order.objects.create(
            user=user,
            subtotal_amount='100.00',
            delivery_cost='0.00',
            total_amount='100.00',
            shipping_address='Москва',
            recipient_name='Иван',
            recipient_phone='+79001234567',
            status='processing',
            created_at=timezone.now(),
        )

        payload = {
            'event_id': 'evt_confirmed_1',
            'event_type': 'order.confirmed',
            'occurred_at': '2026-06-30T10:00:00Z',
            'platform_order_id': str(order.id),
            'data': {
                'distributor_order_ref': 'DIN-2026-1',
                'confirmed_at': '2026-06-30T10:01:00Z',
            },
        }

        response = self.post_json('/api/integrations/distributor/v1/webhooks/fulfillment', payload)
        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'confirmed')
        sync = DistributorOrder.objects.get(order=order)
        self.assertEqual(sync.distributor_order_ref, 'DIN-2026-1')
        self.assertEqual(sync.status, 'accepted')

        duplicate_response = self.post_json('/api/integrations/distributor/v1/webhooks/fulfillment', payload)
        self.assertEqual(duplicate_response.status_code, 200)
        self.assertEqual(duplicate_response.data['data']['status'], 'duplicate')
        self.assertEqual(DistributorInboundEvent.objects.filter(event_id='evt_confirmed_1').count(), 1)
