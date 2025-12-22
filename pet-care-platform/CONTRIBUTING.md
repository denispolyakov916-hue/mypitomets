# 🤝 Contributing to Питомец+

Спасибо за интерес к проекту! Мы приветствуем вклад от сообщества.

## 🚀 Быстрый старт

### 1. Подготовка окружения

```bash
# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/pet-care-platform.git
cd pet-care-platform

# Запустить проект
# Windows
.\sync_after_pull.bat

# Linux/Mac
./sync_after_pull.sh
```

### 2. Создать ветку для работы

```bash
# Для новой функциональности
git checkout -b feature/your-feature-name

# Для исправления бага
git checkout -b bugfix/issue-number-description

# Для документации
git checkout -b docs/update-readme
```

## 📝 Правила работы с кодом

### Коммиты

Используйте понятные сообщения коммитов:

```bash
# Хорошо
git commit -m "feat: add pet vaccination tracking"

# Плохо
git commit -m "fix bug"
```

**Формат:** `type(scope): description`

- **type:** feat, fix, docs, style, refactor, test, chore
- **scope:** backend, frontend, api, ui, etc.
- **description:** краткое описание изменений

### Pull Requests

1. **Обновите свою ветку** с main/develop перед созданием PR
2. **Заполните шаблон PR** полностью
3. **Добавьте тесты** для новых функций
4. **Обновите документацию** если нужно
5. **Проверьте линтинг** и тесты

## 🏗️ Архитектура проекта

### Backend (Django)
```
backend/
├── apps/           # Django приложения
├── config/         # Настройки Django
├── core/           # Общие компоненты
└── manage.py
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── api/        # API клиенты
│   ├── components/ # React компоненты
│   ├── pages/      # Страницы приложения
│   ├── store/      # Состояние (Zustand)
│   └── utils/      # Утилиты
└── package.json
```

## 🧪 Тестирование

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd frontend
npm test
```

## 📋 Чеклист перед PR

- [ ] Код соответствует стилю проекта
- [ ] Добавлены/обновлены тесты
- [ ] Документация обновлена
- [ ] Миграции созданы (для backend)
- [ ] Переменные окружения задокументированы
- [ ] Локально все работает

## 🔧 Настройка среды разработки

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 📚 Документация

- [README.md](README.md) - основная документация
- [GIT_GUIDE.md](GIT_GUIDE.md) - работа с Git
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - структура проекта

## 🤔 Нужна помощь?

- Создайте [issue](https://github.com/YOUR_USERNAME/pet-care-platform/issues) с вопросом
- Присоединяйтесь к обсуждению в существующих issues
- Проверьте [TROUBLESHOOTING.md](TROUBLESHOOTING.md) для решения проблем

## 📜 Кодекс поведения

Мы следуем принципу уважительного общения. Будьте вежливы и конструктивны в коммуникации.

## 📄 Лицензия

Внося вклад в проект, вы соглашаетесь с тем, что ваш код будет опубликован под той же лицензией, что и проект.
