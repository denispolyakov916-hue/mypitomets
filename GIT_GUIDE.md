# Руководство по работе с Git и синхронизации проекта

## Структура веток

**Постоянные ветки:**
- `main` - стабильная версия для продакшна
- `develop` - основная ветка разработки

**Временные ветки:**
- `feature/название-задачи` - для новых фич
- Создаются под задачу, удаляются после мержа

## Первоначальная настройка

### 1. Клонирование и настройка окружения

```bash
git clone <repository-url>
cd pet-care-platform
```

### 2. Backend (Windows / Linux)

**Первый запуск (настройка):**

```bash
cd backend

# Создание виртуального окружения
# Windows:
python -m venv venv
.\venv\Scripts\activate
# Linux:
python3 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Создание .env из шаблона
# Windows:
copy .env.example .env
# Linux:
cp .env.example .env

# Настройка БД
# Windows:
.\setup_database.bat
# Linux:
chmod +x setup_db.sh
./setup_db.sh

# Применение миграций
python manage.py migrate
```

**Запуск бэкенда:**

```bash
cd backend

# Windows:
.\start_backend.bat

# Linux (первый раз сделать исполняемым):
chmod +x start_backend.sh
./start_backend.sh
```

### 3. Frontend (Windows / Linux)

**Первый запуск (настройка):**

```bash
cd frontend

# Установка зависимостей
npm install

# Создание .env из шаблона
# Windows:
copy .env.example .env
# Linux:
cp .env.example .env

# Отредактируйте .env, указав URL бэкенда
```

**Запуск фронтенда:**

```bash
cd frontend

# Windows:
.\start_frontend.bat

# Linux (первый раз сделать исполняемым):
chmod +x start_frontend.sh
./start_frontend.sh
```

**Примечание для Linux:** После первого `chmod +x` скрипты будут исполняемыми, повторно делать не нужно.

## Ежедневный workflow

### Начало работы (ОБЯЗАТЕЛЬНО)

```bash
# 1. Переключиться на develop
git switch develop

# 2. Получить последние изменения
git pull origin develop

# 3. Синхронизация проекта (применит миграции, обновит зависимости)
# Windows:
.\sync_after_pull.bat
# Linux:
chmod +x sync_after_pull.sh  # первый раз
./sync_after_pull.sh

# 4. Создать ветку для задачи
git switch -c feature/название-задачи
```

**Примеры названий веток:**
- `feature/backend-user-auth`
- `feature/frontend-login-page`
- `feature/fix-api-call`

### Работа над задачей

```bash
# Проверить статус
git status

# Добавить изменения
git add .                    # все файлы
git add путь/к/файлу         # конкретный файл

# Создать коммит
git commit -m "Описание что сделано"

# Отправить на сервер
git push origin feature/название-задачи
```

### Завершение задачи

```bash
# 1. Вернуться на develop
git switch develop

# 2. Получить последние изменения
git pull origin develop

# 3. Влить свою ветку
git merge feature/название-задачи

# 4. Отправить изменения
git push origin develop

# 5. Удалить локальную ветку
git branch -d feature/название-задачи
```

## Работа с миграциями БД

### Создание миграций

```bash
cd backend
# Windows:
.\venv\Scripts\activate
# Linux:
source venv/bin/activate

# После изменения models.py
python manage.py makemigrations
python manage.py migrate  # применить локально

# Добавить миграции в Git
git add apps/*/migrations/
git commit -m "Migration: описание изменений"
git push
```

### Применение миграций после pull

```bash
# Автоматически через sync_after_pull.bat (Windows)
# Или вручную:
cd backend
# Windows:
.\venv\Scripts\activate
# Linux:
source venv/bin/activate
python manage.py migrate
```

**Правила:**
- ✅ ВСЕГДА коммитьте миграции вместе с изменениями моделей
- ❌ НЕ редактируйте миграции вручную
- ❌ НЕ удаляйте миграции без согласования

## Работа с зависимостями

### Backend

```bash
cd backend
# Windows:
.\venv\Scripts\activate
# Linux:
source venv/bin/activate

# Установить новую зависимость
pip install package-name

# Обновить requirements.txt
pip freeze > requirements.txt

# Закоммитить
git add requirements.txt
git commit -m "Add package-name"
```

### Frontend

```bash
cd frontend

# Установить зависимость
npm install package-name

# package.json и package-lock.json обновятся автоматически
git add package.json package-lock.json
git commit -m "Add package-name"
```

## Настройка .env файлов

### Синхронизация между разработчиками

`.env` файлы коммитятся в Git для синхронизации настроек команды.

**Для личных настроек используйте `.env.local`** (не коммитится):
- `backend/.env.local` - переопределения для бэкенда
- `frontend/.env.local` - переопределения для фронтенда

### Настройка IP адресов (работа в одной сети)

**На компьютере с бэкендом:**
1. Узнайте IP: `ipconfig` (Windows) или `ifconfig` (Linux)
2. В `backend/.env` добавьте IP в `ALLOWED_HOSTS`:
   ```
   ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,192.168.1.139
   ```
3. Запустите: `python manage.py runserver 0.0.0.0:8000`

**На компьютере с фронтендом:**
В `frontend/.env` укажите: `VITE_API_URL=http://192.168.1.139:8000/api`

## Основные команды Git

### Навигация
```bash
git switch ветка                # Переключиться на ветку
git switch -c новая-ветка       # Создать и переключиться
git branch                      # Список локальных веток
git branch -a                   # Все ветки
```

### Работа с изменениями
```bash
git status                       # Статус изменений
git add .                        # Добавить все
git add файл                     # Добавить конкретный файл
git commit -m "Сообщение"        # Создать коммит
git push origin ветка            # Отправить на сервер
git pull origin ветка            # Получить с сервера
```

### Просмотр
```bash
git log                          # История коммитов
git log --oneline                # Краткая история
git diff                         # Изменения в рабочей директории
git diff --staged                # Изменения в staging
```

## Решение конфликтов

### Конфликты при merge/pull

```bash
# 1. Git покажет файлы с конфликтами
# 2. Откройте файлы, найдите маркеры:
#    <<<<<<< HEAD
#    ваш код
#    =======
#    чужой код
#    >>>>>>> branch-name
# 3. Выберите нужный код, удалите маркеры
# 4. Сохраните файл
git add файл-с-конфликтом
git commit -m "Resolve conflict"
```

### Конфликты в миграциях

```bash
# Удалить конфликтующие миграции (кроме __init__.py)
# Windows:
del apps\*\migrations\0*.py
# Linux:
rm apps/*/migrations/0*.py

# Создать новые миграции
python manage.py makemigrations
python manage.py migrate

# Закоммитить
git add apps/*/migrations/
git commit -m "Resolve migration conflicts"
```

## Удаление веток

### Локальная ветка
```bash
git branch -d branch_name        # Безопасное удаление
git branch -D branch_name        # Принудительное удаление
```

### Удалённая ветка
```bash
git push origin --delete branch_name
```

### Очистка ссылок
```bash
git fetch --prune
```

## Правила работы

✅ **ОБЯЗАТЕЛЬНО:**
- Всегда `git pull` перед началом работы
- Использовать `sync_after_pull.bat` (Windows) или `sync_after_pull.sh` (Linux) после pull
- Создавать feature-ветку для каждой задачи
- Коммитить миграции вместе с изменениями моделей
- Коммитить только рабочий код
- Понятные сообщения коммитов

❌ **НЕ ДЕЛАЙ:**
- Коммиты напрямую в `main` или `develop`
- Начинать работу без `pull` и синхронизации
- Коммитить сломанный код
- Редактировать миграции вручную
- Игнорировать конфликты

## Быстрая шпаргалка

```
Начало дня:
  git switch develop
  git pull origin develop
  .\sync_after_pull.bat (Windows) или ./sync_after_pull.sh (Linux)
  git switch -c feature/задача

Работа:
  git add .
  git commit -m "..."
  git push origin feature/задача

Завершение:
  git switch develop
  git pull origin develop
  git merge feature/задача
  git push origin develop
  git branch -d feature/задача
```

## Различия Windows/Linux

| Действие | Windows | Linux |
|----------|---------|-------|
| Активация venv | `.\venv\Scripts\activate` | `source venv/bin/activate` |
| Копирование файла | `copy file1 file2` | `cp file1 file2` |
| Синхронизация | `.\sync_after_pull.bat` | `./sync_after_pull.sh` |
| Запуск бэкенда | `.\start_backend.bat` | `./start_backend.sh` |
| Запуск фронтенда | `.\start_frontend.bat` | `./start_frontend.sh` |
| Узнать IP | `ipconfig` | `ifconfig` или `ip addr` |
| Удалить файлы | `del path\*.py` | `rm path/*.py` |
