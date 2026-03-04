"""
═══════════════════════════════════════════════════════════════════════════════
                         🐾 ПИТОМЕЦ+ API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════

Единый реестр всех API эндпоинтов проекта.
Используйте этот файл для быстрого поиска нужного эндпоинта.

Запуск: python manage.py list_endpoints

Структура:
    /api/auth/      - Аутентификация
    /api/users/     - Профиль пользователя
    /api/pets/      - Питомцы и породы
    /api/shop/      - Магазин
    /api/courses/   - Курсы обучения
    /api/payments/  - Платежи
    /api/reviews/   - Отзывы
    /api/checkout/  - Единый checkout
    /api/calendar/  - Календарь событий
    /api/admin/     - Админ-панель API

═══════════════════════════════════════════════════════════════════════════════
"""

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH - Аутентификация (/api/auth/)
# ═══════════════════════════════════════════════════════════════════════════════
AUTH_ENDPOINTS = {
    'POST /register/':           'Регистрация пользователя',
    'POST /login/':              'Вход пользователя → {access, refresh, user}',
    'POST /logout/':             'Выход пользователя',
    'GET  /refresh/':            'Обновление access токена из cookie',
    'GET  /activate/{link}/':    'Активация аккаунта по ссылке из email',
    'POST /activate-by-code/':   'Активация аккаунта по коду из email',
    'POST /exchange-auth-code/': 'Обмен временного кода на токены',
    'GET  /users/':              'Список пользователей (dev/test)',
}

# ═══════════════════════════════════════════════════════════════════════════════
# USERS - Профиль пользователя (/api/users/)
# ═══════════════════════════════════════════════════════════════════════════════
USERS_ENDPOINTS = {
    'GET  /profile/':            'Профиль пользователя с питомцами и заказами',
    'PUT  /profile/':            'Обновление профиля пользователя',
    'GET  /orders/':             'История заказов пользователя',
    'GET  /courses/':            'Приобретённые курсы пользователя',
}

# ═══════════════════════════════════════════════════════════════════════════════
# PETS - Питомцы и породы (/api/pets/)
# ═══════════════════════════════════════════════════════════════════════════════
PETS_ENDPOINTS = {
    # CRUD питомцев
    'GET  /':                        'Список питомцев пользователя',
    'POST /':                        'Создание питомца → {id, name, species...}',
    'GET  /{uuid}/':                 'Детали питомца',
    'PUT  /{uuid}/':                 'Полное обновление питомца',
    'PATCH /{uuid}/':                'Частичное обновление питомца',
    'DELETE /{uuid}/':               'Удаление питомца',
    'GET  /{uuid}/analysis/':        'Анализ профиля с рекомендациями',
    
    # Справочник пород
    'GET  /breeds/':                 'Список пород ?species=dog&search=лабрадор',
    'GET  /breeds/{uuid}/':          'Детали породы',
    'GET  /breeds/by-slug/{slug}/':  'Порода по slug (SEO)',
    'GET  /breeds/{uuid}/suggestions/': 'Подсказки для автозаполнения PetID',
    
    # Напоминания
    'GET  /reminders/':              'Список напоминаний ?pet={uuid}&status=active',
    'POST /reminders/':              'Создание напоминания',
    'GET  /reminders/categories/':   'Категории и частоты напоминаний',
    'GET  /reminders/upcoming/':     'Предстоящие напоминания (виджет)',
    'GET  /reminders/{uuid}/':       'Детали напоминания',
    'PUT  /reminders/{uuid}/':       'Обновление напоминания',
    'DELETE /reminders/{uuid}/':     'Удаление напоминания',
    'POST /reminders/{uuid}/complete/': 'Отметить выполненным',
}

# ═══════════════════════════════════════════════════════════════════════════════
# SHOP - Магазин (/api/shop/)
# ═══════════════════════════════════════════════════════════════════════════════
SHOP_ENDPOINTS = {
    # Товары
    'GET  /products/':               'Каталог товаров ?animal=dog&category=food&page=1',
    'GET  /products/{id}/':          'Детали товара с отзывами',
    'GET  /products/{id}/frequently-bought/': 'Рекомендации "Часто покупают вместе"',
    'GET  /products/health-filter/': 'Товары по проблемам здоровья питомца',
    'GET  /personal-recommendations/': 'Персональные рекомендации (PetID)',
    
    # Корзина
    'GET  /cart/':                   'Содержимое корзины с итогами',
    'POST /cart/':                   'Добавление товара/курса в корзину',
    'GET  /cart/refresh/':           'Обновление данных корзины',
    'GET  /cart/recommendations/':   'Рекомендации для корзины',
    'PUT  /cart/item/':              'Изменение количества товара',
    'DELETE /cart/item/':            'Удаление из корзины',
    
    # Заказы
    'GET  /checkout/':               'Страница оформления заказа',
    'POST /orders/':                 'Создание заказа из корзины',
    'GET  /orders/history/':         'История заказов ?status=completed&page=1',
    'GET  /orders/{id}/':            'Детали заказа',
    'POST /orders/{id}/confirm-payment/': 'Подтверждение оплаты заказа',
    
    # Адреса доставки
    'GET  /addresses/':              'Список адресов пользователя',
    'POST /addresses/':              'Создание нового адреса',
    'GET  /addresses/search/':       'Поиск адресов (автокомплит)',
    
    # Возвраты
    'POST /returns/':                'Создание запроса на возврат',
    'GET  /returns/list/':           'Список возвратов пользователя',
    'GET  /returns/{id}/':           'Детали возврата',
}

# ═══════════════════════════════════════════════════════════════════════════════
# COURSES - Курсы обучения (/api/courses/)
# ═══════════════════════════════════════════════════════════════════════════════
COURSES_ENDPOINTS = {
    # Каталог
    'GET  /':                        'Каталог курсов ?category=training&level=beginner',
    'GET  /my/':                     'Курсы пользователя с прогрессом',
    'GET  /{id}/':                   'Детали курса с отзывами',
    'GET  /{id}/checkout/':          'Страница оформления курса',
    'POST /{id}/purchase/':          'Покупка/запись на курс',
    'POST /{id}/enroll/':            'Прямая запись на бесплатный курс',
    
    # Обучение
    'GET  /{id}/lessons/':           'Список уроков курса',
    'GET  /{id}/progress/':          'Прогресс по курсу',
    'GET  /{id}/comments/':          'Комментарии к курсу',
    'GET  /{id}/ratings/':           'Оценки курса',
    'POST /{id}/ratings/':           'Добавить оценку курса',
    'POST /{id}/ratings/create/':    'Создание оценки',
    
    # Уроки
    'GET  /lessons/{id}/':           'Детали урока с контентом',
    'POST /lessons/{id}/complete/':  'Завершить урок',
    'PUT  /lessons/{id}/progress/':  'Обновить прогресс урока',
    'GET  /lessons/{id}/comments/':  'Комментарии к уроку',
    'POST /lessons/{id}/comments/':  'Добавить комментарий',
    'POST /lessons/{id}/comments/create/': 'Создание комментария',
    
    # Комментарии
    'GET  /comments/{uuid}/':        'Детали комментария',
    'PUT  /comments/{uuid}/':        'Обновить комментарий',
    'DELETE /comments/{uuid}/':      'Удалить комментарий',
    'POST /comments/{uuid}/like/':   'Лайк комментария',
    'POST /comments/{uuid}/{action}/': 'Реакция на комментарий (like/dislike)',
    
    # Оценки
    'GET  /ratings/{uuid}/':         'Детали оценки',
    'PUT  /ratings/{uuid}/':         'Обновить оценку',
    'DELETE /ratings/{uuid}/':       'Удалить оценку',
    
    # Конструктор курсов (Admin)
    'GET  /{id}/builder/':           'Структура курса для конструктора',
    'GET  /{id}/pages/':             'Список страниц курса',
    'POST /{id}/pages/':             'Создание страницы курса',
    'GET  /pages/{id}/':             'Детали страницы',
    'PUT  /pages/{id}/':             'Обновление страницы',
    'DELETE /pages/{id}/':           'Удаление страницы',
    'GET  /pages/{id}/blocks/':      'Блоки контента на странице',
    'POST /pages/{id}/blocks/':      'Создание блока контента',
    'GET  /blocks/{id}/':            'Детали блока',
    'PUT  /blocks/{id}/':            'Обновление блока',
    'DELETE /blocks/{id}/':          'Удаление блока',
    'POST /blocks/{id}/duplicate/':  'Дублирование блока',
    'GET  /block-templates/':        'Список шаблонов блоков',
    'POST /block-templates/':        'Создание шаблона блока',
    'GET  /block-templates/{id}/':   'Детали шаблона',
    'PUT  /block-templates/{id}/':   'Обновление шаблона',
    'DELETE /block-templates/{id}/': 'Удаление шаблона',
    'POST /block-templates/{id}/use/': 'Использование шаблона',
}

# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENTS - Платежи (/api/payments/)
# ═══════════════════════════════════════════════════════════════════════════════
PAYMENTS_ENDPOINTS = {
    'GET  /':                        'Список платежей пользователя',
    'POST /create/':                 'Создание нового платежа',
    'POST /page/':                   'Единая страница оплаты (карта)',
    'GET  /{id}/':                   'Детали платежа',
    'GET  /by-order/{order_id}/':    'Получение платежа по заказу',
    'POST /{id}/confirm/':           'Подтверждение платежа',
    'POST /{id}/cancel/':            'Отмена платежа',
    'GET  /statistics/':             'Статистика платежей',
}

# ═══════════════════════════════════════════════════════════════════════════════
# REVIEWS - Отзывы (/api/reviews/)
# ═══════════════════════════════════════════════════════════════════════════════
REVIEWS_ENDPOINTS = {
    # Отзывы на товары
    'GET  /products/{id}/':          'Список отзывов товара',
    'POST /products/{id}/':          'Создать отзыв на товар',
    'GET  /products/{id}/eligibility/': 'Проверка права на отзыв',
    'PUT  /products/{id}/reviews/{review_id}/': 'Обновить отзыв',
    'DELETE /products/{id}/reviews/{review_id}/delete/': 'Удалить отзыв',
    
    # Отзывы на курсы
    'GET  /courses/{id}/':           'Список отзывов курса',
    'POST /courses/{id}/':           'Создать отзыв на курс',
    'GET  /courses/{id}/eligibility/': 'Проверка права на отзыв',
    'PUT  /courses/{id}/reviews/{review_id}/': 'Обновить отзыв',
    'DELETE /courses/{id}/reviews/{review_id}/delete/': 'Удалить отзыв',
    
    # Общее
    'GET  /recent-purchases/':       'Недавние покупки для отзывов',
}

# ═══════════════════════════════════════════════════════════════════════════════
# CHECKOUT - Единый checkout (/api/checkout/)
# ═══════════════════════════════════════════════════════════════════════════════
CHECKOUT_ENDPOINTS = {
    'GET  /':                        'Данные для оформления (товары + курсы)',
    'POST /':                        'Создание заказа (товары + курсы)',
}

# ═══════════════════════════════════════════════════════════════════════════════
# CALENDAR - Календарь событий (/api/calendar/)
# ═══════════════════════════════════════════════════════════════════════════════
CALENDAR_ENDPOINTS = {
    'GET  /events/':                 'Список событий ?pet={uuid}&month=2026-01',
    'POST /events/':                 'Создание события календаря',
    'GET  /events/{id}/':            'Детали события',
    'PUT  /events/{id}/':            'Обновление события',
    'DELETE /events/{id}/':          'Удаление события',
    'POST /events/{id}/complete/':   'Отметить событие выполненным',
    'POST /events/{id}/cancel/':     'Отменить событие',
    'GET  /events/today/':           'События на сегодня',
    'GET  /events/upcoming/':        'Предстоящие события',
}

# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN API - Админ-панель (/api/admin/)
# ═══════════════════════════════════════════════════════════════════════════════
ADMIN_ENDPOINTS = {
    # Аналитика
    'GET  /analytics/dashboard_overview/': 'Обзор дашборда (метрики)',
    'GET  /analytics/charts_data/':  'Данные для графиков',
    'GET  /analytics/sales_trends/': 'Тренды продаж',
    'GET  /analytics/users_trends/': 'Тренды регистраций',
    'GET  /analytics/pets_distribution/': 'Распределение питомцев по видам',
    'GET  /analytics/top_products/': 'Топ продаваемых товаров',
    'GET  /analytics/recent_orders/': 'Последние заказы',
    
    # Управление данными
    'POST /management/bulk_update_products/': 'Массовое обновление товаров',
    'POST /management/bulk_update_orders/': 'Массовое обновление заказов',
    'GET  /management/export_data/': 'Экспорт данных (CSV/Excel/PDF/JSON)',
    
    # CRUD операции (все поддерживают GET/POST/PUT/PATCH/DELETE)
    'CRUD /users/':                  'Управление пользователями',
    'CRUD /pets/':                   'Управление питомцами',
    'CRUD /products/':               'Управление товарами',
    'CRUD /orders/':                 'Управление заказами',
    'CRUD /courses/':                'Управление курсами',
    
    # Статистика
    'GET  /stats/summary/':          'Быстрая сводка статистики',
    
    # Конструктор графиков (analytics/)
    'GET  /analytics/metrics/':      'Список доступных метрик',
    'GET  /analytics/configs/':      'Сохранённые конфигурации графиков',
    'POST /analytics/constructor/data/': 'Получение данных для графика',
}

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM - Системные эндпоинты (/api/)
# ═══════════════════════════════════════════════════════════════════════════════
SYSTEM_ENDPOINTS = {
    'GET  /health/':                 'Health check (без аутентификации)',
    'GET  /health/detailed/':        'Детальный health check (БД, кэш)',
    'GET  /metrics/':                'Prometheus-совместимые метрики',
}

# ═══════════════════════════════════════════════════════════════════════════════
# Все эндпоинты для быстрого поиска и документации
# ═══════════════════════════════════════════════════════════════════════════════
ALL_ENDPOINTS = {
    '/api/auth/': AUTH_ENDPOINTS,
    '/api/users/': USERS_ENDPOINTS,
    '/api/pets/': PETS_ENDPOINTS,
    '/api/shop/': SHOP_ENDPOINTS,
    '/api/courses/': COURSES_ENDPOINTS,
    '/api/payments/': PAYMENTS_ENDPOINTS,
    '/api/reviews/': REVIEWS_ENDPOINTS,
    '/api/checkout/': CHECKOUT_ENDPOINTS,
    '/api/calendar/': CALENDAR_ENDPOINTS,
    '/api/admin/': ADMIN_ENDPOINTS,
    '/api/': SYSTEM_ENDPOINTS,
}


def get_endpoints_count():
    """Получить общее количество эндпоинтов."""
    total = 0
    for endpoints in ALL_ENDPOINTS.values():
        total += len(endpoints)
    return total


def print_all_endpoints():
    """Вывод всех эндпоинтов в консоль для быстрого просмотра."""
    print("\n" + "=" * 70)
    print("🐾 ПИТОМЕЦ+ API ENDPOINTS")
    print("=" * 70)
    print(f"Всего эндпоинтов: {get_endpoints_count()}")
    print("=" * 70)
    
    for prefix, endpoints in ALL_ENDPOINTS.items():
        print(f"\n📍 {prefix} ({len(endpoints)} endpoints)")
        print("-" * 60)
        for endpoint, description in endpoints.items():
            print(f"  {endpoint:45} → {description}")


def search_endpoint(query: str):
    """Поиск эндпоинта по запросу."""
    query = query.lower()
    results = []
    
    for prefix, endpoints in ALL_ENDPOINTS.items():
        for endpoint, description in endpoints.items():
            if query in endpoint.lower() or query in description.lower():
                results.append({
                    'prefix': prefix,
                    'endpoint': endpoint,
                    'description': description,
                    'full_url': f"{prefix}{endpoint.split()[1]}"
                })
    
    return results


if __name__ == '__main__':
    print_all_endpoints()



