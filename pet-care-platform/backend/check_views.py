import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.shop.models import Category as ShopCategory, Brand

# Эмулируем код из views.py
MAIN_CATEGORIES = {
    'dog': [
        {'external_id': 2136, 'name': 'Корм', 'icon': '🍖'},
        {'external_id': 2138, 'name': 'Лакомства', 'icon': '🦴'},
        {'external_id': 2341, 'name': 'Ветаптека', 'icon': '💊'},
    ],
    'cat': [
        {'external_id': 2137, 'name': 'Корм', 'icon': '🍖'},
        {'external_id': 2140, 'name': 'Лакомства', 'icon': '🐟'},
    ],
}

animal = None  # Без фильтра по животному

main_cat_list = []
if animal:
    main_cat_list = MAIN_CATEGORIES.get(animal, [])
else:
    # Без фильтра по животному — показываем уникальные названия
    seen_names = set()
    for cat in MAIN_CATEGORIES.get('dog', []):
        if cat['name'] not in seen_names:
            main_cat_list.append(cat)
            seen_names.add(cat['name'])

print(f"main_cat_list count: {len(main_cat_list)}")

# Загружаем данные из БД для этих категорий
external_ids = [c['external_id'] for c in main_cat_list]
print(f"external_ids: {external_ids}")

db_categories = {
    c.external_id: c 
    for c in ShopCategory.objects.filter(
        external_id__in=external_ids,
        is_active=True
    ).prefetch_related('children')
}

print(f"db_categories count: {len(db_categories)}")
print(f"db_categories keys: {list(db_categories.keys())}")

# Собираем иерархическую структуру
hierarchical_categories = []
for cat_info in main_cat_list:
    db_cat = db_categories.get(cat_info['external_id'])
    print(f"Looking for {cat_info['external_id']}: found={db_cat is not None}")
    if not db_cat:
        continue
    
    # Подкатегории
    children = []
    for child in db_cat.children.filter(is_active=True, product_count__gt=0).order_by('-product_count')[:15]:
        children.append({
            'id': child.id,
            'name': child.name,
            'slug': child.slug,
            'product_count': child.product_count
        })
    
    hierarchical_categories.append({
        'id': db_cat.id,
        'external_id': db_cat.external_id,
        'name': cat_info['name'],
        'slug': db_cat.slug,
        'icon': cat_info['icon'],
        'product_count': db_cat.product_count,
        'children': children
    })

print(f"\nhierarchical_categories count: {len(hierarchical_categories)}")
for cat in hierarchical_categories:
    print(f"  {cat['name']}: {cat['product_count']} products, {len(cat['children'])} children")
