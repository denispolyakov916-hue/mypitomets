"""
Настройки Django для платформы Питомец+

Конфигурация:
- PostgreSQL база данных
- JWT-аутентификация
- CORS для фронтенда
"""

import os
from pathlib import Path
from datetime import timedelta

# Загрузка переменных окружения из .env (опционально)
try:
    from dotenv import load_dotenv
    # Сначала загружаем .env (общие настройки из Git)
    load_dotenv()
    # Затем .env.local (личные переопределения, если есть, не в Git)
    load_dotenv('.env.local', override=True)
except ImportError:
    pass  # python-dotenv не установлен, используем переменные окружения напрямую

# =============================================================================
# БАЗОВАЯ КОНФИГУРАЦИЯ
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-change-in-production')

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,192.168.1.139').split(',')

# URL клиентского приложения для редиректов
CLIENT_URL = os.getenv('CLIENT_URL', 'http://localhost:5173')

# URL API для формирования ссылок активации
API_URL = os.getenv('API_URL', 'http://localhost:8000')

# =============================================================================
# НАСТРОЙКИ EMAIL
# =============================================================================

# Настройки SMTP для отправки email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('SMTP_PORT', '587'))

# TLS и SSL взаимоисключающие - определяем автоматически по порту или из переменных окружения
# Для Gmail: порт 587 использует TLS, порт 465 использует SSL
smtp_port = int(os.getenv('SMTP_PORT', '587'))
use_tls_env = os.getenv('EMAIL_USE_TLS', '').lower()
use_ssl_env = os.getenv('EMAIL_USE_SSL', '').lower()

if use_tls_env == 'true' and use_ssl_env == 'true':
    # Если оба установлены в True, приоритет у TLS (для Gmail обычно используется TLS)
    use_tls_env = 'true'
    use_ssl_env = 'false'

if smtp_port == 465:
    # Порт 465 использует SSL
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = True
elif use_tls_env == 'true' or (use_tls_env == '' and smtp_port == 587):
    # Порт 587 и другие используют TLS по умолчанию
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False
elif use_ssl_env == 'true':
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = True
else:
    # По умолчанию для порта 587 используем TLS
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False

EMAIL_HOST_USER = os.getenv('SMTP_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('SMTP_PASSWORD', '')
# DEFAULT_FROM_EMAIL использует EMAIL_HOST_USER, если он задан, иначе fallback
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', None) or EMAIL_HOST_USER or 'noreply@petcare-platform.com'

# Для разработки можно использовать консольный backend (выводит email в консоль)
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# =============================================================================
# ПРИЛОЖЕНИЯ
# =============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Сторонние
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Приложения проекта
    'apps.users',
    'apps.pets',
    'apps.shop',
    'apps.training',
    'apps.payments',
]

MIDDLEWARE = [
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
# БАЗА ДАННЫХ - PostgreSQL
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'pitomets_db'),
        'USER': os.getenv('DB_USER', 'pitomets'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'pitomets_password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# =============================================================================
# КАСТОМНАЯ МОДЕЛЬ ПОЛЬЗОВАТЕЛЯ
# =============================================================================

AUTH_USER_MODEL = 'users.User'

# =============================================================================
# ВАЛИДАЦИЯ ПАРОЛЕЙ
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
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
STATIC_ROOT = BASE_DIR / 'staticfiles'

# =============================================================================
# МЕДИА ФАЙЛЫ (загруженные пользователями)
# =============================================================================

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# =============================================================================
# МЕДИА ФАЙЛЫ
# =============================================================================

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# =============================================================================
# ПЕРВИЧНЫЙ КЛЮЧ
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
# DJANGO REST FRAMEWORK
# =============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

# =============================================================================
# JWT КОНФИГУРАЦИЯ
# =============================================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# =============================================================================
# CORS
# =============================================================================

# CORS_ALLOW_ALL_ORIGINS = True  # Убрано для безопасности в продакшене

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.1.139:5173",
    "http://localhost:3000",  # Альтернативный порт для React
    "http://127.0.0.1:3000",
    # Добавьте здесь домены продакшена:
    # "https://yourdomain.com",
    # "https://www.yourdomain.com",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']

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
# ЛОГИРОВАНИЕ
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
