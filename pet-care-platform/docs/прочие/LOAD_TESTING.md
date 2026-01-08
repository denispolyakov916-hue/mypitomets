# Документация по нагрузочному тестированию

**Дата создания**: Январь 2026  
**Версия**: 1.0  
**Статус**: Этап 4.3 - Нагрузочное тестирование

---

## 📋 Содержание

1. [Обзор](#обзор)
2. [Инструменты](#инструменты)
3. [Установка](#установка)
4. [Сценарии нагрузки](#сценарии-нагрузки)
5. [Критические эндпоинты](#критические-эндпоинты)
6. [Запуск тестов](#запуск-тестов)
7. [Анализ результатов](#анализ-результатов)
8. [Оптимизация](#оптимизация)

---

## Обзор

Нагрузочное тестирование позволяет проверить производительность системы под различными нагрузками и выявить узкие места.

### Цели

- Проверить производительность критических эндпоинтов
- Выявить узкие места в системе
- Определить максимальную нагрузку
- Проверить стабильность под нагрузкой
- Оптимизировать медленные эндпоинты

---

## Инструменты

### Locust (рекомендуется)

**Преимущества**:
- Простой Python синтаксис
- Веб-интерфейс для мониторинга
- Распределенное тестирование
- Гибкая настройка сценариев

**Установка**:
```bash
pip install locust
```

### Apache JMeter (альтернатива)

**Преимущества**:
- Графический интерфейс
- Поддержка различных протоколов
- Расширенная отчетность

---

## Установка

### Locust

```bash
# Добавить в requirements.txt
locust>=2.20.0

# Установить
pip install -r requirements.txt
```

### Структура

```
load_tests/
├── locustfile.py          # Основной файл сценариев
├── scenarios/
│   ├── shop_scenarios.py  # Сценарии для магазина
│   ├── courses_scenarios.py # Сценарии для курсов
│   └── admin_scenarios.py # Сценарии для админки
└── results/              # Результаты тестов
```

---

## Сценарии нагрузки

### Базовый пользователь

```python
from locust import HttpUser, task, between

class PetCareUser(HttpUser):
    """Базовый пользователь платформы"""
    wait_time = between(1, 3)  # Пауза между запросами 1-3 сек
    
    def on_start(self):
        """Авторизация перед тестами"""
        response = self.client.post("/api/auth/login/", {
            "email": "test@example.com",
            "password": "test123"
        })
        if response.status_code == 200:
            self.token = response.json().get('access')
            self.client.headers = {'Authorization': f'Bearer {self.token}'}
    
    @task(3)
    def view_products(self):
        """Просмотр товаров (высокая частота)"""
        self.client.get("/api/shop/products/")
    
    @task(1)
    def view_courses(self):
        """Просмотр курсов (низкая частота)"""
        self.client.get("/api/courses/")
    
    @task(2)
    def view_cart(self):
        """Просмотр корзины"""
        self.client.get("/api/shop/cart/")
```

### Покупатель

```python
class BuyerUser(HttpUser):
    """Пользователь, который покупает товары"""
    wait_time = between(2, 5)
    
    def on_start(self):
        # Авторизация
        pass
    
    @task(5)
    def browse_products(self):
        """Просмотр каталога товаров"""
        self.client.get("/api/shop/products/?animal=dog")
    
    @task(3)
    def view_product_detail(self):
        """Просмотр деталей товара"""
        product_id = 1  # В реальности брать из списка
        self.client.get(f"/api/shop/products/{product_id}/")
    
    @task(2)
    def add_to_cart(self):
        """Добавление товара в корзину"""
        self.client.post("/api/shop/cart/", {
            "product_id": 1,
            "quantity": 1
        })
    
    @task(1)
    def checkout(self):
        """Оформление заказа"""
        self.client.post("/api/checkout/", {
            "delivery_type": "standard",
            "shipping_address": "Тестовый адрес"
        })
```

### Администратор

```python
class AdminUser(HttpUser):
    """Администратор платформы"""
    wait_time = between(3, 6)
    
    def on_start(self):
        # Авторизация как admin
        pass
    
    @task(3)
    def view_stats(self):
        """Просмотр статистики"""
        self.client.get("/api/admin/stats/")
    
    @task(2)
    def view_orders(self):
        """Просмотр заказов"""
        self.client.get("/api/admin/orders/")
    
    @task(1)
    def view_users(self):
        """Просмотр пользователей"""
        self.client.get("/api/admin/users/")
```

---

## Критические эндпоинты

### 1. `/api/shop/products/` - Каталог товаров

**Важность**: Критическая  
**Ожидаемое время ответа**: < 500ms  
**Целевая нагрузка**: 100 RPS

**Сценарий**:
```python
@task(10)
def test_products_list(self):
    """Тест каталога товаров"""
    # С фильтрами
    self.client.get("/api/shop/products/?animal=dog&category=food")
    # С пагинацией
    self.client.get("/api/shop/products/?page=2")
    # С поиском
    self.client.get("/api/shop/products/?search=корм")
```

### 2. `/api/courses/` - Каталог курсов

**Важность**: Критическая  
**Ожидаемое время ответа**: < 500ms  
**Целевая нагрузка**: 50 RPS

**Сценарий**:
```python
@task(5)
def test_courses_list(self):
    """Тест каталога курсов"""
    self.client.get("/api/courses/?pet_type=dog")
    self.client.get("/api/courses/?category=training")
```

### 3. `/api/pets/reminders/` - Напоминания

**Важность**: Высокая  
**Ожидаемое время ответа**: < 300ms  
**Целевая нагрузка**: 30 RPS

**Сценарий**:
```python
@task(3)
def test_reminders(self):
    """Тест напоминаний"""
    self.client.get("/api/pets/reminders/")
    self.client.get("/api/pets/reminders/upcoming/")
```

### 4. `/api/admin/stats/` - Статистика админки

**Важность**: Средняя  
**Ожидаемое время ответа**: < 1000ms  
**Целевая нагрузка**: 10 RPS

**Сценарий**:
```python
@task(1)
def test_admin_stats(self):
    """Тест статистики админки"""
    self.client.get("/api/admin/stats/")
```

---

## Запуск тестов

### Базовый запуск

```bash
# Запуск с веб-интерфейсом
locust -f load_tests/locustfile.py

# Откроется веб-интерфейс на http://localhost:8089
```

### Запуск с параметрами

```bash
# Указать хост и количество пользователей
locust -f load_tests/locustfile.py \
    --host=http://localhost:8077 \
    --users=100 \
    --spawn-rate=10 \
    --run-time=5m

# Без веб-интерфейса (headless)
locust -f load_tests/locustfile.py \
    --host=http://localhost:8077 \
    --users=100 \
    --spawn-rate=10 \
    --run-time=5m \
    --headless \
    --html=results/report.html
```

### Распределенное тестирование

```bash
# Master (управляющий)
locust -f load_tests/locustfile.py --master

# Worker (рабочий)
locust -f load_tests/locustfile.py --worker --master-host=localhost
```

---

## Анализ результатов

### Метрики

1. **RPS (Requests Per Second)** - Запросов в секунду
2. **Response Time** - Время ответа
   - Min - Минимальное
   - Max - Максимальное
   - Median - Медианное
   - 95th percentile - 95-й перцентиль
3. **Failure Rate** - Процент ошибок
4. **Throughput** - Пропускная способность

### Целевые показатели

| Эндпоинт | RPS | Response Time (95th) | Failure Rate |
|----------|-----|---------------------|--------------|
| `/api/shop/products/` | 100 | < 500ms | < 1% |
| `/api/courses/` | 50 | < 500ms | < 1% |
| `/api/pets/reminders/` | 30 | < 300ms | < 1% |
| `/api/admin/stats/` | 10 | < 1000ms | < 1% |

### Интерпретация результатов

**Хорошие результаты**:
- ✅ Response Time (95th) в пределах целевых показателей
- ✅ Failure Rate < 1%
- ✅ Нет деградации производительности при увеличении нагрузки

**Проблемы**:
- ❌ Response Time растет линейно с нагрузкой
- ❌ Failure Rate > 1%
- ❌ Ошибки 500 (Internal Server Error)
- ❌ Ошибки 503 (Service Unavailable)

---

## Оптимизация

### Выявленные узкие места

1. ⏳ `/api/shop/products/` - Требует оптимизации запросов
2. ⏳ `/api/courses/` - Требует кэширования
3. ⏳ `/api/admin/stats/` - Требует оптимизации агрегаций

### Рекомендации

1. **Кэширование**:
   - Кэшировать списки товаров и курсов
   - Использовать Redis для кэширования

2. **Оптимизация запросов**:
   - Использовать `select_related` и `prefetch_related`
   - Оптимизировать пагинацию

3. **Индексы БД**:
   - Добавить индексы на часто используемые поля
   - Оптимизировать составные индексы

4. **Асинхронность**:
   - Использовать асинхронные запросы где возможно
   - Оптимизировать тяжелые вычисления

---

## Результаты тестирования

### Статус: ⏳ В процессе

#### Тест 1: Каталог товаров
- **Дата**: -
- **Нагрузка**: -
- **RPS**: -
- **Response Time (95th)**: -
- **Failure Rate**: -
- **Результат**: ⏳ Не проведен

#### Тест 2: Каталог курсов
- **Дата**: -
- **Нагрузка**: -
- **RPS**: -
- **Response Time (95th)**: -
- **Failure Rate**: -
- **Результат**: ⏳ Не проведен

#### Тест 3: Напоминания
- **Дата**: -
- **Нагрузка**: -
- **RPS**: -
- **Response Time (95th)**: -
- **Failure Rate**: -
- **Результат**: ⏳ Не проведен

#### Тест 4: Статистика админки
- **Дата**: -
- **Нагрузка**: -
- **RPS**: -
- **Response Time (95th)**: -
- **Failure Rate**: -
- **Результат**: ⏳ Не проведен

---

## Следующие шаги

1. ⏳ Создать файл `load_tests/locustfile.py`
2. ⏳ Настроить сценарии нагрузки
3. ⏳ Провести тестирование критических эндпоинтов
4. ⏳ Проанализировать результаты
5. ⏳ Оптимизировать выявленные узкие места
6. ⏳ Повторить тестирование после оптимизации

---

*Документ создан в рамках Этапа 4.3 рефакторинга*  
*Последнее обновление: Январь 2026*

