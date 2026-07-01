"""
Подтверждение email и телефона в профиле пользователя (по коду).

Регистрация — свободная (аккаунт сразу рабочий). Это отдельное, необязательное
подтверждение контактов уже залогиненным пользователем в личном кабинете:

- email: 6-значный код шлётся на почту (переиспользуем activation_code), затем
  пользователь вводит его в профиле → email_verified = True.
- телефон: SMS-код через общий механизм PhoneAuthService, затем номер
  привязывается к пользователю → phone_verified = True.
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from core.exceptions import ApiError
from apps.users.models import PhoneOtp
from apps.users.services.user_service import UserService
from apps.users.services.mail_service import MailService
from apps.users.services.phone_auth_service import (
    PhoneAuthService,
    normalize_phone,
    OTP_TTL_MINUTES,
    OTP_MAX_ATTEMPTS,
)

User = get_user_model()
logger = logging.getLogger('apps.users')


class ProfileVerificationService:
    """Подтверждение email/телефона в личном кабинете."""

    # ---------------- Email ----------------
    @staticmethod
    def request_email_code(user) -> dict:
        if user.email_verified:
            raise ApiError.bad_request('Email уже подтверждён')

        code = UserService._generate_code_with_timestamp(user)

        # Письмо с кодом — в фоне через очередь (Celery), с fallback на
        # синхронную отправку при недоступном брокере.
        from apps.users.tasks import dispatch_activation_email
        dispatch_activation_email(user.email, '', code)
        return {'message': f'Код отправлен на {user.email}'}

    @staticmethod
    def confirm_email(user, code) -> dict:
        if user.email_verified:
            return {'message': 'Email уже подтверждён', 'email_verified': True}
        if not user.activation_code:
            raise ApiError.bad_request('Сначала запросите код подтверждения')
        if UserService._is_code_expired(user.code_created_at):
            raise ApiError.bad_request('Срок действия кода истёк. Запросите новый.')
        if (code or '').strip() != user.activation_code:
            raise ApiError.bad_request('Неверный код')

        user.email_verified = True
        user.is_activated = True
        user.activation_code = None
        user.save(update_fields=['email_verified', 'is_activated', 'activation_code'])
        logger.info(f"[ProfileVerify] Email подтверждён: {user.email}")
        return {'message': 'Email подтверждён', 'email_verified': True}

    # ---------------- Телефон ----------------
    @staticmethod
    def request_phone_code(user, phone_raw) -> dict:
        # Переиспользуем общий механизм OTP (нормализация + лимиты + отправка SMS).
        return PhoneAuthService.request_code(phone_raw)

    @staticmethod
    def confirm_phone(user, phone_raw, code) -> dict:
        phone = normalize_phone(phone_raw)

        # Номер не должен быть привязан к другому аккаунту.
        other = User.objects.filter(phone=phone).exclude(id=user.id).first()
        if other:
            raise ApiError.bad_request('Этот номер уже привязан к другому аккаунту')

        otp = PhoneOtp.objects.filter(phone=phone, is_used=False).order_by('-created_at').first()
        if not otp:
            raise ApiError.bad_request('Код не запрашивался или уже использован. Запросите новый.')
        if (timezone.now() - otp.created_at) > timedelta(minutes=OTP_TTL_MINUTES):
            raise ApiError.bad_request('Срок действия кода истёк. Запросите новый.')
        if otp.attempts >= OTP_MAX_ATTEMPTS:
            raise ApiError.bad_request('Слишком много попыток. Запросите новый код.')
        if (code or '').strip() != otp.code:
            otp.attempts += 1
            otp.save(update_fields=['attempts'])
            raise ApiError.bad_request('Неверный код')

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        user.phone = phone
        user.phone_verified = True
        user.save(update_fields=['phone', 'phone_verified'])
        logger.info(f"[ProfileVerify] Телефон подтверждён для {user.email}: {phone}")
        return {'message': 'Телефон подтверждён', 'phone': phone, 'phone_verified': True}
