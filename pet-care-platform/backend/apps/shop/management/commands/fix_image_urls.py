"""
Команда для проверки и отображения статистики URL изображений.

Показывает количество URL с разными доменами.
"""

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Показывает статистику URL изображений в БД'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Статистика Product.image_url
            cursor.execute("""
                SELECT COUNT(*) FROM shop_products 
                WHERE image_url LIKE '%kotmatros.ru%'
            """)
            products_total = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM shop_products 
                WHERE image_url LIKE '%cdn.kotmatros.ru%'
            """)
            products_cdn = cursor.fetchone()[0]
            
            products_regular = products_total - products_cdn

            # Статистика ProductImage.url
            cursor.execute("""
                SELECT COUNT(*) FROM shop_product_images 
                WHERE url LIKE '%kotmatros.ru%'
            """)
            images_total = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM shop_product_images 
                WHERE url LIKE '%cdn.kotmatros.ru%'
            """)
            images_cdn = cursor.fetchone()[0]
            
            images_regular = images_total - images_cdn

        self.stdout.write('=== Статистика URL изображений ===')
        self.stdout.write('')
        self.stdout.write('Product.image_url:')
        self.stdout.write(f'  kotmatros.ru: {products_regular}')
        self.stdout.write(f'  cdn.kotmatros.ru: {products_cdn}')
        self.stdout.write('')
        self.stdout.write('ProductImage.url:')
        self.stdout.write(f'  kotmatros.ru: {images_regular}')
        self.stdout.write(f'  cdn.kotmatros.ru: {images_cdn}')
