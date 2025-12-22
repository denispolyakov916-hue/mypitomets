# 📋 Настройка GitHub Projects

## Автоматическое управление задачами

### 1. Создание Project Board

1. Перейдите в раздел **Projects** вашего репозитория
2. Нажмите **New project**
3. Выберите шаблон **Board** или **Table**

### 2. Настройка автоматизации

#### Рекомендуемая структура проекта:

**Колонки:**
- 📋 **Backlog** - Новые задачи
- 🔄 **In Progress** - В работе
- ✅ **In Review** - На ревью
- 🎉 **Done** - Завершено

**Автоматизации:**
- Автоматически добавлять иссуе с лейблами: `enhancement`, `bug`, `documentation`
- Перемещать иссуе в "In Progress" при назначении
- Перемещать в "In Review" при создании PR
- Перемещать в "Done" при закрытии иссуе/PR

### 3. Настройка лейблов

Рекомендуемые лейблы для классификации задач:

**Приоритет:**
- 🔴 `priority-high` - Высокий приоритет
- 🟡 `priority-medium` - Средний приоритет
- 🟢 `priority-low` - Низкий приоритет

**Тип:**
- 🐛 `bug` - Исправление ошибки
- ✨ `enhancement` - Улучшение/новая функция
- 📚 `documentation` - Документация
- 🔧 `maintenance` - Техническое обслуживание
- 🧪 `testing` - Тестирование

**Статус:**
- 🚀 `ready-for-dev` - Готово к разработке
- 🔄 `in-progress` - В работе
- 👀 `needs-review` - Требует ревью
- ✅ `completed` - Завершено

**Компоненты:**
- 🖥️ `backend` - Backend задачи
- 💻 `frontend` - Frontend задачи
- 🔗 `api` - API интеграция
- 🎨 `ui-ux` - UI/UX дизайн

### 4. Рабочий процесс

#### Для новой задачи:
1. Создать issue с соответствующим лейблом
2. Issue автоматически добавляется в проект
3. Назначить ответственного
4. Переместить в "In Progress"
5. Создать ветку для работы
6. После завершения создать PR
7. После мерджа закрыть issue

#### Еженедельный ритуал:
- **Понедельник:** Планирование недели, распределение задач
- **Пятница:** Ревью выполненного, планирование следующей недели

### 5. Мониторинг прогресса

Используйте встроенные метрики GitHub Projects:
- **Burn-down chart** - Отслеживание прогресса
- **Velocity** - Скорость команды
- **Cycle time** - Время от создания до завершения задачи

### 6. Интеграция с командами

- **Backend разработчик:** Отвечает за лейбл `backend`
- **Frontend разработчик:** Отвечает за лейбл `frontend`
- **Оба:** Отвечают за лейблы `api`, `testing`

## Полезные ссылки

- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [Project automation](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project)
- [Managing projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project)
