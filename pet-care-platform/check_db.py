#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append('.')
django.setup()

from apps.shop.models import Product
from apps.training.models import Course

print('=== ПРОВЕРКА ДАННЫХ В БАЗЕ ===')
print(f'Всего товаров: {Product.objects.count()}')
print(f'Всего курсов: {Course.objects.count()}')

print('\nПервые 3 товара:')
for product in Product.objects.all()[:3]:
    print(f'  - {product.name[:50]}... ({product.price}₽)')

print('\nПервые 3 курса:')
for course in Course.objects.all()[:3]:
    print(f'  - {course.title[:50]}... ({course.price}₽)')

