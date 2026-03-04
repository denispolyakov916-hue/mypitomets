import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Category

# Проверяем категорию Корм для собак
cat = Category.objects.get(external_id=2136)
print(f"Category: {cat.name}")
print(f"  external_id: {cat.external_id}")
print(f"  product_count: {cat.product_count}")
print(f"  is_active: {cat.is_active}")
print(f"  Children count: {cat.children.count()}")

print("\nChildren with products:")
for c in cat.children.filter(is_active=True, product_count__gt=0).order_by('-product_count')[:10]:
    print(f"  - {c.name}: {c.product_count}")

print("\nAll children:")
for c in cat.children.all()[:10]:
    print(f"  - {c.name}: {c.product_count}, active={c.is_active}")
