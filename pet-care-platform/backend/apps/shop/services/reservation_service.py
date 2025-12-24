from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from apps.shop.models import Reservation, Product
from apps.training.models import Course


class ReservationService:

    @staticmethod
    def create_reservations_from_cart(cart):
        """Создать резервирования для всех элементов корзины."""
        return ReservationService.create_reservations_from_items(
            cart.user, list(cart.items.all())
        )

    @staticmethod
    def create_reservations_from_items(user, items):
        """Создать резервирования для выбранных элементов корзины."""
        reservations = []
        expires_at = timezone.now() + timedelta(minutes=10)

        with transaction.atomic():
            for item in items:
                if item.product:
                    # Блокировать строку товара для предотвращения race condition
                    # Это гарантирует, что между проверкой и обновлением никто другой не изменит количество
                    product = Product.objects.select_for_update().get(id=item.product.id)
                    
                    # Проверить доступность товара
                    # stock_count уже учитывает все активные резервирования (они уменьшают stock_count)
                    if product.stock_count < item.quantity:
                        raise ValueError(
                            f"Товар {product.name} недоступен. "
                            f"Запрошено: {item.quantity} шт., доступно: {product.stock_count} шт."
                        )

                    # Создать резервирование товара
                    reservation = Reservation.objects.create(
                        user=user,
                        reservation_type='product',
                        object_id=str(product.id),
                        quantity=item.quantity,
                        expires_at=expires_at
                    )

                    # Уменьшить доступное количество
                    product.stock_count -= item.quantity
                    # Обновить флаг in_stock на основе stock_count
                    product.in_stock = product.stock_count > 0
                    product.save()

                    reservations.append(reservation)

                elif item.course:
                    # Создать резервирование курса
                    reservation = Reservation.objects.create(
                        user=user,
                        reservation_type='course',
                        object_id=str(item.course.id),
                        pet_id=str(item.pet.id) if item.pet else None,
                        quantity=1,  # Курсы всегда quantity=1
                        expires_at=expires_at
                    )

                    reservations.append(reservation)

        return reservations

    @staticmethod
    def cancel_reservations(reservations):
        """Отменить резервирования и вернуть товары на склад."""
        with transaction.atomic():
            for reservation in reservations:
                if reservation.reservation_type == 'product':
                    try:
                        # Блокировать строку товара для предотвращения race condition
                        product = Product.objects.select_for_update().get(id=reservation.object_id)
                        product.stock_count += reservation.quantity
                        # Обновить флаг in_stock на основе stock_count
                        product.in_stock = product.stock_count > 0
                        product.save()
                    except Product.DoesNotExist:
                        pass  # Товар уже удалён

                reservation.delete()

    @staticmethod
    def cleanup_expired_reservations():
        """Очистить истёкшие резервирования (запускается по cron)."""
        expired = Reservation.objects.filter(expires_at__lt=timezone.now())

        with transaction.atomic():
            for reservation in expired:
                if reservation.reservation_type == 'product':
                    try:
                        # Блокировать строку товара для предотвращения race condition
                        product = Product.objects.select_for_update().get(id=reservation.object_id)
                        product.stock_count += reservation.quantity
                        # Обновить флаг in_stock на основе stock_count
                        product.in_stock = product.stock_count > 0
                        product.save()
                    except Product.DoesNotExist:
                        pass  # Товар уже удалён

            expired.delete()
