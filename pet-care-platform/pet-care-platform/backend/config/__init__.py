"""Пакет config: при старте Django поднимаем Celery-приложение,
чтобы декоратор @shared_task и .delay() работали во всём проекте."""

from .celery import app as celery_app

__all__ = ('celery_app',)
