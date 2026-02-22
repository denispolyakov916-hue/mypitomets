# ТЗ на выгрузку данных по кормам (Kotmatros)

## 1. Контекст и цель
Мы строим единое хранилище товаров для магазина и сервиса персонализированного подбора питания. 
Нужен один выгрузочный файл по кормам, лакомствам и добавкам, чтобы считать персонализацию (подбор корма по возрасту/размеру/составу/ограничениям).

## 2. Общие требования
- Один файл `kotmatros_food_export.jsonl`.
- Формат JSON Lines: **1 строка = 1 SKU**.
- Кодировка UTF-8.
- Все числовые значения в стандартных единицах (граммы, ккал/100г).
- Если данных нет — ставить `null` или пустой массив.

## 3. Категории (ID)
Выгружаем **все** товары из:
- **[2137] Корм (кошки)**
- **[2140] Лакомства (кошки)**
- **[2141] Витамины и добавки (кошки)**
- **[2132] Корм (собаки)**
- **[2138] Лакомства (собаки)**
- **[2139] Витамины и добавки (собаки)**
- **[2346] Правильное питание для щенка**
- **[2345] Правильное питание для котенка**

## 4. Описание записи (полное, по нашим сущностям)
Ниже — **максимально полный набор** по каждому SKU. Если данных нет, передавайте `null` или пустые массивы.
Если значение указано на упаковке, оно имеет приоритет над данными из внутренних полей.
Отличия SKU фиксируются только по двум осям: **вес** и **вкус**.

### 4.1 Product (карточка товара)
- `product_id` (string) — идентификатор карточки товара (общий для всех SKU).
- `product_title` (string) — название товара в витрине (как на сайте/упаковке).
- `brand` (string) — бренд на упаковке.
- `manufacturer` (string|null) — производитель (если отличается от бренда).
- `category_id` (int) — ID категории из дерева Kotmatros.
- `category_name` (string) — название категории.
- `subcategory_path` (array of string) — путь до подкатегории, например: `["Корм","Сухой"]` (из структуры каталога).
- `product_type` (enum) — тип товара.
  - `food` — корм.
  - `treat` — лакомство.
  - `supplement` — витамины/добавки.
- `animal_type` (enum) — для какого животного.
  - `cat` — кошки.
  - `dog` — собаки.
- `life_stage` (enum) — возрастная группа.
  - `kitten` — котенок.
  - `puppy` — щенок.
  - `adult` — взрослый.
  - `senior` — пожилой.
  - `all` — для всех возрастов.
- `breed` (string|null) — порода, если корм для конкретной породы (иначе `null`).
- `breed_size` (enum|null) — размер животного.
  - `toy`, `small`, `medium`, `large`, `giant` — размеры.
  - `all` — универсальный размер.
  - `null` — не указан.
- `description` (string|null) — описание с сайта/упаковки, если есть.
- `completeness` (enum) — полнорационный/дополнительный.
  - `complete` — полнорационный (complete).
  - `complimentary` — дополнительный (complimentary).
- `country_of_origin` (string|null) — страна производства.
- `images` (array of object) — галерея изображений товара.
  - `url` (string) — ссылка на файл.
  - `type` (enum) — тип изображения:
    - `main` — главное.
    - `pack` — упаковка.
    - `composition` — состав/ингредиенты.
    - `nutrition_table` — таблица нутриентов.
    - `other` — другое.
- `is_active` (boolean) — признак, что товар активен в продаже.
- `updated_at` (ISO-8601) — дата/время последнего обновления записи.

#### 4.1.1 Как определять `life_stage` (по упаковке)
Если возраст указан на упаковке текстом или диапазоном, маппить так:

Кошки:
- `kitten`: 0–12 мес (надписи: Kitten, Junior, до 12 месяцев, 0-12).
- `adult`: 12–84 мес (надписи: Adult, Adult 1+, 1-7 лет).
- `senior`: 84+ мес (надписи: Senior, 7+, 8+, 10+).
- `all`: если прямо указано "для всех возрастов"/"all life stages".

Собаки:
- `puppy`: 0–12(18) мес (надписи: Puppy, Junior, Growth, до 12/18 мес).
- `adult`: 12(18)–84 мес (надписи: Adult, Adult 1+, 1-7 лет).
- `senior`: 84+ мес (надписи: Senior, Mature 7+, 8+, 10+).
- `all`: если прямо указано "для всех возрастов"/"all life stages".

Если возраст не указан — `life_stage = "all"` и заполнить `age_range_months = null`.

### 4.2 SKU (торговая позиция)
- `sku_id` (string) — ID конкретной позиции (вес/упаковка/вариант).
- `product_id` (string) — связь с карточкой товара.
- `barcode` (string|null) — штрихкод (если есть).
- `variant_axis` (array of enum) — по каким осям отличается данный SKU.
  - `weight` — вес/объем.
  - `flavor` — вкус/основной белок.
- `variant_values` (object) — фактические значения отличий.
  - `weight_g` (number) — вес/объем в граммах.
  - `flavor` (array of string) — вкусы/основные ингредиенты.
- `flavor` (array of string) — вкусы/основные ингредиенты для поиска (например: "курица", "лосось").
- `package.net_weight_g` (number) — вес нетто в граммах (если на упаковке в кг — переводить в г).
- `package.unit` (enum) — единица упаковки.
  - `g` — граммы, `kg` — килограммы, `ml` — миллилитры.
- `package.package_type` (enum) — тип упаковки.
  - `bag` — пакет.
  - `can` — банка.
  - `pouch` — пауч.
  - `tray` — лоток.
  - `box` — коробка.
  - `other` — другой тип.
- `storage` (string|null) — условия хранения (текст).
- `shelf_life_months` (number|null) — срок годности в месяцах.
- `kibble_size` (enum|null) — размер гранулы.
  - `small`, `medium`, `large`.
- `price` (object) — цена SKU.
  - `regular` (number) — обычная цена.
  - `discount` (number|null) — цена со скидкой, если есть.
  - `currency` (string) — валюта, всегда `RUB`.
- `stock` (object|null) — наличие/остатки (если есть).
  - `in_stock` (boolean) — в наличии.
  - `quantity` (number|null) — остаток, если доступен.

### 4.3 Nutrition (БЖУ и энергетика, на 100 г)
- `nutrition.energy_kcal_per_100g` (number) — калорийность.
- `nutrition.protein_g_per_100g` (number) — белки.
- `nutrition.fat_g_per_100g` (number) — жиры.
- `nutrition.carbs_g_per_100g` (number) — углеводы.
- `nutrition.fiber_g_per_100g` (number) — клетчатка.
- `nutrition.ash_g_per_100g` (number) — зола.
- `nutrition.moisture_percent` (number) — влажность, %.
- `meat_percent` (number|null) — процент мяса, если указан на упаковке.

### 4.4 Ingredients (состав)
`ingredients[]`:
- `name` (string) — ингредиент.
- `percent` (number) — доля в процентах (обязательна).
- `order` (int) — порядок в списке состава (1 — первый по убыванию).
- `group` (enum) — тип ингредиента.
  - `animal_protein` — животный белок.
  - `plant` — растительное сырье.
  - `fat` — жиры/масла.
  - `vitamin` — витаминные компоненты.
  - `mineral` — минеральные компоненты.
  - `other` — прочее.
`composition_groups[]` — состав по группам (как на упаковке).
- `name` (string) — группа ингредиентов (например, "мясо и субпродукты", "злаки").
- `percent` (number) — доля группы в процентах.

### 4.5 Vitamins / Minerals / Additives
`vitamins[]`, `minerals[]`, `additives[]`:
- `name` (string) — наименование вещества.
- `value` (number) — числовое значение.
- `unit` (string) — единица измерения (IU, mg, mcg и т.д.), как на упаковке.
Примеры основных витаминов/минералов: A, D3, E, Zn, Fe, Cu, Se, I.

### 4.6 Feeding Guidelines (нормы)
`feeding_guidelines[]`:
- `weight_kg` (number) — вес животного в кг.
- `daily_g` (number) — суточная норма в граммах.
- `notes` (string|null) — комментарий (например, возраст/активность).
Также допускается текстовое поле:
- `feeding_guidelines_text` (string|null) — полный текст нормы с упаковки для последующего парсинга.
Дополнительно (если на упаковке есть разбивка по возрасту/активности):
- `feeding_guidelines_by_activity[]`:
  - `life_stage` (enum) — возрастная группа.
  - `activity_level` (enum) — уровень активности.
  - `weight_kg` (number)
  - `daily_g` (number)

### 4.7 Для персонализации (обязательно)
- `special_diet[]` (array of enum) — специальные назначения, включая показания/состояния.
  - `sterilized` — для стерилизованных/кастрированных.
  - `hypoallergenic` — гипоаллергенный.
  - `sensitive_digestion` — чувствительное пищеварение.
  - `weight_control` — контроль веса.
  - `grain_free` — беззерновой (если нет отдельного флага).
  - `urinary` — поддержка мочевыделительной системы.
  - `kidney_support` — поддержка почек.
  - `joint_support` — поддержка суставов.
  - `gastrointestinal` — поддержка ЖКТ.
  - `skin_coat` — кожа/шерсть.
- `activity_level` (enum|null) — уровень активности.
  - `low`, `normal`, `high`.
- `grain_free` (boolean|null) — признак беззернового корма.
- `age_range_months` (object|null) — возрастной диапазон.
  - `min` (number), `max` (number).

#### 4.8 Как определять enum-значения (краткие правила)
- `product_type`: берется из категории/подкатегории (корм/лакомства/добавки).
- `animal_type`: по назначению на упаковке (для кошек/для собак).
- `life_stage`: по возрастным указаниям на упаковке (см. 4.1.1).
- `breed_size`: по словам на упаковке (Toy/Small/Medium/Large/Giant) или универсальный.
- `completeness`: по маркировке "полнорационный/дополнительный".
- `package.package_type`: по типу упаковки (пакет/банка/пауч/лоток/коробка).
- `kibble_size`: по указанию размера гранул (small/medium/large) или `null`.
- `variant_axis`: фиксируем только `weight` и `flavor`.
- `images.type`: по назначению изображения (главное/упаковка/состав/таблица нутриентов).
- `special_diet`: по указаниям на упаковке (стерилизованные, гипоаллергенный и т.д.).
- `activity_level`: по указаниям на упаковке (низкая/нормальная/высокая активность).

## 5. Правила заполнения
- Все нутриенты указывать **на 100 г** (если иначе — явно добавить комментарий в `notes`).
- Проценты состава обязательны для каждого ингредиента.
- Если товар универсален — `life_stage = "all"`, `breed = null`, `breed_size = "all"`.

## 6. Проверка качества данных перед передачей
- Нет пустых строк в JSONL.
- У каждой записи есть `product_id`, `sku_id`, `category_id`, `animal_type`, `product_type`.
- `package.net_weight_g` заполнен, если это корм/лакомство.
- Для `food` заполнены `nutrition` и `ingredients`.
- Для `ingredients` заполнены `percent`.
- Для каждой записи заполнен `price.regular` и `price.currency = "RUB"`.

## 7. Минимальные требования по подкатегориям
### 7.1 Корм (сухой/влажный/консервы/паучи/паштет)
- `product_type = "food"`
- Полный `nutrition` + `ingredients` обязательны.

### 7.2 Лакомства
- `product_type = "treat"`
- Обязательны `ingredients`, `flavor`, `nutrition` (если есть).

### 7.3 Витамины и добавки
- `product_type = "supplement"`
- Обязательны `ingredients` и `vitamins/additives`.
- `nutrition` можно пустым, если нет калорийности.

## 8. Пример записи (максимальный)
```json
{
  "product_id": "CAT-DRY-01",
  "sku_id": "CAT-DRY-400-01",
  "category_id": 2137,
  "category_name": "Корм",
  "subcategory_path": ["Корм", "Сухой"],
  "product_type": "food",
  "animal_type": "cat",
  "life_stage": "adult",
  "breed": null,
  "breed_size": "all",
  "product_title": "Корм сухой для кошек с курицей",
  "brand": "BrandX",
  "manufacturer": "BrandX Factory",
  "completeness": "complete",
  "variant_axis": ["weight", "flavor"],
  "variant_values": { "weight_g": 400, "flavor": ["курица"] },
  "flavor": ["курица"],
  "package": { "net_weight_g": 400, "unit": "g", "package_type": "bag" },
  "kibble_size": "medium",
  "shelf_life_months": 12,
  "price": { "regular": 499, "discount": 449, "currency": "RUB" },
  "stock": { "in_stock": true, "quantity": 120 },
  "nutrition": { "energy_kcal_per_100g": 380, "protein_g_per_100g": 30, "fat_g_per_100g": 12, "carbs_g_per_100g": 35, "fiber_g_per_100g": 3, "ash_g_per_100g": 7, "moisture_percent": 10 },
  "meat_percent": 30,
  "ingredients": [
    { "name": "курица", "percent": 30, "order": 1, "group": "animal_protein" }
  ],
  "composition_groups": [
    { "name": "мясо и субпродукты", "percent": 45 },
    { "name": "злаки", "percent": 25 }
  ],
  "vitamins": [{ "name": "A", "value": 15000, "unit": "IU" }],
  "minerals": [{ "name": "Zn", "value": 120, "unit": "mg" }],
  "additives": [{ "name": "таурин", "value": 1000, "unit": "mg" }],
  "feeding_guidelines": [{ "weight_kg": 4, "daily_g": 60, "notes": null }],
  "feeding_guidelines_by_activity": [
    { "life_stage": "adult", "activity_level": "normal", "weight_kg": 4, "daily_g": 60 }
  ],
  "feeding_guidelines_text": "4 кг — 60 г/сутки, нормальная активность",
  "special_diet": ["sterilized"],
  "activity_level": "normal",
  "grain_free": false,
  "age_range_months": { "min": 12, "max": 84 },
  "images": [
    { "url": "https://.../cat-dry-400.jpg", "type": "main" },
    { "url": "https://.../cat-dry-400-pack.jpg", "type": "pack" },
    { "url": "https://.../cat-dry-400-ingredients.jpg", "type": "composition" },
    { "url": "https://.../cat-dry-400-back.jpg", "type": "nutrition_table" }
  ],
  "description": "Полнорационный корм...",
  "storage": "Хранить в сухом месте",
  "barcode": "1234567890123",
  "country_of_origin": "RU",
  "is_active": true,
  "updated_at": "2026-01-29T00:00:00Z"
}
```
