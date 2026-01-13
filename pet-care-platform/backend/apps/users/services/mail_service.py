"""
Сервис для отправки email

Отправка писем активации аккаунта.
Аналогично mail-service.js из проекта-образца.
"""

from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger('apps.users')


class MailService:
    """Сервис для отправки email."""
    
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
            api_url = getattr(settings, 'API_URL', 'http://localhost:8001')
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
                        Код действителен в течение 30 минут.
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

Код действителен в течение 30 минут.

Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
            """
            
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            if not from_email:
                from_email = getattr(settings, 'EMAIL_HOST_USER', 'noreply@petcare-platform.com')
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            logger.info(f"Письмо восстановления пароля отправлено на {to_email}")
            
        except Exception as e:
            logger.error(f"Ошибка при отправке письма восстановления на {to_email}: {str(e)}")
            raise

