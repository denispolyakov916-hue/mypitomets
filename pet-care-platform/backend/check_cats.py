import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Category

print("=== ROOT CATEGORIES ===")
cats = Category.objects.filter(parent__isnull=True).order_by('id')[:20]
for c in cats:
    children = Category.objects.filter(parent=c).count()
    print(f"ID:{c.id} name:{c.name} slug:{c.slug} code:{c.code or '-'} children:{children}")

print("\n=== CHILDREN OF FIRST 3 ROOT CATS ===")
for parent in cats[:3]:
    print(f"\n-- Children of {parent.name} (id:{parent.id}) --")
    children = Category.objects.filter(parent=parent)[:10]
    for ch in children:
        print(f"   ID:{ch.id} name:{ch.name} slug:{ch.slug}")
