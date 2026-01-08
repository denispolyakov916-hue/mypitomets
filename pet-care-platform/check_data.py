#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append('backend')
django.setup()

from apps.shop.models import Product
from apps.training.models import Course, Lesson

print('=== ФИНАЛЬНЫЕ ДАННЫЕ В БАЗЕ ===')
print(f'Товаров: {Product.objects.count()}')
print(f'Курсов: {Course.objects.count()}')
print(f'Уроков: {Lesson.objects.count()}')

print('\n=== СТАТИСТИКА ТОВАРОВ ===')
from django.db.models import Count
animal_stats = Product.objects.values('animal').annotate(count=Count('id'))
for stat in animal_stats:
    print(f'{stat["animal"]}: {stat["count"]}')

category_stats = Product.objects.values('category').annotate(count=Count('id'))
for stat in category_stats:
    print(f'{stat["category"]}: {stat["count"]}')

print('\n=== СТАТИСТИКА КУРСОВ ===')
course_stats = Course.objects.values('pet_type').annotate(count=Count('id'))
for stat in course_stats:
    print(f'{stat["pet_type"]}: {stat["count"]}')

