# Решение проблем - Питомец+

## Проблема: Фронтенд не подключен к бэкенду

### Симптомы
- Фронтенд запускается, но не может получить данные с бэкенда
- Ошибки CORS в консоли браузера
- Запросы к API не проходят

### Решение

#### 1. Настройка переменных окружения

**Фронтенд** требует файл `.env` с URL бэкенда:

```bash
# В папке frontend создайте файл .env:
VITE_API_URL=http://localhost:8000/api
```

**Быстрая настройка**: Запустите `setup_cors.bat` - он создаст `.env` автоматически.

#### 2. Настройка CORS в Django

В файле `backend/config/settings.py` должны быть настройки:

```python
DEBUG = True  # Для разработки

CORS_ALLOW_ALL_ORIGINS = DEBUG  # Разрешает все источники в режиме DEBUG

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True
```

#### 3. Установка зависимостей

Если бэкенд не запускается из-за ошибки **"Pillow is not installed"**:

```bash
cd backend
venv\Scripts\activate
pip install Pillow
```

### Проверка

1. **Бэкенд работает**: http://localhost:8000/api/
2. **Фронтенд работает**: http://localhost:5173
3. **Консоль браузера** (F12): не должно быть ошибок CORS

### Быстрый перезапуск

Используйте `restart_services.bat` для быстрого перезапуска сервисов без настройки БД.

---

## Другие проблемы

### База данных не подключается

Проверьте настройки PostgreSQL в `backend/config/settings.py`:

```python
DATABASES = {
    'default': {
        'NAME': 'pitomets_db',
        'USER': 'pitomets',
        'PASSWORD': 'pitomets_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Порты заняты

Проверьте, какие процессы используют порты:

```bash
# Проверка порта 8000 (бэкенд)
netstat -ano | findstr :8000

# Проверка порта 5173 (фронтенд)
netstat -ano | findstr :5173

# Остановка процесса по PID
taskkill /F /PID <номер_процесса>
```

