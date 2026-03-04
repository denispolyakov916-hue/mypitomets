# Структура БД магазина (PostgreSQL)

Документ описывает рекомендуемую структуру данных магазина, включая таблицы,
типы, ограничения и пояснения по каждому полю. Названия таблиц приведены в
корректной форме.

## Таблицы

### `products`
Карточка товара (общая информация, без вариаций).

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор карточки товара. |
| `slug` | `text` | `UNIQUE NOT NULL` | URL-имя товара для SEO-friendly ссылок. |
| `title` | `text` | `NOT NULL` | Название товара в витрине (как на упаковке/сайте). |
| `short_description` | `text` |  | Краткое описание для превью в каталоге. |
| `brand_id` | `bigint` | `REFERENCES brands(id)` | Бренд товара. |
| `manufacturer` | `text` |  | Производитель, если отличается от бренда. |
| `category_id` | `bigint` | `NOT NULL REFERENCES categories(id)` | Основная категория товара (из дерева категорий). |
| `kotmatros_product_id` | `bigint` | `UNIQUE` | ID товара в Kotmatros (для синхронизации). |
| `animal_type` | `animal_type` | `NOT NULL CHECK (animal_type IN ('cat','dog','all'))` | Для какого животного предназначен товар. |
| `life_stage` | `life_stage` | `NOT NULL DEFAULT 'all' CHECK (life_stage IN ('kitten','puppy','adult','senior','all'))` | Возрастная группа (если применимо). |
| `breed_id` | `bigint` | `REFERENCES breeds(id)` | Порода, если товар предназначен для конкретной породы. |
| `description` | `text` |  | Описание товара для карточки. |
| `completeness` | `food_completeness` | `CHECK (completeness IN ('complete','complimentary'))` | Полнорационный/дополнительный (для кормов). |
| `country_of_origin` | `text` |  | Страна производства. |
| `main_image_url` | `text` |  | Основное изображение для витрины (кэш для быстрого списка). |
| `rating` | `numeric(2,1)` | `DEFAULT 0 CHECK (rating BETWEEN 0 AND 5)` | Денормализованный средний рейтинг товара. |
| `rating_count` | `integer` | `DEFAULT 0 CHECK (rating_count >= 0)` | Количество отзывов (денормализовано). |
| `order_count` | `integer` | `DEFAULT 0 CHECK (order_count >= 0)` | Счётчик заказов (для сортировки «Хиты продаж»). |
| `price` | `numeric(12,2)` | `CHECK (price >= 0)` | Цена из default-варианта (денормализовано для каталога). |
| `compare_price` | `numeric(12,2)` | `CHECK (compare_price >= 0)` | Старая цена из default-варианта (для отображения скидки). |
| `meta_title` | `text` |  | SEO-заголовок для `<title>` страницы. |
| `meta_description` | `text` |  | SEO-описание для мета-тега description. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активной продажи. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата создания карточки. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата последнего обновления карточки. |

### `product_variants`
SKU-варианты товара (цена, остаток, упаковка, вес и т.п.).

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор SKU. |
| `product_id` | `bigint` | `NOT NULL REFERENCES products(id)` | Связь с карточкой товара. |
| `kotmatros_variant_id` | `bigint` | `UNIQUE` | ID SKU в Kotmatros (для синхронизации). |
| `name` | `text` |  | Название вариации для отображения («2 кг», «Курица», «Размер M»). |
| `price_regular` | `numeric(12,2)` | `NOT NULL CHECK (price_regular >= 0)` | Базовая цена. |
| `price_discount` | `numeric(12,2)` | `CHECK (price_discount >= 0)` | Цена со скидкой (если есть). |
| `currency` | `currency_code` | `NOT NULL DEFAULT 'RUB' CHECK (currency IN ('RUB'))` | Валюта цены. |
| `in_stock` | `boolean` | `NOT NULL DEFAULT true` | Признак наличия. |
| `stock_qty` | `integer` | `CHECK (stock_qty >= 0)` | Остаток на складе (если доступен). |
| `package_type` | `package_type` | `CHECK (package_type IN ('bag','can','pouch','tray','box','other'))` | Тип упаковки (пакет/банка/пауч и т.д.). |
| `net_weight_g` | `integer` | `CHECK (net_weight_g > 0)` | Вес нетто (в граммах). |
| `weight_display` | `text` |  | Вес для отображения («400 г», «2 кг», «10 кг»). |
| `volume_ml` | `integer` | `CHECK (volume_ml > 0)` | Объем (в мл), если актуально. |
| `volume_display` | `text` |  | Объём для отображения («250 мл», «1 л»). |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Порядок отображения вариаций. |
| `is_default` | `boolean` | `NOT NULL DEFAULT false` | Вариация по умолчанию (цена в карточке каталога). |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности SKU. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата обновления SKU. |

### `product_categories`
Дополнительные категории для товара (многие-ко-многим).

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `product_id` | `bigint` | `NOT NULL REFERENCES products(id)` | Товар. |
| `category_id` | `bigint` | `NOT NULL REFERENCES categories(id)` | Категория. |
| `PRIMARY KEY` |  | `(product_id, category_id)` | Уникальная связь товар–категория. |

### `categories`
Дерево категорий магазина.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор категории. |
| `parent_id` | `bigint` | `REFERENCES categories(id)` | Родительская категория. |
| `code` | `text` | `UNIQUE NOT NULL` | Технический код категории (например `food.dry`). |
| `slug` | `text` | `UNIQUE NOT NULL` | URL-имя категории для SEO-friendly ссылок. |
| `name` | `text` | `NOT NULL` | Отображаемое название категории. |
| `kotmatros_category_id` | `bigint` | `UNIQUE` | ID категории в Kotmatros (для синхронизации). |
| `icon` | `text` |  | Иконка категории (emoji или класс иконки). |
| `image_url` | `text` |  | Изображение категории (для баннеров). |
| `product_count` | `integer` | `DEFAULT 0 CHECK (product_count >= 0)` | Количество товаров (денормализовано для меню). |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Порядок отображения в дереве. |
| `show_in_menu` | `boolean` | `NOT NULL DEFAULT true` | Показывать ли категорию в меню. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности. |

### `brands`
Справочник брендов.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор бренда. |
| `slug` | `text` | `UNIQUE NOT NULL` | URL-имя бренда для SEO-friendly ссылок. |
| `name` | `text` | `UNIQUE NOT NULL` | Название бренда. |
| `logo_url` | `text` |  | URL логотипа бренда. |
| `country` | `text` |  | Страна бренда (если нужна аналитика). |
| `description` | `text` |  | Описание бренда. |
| `brand_class` | `brand_class` | `CHECK (brand_class IN ('economy','premium','super_premium','holistic'))` | Класс бренда (для рекомендаций и фильтров). |
| `priority` | `smallint` | `DEFAULT 5 CHECK (priority BETWEEN 1 AND 10)` | Приоритет бренда для рекомендаций (1–10). |
| `product_count` | `integer` | `DEFAULT 0 CHECK (product_count >= 0)` | Количество товаров бренда (денормализовано). |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности. |

### `product_images`
Галерея изображений товаров.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор изображения. |
| `product_id` | `bigint` | `NOT NULL REFERENCES products(id)` | Карточка товара. |
| `variant_id` | `bigint` | `REFERENCES product_variants(id)` | Привязка к SKU (если фото вариативное). |
| `url` | `text` | `NOT NULL` | Ссылка на изображение. |
| `type` | `image_type` | `NOT NULL DEFAULT 'other' CHECK (type IN ('main','pack','composition','nutrition_table','other'))` | Тип изображения (main/pack/etc.). |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Порядок в галерее. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности. |

### `attributes`
Справочник атрибутов для вариантов (цвет, размер, вкус и т.д.).

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор атрибута. |
| `code` | `text` | `UNIQUE NOT NULL` | Технический код (`color`, `size`, `flavor`). |
| `name` | `text` | `NOT NULL` | Название атрибута. |
| `value_type` | `attribute_value_type` | `NOT NULL CHECK (value_type IN ('string','number','boolean','enum'))` | Тип значения (string/number/boolean/enum). |
| `unit` | `text` |  | Единица измерения, если применимо. |
| `is_multi` | `boolean` | `NOT NULL DEFAULT false` | Можно ли хранить несколько значений. |
| `is_filterable` | `boolean` | `NOT NULL DEFAULT true` | Доступен ли атрибут в фильтрах. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности. |

### `attribute_values`
Справочник значений атрибутов.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор значения. |
| `attribute_id` | `bigint` | `NOT NULL REFERENCES attributes(id)` | Атрибут. |
| `value` | `text` | `NOT NULL` | Техническое значение (`red`, `chicken`). |
| `display` | `text` |  | Отображаемое значение (если отличается). |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Порядок в фильтрах/списках. |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности. |
| `UNIQUE` |  | `(attribute_id, value)` | Уникальность значения в рамках атрибута. |

### `variant_attribute_values`
Связь значений атрибутов с SKU.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `variant_id` | `bigint` | `NOT NULL REFERENCES product_variants(id)` | SKU. |
| `attribute_value_id` | `bigint` | `NOT NULL REFERENCES attribute_values(id)` | Значение атрибута. |
| `PRIMARY KEY` |  | `(variant_id, attribute_value_id)` | Уникальная связь SKU–значение. |

### `food_details`
Детали корма и данные для подбора питания. Хранится по карточке товара.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `product_id` | `bigint` | `PRIMARY KEY REFERENCES products(id)` | Карточка товара, 1:1 с кормом. |
| `product_type` | `food_product_type` | `NOT NULL CHECK (product_type IN ('food','treat','supplement'))` | Тип корма: корм/лакомство/добавка. |
| `target_size` | `breed_size` | `CHECK (target_size IN ('toy','small','medium','large','giant','all'))` | Целевой размер (важно для собак). |
| `grain_free` | `boolean` |  | Признак беззернового. |
| `is_hypoallergenic` | `boolean` |  | Признак гипоаллергенного корма. |
| `is_veterinary` | `boolean` |  | Признак лечебной/ветеринарной диеты. |
| `special_diet` | `special_diet[]` | `CHECK (special_diet <@ ARRAY['sterilized','hypoallergenic','sensitive_digestion','weight_control','grain_free','urinary','kidney_support','joint_support','gastrointestinal','skin_coat']::text[])` | Специальные назначения (массив enum). |
| `compatibility_group` | `text` | `CHECK (compatibility_group IN ('regular','hypoallergenic','therapeutic_renal','therapeutic_diabetic','therapeutic_digestive','therapeutic_weight','therapeutic_urinary'))` | Группа совместимости (для мультипитания). |
| `activity_level` | `activity_level` | `CHECK (activity_level IN ('low','normal','high'))` | Уровень активности. |
| `kibble_size` | `kibble_size` | `CHECK (kibble_size IN ('small','medium','large'))` | Размер гранулы (если указан). |
| `shelf_life_months` | `integer` |  | Срок годности. |
| `storage` | `text` |  | Условия хранения. |
| `meat_percent` | `numeric(5,2)` | `CHECK (meat_percent >= 0)` | Процент мяса (если есть на упаковке). |
| `energy_kcal_per_100g` | `numeric(6,2)` | `CHECK (energy_kcal_per_100g >= 0)` | Калорийность на 100 г. |
| `protein_g_per_100g` | `numeric(6,2)` | `CHECK (protein_g_per_100g >= 0)` | Белки на 100 г. |
| `fat_g_per_100g` | `numeric(6,2)` | `CHECK (fat_g_per_100g >= 0)` | Жиры на 100 г. |
| `carbs_g_per_100g` | `numeric(6,2)` | `CHECK (carbs_g_per_100g >= 0)` | Углеводы на 100 г. |
| `fiber_g_per_100g` | `numeric(6,2)` | `CHECK (fiber_g_per_100g >= 0)` | Клетчатка на 100 г. |
| `ash_g_per_100g` | `numeric(6,2)` | `CHECK (ash_g_per_100g >= 0)` | Зола на 100 г. |
| `moisture_percent` | `numeric(5,2)` | `CHECK (moisture_percent BETWEEN 0 AND 100)` | Влажность, %. |
| `ingredients` | `text[]` |  | Список ингредиентов (для исключений и аллергий). |
| `allergens` | `text[]` |  | Список аллергенов (для строгого исключения). |
| `health_conditions` | `text[]` |  | Показания/назначения (например urinary, digestive). |
| `age_min_months` | `integer` |  | Минимальный возраст (мес). |
| `age_max_months` | `integer` |  | Максимальный возраст (мес). |

### `wishlists`
Избранные товары пользователей.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор записи. |
| `user_id` | `uuid` | `NOT NULL REFERENCES users(id)` | Пользователь. |
| `product_id` | `bigint` | `NOT NULL REFERENCES products(id)` | Товар. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата добавления. |
| `UNIQUE` |  | `(user_id, product_id)` | Один товар — одна запись на пользователя. |

### `promotions`
Промокоды и акции.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор акции. |
| `code` | `text` | `UNIQUE NOT NULL` | Промокод (например `SUMMER2024`). |
| `name` | `text` | `NOT NULL` | Название акции для админки. |
| `description` | `text` |  | Описание акции для пользователя. |
| `discount_type` | `discount_type` | `NOT NULL CHECK (discount_type IN ('percent','fixed','free_shipping'))` | Тип скидки. |
| `discount_value` | `numeric(12,2)` | `NOT NULL CHECK (discount_value >= 0)` | Размер скидки (% или сумма). |
| `min_order_amount` | `numeric(12,2)` | `CHECK (min_order_amount >= 0)` | Минимальная сумма заказа для применения. |
| `max_discount_amount` | `numeric(12,2)` | `CHECK (max_discount_amount >= 0)` | Максимальная сумма скидки (для %). |
| `max_uses` | `integer` |  | Максимальное количество использований (NULL = безлимит). |
| `max_uses_per_user` | `integer` | `DEFAULT 1` | Максимум использований одним пользователем. |
| `uses_count` | `integer` | `DEFAULT 0 CHECK (uses_count >= 0)` | Текущее количество использований. |
| `applies_to` | `promo_target` | `NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','category','brand','product'))` | К чему применяется. |
| `target_ids` | `bigint[]` |  | ID категорий/брендов/товаров (если applies_to != 'all'). |
| `starts_at` | `timestamptz` |  | Дата начала акции (NULL = сразу). |
| `ends_at` | `timestamptz` |  | Дата окончания акции (NULL = бессрочно). |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Признак активности. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата создания. |

### `promotion_usages`
История использования промокодов.

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор записи. |
| `promotion_id` | `bigint` | `NOT NULL REFERENCES promotions(id)` | Промокод. |
| `user_id` | `uuid` | `NOT NULL REFERENCES users(id)` | Пользователь. |
| `order_id` | `text` | `NOT NULL REFERENCES orders(id)` | Заказ, к которому применён. |
| `discount_amount` | `numeric(12,2)` | `NOT NULL CHECK (discount_amount >= 0)` | Фактическая сумма скидки. |
| `used_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата использования. |

### `price_history`
История изменения цен (для аналитики и отображения «было/стало»).

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор записи. |
| `variant_id` | `bigint` | `NOT NULL REFERENCES product_variants(id)` | Вариант товара. |
| `price_regular` | `numeric(12,2)` | `NOT NULL CHECK (price_regular >= 0)` | Базовая цена на момент записи. |
| `price_discount` | `numeric(12,2)` | `CHECK (price_discount >= 0)` | Цена со скидкой на момент записи. |
| `recorded_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Дата фиксации цены. |

### `product_relations`
Связи между товарами (похожие, сопутствующие, апселл).

| Поле | Тип | Ограничения | Описание |
| --- | --- | --- | --- |
| `id` | `bigint` | `PRIMARY KEY` | Идентификатор связи. |
| `product_id` | `bigint` | `NOT NULL REFERENCES products(id)` | Основной товар. |
| `related_product_id` | `bigint` | `NOT NULL REFERENCES products(id)` | Связанный товар. |
| `relation_type` | `relation_type` | `NOT NULL CHECK (relation_type IN ('similar','complementary','upsell','cross_sell'))` | Тип связи. |
| `score` | `numeric(5,2)` | `DEFAULT 0` | Вес связи (для сортировки). |
| `is_auto` | `boolean` | `NOT NULL DEFAULT false` | Автоматически сгенерировано (ML) или вручную. |
| `sort_order` | `integer` | `NOT NULL DEFAULT 0` | Порядок отображения. |
| `UNIQUE` |  | `(product_id, related_product_id, relation_type)` | Уникальность связи. |

## Enum-значения

### `animal_type`
- `cat` — кошка
- `dog` — собака
- `all` — универсально

### `brand_class`
- `economy` — эконом-класс
- `premium` — премиум
- `super_premium` — супер-премиум
- `holistic` — холистик

### `life_stage`
- `kitten` — котенок
- `puppy` — щенок
- `adult` — взрослый
- `senior` — пожилой
- `all` — все возраста

### `breed_size`
- `toy`, `small`, `medium`, `large`, `giant`, `all`

### `food_completeness`
- `complete` — полнорационный
- `complimentary` — дополнительный

### `food_product_type`
- `food` — корм
- `treat` — лакомство
- `supplement` — витамины/добавки

### `package_type`
- `bag`, `can`, `pouch`, `tray`, `box`, `other`

### `image_type`
- `main`, `pack`, `composition`, `nutrition_table`, `other`

### `currency_code`
- `RUB`

### `kibble_size`
- `small`, `medium`, `large`

### `activity_level`
- `low`, `normal`, `high`

### `special_diet`
- `sterilized`
- `hypoallergenic`
- `sensitive_digestion`
- `weight_control`
- `grain_free`
- `urinary`
- `kidney_support`
- `joint_support`
- `gastrointestinal`
- `skin_coat`

### `attribute_value_type`
- `string`
- `number`
- `boolean`
- `enum`

### `discount_type`
- `percent` — процент от суммы
- `fixed` — фиксированная сумма
- `free_shipping` — бесплатная доставка

### `promo_target`
- `all` — вся корзина
- `category` — конкретные категории
- `brand` — конкретные бренды
- `product` — конкретные товары

### `relation_type`
- `similar` — похожие товары
- `complementary` — сопутствующие («с этим покупают»)
- `upsell` — более дорогая альтернатива
- `cross_sell` — перекрёстные продажи

## CHECK-ограничения (контроль допустимых значений)

В PostgreSQL есть два равнозначных подхода:
1) `ENUM` типы (перечислены выше) — самый строгий и читаемый вариант.
2) `CHECK` ограничения — гибко, можно применять к любому текстовому полю.

Ниже — примеры CHECK-ограничений для ключевых полей, если решим не вводить
отдельные `ENUM` типы:

- `products.animal_type`: `CHECK (animal_type IN ('cat','dog','all'))`
- `products.life_stage`: `CHECK (life_stage IN ('kitten','puppy','adult','senior','all'))`
- `products.breed_size`: `CHECK (breed_size IN ('toy','small','medium','large','giant','all'))`
- `products.completeness`: `CHECK (completeness IN ('complete','complimentary'))`

- `product_variants.currency`: `CHECK (currency IN ('RUB'))`
- `product_variants.package_type`: `CHECK (package_type IN ('bag','can','pouch','tray','box','other'))`

- `product_images.type`: `CHECK (type IN ('main','pack','composition','nutrition_table','other'))`

- `attributes.value_type`: `CHECK (value_type IN ('string','number','boolean','enum'))`

- `brands.brand_class`: `CHECK (brand_class IN ('economy','premium','super_premium','holistic'))`
- `brands.priority`: `CHECK (priority BETWEEN 1 AND 10)`

- `food_details.product_type`: `CHECK (product_type IN ('food','treat','supplement'))`
- `food_details.activity_level`: `CHECK (activity_level IN ('low','normal','high'))`
- `food_details.kibble_size`: `CHECK (kibble_size IN ('small','medium','large'))`
- `food_details.special_diet`: `CHECK (special_diet <@ ARRAY[
  'sterilized','hypoallergenic','sensitive_digestion','weight_control',
  'grain_free','urinary','kidney_support','joint_support','gastrointestinal',
  'skin_coat'
]::text[])`

Дополнительно можно поставить диапазонные CHECK:
- `net_weight_g > 0`, `volume_ml > 0`, `price_regular >= 0`
- нутриенты на 100 г `>= 0`, влажность `BETWEEN 0 AND 100`

## Связи между таблицами

### Каталог товаров
- `products.category_id` → `categories.id` (основная категория товара).
- `products.brand_id` → `brands.id` (бренд товара).
- `products.breed_id` → `breeds.id` (порода, если товар для конкретной породы).
- `product_categories` связывает `products` и `categories` (дополнительные категории).
- `product_variants.product_id` → `products.id` (товар–SKU).
- `product_images.product_id` → `products.id` (галерея товара).
- `product_images.variant_id` → `product_variants.id` (вариативные фото).
- `food_details.product_id` → `products.id` (1:1, только для кормов/лакомств/добавок).
- `product_relations` — связи между товарами (similar, upsell и т.д.).

### Атрибуты
- `attributes` → `attribute_values` (справочник значений).
- `variant_attribute_values` связывает `product_variants` и `attribute_values`.

### Пользовательские данные
- `wishlists.user_id` → `users.id` (избранное пользователя).
- `wishlists.product_id` → `products.id` (товар в избранном).

### Промо-акции
- `promotions` — справочник промокодов.
- `promotion_usages.promotion_id` → `promotions.id`.
- `promotion_usages.user_id` → `users.id`.
- `promotion_usages.order_id` → `orders.id`.

### История цен
- `price_history.variant_id` → `product_variants.id`.

## Примечания по хранению состава и нутриентов

- Нутриенты (БЖУ, калорийность, влажность) вынесены в отдельные числовые поля.
- Состав/витамины/минералы/добавки/нормы хранятся в `jsonb` массивах, чтобы
  не плодить много таблиц на старте. При росте требований их можно вынести
  в отдельные таблицы и связать по `product_id`.

## Денормализованные поля (счётчики, рейтинги, цены)

Для оптимизации производительности каталога денормализованы следующие поля:

| Таблица | Поле | Как обновляется |
| --- | --- | --- |
| `products` | `price`, `compare_price` | Триггер при изменении default-варианта или его цены. |
| `products` | `rating`, `rating_count` | Триггер/cron после добавления/изменения отзывов. |
| `products` | `order_count` | Триггер/cron после успешного заказа. |
| `categories` | `product_count` | Триггер/cron при добавлении/удалении товаров. |
| `brands` | `product_count` | Триггер/cron при добавлении/удалении товаров. |
| `promotions` | `uses_count` | Триггер при создании `promotion_usages`. |

**Важно:**
- При изменении связей (category_id, brand_id) необходимо пересчитывать счётчики.
- При изменении `is_default` у вариантов — пересчитать `price`/`compare_price` в `products`.
- При изменении цен у default-варианта — записать в `price_history` и обновить `products`.
