# Документация по кэшированию

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 1.5 - Внедрение кэширования

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Настройка кэширования](#настройка-кэширования)
3. [Использование кэширования](#использование-кэширования)
4. [Инвалидация кэша](#инвалидация-кэша)
5. [Стратегии кэширования](#стратегии-кэширования)
6. [Мониторинг и отладка](#мониторинг-и-отладка)

---

## Обзор

Система кэширования платформы "Питомец+" предназначена для:
- Улучшения производительности API
- Снижения нагрузки на базу данных
- Ускорения ответов на часто запрашиваемые данные

### Типы кэширования

1. **Кэширование списков** - списки товаров и курсов с фильтрами
2. **Кэширование деталей** - детальная информация о товарах и курсах
3. **Кэширование рекомендаций** - персональные рекомендации
4. **Кэширование админки** - аналитические данные админ-панели

---

## Настройка кэширования

### Конфигурация в settings.py

```python
# Настройки кэширования
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'OPTIONS': {
            'MAX_ENTRIES': 10000,
        },
        'KEY_PREFIX': 'pitomets',
        'TIMEOUT': 300,  # 5 минут по умолчанию
    }
}

# Время жизни кэша для разных типов данных (в секундах)
CACHE_TIMEOUTS = {
    'products_list': 300,      # 5 минут - список товаров
    'courses_list': 300,       # 5 минут - список курсов
    'product_detail': 600,      # 10 минут - детали товара
    'course_detail': 600,       # 10 минут - детали курса
    'recommendations': 600,     # 10 минут - рекомендации
    'admin_stats': 60,          # 1 минута - статистика админки
    'admin_dashboard': 300,    # 5 минут - дашборд админки
}
```

### Использование Redis в продакшене

Для продакшена рекомендуется использовать Redis:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'pitomets',
        'TIMEOUT': 300,
    }
}
```

**Требования**:
- Установить `django-redis`: `pip install django-redis`
- Настроить Redis сервер

---

## Использование кэширования

### Кэширование в Views

#### ProductListView

Кэширует список товаров с учетом фильтров (без пагинации):

```python
class ProductListView(APIView):
    def get(self, request):
        # Проверка кэша
        cache_key = self._get_cache_key(request)
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            # Применяем пагинацию к кэшированным данным
            ...
            return Response(response_data)
        
        # Выполняем запрос к БД
        ...
        
        # Сохраняем в кэш
        cache.set(cache_key, response_data, cache_timeout)
        return Response(response_data)
```

**Особенности**:
- Кэшируются все товары без пагинации
- Пагинация применяется к кэшированным данным
- TTL: 5 минут

#### ProductDetailView

Кэширует детали товара:

```python
class ProductDetailView(APIView):
    def get(self, request, product_id):
        cache_key = f'product_detail:{product_id}'
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response)
        
        # Запрос к БД
        ...
        
        # Сохраняем в кэш
        cache.set(cache_key, response_data, cache_timeout)
        return Response(response_data)
```

**Особенности**:
- Для неавторизованных пользователей кэшируется полный ответ
- Для авторизованных пользователей кэшируется базовая информация (без `is_purchased`)
- TTL: 10 минут

#### CourseListView

Аналогично `ProductListView`, кэширует список курсов с учетом фильтров.

#### CourseDetailView

Аналогично `ProductDetailView`, кэширует детали курса.

### Утилиты кэширования

#### core/cache_utils.py

Предоставляет утилиты для работы с кэшем:

```python
from core.cache_utils import CacheManager, make_cache_key, cached_function

# Создание ключа кэша
cache_key = make_cache_key('products_list', filters)

# Использование менеджера кэша
CacheManager.invalidate_products_cache()
CacheManager.invalidate_courses_cache()
CacheManager.invalidate_recommendations_cache(pet_id='...')

# Декоратор для функций
@cached_function(timeout=600, key_prefix='recommendations')
def get_recommendations(pet_id):
    ...
```

---

## Инвалидация кэша

### Автоматическая инвалидация через сигналы

Сигналы Django автоматически инвалидируют кэш при изменении данных:

#### apps/shop/signals.py

```python
@receiver(post_save, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    """Инвалидация кэша товаров при сохранении."""
    CacheManager.invalidate_products_cache()
    cache.delete(f'product_detail:{instance.id}')

@receiver(post_delete, sender=Product)
def invalidate_product_cache_on_delete(sender, instance, **kwargs):
    """Инвалидация кэша товаров при удалении."""
    CacheManager.invalidate_products_cache()
    cache.delete(f'product_detail:{instance.id}')
```

#### apps/training/signals.py

Аналогично для курсов.

### Ручная инвалидация

```python
from core.cache_utils import CacheManager

# Инвалидация всего кэша товаров
CacheManager.invalidate_products_cache()

# Инвалидация всего кэша курсов
CacheManager.invalidate_courses_cache()

# Инвалидация рекомендаций для конкретного питомца
CacheManager.invalidate_recommendations_cache(pet_id='...')

# Инвалидация всего кэша
CacheManager.invalidate_all_cache()
```

---

## Стратегии кэширования

### 1. Списки товаров и курсов

**Стратегия**: Кэширование всех результатов без пагинации

**Преимущества**:
- Один запрос к БД для всех страниц
- Быстрая пагинация на стороне кэша

**Недостатки**:
- Больше памяти для больших списков
- Медленнее при большом количестве товаров

**TTL**: 5 минут

### 2. Детали товаров и курсов

**Стратегия**: Кэширование полной информации

**Преимущества**:
- Быстрый доступ к деталям
- Снижение нагрузки на БД

**Недостатки**:
- Для авторизованных пользователей нужна дополнительная обработка

**TTL**: 10 минут

### 3. Рекомендации

**Стратегия**: Кэширование персональных рекомендаций

**Преимущества**:
- Персонализация без пересчета
- Быстрый ответ

**TTL**: 10 минут

### 4. Админ-панель

**Стратегия**: Кэширование аналитических данных

**TTL**: 1-5 минут (в зависимости от типа данных)

---

## Мониторинг и отладка

### Проверка кэша

```python
from django.core.cache import cache

# Проверка наличия ключа
if cache.has_key('products_list:...'):
    print('Ключ существует')

# Получение значения
value = cache.get('products_list:...')

# Установка значения
cache.set('products_list:...', data, timeout=300)

# Удаление ключа
cache.delete('products_list:...')

# Очистка всего кэша
cache.clear()
```

### Логирование

Кэширование логируется через стандартное логирование Django:

```python
import logging
logger = logging.getLogger('apps.shop')

# При попадании в кэш
logger.debug(f'Cache hit: {cache_key}')

# При промахе кэша
logger.debug(f'Cache miss: {cache_key}')
```

### Метрики

Для мониторинга эффективности кэширования можно добавить:

- Hit rate (процент попаданий в кэш)
- Miss rate (процент промахов)
- Среднее время ответа с кэшем и без

---

## Рекомендации

### 1. Выбор TTL

- **Короткий TTL (1-5 минут)**: Часто изменяющиеся данные (статистика, заказы)
- **Средний TTL (5-10 минут)**: Умеренно изменяющиеся данные (товары, курсы)
- **Длинный TTL (30+ минут)**: Редко изменяющиеся данные (справочники)

### 2. Размер кэша

- Для LocMemCache: ограничить `MAX_ENTRIES`
- Для Redis: настроить `maxmemory` и политику вытеснения

### 3. Инвалидация

- Использовать сигналы для автоматической инвалидации
- Избегать слишком частой инвалидации
- Группировать инвалидацию при массовых операциях

### 4. Производительность

- Кэшировать только тяжелые запросы
- Избегать кэширования персональных данных (кроме рекомендаций)
- Использовать компрессию для больших данных (в Redis)

---

## Известные ограничения

1. **LocMemCache**: Не подходит для многопроцессных серверов (Gunicorn с несколькими воркерами)
2. **Пагинация**: Кэшируются все данные, что может быть проблемой для больших списков
3. **Персонализация**: Для авторизованных пользователей нужна дополнительная обработка

---

## Следующие шаги

1. ⏳ Настройка Redis для продакшена
2. ⏳ Добавление метрик кэширования
3. ⏳ Оптимизация размера кэша
4. ⏳ Добавление кэширования для рекомендаций

---

*Документ создан в рамках Этапа 1.5 рефакторинга*  
*Последнее обновление: Январь 2026*

