# Структура базы данных

## СУБД

PostgreSQL 14+, база `pitomets_db`, кодировка UTF-8.

## Модели и таблицы

### users (apps.users)

| Таблица | Модель | PK | Описание |
|---------|--------|-----|----------|
| `users` | User | UUID (uuid4) | Пользователи (email-based auth) |
| `tokens` | Token | UUID | Refresh-токены |

### pets (apps.pets)

| Таблица | Модель | PK | Описание |
|---------|--------|-----|----------|
| `pets` | Pet | UUIDv7 | Профили питомцев (PetID) |
| `breeds` | Breed | AutoField | Справочник пород |
| `pet_vaccinations` | Vaccination | UUIDv7 | Вакцинации |
| `pet_medications` | Medication | UUIDv7 | Медикаменты |
| `pet_events` | CalendarEvent | UUIDv7 | События календаря |
| `pet_reminders` | Reminder | UUIDv7 | Напоминания |

### shop (apps.shop)

| Таблица | Модель | PK | Описание |
|---------|--------|-----|----------|
| `shop_categories` | Category | AutoField | Категории товаров |
| `shop_products` | Product | AutoField | Товары |
| `shop_cart_items` | CartItem | AutoField | Элементы корзины |
| `shop_orders` | Order | UUIDv7 | Заказы |
| `shop_order_items` | OrderItem | AutoField | Позиции заказа |

### training (apps.training)

| Таблица | Модель | PK | Описание |
|---------|--------|-----|----------|
| `training_courses` | Course | AutoField | Курсы |
| `training_lessons` | Lesson | AutoField | Уроки |
| `course_pages` | CoursePage | AutoField | Страницы конструктора |
| `content_blocks` | ContentBlock | AutoField | Блоки контента |
| `user_courses` | UserCourse | UUIDv7 | Прогресс пользователя |

### payments (apps.payments)

| Таблица | Модель | PK | Описание |
|---------|--------|-----|----------|
| `payments` | Payment | UUIDv7 | Платежи |

### reviews (apps.reviews)

| Таблица | Модель | PK | Описание |
|---------|--------|-----|----------|
| `reviews` | Review | UUIDv7 | Отзывы |

## Стратегия первичных ключей

- **UUIDv7** (`core.utils.generate_uuid7`): для пользовательского контента (Pet, Order, Payment, Review) — сортируемые по времени
- **uuid.uuid4**: для модели User — стандартный UUID
- **AutoField**: для админского контента (Course, Product, Category, Breed) — целочисленные ID

## Общие паттерны

- Timestamps: `created_at` (default=timezone.now), `updated_at` (auto_now=True)
- Мягкое удаление: `is_active` поле (где применимо)
- Владелец: `owner` ForeignKey на User с `related_name`
- Индексы: составные индексы `[owner, -created_at]` для частых запросов
