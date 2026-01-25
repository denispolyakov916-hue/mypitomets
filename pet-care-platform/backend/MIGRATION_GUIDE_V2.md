# Руководство по миграции на API V2

## Обзор

Этот документ описывает изменения в структуре данных магазина и рекомендации по миграции с legacy API (v1) на новое API (v2).

## Основные изменения

### 1. Новые модели

| Модель | Описание |
|--------|----------|
| `Category` | Иерархические категории с `path[]` для быстрого поиска |
| `Brand` | Справочник брендов с классами (economy/premium/super_premium/holistic) |
| `ProductSKU` | Варианты товаров (размер, вес, вкус) |
| `ProductBreedRecommendation` | Рекомендации товаров для пород |

### 2. Deprecated поля в модели Product

Следующие поля помечены как deprecated и будут удалены в версии 2.0:

| Deprecated поле | Замена |
|-----------------|--------|
| `animal` | `animal_type` (поддерживает значение 'all') |
| `category` (CharField) | `new_category` (FK к модели Category) |
| `subcategory` | Иерархия через `new_category.children` |
| `category_name` | `new_category.name` |

### 3. Новые поля в модели Product

| Поле | Тип | Описание |
|------|-----|----------|
| `slug` | SlugField | URL-имя товара |
| `short_description` | CharField | Краткое описание для каталога |
| `image_url` | URLField | Основное изображение |
| `compare_price` | DecimalField | Старая цена (для скидок) |
| `rating` | DecimalField | Денормализованный рейтинг |
| `rating_count` | IntegerField | Количество отзывов |
| `is_available` | BooleanField | Наличие товара |
| `sku_count` | SmallIntegerField | Количество SKU |
| `animal_type` | CharField | Тип животного (dog/cat/all) |
| `new_category` | ForeignKey | Связь с иерархией категорий |
| `product_group` | CharField | Группа для логики бэкенда |
| `brand` | ForeignKey | Связь с брендом |
| `age_group` | CharField | Возрастная группа |
| `size_group` | CharField | Размерная группа |
| `is_grain_free` | BooleanField | Беззерновой корм |
| `is_hypoallergenic` | BooleanField | Гипоаллергенный |
| `is_veterinary` | BooleanField | Ветеринарная диета |
| `health_conditions` | ArrayField | Показания по здоровью |
| `category_details` | JSONField | Детали категории (нутриенты и т.д.) |

## API Endpoints

### Legacy API (v1) — сохранены для обратной совместимости

```
GET /api/shop/products/                    # Каталог
GET /api/shop/products/{id}/               # Детали товара
```

### Новое API (v2)

```
# Каталог с новыми фильтрами
GET /api/shop/v2/products/
GET /api/shop/v2/products/{id}/
GET /api/shop/v2/products/by-slug/{slug}/

# Категории
GET /api/shop/categories/
GET /api/shop/categories/{slug}/

# Бренды
GET /api/shop/brands/
GET /api/shop/brands/{slug}/

# Товары для породы
GET /api/shop/breeds/{id}/products/

# Рекомендации для пород
GET /api/shop/products/{id}/breed-recommendations/
```

### Новые параметры фильтрации (v2)

| Параметр | Описание |
|----------|----------|
| `animal_type` | dog / cat / all |
| `category_id` | ID категории |
| `category_slug` | Slug категории |
| `product_group` | food / treats / vet / vitamins / ... |
| `brand_id` | ID бренда |
| `brand_slug` | Slug бренда |
| `age_group` | puppy / kitten / adult / senior / all |
| `size_group` | mini / small / medium / large / giant / all |
| `is_grain_free` | true |
| `is_hypoallergenic` | true |
| `is_veterinary` | true |
| `health_condition` | urinary / obesity / joint / ... |
| `sort` | price_asc / price_desc / rating / newest |

## План миграции для разработчиков

### Этап 1: Подготовка — ВЫПОЛНЕНО
- [x] Добавлены новые модели и поля
- [x] Добавлены API v2 endpoints
- [x] Legacy endpoints сохранены
- [x] Deprecated поля помечены

### Этап 2: Интеграция полей — ВЫПОЛНЕНО
- [x] Обновлён `food_recommendation_service.py` — все запросы используют новые + legacy поля
- [x] Обновлён `views_food.py` — фильтрация с новыми полями
- [x] Обновлён `services_food.py` — базовые запросы
- [x] Обновлён `shop/services.py` — рекомендации
- [x] Обновлён `admin_api.py` — API администратора
- [x] Обновлён `Product.to_dict()` — включает все новые поля

### Этап 3: Миграция фронтенда — ВЫПОЛНЕНО
- [x] Обновлён API client для использования v2 endpoints
- [x] Обновлены компоненты фильтрации
- [x] Обновлена карточка товара для отображения SKU
- [x] Страница подбора корма работает с новой структурой

### Этап 3: Удаление legacy (версия 2.0)
- [ ] Удалить deprecated поля из модели Product
- [ ] Удалить deprecated choices
- [ ] Удалить legacy индексы
- [ ] Удалить legacy API endpoints

## Примеры миграции кода

### До (legacy)
```python
# Фильтрация по животному
products = Product.objects.filter(animal='dog')

# Фильтрация по категории
products = Product.objects.filter(category='food', subcategory='dry')
```

### После (v2)
```python
# Фильтрация по животному
products = Product.objects.filter(animal_type__in=['dog', 'all'])

# Фильтрация по категории (с иерархией)
products = Product.objects.in_new_category(category)

# Или через product_group
products = Product.objects.filter(product_group='food')
```

## Контакты

При возникновении вопросов по миграции обращайтесь к команде разработки.
