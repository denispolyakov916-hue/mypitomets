"""
Сервис отправки SMS — одноразовые коды (OTP) для регистрации/входа по телефону.

Провайдер по умолчанию — SMSC.ru (HTTP API). Конфигурация через переменные окружения:
- SMS_BACKEND: 'smsc' (реальная отправка) | 'console' (печать кода в лог — для разработки)
- SMSC_LOGIN, SMSC_PASSWORD: логин и пароль (или API-пароль) личного кабинета SMSC.ru
- SMSC_SENDER: имя отправителя (опционально; требует регистрации имени в SMSC)

Никакие секреты в коде не хранятся — только имена переменных окружения.
"""

import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger('apps.users')


class SmsService:
    """Единая точка отправки SMS в проекте."""

    SMSC_URL = 'https://smsc.ru/sys/send.php'

    @staticmethod
    def _backend() -> str:
        return (getattr(settings, 'SMS_BACKEND', '') or 'console').lower()

    @staticmethod
    def send_sms(phone: str, text: str) -> bool:
        """
        Отправить SMS. Возвращает True при успехе.

        В режиме 'console' (по умолчанию) реальная отправка не выполняется — код
        печатается в лог, чтобы можно было тестировать без провайдера.
        """
        backend = SmsService._backend()

        if backend != 'smsc':
            logger.info(f"[SMS console] -> {phone}: {text}")
            print(f"[SMS console] -> {phone}: {text}")
            return True

        login = getattr(settings, 'SMSC_LOGIN', '') or ''
        psw = getattr(settings, 'SMSC_PASSWORD', '') or ''
        if not login or not psw:
            logger.error('[SMS] SMSC_LOGIN/SMSC_PASSWORD не настроены — SMS не отправлено')
            return False

        params = {
            'login': login,
            'psw': psw,
            'phones': phone,
            'mes': text,
            'fmt': 3,            # формат ответа: 3 = JSON
            'charset': 'utf-8',
        }
        sender = getattr(settings, 'SMSC_SENDER', '') or ''
        if sender:
            params['sender'] = sender

        url = SmsService.SMSC_URL + '?' + urllib.parse.urlencode(params)
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            if data.get('error') or data.get('error_code'):
                logger.error(f"[SMS] SMSC вернул ошибку: {data}")
                return False
            logger.info(f"[SMS] Отправлено на {phone} (id={data.get('id')}, cnt={data.get('cnt')})")
            return True
        except Exception as e:
            logger.error(f"[SMS] Ошибка отправки на {phone}: {e}")
            return False

    @staticmethod
    def send_otp_code(phone: str, code: str) -> bool:
        text = f"Питомец+: код подтверждения {code}. Никому не сообщайте его."
        return SmsService.send_sms(phone, text)
