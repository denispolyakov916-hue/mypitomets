"""
Регистрация и вход по номеру телефона через одноразовый код (OTP) из SMS.

Поток:
1. request_code(phone)  — генерирует 6-значный код, сохраняет PhoneOtp, шлёт SMS.
2. verify_code(phone, code) — проверяет код, находит/создаёт пользователя по телефону
   (с синтетическим уникальным email, т.к. USERNAME_FIELD = email), выдаёт JWT-токены.
"""

import logging
import random
import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from core.exceptions import ApiError
from apps.users.models import PhoneOtp
from apps.users.services.token_service import TokenService
from apps.users.services.sms_service import SmsService
from apps.users.services.user_service import _serialize_user

User = get_user_model()
logger = logging.getLogger('apps.users')

OTP_TTL_MINUTES = 10           # срок жизни кода
OTP_MAX_ATTEMPTS = 5           # попыток ввода на один код
OTP_RESEND_COOLDOWN_SECONDS = 60   # не чаще раза в минуту
OTP_MAX_PER_HOUR = 5           # не более N кодов на номер в час


def normalize_phone(raw: str) -> str:
    """Нормализует номер РФ к формату +7XXXXXXXXXX."""
    digits = re.sub(r'\D', '', raw or '')
    if not digits:
        raise ApiError.bad_request('Укажите номер телефона')
    if len(digits) == 11 and digits.startswith('8'):
        digits = '7' + digits[1:]
    if len(digits) == 10:
        digits = '7' + digits
    if len(digits) != 11 or not digits.startswith('7'):
        raise ApiError.bad_request('Некорректный номер телефона')
    return '+' + digits


class PhoneAuthService:
    """Регистрация и вход по телефону через SMS-код."""

    @staticmethod
    def request_code(phone_raw: str) -> dict:
        phone = normalize_phone(phone_raw)
        now = timezone.now()

        last = PhoneOtp.objects.filter(phone=phone).order_by('-created_at').first()
        if last and (now - last.created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise ApiError.bad_request('Слишком часто. Подождите минуту перед повторной отправкой кода.')

        hour_count = PhoneOtp.objects.filter(
            phone=phone, created_at__gte=now - timedelta(hours=1)
        ).count()
        if hour_count >= OTP_MAX_PER_HOUR:
            raise ApiError.bad_request('Превышен лимит запросов кода для этого номера. Попробуйте позже.')

        code = str(random.randint(100000, 999999))
        PhoneOtp.objects.create(phone=phone, code=code)

        if not SmsService.send_otp_code(phone, code):
            raise ApiError.bad_request('Не удалось отправить SMS. Попробуйте позже.')

        logger.info(f"[PhoneAuth] Код отправлен на {phone}")
        return {'message': 'Код отправлен', 'phone': phone}

    @staticmethod
    def verify_code(phone_raw: str, code: str) -> dict:
        phone = normalize_phone(phone_raw)

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

        user = User.objects.filter(phone=phone).first()
        created = False
        if not user:
            synthetic_email = f'{phone.lstrip("+")}@phone.betapitometsplus.ru'
            user = User.objects.create_user(
                email=synthetic_email,
                password=None,
                phone=phone,
                is_activated=True,
            )
            created = True
        elif not user.is_activated:
            user.is_activated = True
            user.save(update_fields=['is_activated'])

        tokens = TokenService.generate_tokens(user)
        TokenService.save_token(user.id, tokens['refreshToken'])

        logger.info(f"[PhoneAuth] Вход по телефону {phone} (создан: {created})")
        return {**tokens, 'user': _serialize_user(user), 'created': created}
