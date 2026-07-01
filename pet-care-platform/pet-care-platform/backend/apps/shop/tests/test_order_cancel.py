"""
Тесты эндпоинта отмены заказа.

POST /api/shop/orders/{order_id}/cancel/

Покрывают:
- владелец отменяет неоплаченный заказ -> 200 + статус 'cancelled';
- посторонний пользователь -> 404 (заказ не виден);
- неавторизованный запрос -> 401;
- отмена уже оплаченного/обработанного заказа -> 400;
- отмена возвращает связанные товары на склад и отменяет платежи.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.shop.models import Order, OrderItem, Product
from apps.payments.models import Payment

User = get_user_model()


class OrderCancelTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email='owner@example.com', password='pass12345'
        )
        self.other = User.objects.create_user(
            email='other@example.com', password='pass12345'
        )

    def _create_order(self, user, order_status='pending', with_product=False):
        order = Order.objects.create(
            user=user,
            subtotal_amount=Decimal('100.00'),
            delivery_cost=Decimal('0.00'),
            total_amount=Decimal('100.00'),
            shipping_address='Тестовый адрес',
            status=order_status,
        )
        if with_product:
            # Товар помечен недоступным (как при резервировании под заказ)
            product = Product.objects.create(
                name='Тестовый товар',
                price=Decimal('100.00'),
                is_available=False,
            )
            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                price=Decimal('100.00'),
                quantity=1,
            )
            order._product = product
        return order

    def _cancel_url(self, order_id):
        return f'/api/shop/orders/{order_id}/cancel/'

    def test_owner_cancels_pending_order(self):
        order = self._create_order(self.owner, 'pending')
        self.client.force_authenticate(self.owner)

        response = self.client.post(self._cancel_url(order.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['order']['status'], 'cancelled')
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_cancel_restores_stock_and_cancels_payment(self):
        order = self._create_order(self.owner, 'pending', with_product=True)
        payment = Payment.objects.create(
            user=self.owner,
            payment_type='shop_order',
            object_id=str(order.id),
            amount=Decimal('100.00'),
            status='pending',
        )
        self.client.force_authenticate(self.owner)

        response = self.client.post(self._cancel_url(order.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order._product.refresh_from_db()
        self.assertTrue(order._product.is_available)
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'cancelled')

    def test_non_owner_cannot_cancel(self):
        order = self._create_order(self.owner, 'pending')
        self.client.force_authenticate(self.other)

        response = self.client.post(self._cancel_url(order.id))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_unauthenticated_cannot_cancel(self):
        order = self._create_order(self.owner, 'pending')

        response = self.client.post(self._cancel_url(order.id))

        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        order.refresh_from_db()
        self.assertEqual(order.status, 'pending')

    def test_cannot_cancel_paid_order(self):
        # 'processing' = оплачен/в обработке -> отмена пользователем запрещена
        order = self._create_order(self.owner, 'processing')
        self.client.force_authenticate(self.owner)

        response = self.client.post(self._cancel_url(order.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, 'processing')

    def test_cannot_cancel_delivered_order(self):
        order = self._create_order(self.owner, 'delivered')
        self.client.force_authenticate(self.owner)

        response = self.client.post(self._cancel_url(order.id))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, 'delivered')

    def test_owner_cancels_expired_order(self):
        order = self._create_order(self.owner, 'expired', with_product=True)
        self.client.force_authenticate(self.owner)

        response = self.client.post(self._cancel_url(order.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        order._product.refresh_from_db()
        self.assertTrue(order._product.is_available)

    def test_sbp_pending_order_survives_until_cancel(self):
        """
        СБП: заказ, ожидающий оплаты через СБП, не должен пропадать.

        Способ оплаты СБП хранится в metadata платежа (payment_method='card' +
        metadata={'payment_method': 'sbp'}), поэтому cancel-флоу от него не зависит.
        Проверяем, что до отмены заказ виден как 'pending' с позициями, а отмена
        переводит его в 'cancelled' и отменяет СБП-платёж (а не удаляет заказ).
        """
        order = self._create_order(self.owner, 'pending', with_product=True)
        sbp_payment = Payment.objects.create(
            user=self.owner,
            payment_type='unified_checkout',
            object_id=str(order.id),
            amount=Decimal('100.00'),
            payment_method='card',
            status='pending',
            metadata={'payment_method': 'sbp'},
        )
        self.client.force_authenticate(self.owner)

        # До отмены заказ доступен как 'pending' и содержит позиции.
        detail = self.client.get(f'/api/shop/orders/{order.id}/')
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['order']['status'], 'pending')
        self.assertEqual(len(detail.data['order']['items']), 1)

        # Отмена не удаляет заказ, а переводит его в 'cancelled'.
        response = self.client.post(self._cancel_url(order.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['order']['status'], 'cancelled')

        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        sbp_payment.refresh_from_db()
        self.assertEqual(sbp_payment.status, 'cancelled')
