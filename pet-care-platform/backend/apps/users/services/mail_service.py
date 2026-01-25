"""
Сервис для отправки email

Централизованный сервис отправки писем для платформы Питомец+.

Поддерживаемые типы писем:
- Активация аккаунта (регистрация)
- Восстановление пароля
- (Планируется) Подтверждение заказа
- (Планируется) Напоминания о событиях

Конфигурация:
- Локально: smtp.mail.ru (testpetplus@mail.ru)
- Продакшен: SendGrid / Amazon SES / Mailgun (через переменные окружения)

Переменные окружения для продакшена:
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, DEFAULT_FROM_EMAIL
"""

from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger('apps.users')


class EmailTemplates:
    """Базовые HTML/текстовые шаблоны для писем."""
    
    @staticmethod
    def get_base_html(content: str, title: str = "Питомец+") -> str:
        """Обёртка HTML письма с базовыми стилями."""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🐾 Питомец+</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                Это автоматическое письмо от платформы Питомец+.<br>
                                Если вы не совершали это действие, проигнорируйте это письмо.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """


class MailService:
    """
    Сервис для отправки email.
    
    Единая точка входа для всех типов email-рассылок в проекте.
    Поддерживает различные SMTP провайдеры через конфигурацию Django.
    """
    
    @staticmethod
    def _get_from_email() -> str:
        """Получить адрес отправителя с fallback значениями."""
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        if not from_email or from_email == '':
            from_email = getattr(settings, 'EMAIL_HOST_USER', None)
        if not from_email or from_email == '':
            from_email = 'testpetplus@mail.ru'
        return from_email
    
    @staticmethod
    def _send_email(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
        """
        Базовый метод отправки email.
        
        Возвращает True при успешной отправке, False при ошибке.
        """
        from_email = MailService._get_from_email()
        
        try:
            print(f"[EMAIL SERVICE] Отправка письма")
            print(f"[EMAIL SERVICE] От: {from_email}")
            print(f"[EMAIL SERVICE] Кому: {to_email}")
            print(f"[EMAIL SERVICE] Тема: {subject}")
            
            send_mail(
                subject=subject,
                message=text_content,
                from_email=from_email,
                recipient_list=[to_email],
                html_message=html_content,
                fail_silently=False,
            )
            
            logger.info(f"Письмо успешно отправлено на {to_email}")
            print(f"[EMAIL SERVICE SUCCESS] Письмо отправлено на {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка отправки письма на {to_email}: {str(e)}")
            print(f"[EMAIL SERVICE ERROR] {str(e)}")
            return False
    
    @staticmethod
    def send_activation_mail(to_email, activation_link, activation_code=None):
        """
        Отправка письма активации аккаунта с кодом и ссылкой.
        
        Аргументы:
            to_email: Email адрес получателя
            activation_link: Полная ссылка для активации аккаунта
            activation_code: Код активации (6 цифр), опционально
        """
        try:
            api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
            subject = f'Активация аккаунта на {api_url}'
            
            # HTML версия письма
            code_section = ""
            if activation_code:
                code_section = f"""
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                            Для прохождения регистрации введите указанный ниже код:
                        </p>
                        <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                            {activation_code}
                        </div>
                        <p style="color: #999; font-size: 14px; margin-top: 10px;">
                            Код действителен в течение 15 минут.
                        </p>
                    </div>
                    <p style="color: #666; font-size: 16px; text-align: center; margin: 20px 0;">
                        <strong>ИЛИ</strong>
                    </p>
                """
            
            html_message = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Активация аккаунта</h1>
                    {code_section}
                    <p style="color: #666; font-size: 16px;">
                        Для активации вашего аккаунта перейдите по ссылке:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{activation_link}" 
                           style="display: inline-block; padding: 12px 24px; 
                                  background-color: #007bff; color: white; 
                                  text-decoration: none; border-radius: 5px;
                                  font-size: 16px;">
                            Активировать аккаунт
                        </a>
                    </div>
                    <p style="color: #999; font-size: 14px;">
                        Или скопируйте и вставьте эту ссылку в браузер:
                    </p>
                    <p style="color: #666; font-size: 12px; word-break: break-all;">
                        {activation_link}
                    </p>
                </div>
            """
            
            # Текстовая версия письма
            code_text = ""
            if activation_code:
                code_text = f"""
Для прохождения регистрации введите указанный ниже код:
{activation_code}

Код действителен в течение 15 минут.

ИЛИ

"""
            
            message = f"""
Активация аккаунта

{code_text}Для активации вашего аккаунта перейдите по ссылке:
{activation_link}

Если ссылка не работает, скопируйте её и вставьте в адресную строку браузера.
            """
            
            # Получаем адрес отправителя с fallback значениями
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            if not from_email or from_email == '':
                from_email = getattr(settings, 'EMAIL_HOST_USER', None)
            if not from_email or from_email == '':
                from_email = 'noreply@petcare-platform.com'  # Fallback адрес
            
            # Проверяем, что адрес не пустой
            if not from_email or from_email.strip() == '':
                logger.warning("EMAIL_HOST_USER и DEFAULT_FROM_EMAIL не настроены, используем fallback")
                from_email = 'noreply@petcare-platform.com'
            
            print(f"[EMAIL SERVICE] Отправка письма активации")
            print(f"[EMAIL SERVICE] От: {from_email}")
            print(f"[EMAIL SERVICE] Кому: {to_email}")
            print(f"[EMAIL SERVICE] Тема: {subject}")
            print(f"[EMAIL SERVICE] Код активации: {activation_code}")
            print(f"[EMAIL SERVICE] Ссылка активации: {activation_link}")
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Письмо активации отправлено на {to_email}")
            print(f"[EMAIL SERVICE SUCCESS] Письмо успешно отправлено на {to_email}")
            
        except Exception as e:
            logger.error(f"Ошибка при отправке письма активации на {to_email}: {str(e)}")
            # Не пробрасываем исключение, чтобы регистрация не падала из-за проблем с email
            # В production можно настроить очередь для отправки email
    
    @staticmethod
    def send_password_reset_mail(to_email, reset_code):
        """
        Отправка письма для восстановления пароля.
        
        Аргументы:
            to_email: Email адрес получателя
            reset_code: Код восстановления (6 цифр)
        """
        try:
            subject = 'Восстановление пароля - Питомец+'
            
            html_message = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Восстановление пароля</h1>
                    <p style="color: #666; font-size: 16px;">
                        Вы запросили восстановление пароля на платформе Питомец+.
                    </p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <p style="color: #666; font-size: 16px; margin-bottom: 10px;">
                            Введите этот код для сброса пароля:
                        </p>
                        <div style="font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                            {reset_code}
                        </div>
                    </div>
                    <p style="color: #999; font-size: 14px;">
                        Код действителен в течение 15 минут.
                    </p>
                    <p style="color: #999; font-size: 14px;">
                        Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
                    </p>
                </div>
            """
            
            message = f"""
Восстановление пароля

Вы запросили восстановление пароля на платформе Питомец+.

Введите этот код для сброса пароля: {reset_code}

Код действителен в течение 15 минут.

Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
            """
            
            # Получаем адрес отправителя с fallback значениями (как в send_activation_mail)
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            if not from_email or from_email == '':
                from_email = getattr(settings, 'EMAIL_HOST_USER', None)
            if not from_email or from_email == '':
                from_email = 'noreply@petcare-platform.com'
            
            # Проверяем, что адрес не пустой
            if not from_email or from_email.strip() == '':
                logger.warning("EMAIL_HOST_USER и DEFAULT_FROM_EMAIL не настроены, используем fallback")
                from_email = 'noreply@petcare-platform.com'
            
            print(f"[EMAIL SERVICE] Отправка письма восстановления пароля")
            print(f"[EMAIL SERVICE] От: {from_email}")
            print(f"[EMAIL SERVICE] Кому: {to_email}")
            print(f"[EMAIL SERVICE] Тема: {subject}")
            print(f"[EMAIL SERVICE] Код восстановления: {reset_code}")
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Письмо восстановления пароля отправлено на {to_email}")
            print(f"[EMAIL SERVICE SUCCESS] Письмо восстановления пароля успешно отправлено на {to_email}")
            
        except Exception as e:
            logger.error(f"Ошибка при отправке письма восстановления на {to_email}: {str(e)}")
            print(f"[EMAIL SERVICE ERROR] Ошибка отправки письма восстановления: {str(e)}")
            # Не пробрасываем исключение, чтобы запрос не падал из-за проблем с email
            # Код восстановления сохранён в БД и пользователь может его увидеть в консоли при отладке

