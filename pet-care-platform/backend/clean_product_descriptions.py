#!/usr/bin/env python
"""
Clean HTML <p> tags from product descriptions.
"""

import os
import re
import html
import django


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Product  # noqa: E402


def clean_descriptions():
  updated = 0
  qs = Product.objects.filter(description__isnull=False)
  for product in qs.iterator():
    raw = product.description or ''
    cleaned = re.sub(r'<[^>]+>', '', raw)
    cleaned = html.unescape(cleaned)
    cleaned = re.sub(r'Recommendations?\\s+for\\s+(preparation|use)\\s*[:：].*$', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Рекомендации\\s+по\\s+приготовлению/использованию\\s*[:：].*$', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Рекомендации\\s+по\\s+(приготовлению|использованию)\\s*[:：].*$', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Инструкция\\s+по\\s+применению\\s*[:：].*$', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'Рекомендации\\s+по\\s+кормлению\\s*[:：].*$', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned).strip()
    if cleaned != raw:
      product.description = cleaned
      product.save(update_fields=['description'])
      updated += 1
  print(f'Updated descriptions: {updated}')


if __name__ == '__main__':
  clean_descriptions()
