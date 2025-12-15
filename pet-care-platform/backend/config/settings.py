"""
Настройки Django для MVP Питомец+

Этот конфигурационный файл содержит все настройки для запуска
MVP версии платформы для владельцев домашних животных.

Ключевые особенности:
- JWT-аутентификация
- CORS для связи с фронтендом
- In-memory хранилище данных (база данных не требуется для MVP)
- Настройки для разработки

Заметка по безопасности:
    В продакшене все секретные ключи и конфиденциальные данные
    должны загружаться из переменных окружения, а не быть захардкожены.
"""

import os
from pathlib import Path
from datetime import timedelta

# =============================================================================
# БАЗОВАЯ КОНФИГУРАЦИЯ
# =============================================================================

# Базовый путь проекта: BASE_DIR / 'subdir'
BASE_DIR = Path(__file__).resolve().parent.parent

# ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ: держите секретный ключ в тайне в продакшене!
# Для MVP используется захардкоженный ключ. В продакшене используйте:
# SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
SECRET_KEY = 'django-insecure-mvp-key-change-in-production-pitomets-plus-2024'

# ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ: не запускайте с DEBUG=True в продакшене!
DEBUG = True

# Хосты, которым разрешён доступ к приложению
# Для MVP разрешаем localhost соединения
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# =============================================================================
# ОПРЕДЕЛЕНИЕ ПРИЛОЖЕНИЙ
# =============================================================================

INSTALLED_APPS = [
    # Встроенные приложения Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Сторонние приложения
    'rest_framework',           # Django REST Framework для API
    'rest_framework_simplejwt', # JWT аутентификация
    'corsheaders',              # CORS заголовки для фронтенда
    
    # Приложения проекта - каждое представляет бизнес-модуль
    'apps.users',               # Аутентификация и профили пользователей
    'apps.pets',                # PetID - центральный модуль
    'apps.shop',                # Магазин, корзина, заказы
    'apps.training',            # Образовательные курсы
]

MIDDLEWARE = [
    # CORS middleware должен быть размещён перед CommonMiddleware
    'corsheaders.middleware.CorsMiddleware',
    
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# =============================================================================
# КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ
# =============================================================================

# Для MVP используем SQLite, который не требует настройки
# Все бизнес-данные хранятся в памяти в data_store.py
# SQLite используется только для внутренних нужд Django (сессии и т.д.)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# =============================================================================
# ВАЛИДАЦИЯ ПАРОЛЕЙ
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 6,  # Упрощено для тестирования MVP
        }
    },
]

# =============================================================================
# ИНТЕРНАЦИОНАЛИЗАЦИЯ
# =============================================================================

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

# =============================================================================
# СТАТИЧЕСКИЕ ФАЙЛЫ
# =============================================================================

STATIC_URL = 'static/'

# =============================================================================
# ТИП ПЕРВИЧНОГО КЛЮЧА ПО УМОЛЧАНИЮ
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
# КОНФИГУРАЦИЯ DJANGO REST FRAMEWORK
# =============================================================================

REST_FRAMEWORK = {
    # Аутентификация по умолчанию через кастомный JWT (работает с in-memory хранилищем)
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.authentication.CustomJWTAuthentication',
    ),
    
    # Разрешения по умолчанию - разрешаем всё для публичных эндпоинтов
    # Отдельные views переопределяют это при необходимости
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    
    # Обработка исключений
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    
    # Формат ответа
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

# =============================================================================
# КОНФИГУРАЦИЯ JWT
# =============================================================================

SIMPLE_JWT = {
    # Настройки времени жизни токенов
    # Access токен истекает через 1 день (расширено для удобства тестирования MVP)
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    
    # Refresh токен истекает через 7 дней
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    
    # Ротация refresh токенов для лучшей безопасности
    'ROTATE_REFRESH_TOKENS': True,
    
    # Блокировка старых токенов после ротации
    'BLACKLIST_AFTER_ROTATION': False,
    
    # Алгоритм подписи токенов
    'ALGORITHM': 'HS256',
    
    # Ключ для подписи (использует SECRET_KEY Django)
    'SIGNING_KEY': SECRET_KEY,
    
    # Идентификация типа токена
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # Поле идентификации пользователя
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# =============================================================================
# КОНФИГУРАЦИЯ CORS
# =============================================================================

# Разрешаем все источники в разработке (ограничить в продакшене!)
CORS_ALLOW_ALL_ORIGINS = True

# Альтернативно, можно указать разрешённые источники явно:
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
# ]

# Разрешаем credentials (куки, заголовки авторизации)
CORS_ALLOW_CREDENTIALS = True

# Разрешённые HTTP методы
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Разрешённые HTTP заголовки
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# =============================================================================
# КОНФИГУРАЦИЯ ЛОГИРОВАНИЯ
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    
    # Определения форматов логов
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    
    # Определения обработчиков
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    
    # Определения логгеров
    'loggers': {
        # Внутренний логгер Django
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        # Логгер приложения для наших кастомных apps
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
