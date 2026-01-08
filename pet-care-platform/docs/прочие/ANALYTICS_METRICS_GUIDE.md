# Система метрик админ-панели "Питомец+"

## Обзор

Данный документ является руководством по разработке системы метрик для админ-панели платформы "Питомец+". Он описывает комплексную систему аналитики, которая поможет принимать обоснованные бизнес-решения в сфере pet-care e-commerce.

## Цели системы метрик

- **Текущее состояние бизнеса**: мониторинг ключевых показателей в реальном времени
- **Тренды и паттерны**: выявление тенденций роста/спада, сезонности
- **Проблемные зоны**: определение узких мест и возможностей для улучшения
- **Прогнозирование**: основа для планирования развития бизнеса
- **Оперативное реагирование**: быстрое выявление и решение проблем

## Архитектурные принципы

### Технический стек
- **Backend**: Django + PostgreSQL + Django REST Framework
- **Frontend**: React + D3.js + Zustand
- **Кэширование**: Redis для оптимизации запросов
- **Агрегация**: Материализованные представления для сложных расчетов
- **Конструктор графиков**: D3.js с drag-and-drop интерфейсом

### Подходы к аналитике
- **Real-time данные**: актуальные показатели без задержек
- **Drill-down**: детализация от общего к частному
- **Сравнение периодов**: динамика изменений со временем
- **Сегментация**: анализ по категориям, регионам, типам клиентов
- **Персонализация**: метрики, адаптированные под роли пользователей
- **Гибкий конструктор**: D3.js конструктор графиков с drag-and-drop
- **Многослойная визуализация**: комбинирование различных типов графиков

---

## 1. Метрики пользователей

### 1.1 Регистрация и активация

#### Основные метрики
| Метрика | Расчет | Источник данных | Частота обновления |
|---------|--------|-----------------|-------------------|
| **Всего пользователей** | `COUNT(*)` из таблицы users | `User.objects.count()` | Real-time |
| **Активных пользователей** | Пользователи с is_active=True | `User.objects.filter(is_active=True).count()` | Real-time |
| **Активированных аккаунтов** | Пользователи с is_activated=True | `User.objects.filter(is_activated=True).count()` | Real-time |
| **Конверсия активации** | Активированные / Всего зарегистрированных * 100% | Расчет на основе User.is_activated | Ежечасно |
| **Регистрации по дням** | GROUP BY DATE(created_at) | User.created_at | Ежедневно |

#### Визуализация
- **Линейный график**: Динамика регистраций (D3.js Line Chart)
- **Круговая диаграмма**: Распределение по статусу активации
- **Метрики-карточки**: Total, Active, Activated, Conversion Rate

#### API эндпоинты для frontend
```javascript
GET /api/admin/analytics/users/overview/
GET /api/admin/analytics/users/registration-trends/
GET /api/admin/analytics/users/activation-funnel/
```

### 1.2 Поведенческие метрики

#### Метрики вовлеченности
| Метрика | Расчет | Источник данных | Период |
|---------|--------|-----------------|---------|
| **MAU (Monthly Active Users)** | Уникальные пользователи с активностью за месяц | User.last_login или логи действий | Месяц |
| **DAU (Daily Active Users)** | Уникальные пользователи за день | Анализ логов или Token.updated_at | День |
| **Среднее время сессии** | AVG(session_duration) | Логирование сессий в Token | День |
| **Показатель удержания** | Доля вернувшихся пользователей | Анализ последовательных активностей | Неделя |

#### Метрики персонализации
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Процент заполненных профилей** | Пользователи с completed_profile=True | User.profile_completion_status |
| **Среднее кол-во питомцев на пользователя** | AVG(pet_count) по пользователям | COUNT(User.pets) |
| **География пользователей** | GROUP BY city/country | User.city, User.default_address |

#### Визуализация
- **Когортный анализ**: Тепловая карта удержания
- **Географическая карта**: Распределение по регионам
- **Воронка конверсии**: Регистрация → Активация → Первый заказ

### 1.3 Сегментация пользователей

#### RFM-анализ для pet-care
- **Recency**: Последняя активность (дни с последнего заказа/входа)
- **Frequency**: Частота покупок (заказов в месяц)
- **Monetary**: Сумма расходов (общая выручка от пользователя)

#### Сегменты клиентов
| Сегмент | Критерии | Метрики |
|---------|-----------|---------|
| **Новички** | < 30 дней с регистрации | Конверсия в покупателей |
| **Активные** | ≥ 3 заказа за 3 месяца | LTV, повторные покупки |
| **Спящие** | > 90 дней без активности | Возвращение через email |
| **VIP** | Top 10% по выручке | Персональные предложения |

---

## 2. Метрики питомцев (PetID)

### 2.1 Базовая статистика

#### Демография питомцев
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Всего профилей PetID** | `COUNT(*)` из таблицы pets | `Pet.objects.count()` |
| **Распределение по видам** | GROUP BY species | Pet.species |
| **Распределение по породам** | GROUP BY breed | Pet.breed |
| **Распределение по полу** | GROUP BY gender | Pet.gender |
| **Средний возраст** | AVG(age) рассчитанный из date_of_birth | Pet.date_of_birth |

#### Визуализация
```javascript
// Распределение по видам (D3.js Pie Chart)
const pie = d3.pie()
  .value(d => d.count);

const arc = d3.arc()
  .innerRadius(0)
  .outerRadius(100);

const color = d3.scaleOrdinal()
  .domain(['Собаки', 'Кошки', 'Птицы', 'Грызуны'])
  .range(['#3b82f6', '#f97316', '#10b981', '#8b5cf6']);

svg.selectAll('path')
  .data(pie(speciesCounts))
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', d => color(d.data.species));
```

### 2.2 Здоровье и проблемы

#### Метрики здоровья
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Процент питомцев с проблемами здоровья** | COUNT с health_issues != [] / Total * 100% | Pet.health_issues |
| **Топ проблем здоровья** | GROUP BY health_issue, ORDER BY COUNT DESC | Pet.health_issues (JSON array) |
| **Питомцы с аллергиями** | COUNT с allergies != [] | Pet.allergies |
| **Кастрированные/стерилизованные** | COUNT с is_neutered=True | Pet.is_neutered |

#### Рекомендации для бизнеса
```javascript
// Метрики для маркетинга
{
  "pets_with_health_issues": 127,
  "pets_with_allergies": 89,
  "top_health_problems": [
    {"overweight": 45},
    {"sensitive_digestion": 32},
    {"joint_problems": 28}
  ]
}
```

### 2.3 Активность и персонализация

#### Метрики активности
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Уровни активности** | GROUP BY activity_level | Pet.activity_level |
| **Заполненность расширенных профилей** | COUNT с is_extended_profile=True | Pet.is_extended_profile |
| **Любимые продукты** | GROUP BY favorite_foods | Pet.favorite_foods (JSON) |
| **Типы поведения** | GROUP BY behavior_type | Pet.behavior_type |

### 2.4 Корреляция с бизнес-метриками

#### Связь PetID с продажами
- **Средний чек по типу питомца**: AVG(order.total) GROUP BY pet.species
- **Конверсия в покупки**: Процент пользователей с питомцами, совершивших заказы
- **Персонализация рекомендаций**: Эффективность персональных рекомендаций на основе PetID

#### API для аналитики питомцев
```javascript
GET /api/admin/analytics/pets/demographics/
GET /api/admin/analytics/pets/health-stats/
GET /api/admin/analytics/pets/behavior-patterns/
GET /api/admin/analytics/pets/personalization-impact/
```

---

## 3. Метрики магазина и заказов

### 3.1 Продажи и выручка

#### Основные коммерческие метрики
| Метрика | Расчет | Источник данных | Период |
|---------|--------|-----------------|---------|
| **Общая выручка** | SUM(order.total_amount) | Order.total_amount | All time |
| **Выручка за период** | SUM(order.total_amount) WHERE date BETWEEN | Order.created_at | День/Неделя/Месяц |
| **Средний чек** | AVG(order.total_amount) | Order.total_amount | Период |
| **Количество заказов** | COUNT(*) из orders | Order.objects.count() | Период |
| **Количество товаров в заказе** | AVG(order.items_count) | Order.items.count() | Период |

#### Визуализация продаж
```javascript
// Тренд продаж (D3.js Combo Chart)
const margin = { top: 20, right: 80, bottom: 30, left: 50 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Создание SVG
const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

// Шкалы
const x = d3.scaleBand()
  .domain(dates)
  .range([0, width])
  .padding(0.1);

const y = d3.scaleLinear()
  .domain([0, d3.max(revenue)])
  .range([height, 0]);

const y1 = d3.scaleLinear()
  .domain([0, d3.max(ordersCount)])
  .range([height, 0]);

// Столбцы для заказов
svg.selectAll('.bar')
  .data(dates.map((d, i) => ({ date: d, value: ordersCount[i] })))
  .enter().append('rect')
  .attr('class', 'bar')
  .attr('x', d => x(d.date))
  .attr('width', x.bandwidth())
  .attr('y', d => y1(d.value))
  .attr('height', d => height - y1(d.value))
  .attr('fill', '#10b981');

// Линия для выручки
const line = d3.line()
  .x(d => x(d.date) + x.bandwidth() / 2)
  .y(d => y(d.value));

svg.append('path')
  .datum(dates.map((d, i) => ({ date: d, value: revenue[i] })))
  .attr('fill', 'none')
  .attr('stroke', '#3b82f6')
  .attr('stroke-width', 2)
  .attr('d', line);
```

### 3.2 Статусы заказов

#### Метрики статуса
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Распределение по статусам** | GROUP BY status | Order.status |
| **Время на обработку** | AVG(processing_time) | Order.created_at → status_changed_at |
| **Конверсия в доставку** | Заказы со статусом 'delivered' / Все заказы | Order.status |
| **Показатель отмен** | Заказы со статусом 'cancelled' / Все заказы | Order.status |

### 3.3 Категории и товары

#### Метрики товаров
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Топ товаров по продажам** | GROUP BY product, SUM(quantity) ORDER BY DESC | OrderItem.product, OrderItem.quantity |
| **Выручка по категориям** | GROUP BY category SUM(total) | Product.category, OrderItem.total |
| **Средний рейтинг товаров** | AVG(rating) GROUP BY product | Review.rating |
| **Количество отзывов** | COUNT(*) GROUP BY product | Review.objects.filter(product=product) |

#### ABC-анализ товаров
- **A-класс**: Топ 20% товаров приносят 80% выручки
- **B-класс**: Следующие 30% товаров
- **C-класс**: Остальные 50% товаров

### 3.4 Корзина и конверсия

#### Метрики конверсии
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Показатель брошенных корзин** | (Корзины без заказов / Все корзины) * 100% | Cart без Order |
| **Средний размер корзины** | AVG(items_count) по Cart | Cart.items.count() |
| **Конверсия корзина→заказ** | Заказы / Корзины * 100% | Cart → Order |

---

## 4. Метрики курсов и обучения

### 4.1 Популярность курсов

#### Метрики курсов
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Количество приобретенных курсов** | COUNT(*) из user_courses | UserCourse.objects.count() |
| **Выручка от курсов** | SUM(course.price) | UserCourse.course.price |
| **Средний рейтинг курсов** | AVG(rating) GROUP BY course | Rating.rating |
| **Завершенные курсы** | COUNT с progress=100 | UserCourseProgress.progress_percent |

#### Визуализация обучения
```javascript
// Прогресс обучения (D3.js Doughnut Chart)
const width = 300, height = 300, radius = Math.min(width, height) / 2;

const color = d3.scaleOrdinal()
  .domain(['Завершено', 'В процессе', 'Не начато'])
  .range(['#10b981', '#f59e0b', '#e5e7eb']);

const pie = d3.pie()
  .value(d => d.value);

const arc = d3.arc()
  .innerRadius(radius * 0.6)
  .outerRadius(radius * 0.9);

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .append('g')
  .attr('transform', `translate(${width/2},${height/2})`);

const data = [
  { label: 'Завершено', value: completed },
  { label: 'В процессе', value: inProgress },
  { label: 'Не начато', value: notStarted }
];

svg.selectAll('path')
  .data(pie(data))
  .enter()
  .append('path')
  .attr('d', arc)
  .attr('fill', d => color(d.data.label));
```

### 4.2 Прогресс обучения

#### Метрики прогресса
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Средний прогресс по курсам** | AVG(progress_percent) | UserCourseProgress.progress_percent |
| **Время на завершение курса** | AVG(completed_at - started_at) | UserCourseProgress timestamps |
| **Отток на разных этапах** | Доля пользователей, остановившихся на определенном прогрессе | UserCourseProgress.progress_percent |
| **Повторные просмотры** | COUNT повторных прохождений уроков | Логи просмотров |

### 4.3 Эффективность курсов

#### Метрики качества контента
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Вовлеченность по урокам** | AVG(time_spent) по урокам | UserLessonProgress.time_spent |
| **Успеваемость тестов** | AVG(success_rate) | UserLessonProgress.success_rate |
| **Количество комментариев** | COUNT(*) GROUP BY course | Comment.objects.filter(course=course) |
| **Использование шаблонов** | COUNT(*) GROUP BY template | BlockTemplate.usage_count |

---

## 5. Метрики платежей и финансов

### 5.1 Платежи и возвраты

#### Финансовые метрики
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Общая сумма платежей** | SUM(amount) | Payment.amount |
| **Успешные платежи** | COUNT с status='completed' | Payment.status |
| **Неудачные платежи** | COUNT с status='failed' | Payment.status |
| **Возвраты** | SUM(amount) WHERE status='refunded' | Payment.amount, Payment.status |

#### Метрики возвратов
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Сумма возвратов** | SUM(refund_amount) | Return.refund_amount |
| **Причины возвратов** | GROUP BY reason | Return.reason |
| **Время на обработку возврата** | AVG(processed_at - requested_at) | Return timestamps |

### 5.2 Методы оплаты

#### Распределение платежей
```javascript
// Методы оплаты (D3.js Bar Chart)
const margin = { top: 20, right: 30, bottom: 40, left: 50 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

const x = d3.scaleBand()
  .domain(['Карта', 'Банковский перевод', 'Наличными', 'Электронный кошелек'])
  .range([0, width])
  .padding(0.1);

const y = d3.scaleLinear()
  .domain([0, d3.max(methodCounts)])
  .range([height, 0]);

// Столбцы
svg.selectAll('.bar')
  .data(methodCounts.map((count, i) => ({
    method: ['Карта', 'Банковский перевод', 'Наличными', 'Электронный кошелек'][i],
    count: count
  })))
  .enter().append('rect')
  .attr('class', 'bar')
  .attr('x', d => x(d.method))
  .attr('width', x.bandwidth())
  .attr('y', d => y(d.count))
  .attr('height', d => height - y(d.count))
  .attr('fill', (d, i) => ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i]);

// Оси
svg.append('g')
  .attr('transform', `translate(0,${height})`)
  .call(d3.axisBottom(x));

svg.append('g')
  .call(d3.axisLeft(y));
```

### 5.3 Финансовые отчеты

#### LTV и когортный анализ
- **Lifetime Value**: Общая выручка от пользователя за все время
- **CAC (Customer Acquisition Cost)**: Стоимость привлечения клиента
- **Payback period**: Период окупаемости рекламных расходов
- **Когортный анализ**: Анализ поведения групп пользователей по времени регистрации

---

## 6. Метрики отзывов и качества

### 6.1 Рейтинги и отзывы

#### Метрики качества
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Средний рейтинг товаров** | AVG(rating) WHERE is_approved=True | Review.rating |
| **Средний рейтинг курсов** | AVG(rating) WHERE is_approved=True | Rating.rating |
| **Количество отзывов** | COUNT(*) WHERE is_approved=True | Review.is_approved |
| **Процент верифицированных отзывов** | COUNT с is_verified_purchase=True / Total | Review.is_verified_purchase |

### 6.2 Анализ тональности

#### Метрики текста отзывов
- **Распределение рейтингов**: 1-5 звезд
- **NPS (Net Promoter Score)**: Промоутеры - Критики
- **Анализ ключевых слов**: Темы отзывов (положительные/отрицательные)
- **Вовлеченность**: Лайки/дизлайки комментариев

---

## 7. Метрики напоминаний и заботы

### 7.1 Активность напоминаний

#### Метрики напоминаний
| Метрика | Расчет | Источник данных |
|---------|--------|-----------------|
| **Созданные напоминания** | COUNT(*) | Reminder.objects.count() |
| **Активные напоминания** | COUNT с is_active=True | Reminder.is_active |
| **Выполненные напоминания** | COUNT с is_completed=True | Reminder.is_completed |
| **Своевременность выполнения** | COUNT выполненных вовремя / Все выполненные | Reminder.completed_at vs reminder_date |

### 7.2 Категории напоминаний

#### Анализ по типам ухода
| Категория | Метрики | Бизнес-ценность |
|-----------|---------|-----------------|
| **Feeding** | Частота кормлений, типы кормов | Рекомендации продуктов |
| **Medication** | Приемы препаратов, вакцинации | Продажи ветпрепаратов |
| **Vet visits** | Посещения ветеринара | Уведомления о приемах |
| **Grooming** | Уход за шерстью, купание | Продажи средств ухода |

---

## 8. Дашборд и визуализация

### 8.1 Структура главного дашборда

#### Основные виджеты
```javascript
// Главный дашборд - React компонент
function Dashboard() {
  return (
    <div className="dashboard-grid">
      {/* KPI карточки */}
      <MetricCard title="Выручка" value={revenue} trend={+12.5} />
      <MetricCard title="Заказы" value={ordersCount} trend={+8.2} />
      <MetricCard title="Пользователи" value={usersCount} trend={+15.3} />
      <MetricCard title="Питомцы" value={petsCount} trend={+22.1} />

      {/* Графики */}
      <ChartCard title="Продажи по дням" type="line" data={salesData} />
      <ChartCard title="Распределение заказов" type="pie" data={statusData} />
      <ChartCard title="Топ товаров" type="bar" data={topProducts} />

      {/* Детальные метрики */}
      <DrillDownTable title="Последние заказы" data={recentOrders} />
    </div>
  );
}
```

### 8.2 Интерактивные возможности

#### Drill-down функциональность
- **Клик на метрику**: Переход к детальному представлению
- **Фильтры по времени**: День/Неделя/Месяц/Квартал/Год
- **Сравнение периодов**: Текущий vs предыдущий период
- **Экспорт данных**: CSV, Excel, PDF для отчетов

### 8.3 Адаптивность и UX

#### Mobile-first дизайн
```css
/* Адаптивная сетка для дашборда */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### 8.4 Real-time обновления

#### WebSocket интеграция
```javascript
// Real-time обновления метрик
useEffect(() => {
  const ws = new WebSocket('/ws/analytics/');

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateMetrics(data);
  };

  return () => ws.close();
}, []);
```

---

## 9. Дополнения для аналитики

### 9.1 Новые поля в моделях

#### Расширение User
```python
class User(models.Model):
    # Существующие поля...

    # Новые поля для аналитики
    acquisition_channel = models.CharField(
        max_length=50,
        choices=[
            ('organic', 'Органический трафик'),
            ('paid_ads', 'Платная реклама'),
            ('social_media', 'Социальные сети'),
            ('referral', 'Реферальная программа'),
            ('partner', 'Партнерские программы')
        ],
        blank=True,
        verbose_name='Источник привлечения'
    )

    first_order_date = models.DateTimeField(null=True, blank=True)
    last_activity_date = models.DateTimeField(auto_now=True)
    total_orders_count = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    preferred_categories = models.JSONField(default=list)  # Любимые категории
```

#### Расширение Order
```python
class Order(models.Model):
    # Существующие поля...

    # Новые поля для аналитики
    utm_source = models.CharField(max_length=100, blank=True)
    utm_medium = models.CharField(max_length=100, blank=True)
    utm_campaign = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(
        max_length=20,
        choices=[('mobile', 'Мобильный'), ('desktop', 'Десктоп'), ('tablet', 'Планшет')],
        blank=True
    )
    browser = models.CharField(max_length=100, blank=True)
    referrer = models.URLField(blank=True)
```

### 9.2 Событийная аналитика

#### Трекинг событий
```python
class AnalyticsEvent(models.Model):
    """Модель для хранения аналитических событий"""

    EVENT_TYPES = [
        ('page_view', 'Просмотр страницы'),
        ('product_view', 'Просмотр товара'),
        ('add_to_cart', 'Добавление в корзину'),
        ('purchase', 'Покупка'),
        ('course_start', 'Начало курса'),
        ('lesson_complete', 'Завершение урока'),
        ('pet_profile_update', 'Обновление профиля питомца'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    object_id = models.CharField(max_length=36, blank=True)  # ID объекта действия
    metadata = models.JSONField(default=dict)
    session_id = models.CharField(max_length=36)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['session_id']),
        ]
```

### 9.3 Когортный анализ

#### Когорты пользователей
- **Регистрационные когорты**: Пользователи, зарегистрированные в определенный период
- **Поведенческие когорты**: Группы по уровню активности
- **RFM-сегментация**: Recency, Frequency, Monetary
- **LTV-прогноз**: Прогнозирование пожизненной ценности клиентов

### 9.4 A/B тестирование

#### Фреймворк для экспериментов
```python
class ABTest(models.Model):
    """Модель для A/B тестирования"""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    variants = models.JSONField(default=dict)  # {'A': 'control', 'B': 'variant'}
    target_metric = models.CharField(max_length=100)  # conversion_rate, revenue, etc.
    status = models.CharField(
        max_length=20,
        choices=[('draft', 'Черновик'), ('running', 'Запущен'), ('completed', 'Завершен')],
        default='draft'
    )

    start_date = models.DateTimeField(null=True)
    end_date = models.DateTimeField(null=True)

    results = models.JSONField(default=dict)  # Статистика результатов
```

---

## 10. Техническая реализация

### 10.1 Backend API

#### Структура эндпоинтов
```
api/admin/analytics/
├── dashboard_overview/          # Обзорные метрики
├── sales_trends/               # Тренды продаж
├── users_trends/               # Тренды пользователей
├── pets_distribution/          # Распределение питомцев
├── top_products/               # Топ товаров
├── recent_orders/              # Последние заказы
├── conversion_funnel/          # Воронка конверсии
├── cohort_analysis/            # Когортный анализ
└── real_time_metrics/          # Real-time метрики
```

#### Оптимизация запросов
```python
# Материализованное представление для быстрых запросов
CREATE MATERIALIZED VIEW analytics_dashboard AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as orders_count,
    SUM(total_amount) as revenue,
    AVG(total_amount) as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

# Обновление каждые 5 минут
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_dashboard;
```

### 10.2 Frontend компоненты

#### Универсальные компоненты графиков
```javascript
// Универсальный компонент для графиков
function AnalyticsChart({ type, data, options, title }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const chart = new Chart(chartRef.current, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          ...options
        }
      });

      return () => chart.destroy();
    }
  }, [type, data, options]);

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <canvas ref={chartRef} />
    </div>
  );
}
```

#### Кастомные хуки для аналитики
```javascript
// Хук для загрузки аналитических данных
function useAnalytics(endpoint, params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/admin/analytics/${endpoint}`, { params });
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [endpoint, JSON.stringify(params)]);

  return { data, loading, error };
}
```

### 10.3 Кэширование и производительность

#### Redis кэширование
```python
# Кэширование результатов аналитики
from django.core.cache import cache

@cache_page(300)  # 5 минут кэширования
def analytics_dashboard_view(request):
    # Тяжелые запросы кэшируются
    return JsonResponse(get_dashboard_data())

# Инвалидация кэша при изменениях
def invalidate_analytics_cache():
    cache.delete_pattern('analytics:*')
```

---

## 11. Мониторинг и алерты

### 11.1 Автоматические алерты

#### Бизнес-алерты
- **Падение продаж**: >20% снижение за день
- **Рост возвратов**: >10% возвратов за неделю
- **Проблемы с платежами**: >5% неудачных платежей
- **Отток пользователей**: Снижение DAU >15%

#### Технические алерты
- **Производительность**: Запросы >2 секунд
- **Ошибки API**: >5% ошибок за час
- **Загрузка сервера**: CPU >80%, Memory >85%

### 11.2 Отчеты и экспорт

#### Автоматические отчеты
- **Ежедневный**: Ключевые метрики дня
- **Еженедельный**: Тренды и сравнение с прошлой неделей
- **Ежемесячный**: Полный бизнес-анализ
- **Квартальный**: Стратегические insights

---

## 12. Конструктор аналитических графиков

### 12.1 Обзор системы

Конструктор аналитических графиков представляет собой мощный инструмент для создания кастомных визуализаций данных на базе D3.js. Система предоставляет администраторам возможность строить сложные, многослойные графики через интуитивный drag-and-drop интерфейс.

#### Ключевые возможности
- **Гибкий холст**: Единое рабочее пространство для наложения различных типов графиков
- **Динамическая настройка осей**: Выбор метрик для осей X и Y из всей системы
- **Многослойность**: Добавление нескольких независимых графиков на один холст
- **Интеллектуальный интерфейс**: Автоподбор типов графиков и контекстные подсказки
- **Высокая производительность**: Оптимизация для работы с большими объемами данных

### 12.2 Архитектура конструктора

#### Frontend компоненты
```
src/admin/analytics/constructor/
├── ChartBuilder.jsx          # Главный компонент конструктора
├── Canvas.jsx                 # D3.js холст для визуализации
├── MetricsPanel.jsx           # Панель выбора метрик
├── AxisConfigurator.jsx       # Настройка осей X/Y
├── LayerManager.jsx           # Управление слоями графиков
├── FilterPanel.jsx            # Система фильтров
└── ExportPanel.jsx            # Экспорт графиков
```

#### Backend API
```
api/admin/analytics/constructor/
├── metrics/                   # Доступные метрики
├── chart-data/                # Данные для графиков
├── configs/                   # Сохранение конфигураций
└── templates/                 # Шаблоны графиков
```

### 12.3 Типы поддерживаемых графиков

#### Базовые типы
- **Линейные графики**: Временные ряды, тренды, сравнение периодов
- **Столбчатые диаграммы**: Категориальные данные, распределения
- **Точечные диаграммы**: Корреляции, кластеры, выбросы
- **Пузырьковые диаграммы**: Многомерные данные с размером и цветом

#### Продвинутые визуализации
- **Комбинированные графики**: Сочетание линий и столбцов
- **Диаграммы с областями**: Накопительные данные
- **Геометрические визуализации**: Диаграммы Вороного, тепловые карты

### 12.4 Процесс создания визуализации

#### Шаг 1: Выбор базового измерения (ось X)
```javascript
// Примеры осей X
const timeAxis = {
  type: 'time',
  metric: 'date',
  format: '%Y-%m-%d',
  scale: 'time'
};

const categoryAxis = {
  type: 'category',
  metric: 'pet_species',
  sort: 'count_desc'
};
```

#### Шаг 2: Добавление метрик для анализа (ось Y)
```javascript
// Конфигурация метрики
const revenueMetric = {
  id: 'order_revenue',
  aggregation: 'sum',
  label: 'Выручка',
  color: '#3b82f6',
  chart_type: 'line'
};
```

#### Шаг 3: Настройка слоев и стилей
```javascript
// Конфигурация слоя
const layerConfig = {
  type: 'line',
  data_source: 'revenueMetric',
  style: {
    stroke: '#3b82f6',
    stroke_width: 2,
    opacity: 1
  },
  interpolation: 'monotone'
};
```

### 12.5 Интеллектуальные возможности

#### Автоподбор типа графика
Система анализирует характеристики данных и предлагает оптимальный тип визуализации:

```javascript
function suggestChartType(metrics, dimensions) {
  // Анализ типов данных
  const hasTimeDimension = dimensions.some(d => d.type === 'time');
  const hasNumericMetrics = metrics.some(m => m.data_type === 'decimal');
  const metricsCount = metrics.length;

  if (hasTimeDimension && hasNumericMetrics) {
    return metricsCount > 1 ? 'combo' : 'line';
  }

  if (metricsCount === 2 && metrics.every(m => m.data_type === 'decimal')) {
    return 'scatter';
  }

  return 'bar';
}
```

#### Связка метрик
Автоматическое определение коррелирующих показателей для комплексного анализа:

```javascript
// Рекомендации связанных метрик
const metricRelationships = {
  'user_registrations': ['conversion_rate', 'first_order_date', 'lifetime_value'],
  'order_revenue': ['order_count', 'avg_order_value', 'customer_acquisition_cost'],
  'pet_profiles': ['health_issues', 'feeding_schedule', 'vet_visits']
};
```

### 12.6 Примеры аналитических сценариев

#### Анализ эффективности рекомендаций
```javascript
const recommendationAnalysis = {
  title: 'Эффективность рекомендательной системы',
  axes: {
    x: { metric: 'date', type: 'time' },
    y: [
      { metric: 'clicks_on_recommendations', type: 'line', color: '#3b82f6' },
      { metric: 'conversion_to_purchase', type: 'line', color: '#10b981' },
      { metric: 'avg_order_value', type: 'bar', color: '#f59e0b' }
    ]
  },
  filters: {
    date_range: { start: '2024-01-01', end: '2024-01-31' }
  }
};
```

#### Сравнение поведения владельцев разных питомцев
```javascript
const petOwnerBehavior = {
  title: 'Поведение владельцев по видам питомцев',
  axes: {
    x: { metric: 'pet_species', type: 'category' },
    y: [
      { metric: 'purchase_frequency', type: 'bar', color: '#3b82f6' },
      { metric: 'avg_order_value', type: 'line', color: '#10b981' },
      { metric: 'course_completion_rate', type: 'scatter', color: '#8b5cf6' }
    ]
  },
  layers: [
    { type: 'bar', data: 'purchase_frequency' },
    { type: 'line', data: 'avg_order_value' },
    { type: 'points', data: 'course_completion_rate' }
  ]
};
```

### 12.7 Производительность и оптимизация

#### Кэширование запросов
```python
# Redis кэш для результатов конструктора
CHART_DATA_CACHE_KEY = "chart_constructor:{config_hash}:{user_id}"
CHART_DATA_CACHE_TTL = 600  # 10 минут

# Инвалидация при изменениях данных
@receiver(post_save, sender=Order)
def invalidate_chart_cache(sender, instance, **kwargs):
    cache.delete_pattern("chart_constructor:*")
```

#### Материализованные представления
```sql
-- Оптимизированное представление для конструктора
CREATE MATERIALIZED VIEW chart_constructor_data AS
SELECT
    DATE(created_at) as date,
    'users' as category,
    COUNT(*) as registrations,
    NULL as orders,
    NULL as revenue,
    NULL as pets
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)

UNION ALL

SELECT
    DATE(created_at) as date,
    'orders' as category,
    NULL as registrations,
    COUNT(*) as orders,
    SUM(total_amount) as revenue,
    NULL as pets
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at);
```

### 12.8 Безопасность и контроль доступа

#### Права доступа к метрикам
```python
class ChartConstructorPermissions:
    CAN_USE_CONSTRUCTOR = 'analytics.can_use_chart_constructor'
    CAN_VIEW_ALL_METRICS = 'analytics.can_view_all_metrics'
    CAN_SAVE_PUBLIC_TEMPLATES = 'analytics.can_save_public_templates'
    CAN_EXPORT_CHART_DATA = 'analytics.can_export_chart_data'
```

#### Валидация конфигураций
```python
def validate_chart_config(config, user):
    """Валидация конфигурации графика на безопасность"""

    # Проверка доступа к метрикам
    allowed_metrics = get_user_allowed_metrics(user)
    for layer in config.get('layers', []):
        if layer['metric'] not in allowed_metrics:
            raise ValidationError(f"Доступ к метрике {layer['metric']} запрещен")

    # Ограничение размера данных
    if config.get('data_limit', 0) > MAX_CHART_DATA_LIMIT:
        config['data_limit'] = MAX_CHART_DATA_LIMIT

    return config
```

### 12.9 API конструктора

#### Получение доступных метрик
```http
GET /api/admin/analytics/constructor/metrics/
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "categories": [
    {
      "name": "Пользователи",
      "metrics": [
        {
          "id": "user_registrations",
          "name": "Регистрации пользователей",
          "data_type": "integer",
          "dimensions": ["date", "source"],
          "aggregations": ["count", "sum"]
        }
      ]
    }
  ]
}
```

#### Получение данных для графика
```http
POST /api/admin/analytics/constructor/data/
Content-Type: application/json
Authorization: Bearer <token>
```

**Тело запроса:**
```json
{
  "config": {
    "axes": {
      "x": {"metric": "date", "type": "time"},
      "y": [{"metric": "user_registrations", "aggregation": "count"}]
    },
    "filters": {
      "date_range": {"start": "2024-01-01", "end": "2024-01-31"}
    }
  },
  "data_limit": 10000
}
```

### 12.10 Интеграция с существующей системой

#### Совместимость с текущими метриками
Конструктор полностью совместим с существующей системой метрик и использует те же источники данных:

```python
# Интеграция с существующими моделями
class ChartConstructorService:
    def get_available_metrics(self):
        """Получение всех доступных метрик из системы"""

        metrics = []

        # Метрики пользователей
        metrics.extend(self.get_user_metrics())

        # Метрики заказов
        metrics.extend(self.get_order_metrics())

        # Метрики питомцев
        metrics.extend(self.get_pet_metrics())

        # Метрики курсов
        metrics.extend(self.get_course_metrics())

        return metrics
```

---

## Заключение

Данная система метрик предоставляет комплексный инструмент для анализа бизнеса платформы "Питомец+". Она охватывает все ключевые аспекты:

- **Пользовательский опыт**: от регистрации до повторных покупок
- **Продуктовые метрики**: эффективность товаров и курсов
- **Финансовые показатели**: выручка, LTV, ROI
- **Операционные метрики**: эффективность процессов, качество обслуживания

Реализация данной системы позволит принимать data-driven решения и оптимизировать бизнес-процессы платформы.

## Следующие шаги

1. **Приоритизация метрик**: Определить 20% метрик, дающих 80% инсайтов
2. **Пилотная реализация**: Начать с дашборда основных KPI
3. **Итеративная разработка**: Добавлять метрики по мере роста бизнеса
4. **A/B тестирование**: Проверять эффективность аналитики для принятия решений
5. **Автоматизация**: Настроить автоматические отчеты и алерты

---

*Документ создан: Январь 2026*
*Автор: Старший продуктовый аналитик и архитектор метрик*
*Платформа: Питомец+ (Pet Care Platform)*
