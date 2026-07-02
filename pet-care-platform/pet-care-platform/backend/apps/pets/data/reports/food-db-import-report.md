# Отчёт импорта базы кормов (dry-run)

- Файл: `/app/fooddump.sql`
- Режим: DRY-RUN (запись в БД не выполняется)
- Блокирующих проблем: **0**

## Строки в дампе

| Таблица | Строк | Создано (нов.) | Обновлено (сущ.) |
|---|---:|---:|---:|
| suppliers | 1 | 0 | 1 |
| food_recipes | 1397 | 8 | 1389 |
| supplier_offers | 2194 | 314 | 1880 |
| supplier_raw_items | 1583 | 1 | 1582 |
| food_brand_rules | 0 | 0 | 0 |

## Проверки

| Проверка | Итог | Кол-во | Детали |
|---|---|---:|---|
| food_recipes: дубли recipe_key | ⚠️ warning | 254 | derevenskie-lakomstva|повседневная линейка|курица|treat, darsi|повседневная линейка|печень|dry, best-dinner-vet-profi|vet profi|телятина|wet, pro-plan|nutri savour|говядина|wet, best-dinner-vet-profi|… |
| supplier_offers: дубли (supplier+article) | ✅ ok | 0 |  |
| food_recipes: без офферов | ⚠️ warning | 4 |  |
| supplier_offers: без рецепта | ⚠️ warning | 246 |  |
| supplier_offers: без цены | ✅ ok | 0 |  |
| supplier_offers: без веса | ⚠️ warning | 190 |  |
| supplier_offers: in_stock=true без цены/веса (не продаётся) | ⚠️ warning | 103 | abcff70a-f3a1-5397-9b41-403c561076ee, 6f903b35-a207-5264-acb9-02555848e3ac, 9a3416bd-dfdf-520d-9531-989a4fd05cd7, 2e53182b-f99b-5bbe-95c8-318555341771, b9084619-f557-5377-be09-a83183e6d3c9 … (+98) |
| food_recipes: без species | ✅ ok | 0 |  |
| food_recipes: без food_form | ✅ ok | 0 |  |
| food_recipes: без kcal_per_100g | ⚠️ warning | 726 |  |
| food_recipes.species: нестандартные значения → нормализуется в other при импорте | ⚠️ warning | 9 | ('34c307c6-ddcf-5a6e-b471-034158750604', 'bird'), ('d46ad565-5ff4-5e94-a3a1-63fb9daed3df', 'rodent'), ('87830124-3742-5f5a-9387-36f577385496', 'rodent'), ('06a3c482-4693-79a7-8000-ecfb5bbe9da4', 'bird… |
| food_recipes.food_form: нестандартные значения | ✅ ok | 0 |  |
| food_recipes.parse_status: нестандартные значения | ✅ ok | 0 |  |
| food_recipes.review_status: нестандартные значения | ✅ ok | 0 |  |
| suppliers.supplier_type: нестандартные значения | ✅ ok | 0 |  |
| suppliers.payment_model: нестандартные значения | ✅ ok | 0 |  |
| suppliers.settlement_model: нестандартные значения | ✅ ok | 0 |  |
| food_recipes.field_confidence: битый JSON | ✅ ok | 0 |  |
| supplier_raw_items.raw_json: битый JSON | ✅ ok | 0 |  |
| supplier_offers.raw: битый JSON | ✅ ok | 0 |  |

## Как воронка сходится (1583 сырья → рецепты/офферы)

- `supplier_raw_items` — сырьё Динозаврика как пришло из выгрузки.
- Часть сырья — не корма (игрушки и т.п.), поэтому рецептов меньше, чем сырья.
- Один `FoodRecipe` = много `SupplierOffer` (фасовок), поэтому офферов больше, чем рецептов.
- В подбор/магазин пойдут только рецепты с валидным продаваемым оффером (см. sync + гейт).

## Rollback-план (перед --apply на сервере)

1. Бэкап БД (scripts/backup-db.sh) — обязателен и блокирующий.
2. `--apply` идемпотентен (upsert по UUID) и в одной транзакции: при ошибке — полный откат.
3. Данные не удаляются; при откате восстановление из бэкапа шага 1.
