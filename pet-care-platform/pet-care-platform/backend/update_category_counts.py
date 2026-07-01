#!/usr/bin/env python
"""Скрипт для обновления счётчиков товаров в категориях."""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Category, Product
from django.db.models import Count

print("Updating category product counts...")

# Подсчитываем товары по категориям
product_counts = dict(
    Product.objects.filter(new_category__isnull=False, status=1)
    .values('new_category_id')
    .annotate(cnt=Count('id'))
    .values_list('new_category_id', 'cnt')
)

print(f"Found products in {len(product_counts)} categories")

# Обновляем счётчики (сначала дочерние, потом родительские)
updated = 0

# Сначала обновляем leaf категории
for cat in Category.objects.filter(children__isnull=True):
    cnt = product_counts.get(cat.id, 0)
    if cat.product_count != cnt:
        cat.product_count = cnt
        cat.save(update_fields=['product_count'])
        updated += 1

# Затем обновляем родительские (суммируя дочерние)
for cat in Category.objects.filter(children__isnull=False).distinct():
    own_cnt = product_counts.get(cat.id, 0)
    children_cnt = sum(child.product_count for child in cat.children.all())
    total = own_cnt + children_cnt
    if cat.product_count != total:
        cat.product_count = total
        cat.save(update_fields=['product_count'])
        updated += 1

print(f"Updated {updated} categories")

# Показываем топ категории
print("\nTop categories:")
top = Category.objects.filter(product_count__gt=0).order_by('-product_count')[:15]
for c in top:
    external_id = c.external_id or c.id
    print(f"  {external_id}: {c.name} = {c.product_count}")
