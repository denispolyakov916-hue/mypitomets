"""
Гейт активности товара в корзине и заказе (аудит user-flow 2026-07-01).

Канонический «продаваемый» товар в магазине = status=1 AND is_available=True
(ShopProductManager.active). Но add-to-cart делал Product.objects.get(id=...) без
фильтра, а checkout (OrderCreateView) проверял только is_available — из-за чего
неактивный (status=0) товар просачивался в корзину и заказ.

Запуск: docker compose exec -T backend python manage.py test apps.shop.tests.test_active_product_gate
"""

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.shop.models import Cart, CartItem, Order, Product

User = get_user_model()

CART_URL = '/api/shop/cart/'
ORDERS_URL = '/api/shop/orders/'


@override_settings(SECURE_SSL_REDIRECT=False)
class ActiveProductGateTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email='cartgate@t.local')
        cls.active = Product.objects.create(name='Активный', status=1, is_available=True, price='100.00')
        cls.inactive = Product.objects.create(name='Неактивный', status=0, is_available=True, price='100.00')

    def test_cannot_add_inactive_product_to_cart(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(CART_URL, {'product_id': self.inactive.id, 'quantity': 1}, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND, getattr(r, 'data', None))

    def test_can_add_active_product_to_cart(self):
        self.client.force_authenticate(self.user)
        r = self.client.post(CART_URL, {'product_id': self.active.id, 'quantity': 1}, format='json')
        self.assertIn(r.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED), getattr(r, 'data', None))

    def test_checkout_does_not_create_order_with_inactive_product(self):
        # Товар мог стать неактивным, уже находясь в корзине — checkout обязан его отсечь.
        self.client.force_authenticate(self.user)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.inactive, quantity=1)
        r = self.client.post(ORDERS_URL, {'shipping_address': 'ул. Тестовая, 1'}, format='json')
        self.assertNotEqual(r.status_code, status.HTTP_201_CREATED, getattr(r, 'data', None))
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)

    def test_no_duplicate_order_on_resubmit(self):
        # Анти-дабл-сабмит: после успешного оформления корзина под локом пуста,
        # повторный POST не создаёт второй заказ — ровно один заказ в БД.
        self.client.force_authenticate(self.user)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.active, quantity=1)
        payload = {'shipping_address': 'ул. Тестовая, 1', 'delivery_type': 'pickup'}
        r1 = self.client.post(ORDERS_URL, payload, format='json')
        self.assertIn(r1.status_code, (status.HTTP_200_OK, status.HTTP_201_CREATED), getattr(r1, 'data', None))
        r2 = self.client.post(ORDERS_URL, payload, format='json')
        self.assertNotEqual(r2.status_code, status.HTTP_201_CREATED, getattr(r2, 'data', None))
        self.assertEqual(Order.objects.filter(user=self.user).count(), 1)
