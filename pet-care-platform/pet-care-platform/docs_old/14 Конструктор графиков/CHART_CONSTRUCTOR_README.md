# Конструктор аналитических графиков

## Обзор

Конструктор аналитических графиков - это мощная система для создания интерактивных визуализаций данных в админ-панели платформы "Питомец+". Система предоставляет администраторам возможность строить сложные аналитические дашборды без необходимости программирования.

## 🚀 Ключевые возможности

### 📊 Типы графиков
- **Линейные графики** - тренды и временные ряды
- **Столбчатые диаграммы** - сравнение категорий
- **Точечные диаграммы** - поиск корреляций
- **Пузырьковые диаграммы** - многомерные данные
- **Диаграммы с областями** - накопительные данные
- **Комбинированные графики** - несколько типов в одном

### ⚡ Производительность
- **Виртуализация данных** - обработка миллионов точек
- **Web Workers** - асинхронные вычисления
- **Кэширование** - быстрая загрузка данных
- **Ленивая загрузка** - оптимизация начальной загрузки

### 🎨 Интерфейс
- **Drag & Drop** - интуитивное перетаскивание метрик
- **Real-time preview** - мгновенная визуализация
- **Responsive design** - адаптация под все устройства
- **Accessibility** - поддержка скрин-ридеров

### 🔧 Расширенные возможности
- **Многослойные графики** - наложение нескольких визуализаций
- **Интеллектуальные фильтры** - динамическая фильтрация данных
- **Экспорт** - PNG, SVG, PDF форматы
- **Шаблоны** - сохранение и повторное использование

## 📋 Системные требования

### Frontend
- Node.js 16+
- npm или yarn
- Современный браузер с поддержкой ES2020

### Backend
- Python 3.8+
- Django 4.2+
- PostgreSQL 12+
- Redis (опционально, с заглушкой)

## 🛠️ Установка и запуск

### Автоматическое развертывание

```bash
# Запуск полного развертывания
./deploy-final.sh

# Или отдельные этапы
./deploy-final.sh backup    # Создание резервной копии
./deploy-final.sh test      # Запуск тестов
./deploy-final.sh check     # Финальная проверка
```

### Ручная установка

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py initialize_analytics_metrics
python manage.py runserver
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📖 Использование

### Создание первого графика

1. **Перейдите в админ-панель** и откройте "Конструктор графиков"
2. **Выберите метрики** из библиотеки в левой панели
3. **Перетащите метрику** на ось X или Y
4. **Выберите тип графика** в верхней панели
5. **Настройте фильтры** для уточнения данных
6. **Сохраните график** или экспортируйте

### Расширенные возможности

#### Многослойные графики
```
1. Добавьте несколько метрик
2. Перейдите во вкладку "Слои"
3. Настройте цвет и стиль каждого слоя
4. Управляйте порядком наложения
```

#### Фильтры и сегментация
```
- Дата: быстрый выбор периодов
- Категории: фильтр по типам данных
- Диапазоны: числовые ограничения
- Пользовательские: произвольные условия
```

#### Экспорт и публикация
```
Форматы: PNG, SVG, PDF
Настройки: размер, качество, легенда
Интеграция: встраивание в отчеты
```

## 🔧 API Reference

### Метрики

#### Получение списка метрик
```http
GET /admin/analytics/metrics/
```

#### Создание метрики
```http
POST /admin/analytics/metrics/
Content-Type: application/json

{
  "id": "custom_metric",
  "name": "Пользовательская метрика",
  "category": "custom",
  "data_type": "integer",
  "sql_template": "SELECT COUNT(*) FROM custom_table WHERE date >= '{{start_date}}'"
}
```

### Данные графиков

#### Получение данных
```http
POST /admin/analytics/constructor/data/
Content-Type: application/json

{
  "config": {
    "metrics": [{"id": "users_count", "field": "value"}],
    "dimensions": [],
    "filters": {"date_range": {"start": "2024-01-01", "end": "2024-12-31"}},
    "limit": 1000
  },
  "data_limit": 1000
}
```

#### Сохранение конфигурации
```http
POST /admin/analytics/constructor/configs/
Content-Type: application/json

{
  "name": "Продажи по месяцам",
  "config": {
    "type": "bar",
    "axes": {
      "x": {"field": "month", "type": "band"},
      "y": [{"field": "sales", "type": "linear"}]
    }
  },
  "is_template": false
}
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Frontend тесты
cd frontend
npm run test          # Интерактивный режим
npm run test:run      # Одноразовый запуск
npm run test:coverage # С покрытием

# Backend тесты
cd backend
python manage.py test

# Финальный интеграционный тест
cd frontend
npm run test:final
```

### Структура тестов

```
frontend/src/test/
├── unit/                    # Unit тесты компонентов
├── integration/            # Интеграционные тесты
├── performance/            # Performance тесты
├── e2e/                    # End-to-end тесты
├── utils/                  # Тестовые утилиты
└── final-integration.test.tsx # Финальный интеграционный тест
```

## 📊 Мониторинг производительности

### Метрики производительности

- **Время рендеринга**: < 50ms для типичных графиков
- **FPS**: > 50 кадров в секунду
- **Использование памяти**: < 100MB для больших датасетов
- **Время загрузки**: < 2s для начальной загрузки

### Мониторинг

```javascript
// Включение мониторинга производительности
import { performanceMonitor } from './utils/virtualization'

// Получение статистики
const stats = performanceMonitor.getStats()
console.log('Performance stats:', stats)

// Рекомендации по оптимизации
const recommendations = performanceMonitor.getOptimizationRecommendations()
```

## 🔒 Безопасность

### Аутентификация и авторизация
- JWT токены для API доступа
- Ролевая модель (staff/superuser)
- CSRF защита для форм

### Валидация данных
- Санитизация SQL запросов
- Ограничение размера датасетов
- Валидация конфигураций графиков

### Аудит и логирование
- Логирование всех операций
- Аудит изменений конфигураций
- Мониторинг производительности

## 🚀 Оптимизации

### Виртуализация данных
```javascript
import { dataVirtualizer } from './utils/virtualization'

const result = dataVirtualizer.virtualizeData(largeDataset, config)
// Автоматически уменьшает датасет до 1000 точек
```

### Web Workers
```javascript
import { chartWorker } from './utils/virtualization'

const stats = await chartWorker.run('calculateStatistics', data, config)
// Вычисления выполняются в фоне
```

### Кэширование
```javascript
import { get, set } from './utils/cache'

const cached = get(cacheKey)
if (!cached) {
  const data = await fetchData()
  set(cacheKey, data, 300000) // 5 минут
}
```

## 🐛 Устранение неполадок

### Распространенные проблемы

#### График не отображается
```
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что метрики выбраны
3. Проверьте конфигурацию осей
4. Попробуйте сбросить фильтры
```

#### Медленная загрузка
```
1. Включите виртуализацию для больших датасетов
2. Проверьте подключение к Redis
3. Очистите кэш браузера
4. Используйте прогрессивную загрузку
```

#### Ошибки экспорта
```
1. Проверьте поддержку Canvas API
2. Убедитесь в наличии достаточной памяти
3. Попробуйте меньший размер графика
4. Проверьте CORS настройки
```

### Логи и отладка

```bash
# Логи frontend
cd frontend && npm run dev

# Логи backend
cd backend && python manage.py runserver --verbosity=2

# Performance логи
# Откройте монитор производительности в интерфейсе
```

## 📚 Документация

### Архитектура системы
- `docs/TZ/chart-constructor-specification.md` - Техническое задание
- `docs/ANALYTICS_METRICS_GUIDE.md` - Руководство по метрикам

### API документация
- Swagger UI: `/admin/analytics/docs/`
- OpenAPI спецификация: `/admin/analytics/schema/`

### Примеры использования
```javascript
// Простой линейный график
const config = {
  type: 'line',
  axes: {
    x: { field: 'date', type: 'time' },
    y: [{ field: 'value', type: 'linear', color: '#3b82f6' }]
  }
}

// Многослойный график
const multiLayerConfig = {
  layers: [
    { type: 'line', style: { stroke: '#3b82f6' } },
    { type: 'bar', style: { fill: '#10b981' } }
  ]
}
```

## 🤝 Поддержка

### Сообщество
- **Issues**: Создавайте тикеты на GitHub
- **Discussions**: Обсуждение идей и предложений
- **Wiki**: Подробная документация

### Контакты
- **Email**: support@pitomets-plus.ru
- **Telegram**: @pitomets_support
- **Документация**: docs.pitomets-plus.ru

## 📈 Roadmap

### Предстоящие возможности
- [ ] AI-powered insights (автоматический анализ данных)
- [ ] Real-time dashboards (постоянное обновление)
- [ ] Collaboration features (совместная работа)
- [ ] Mobile app (нативное мобильное приложение)
- [ ] Advanced analytics (прогнозирование, кластерный анализ)

### v2.0 планируемые улучшения
- [ ] 3D визуализации
- [ ] Географические карты
- [ ] Кастомные темы оформления
- [ ] Интеграция с внешними источниками данных
- [ ] Advanced filtering с машинным обучением

---

**Лицензия**: MIT
**Версия**: 1.0.0
**Дата релиза**: $(date +%Y-%m-%d)
