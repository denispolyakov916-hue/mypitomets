"""Фоновые задачи приложения ``users`` (Celery).

Отправка транзакционных писем вынесена из HTTP-цикла: пользователь получает
ответ мгновенно, письмо уходит в фоне с ретраями. Публичный API модуля —
``dispatch_activation_email`` и ``dispatch_password_reset_email``: они ставят
задачу в очередь ПОСЛЕ коммита транзакции, а если брокер недоступен —
отправляют письмо синхронно, чтобы не потерять код.
"""

import logging
import smtplib

from celery import shared_task
from django.db import transaction
from kombu.exceptions import OperationalError as BrokerError

logger = logging.getLogger('apps.users')

# Ретраи только на транзиентных ошибках доставки (соединение/таймаут/SMTP),
# с экспоненциальным backoff. Постоянные ошибки (битый адрес) не долбим.
_TRANSIENT = (smtplib.SMTPException, OSError, TimeoutError)


@shared_task(
    bind=True,
    autoretry_for=_TRANSIENT,
    max_retries=5,
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)
def send_activation_email_task(self, email, activation_url, activation_code):
    """Отправить письмо с кодом активации (регистрация / повторная отправка / профиль)."""
    from .services.mail_service import MailService
    MailService.send_activation_mail(email, activation_url, activation_code)
    logger.info('[users][task] Письмо активации отправлено на %s', email)


@shared_task(
    bind=True,
    autoretry_for=_TRANSIENT,
    max_retries=5,
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)
def send_password_reset_email_task(self, email, reset_code):
    """Отправить письмо с кодом восстановления пароля."""
    from .services.mail_service import MailService
    MailService.send_password_reset_mail(email, reset_code)
    logger.info('[users][task] Письмо восстановления пароля отправлено на %s', email)


def _dispatch(task, sync_send, *args):
    """Поставить письмо в очередь после коммита транзакции.

    Если брокер (Redis) недоступен — не роняем запрос, а шлём письмо синхронно.
    Вне транзакции ``on_commit`` выполняет коллбэк немедленно.
    """
    def _run():
        try:
            task.delay(*args)
        except BrokerError as exc:
            logger.warning('[users] Брокер Celery недоступен (%s) — отправляю письмо синхронно', exc)
            try:
                sync_send(*args)
            except Exception:
                logger.error('[users] Синхронная отправка письма не удалась', exc_info=True)

    transaction.on_commit(_run)


def dispatch_activation_email(email, activation_url, activation_code):
    """Поставить в очередь письмо с кодом активации (fallback — синхронно)."""
    from .services.mail_service import MailService
    _dispatch(send_activation_email_task, MailService.send_activation_mail,
              email, activation_url, activation_code)


def dispatch_password_reset_email(email, reset_code):
    """Поставить в очередь письмо восстановления пароля (fallback — синхронно)."""
    from .services.mail_service import MailService
    _dispatch(send_password_reset_email_task, MailService.send_password_reset_mail,
              email, reset_code)
