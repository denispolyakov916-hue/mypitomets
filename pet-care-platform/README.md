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
- Django 4.2.8 + Django REST Framework
- PostgreSQL + UUIDv7
- Кастомные QuerySet менеджеры
- Service Layer архитектура

### Frontend
- React 18 + Vite
- Tailwind CSS + Chart.js
- Zustand для state management
- Drag-and-drop с @dnd-kit

## 📚 Документация

- [README_START.md](./README_START.md) - Быстрый старт с новыми скриптами
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Полная документация проекта
- [COURSE_BUILDER_TECHNICAL_SPECIFICATION.md](./COURSE_BUILDER_TECHNICAL_SPECIFICATION.md) - Техническое задание конструктора курсов
- [COURSES_IMPLEMENTATION_CONTEXT.md](./COURSES_IMPLEMENTATION_CONTEXT.md) - Контекст реализации курсов
- [admin-redesign-context.md](./admin-redesign-context.md) - Детали редизайна админки

## 🐛 Проблемы?

1. Убедитесь что PostgreSQL запущен
2. Проверьте настройки в `backend/.env`
3. Попробуйте запустить скрипты по отдельности

## 📄 Лицензия

MIT License - свободно для использования и модификации.

