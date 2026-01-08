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

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,192.168.1.139,192.168.1.11').split(',')

# URL клиентского приложения для редиректов
# ПОРТ 5199 - уникальный порт для фронтенда, чтобы избежать конфликтов в локальной сети
CLIENT_URL = os.getenv('CLIENT_URL', 'http://192.168.1.11:5199')

# URL API для формирования ссылок активации
# ПОРТ 8077 - уникальный порт для бекенда, чтобы избежать конфликтов в локальной сети
API_URL = os.getenv('API_URL', 'http://192.168.1.11:8077')

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
    'apps.reviews',
    'apps.calendar',
    'apps.analytics',
]

# =============================================================================
# НАСТРОЙКИ АДМИНКИ
# =============================================================================

# Заголовок админки
ADMIN_SITE_HEADER = 'Питомец+ - Администрирование'
ADMIN_SITE_TITLE = 'Питомец+ Admin'
ADMIN_INDEX_TITLE = 'Добро пожаловать в админку Питомец+'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.RequestLoggingMiddleware',  # Логирование запросов
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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
# БАЗА ДАННЫХ - PostgreSQL или SQLite
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'pitomets_db'),
        'USER': os.getenv('DB_USER', 'pitomets'),
        'PASSWORD': os.getenv('DB_PASSWORD', '578321'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Для SQLite используем упрощенную конфигурацию
if DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3':
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / DATABASES['default']['NAME'],
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
    'EXCEPTION_HANDLER': 'core.exception_handler.custom_exception_handler',
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

# Для разработки разрешаем все origins (в продакшене отключить!)
# В режиме DEBUG разрешаем все, чтобы избежать проблем с разными IP адресами
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Разрешить все в режиме DEBUG

CORS_ALLOWED_ORIGINS = [
    # ==========================================================================
    # ОСНОВНЫЕ ПОРТЫ ПРОЕКТА (уникальные, чтобы избежать конфликтов)
    # ==========================================================================
    "http://localhost:5199",       # Основной порт фронтенда (localhost)
    "http://127.0.0.1:5199",       # localhost (IPv4)
    "http://192.168.1.139:5199",   # Локальная сеть (альтернативный IP)
    "http://192.168.1.11:5199",    # Локальная сеть (основной IP клиента)
    "http://localhost:8077",       # Бекенд порт (localhost)
    "http://127.0.0.1:8077",       # Бекенд порт (IPv4)
    "http://192.168.1.139:8077",   # Бекенд порт (альтернативный IP)
    "http://192.168.1.11:8077",    # Бекенд порт (основной IP клиента)
    
    # ==========================================================================
    # РЕЗЕРВНЫЕ ПОРТЫ (на случай, если основные заняты)
    # ==========================================================================
    "http://localhost:5174",       # Резервный порт фронтенда
    "http://127.0.0.1:5174",
    "http://192.168.1.139:5174",
    "http://192.168.1.11:5174",
    
    "http://localhost:5173",       # Стандартный порт Vite
    "http://127.0.0.1:5173",
    "http://192.168.1.139:5173",
    "http://192.168.1.11:5173",
    
    "http://localhost:3000",       # Стандартный порт React
    "http://127.0.0.1:3000",
    "http://192.168.1.11:3000",
    
    # ==========================================================================
    # HTTPS версии (для безопасного соединения)
    # ==========================================================================
    "https://localhost:5199",
    "https://127.0.0.1:5199",
    "https://192.168.1.11:5199",
    
    "https://localhost:5174",
    "https://127.0.0.1:5174",
    "https://192.168.1.11:5174",
    
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
    'x-xsrf-token',
    'cache-control',
    'pragma',
]

# =============================================================================
# КЭШИРОВАНИЕ
# =============================================================================

# Настройки кэширования
# В разработке используем локальный memory cache
# В продакшене рекомендуется использовать Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'OPTIONS': {
            'MAX_ENTRIES': 10000,
        },
        'KEY_PREFIX': 'pitomets',
        'TIMEOUT': 300,  # 5 минут по умолчанию
    }
}

# Для продакшена рекомендуется использовать Redis:
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.redis.RedisCache',
#         'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
#         'OPTIONS': {
#             'CLIENT_CLASS': 'django_redis.client.DefaultClient',
#         },
#         'KEY_PREFIX': 'pitomets',
#         'TIMEOUT': 300,
#     }
# }

# Время жизни кэша для разных типов данных (в секундах)
CACHE_TIMEOUTS = {
    'products_list': 300,      # 5 минут - список товаров
    'courses_list': 300,      # 5 минут - список курсов
    'product_detail': 600,     # 10 минут - детали товара
    'course_detail': 600,     # 10 минут - детали курса
    'recommendations': 600,   # 10 минут - рекомендации
    'admin_stats': 60,         # 1 минута - статистика админки
    'admin_dashboard': 300,   # 5 минут - дашборд админки
}

# =============================================================================
# ЛОГИРОВАНИЕ
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {module} {funcName} {lineno}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        # JSON форматтер (опционально, если установлен pythonjsonlogger)
        # 'json': {
        #     '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        #     'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)s',
        # },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'app.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'error.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.shop': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.training': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.payments': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.users': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'core': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
