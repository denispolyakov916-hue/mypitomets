from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from apps.shop.models import Reservation, Product
from apps.training.models import Course


class ReservationService:

    @staticmethod
    def create_reservations_from_cart(cart):
        """Создать резервирования для всех элементов корзины."""
        reservations = []
        expires_at = timezone.now() + timedelta(minutes=10)

        with transaction.atomic():
            for item in cart.items.all():
                if item.product:
                    # Проверить доступность товара
                    if not item.product.in_stock or item.product.stock_count < item.quantity:
                        raise ValueError(f"Товар {item.product.name} недоступен")

                    # Создать резервирование товара
                    reservation = Reservation.objects.create(
                        user=cart.user,
                        reservation_type='product',
                        object_id=str(item.product.id),
                        quantity=item.quantity,
                        expires_at=expires_at
                    )

                    # Уменьшить доступное количество
                    item.product.stock_count -= item.quantity
                    item.product.save()

                elif item.course:
                    # Создать резервирование курса
                    reservation = Reservation.objects.create(
                        user=cart.user,
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
                        product = Product.objects.get(id=reservation.object_id)
                        product.stock_count += reservation.quantity
                        product.save()
                    except Product.DoesNotExist:
                        pass  # Товар уже удалён

                reservation.delete()

    @staticmethod
    def cleanup_expired_reservations():
        """Очистить истёкшие резервирования (запускается по cron)."""
        expired = Reservation.objects.filter(expires_at__lt=timezone.now())

        for reservation in expired:
            if reservation.reservation_type == 'product':
                try:
                    product = Product.objects.get(id=reservation.object_id)
                    product.stock_count += reservation.quantity
                    product.save()
                except Product.DoesNotExist:
                    pass

        expired.delete()
