"""
Скрипт для создания суперпользователя Django
"""
import os
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Данные для суперпользователя
# Используем email в качестве логина (модель использует email вместо username)
email = 'admin'
password = 'admin123'

# Проверка существования пользователя
if User.objects.filter(email=email).exists():
    print(f'Пользователь с email "{email}" уже существует. Обновляю пароль...')
    user = User.objects.get(email=email)
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f'[OK] Пароль для пользователя "{email}" обновлен!')
else:
    # Создание нового суперпользователя
    user = User.objects.create_superuser(
        email=email,
        password=password
    )
    print(f'[OK] Суперпользователь "{email}" успешно создан!')

print(f'\nЛогин: {email}')
print(f'Пароль: {password}')
print(f'\nАдминка доступна по адресу: http://localhost:8000/admin/')

