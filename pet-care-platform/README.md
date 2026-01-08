# 🐾 Питомец+ MVP

Комплексная экосистема для владельцев домашних животных с персонализацией PetID, магазином товаров, образовательной платформой и современной React админ-панелью.

## 🚀 Быстрый старт

### Полная настройка проекта (первый запуск)
```batch
REM Настройка виртуального окружения, установка зависимостей, миграции
setup-project.bat
```

### Автоматический запуск всех сервисов
```batch
REM Запускает бэкенд и фронтенд в отдельных окнах
start-all.bat
```

### Ручной запуск

#### 1. Запуск бэкенда
```batch
start-backend.bat
```

#### 2. Запуск фронтенда (в новом окне командной строки)
```batch
start-frontend.bat
```

## 🌐 Доступ после запуска

- **Основной сайт**: http://localhost:5174
- **API бэкенда**: http://localhost:8001/api/
- **Django админка**: http://localhost:8001/admin/
- **React админка**: http://localhost:5174/admin/dashboard
- **Конструктор курсов**: http://localhost:5174/admin/courses
- **Конструктор курсов**: http://localhost:5174/admin/courses

## 👤 Тестовый аккаунт

После запуска будет автоматически создан суперпользователь:
- **Логин**: admin
- **Email**: admin@example.com
- **Пароль**: admin123

## 📋 Возможности

### 🏠 Основные модули
- **PetID**: Цифровой паспорт питомца с персонализацией
- **Магазин**: Каталог товаров с рекомендациями
- **Образовательная платформа**: Курсы обучения с прогрессом
- **Конструктор курсов**: Визуальный drag-and-drop редактор контента
- **Обучение**: Курсы и конструктор контента
- **Персонализация**: Рекомендации на основе профиля питомца

### ⚙️ Админ-панель (новая React версия)
- **Интерактивная аналитика**: Chart.js графики с drill-down
- **Управление данными**: CRUD операции с drag-and-drop
- **Экспорт данных**: CSV, Excel, PDF, JSON форматы
- **Ролевая система**: Разные дашборды для admin/manager/staff
- **Real-time обновления**: Автообновление каждые 5 минут

## 🛠️ Технологии

### Backend
- Django 5.1.5 (LTS) + Django REST Framework 3.15.2
- PostgreSQL 15+ + UUIDv7
- Кастомные QuerySet менеджеры
- Service Layer архитектура
- Кэширование (LocMemCache/Redis)
- Структурированное логирование

### Frontend
- React 18.2.0 + Vite 5.0.0
- Tailwind CSS + Chart.js
- Zustand 4.4.7 для state management
- Drag-and-drop с @dnd-kit
- Lazy Loading и Code Splitting

## 📚 Документация

### Основная документация
- [docs/README.md](./docs/README.md) - Структура документации
- [docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) - Полная документация проекта
- [docs/REFACTORING_SUMMARY.md](./docs/REFACTORING_SUMMARY.md) - Сводка по рефакторингу
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) - История изменений

### Техническая документация
- [docs/DJANGO_5_UPGRADE_GUIDE.md](./docs/DJANGO_5_UPGRADE_GUIDE.md) - Руководство по обновлению Django
- [docs/QUERY_OPTIMIZATION.md](./docs/QUERY_OPTIMIZATION.md) - Оптимизация запросов
- [docs/SERVICE_LAYER.md](./docs/SERVICE_LAYER.md) - Сервисный слой
- [docs/CACHING.md](./docs/CACHING.md) - Кэширование
- [docs/LOGGING.md](./docs/LOGGING.md) - Логирование
- [docs/ERROR_HANDLING.md](./docs/ERROR_HANDLING.md) - Обработка ошибок

### Frontend документация
- [docs/FRONTEND_STORES.md](./docs/FRONTEND_STORES.md) - Zustand stores
- [docs/FRONTEND_ERROR_HANDLING.md](./docs/FRONTEND_ERROR_HANDLING.md) - Обработка ошибок
- [docs/BUNDLE_OPTIMIZATION.md](./docs/BUNDLE_OPTIMIZATION.md) - Оптимизация бандла
- [docs/TYPING.md](./docs/TYPING.md) - Типизация компонентов

### Тестирование
- [docs/TEST_SCENARIOS.md](./docs/TEST_SCENARIOS.md) - Тестовые сценарии
- [docs/TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md) - Стратегия тестирования
- [docs/API_TESTS.md](./docs/API_TESTS.md) - Тестирование API
- [docs/LOAD_TESTING.md](./docs/LOAD_TESTING.md) - Нагрузочное тестирование

### Развертывание
- [docs/deployment/](./docs/deployment/) - Скрипты развертывания
- [docs/BACKUP_RESTORE.md](./docs/BACKUP_RESTORE.md) - Резервное копирование

## 🐛 Проблемы?

1. Убедитесь что PostgreSQL запущен
2. Проверьте настройки в `backend/.env`
3. Попробуйте запустить скрипты по отдельности

## 📄 Лицензия

MIT License - свободно для использования и модификации.

