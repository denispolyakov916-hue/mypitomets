"""
Management command для заполнения недостающих данных в базе.
"""

from django.core.management.base import BaseCommand
from apps.users.models import User
from apps.shop.models import Product
from apps.training.models import Course
import random


class Command(BaseCommand):
    help = 'Заполняет недостающие данные в базе данных'

    def handle(self, *args, **options):
        self.stdout.write('Начинаем заполнение недостающих данных...\n')

        # Заполняем данные админов
        self.stdout.write('1. Заполнение данных администраторов...')
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            if not admin.first_name:
                admin.first_name = 'Администратор'
                admin.last_name = admin.email.split('@')[0].capitalize()
                admin.phone = f'+7{random.randint(9000000000, 9999999999)}'
                admin.save()
                self.stdout.write(f'  Обновлён: {admin.email}')

        # Заполняем складские остатки
        self.stdout.write('\n2. Заполнение складских остатков товаров...')
        products = Product.objects.all()
        updated_products = 0
        for product in products:
            if product.stock_count == 0:
                product.stock_count = random.randint(5, 100)
                product.save()
                updated_products += 1

        self.stdout.write(f'  Обновлено товаров: {updated_products}')

        # Проверяем активность курсов
        self.stdout.write('\n3. Проверка активности курсов...')
        active_courses = Course.objects.filter(is_active=True).count()
        total_courses = Course.objects.count()
        self.stdout.write(f'  Активных курсов: {active_courses}/{total_courses}')

        self.stdout.write('\n✅ Заполнение данных завершено!')


