"""
Команда для обработки просроченных заказов

Использование:
    python manage.py process_expired_orders
"""

from django.core.management.base import BaseCommand
from apps.shop.services.order_service import process_expired_orders


class Command(BaseCommand):
    help = 'Обработка просроченных заказов (возврат товаров на склад, изменение статуса)'

    def handle(self, *args, **options):
        self.stdout.write('Обработка просроченных заказов...')
        
        stats = process_expired_orders()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Обработано заказов: {stats["processed"]}, '
                f'товаров возвращено: {stats["products_returned"]}, '
                f'ошибок: {stats["errors"]}'
            )
        )

