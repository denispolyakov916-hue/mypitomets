"""Celery-приложение проекта «Питомец+».

Брокер — Redis (см. ``CELERY_BROKER_URL`` в settings). Используется для фоновых
задач; сейчас — отправка транзакционных писем (коды активации, сброс пароля),
чтобы HTTP-ответ не ждал SMTP.

Запуск воркера:  ``celery -A config.celery:app worker --loglevel=info``
"""

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('pitomets')

# Все настройки берём из Django settings (переменные с префиксом CELERY_).
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматически находим tasks.py во всех приложениях INSTALLED_APPS.
app.autodiscover_tasks()
