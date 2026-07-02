"""
SKU-гейт и SKU-aware корзина (ревью user-flow, 2026-07-02).

Покрывает находки ревьюера:
- отключённый SKU (status=0, available=True) не должен проходить add-to-cart;
- unified-checkout (`/api/checkout/` → ReservationService) отсекает неактивный товар/SKU
  (раньше тест был только на /api/shop/orders/);
- обновление/удаление строки корзины по cart_item_id при двух фасовках одного товара
  затрагивает именно нужную строку.

Запуск: docker compose exec -T backend python manage.py test apps.shop.tests.test_cart_sku
"""

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.shop.models import Cart, CartItem, Product, ProductSKU
from apps.shop.services import ReservationService

User = get_user_model()

CART_URL = '/api/shop/cart/'
CART_ITEM_URL = '/api/shop/cart/item/'


@override_settings(SECURE_SSL_REDIRECT=False)
class SkuGateTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email='sku@t.local')
        cls.active = Product.objects.create(name='Активный', status=1, is_available=True, price='100.00')
        cls.inactive = Product.objects.create(name='Неактивный', status=0, is_available=True, price='100.00')

    def test_cannot_add_inactive_sku(self):
        # SKU отключён (status=0), но available=True — не должен попадать в корзину.
        sku = ProductSKU.objects.create(product=self.active, sku='S-OFF', price='100.00', status=0, available=True)
        self.client.force_authenticate(self.user)
        r = self.client.post(
            CART_URL, {'product_id': self.active.id, 'sku_id': sku.id, 'quantity': 1}, format='json'
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST, getattr(r, 'data', None))

    def test_reservation_rejects_inactive_product(self):
        # /api/checkout/ идёт через ReservationService — он обязан отсечь неактивный товар.
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(cart=cart, product=self.inactive, quantity=1)
        with self.assertRaises(ValueError):
            ReservationService.create_reservations_from_items(self.user, [item])

    def test_reservation_rejects_inactive_sku(self):
        sku = ProductSKU.objects.create(product=self.active, sku='S-OFF2', price='100.00', status=0, available=True)
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(cart=cart, product=self.active, sku=sku, quantity=1)
        with self.assertRaises(ValueError):
            ReservationService.create_reservations_from_items(self.user, [item])

    def test_reservation_allows_sellable(self):
        sku = ProductSKU.objects.create(product=self.active, sku='S-ON', price='100.00', status=1, available=True)
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(cart=cart, product=self.active, sku=sku, quantity=1)
        reservations = ReservationService.create_reservations_from_items(self.user, [item])
        self.assertEqual(len(reservations), 1)


@override_settings(SECURE_SSL_REDIRECT=False)
class CartSkuAwareTests(APITestCase):
    """Две фасовки одного товара — операции по cart_item_id адресуют нужную строку."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(email='skucart@t.local')
        cls.product = Product.objects.create(name='Корм', status=1, is_available=True, price='100.00')

    def _two_sku_cart(self):
        skuA = ProductSKU.objects.create(product=self.product, sku='A', price='100.00', status=1, available=True)
        skuB = ProductSKU.objects.create(product=self.product, sku='B', price='200.00', status=1, available=True)
        cart = Cart.objects.create(user=self.user)
        itemA = CartItem.objects.create(cart=cart, product=self.product, sku=skuA, quantity=1)
        itemB = CartItem.objects.create(cart=cart, product=self.product, sku=skuB, quantity=1)
        return itemA, itemB

    def test_update_targets_right_row(self):
        itemA, itemB = self._two_sku_cart()
        self.client.force_authenticate(self.user)
        r = self.client.put(CART_ITEM_URL, {'cart_item_id': itemB.id, 'quantity': 5}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK, getattr(r, 'data', None))
        itemA.refresh_from_db()
        itemB.refresh_from_db()
        self.assertEqual(itemA.quantity, 1)  # не затронута
        self.assertEqual(itemB.quantity, 5)

    def test_delete_targets_right_row(self):
        itemA, itemB = self._two_sku_cart()
        self.client.force_authenticate(self.user)
        r = self.client.delete(CART_ITEM_URL, {'cart_item_id': itemA.id}, format='json')
        self.assertIn(r.status_code, (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT), getattr(r, 'data', None))
        self.assertFalse(CartItem.objects.filter(id=itemA.id).exists())
        self.assertTrue(CartItem.objects.filter(id=itemB.id).exists())
