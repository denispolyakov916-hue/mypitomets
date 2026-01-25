#!/usr/bin/env python3
"""
Тестовый скрипт для проверки восстановления пароля
"""
import os
import sys
import django

# Настройка Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.users.services.user_service import UserService
from django.utils import timezone
import random

def test_password_reset_flow():
    """Тестирование полного цикла восстановления пароля"""

    # Создаем тестового пользователя
    test_email = f"test_{random.randint(1000, 9999)}@example.com"
    test_password = "TestPassword123"

    print(f"[TEST] Создание тестового пользователя: {test_email}")

    # Регистрация
    user_data = UserService.registration(test_email, test_password, "Test", "User")
    print(f"[TEST] Пользователь зарегистрирован: {user_data}")

    # Получаем пользователя из БД
    user = User.objects.get(email=test_email)
    print(f"[TEST] Найден пользователь в БД: {user.email}")

    # Запрос восстановления пароля
    print(f"[TEST] Запрос восстановления пароля для {test_email}")
    result = UserService.request_password_reset(test_email)
    print(f"[TEST] Результат запроса: {result}")

    # Получаем обновленного пользователя
    user.refresh_from_db()
    print(f"[TEST] Код восстановления: {user.password_reset_code}")
    print(f"[TEST] Время создания кода: {user.password_reset_code_created_at}")

    # Проверяем, что код установлен
    assert user.password_reset_code is not None, "Код восстановления не установлен"
    assert user.password_reset_code_created_at is not None, "Время создания кода не установлено"
    assert len(user.password_reset_code) == 6, "Код должен быть 6 символов"
    assert user.password_reset_code.isdigit(), "Код должен содержать только цифры"

    # Тестируем подтверждение восстановления
    new_password = "NewTestPassword123"
    print(f"[TEST] Подтверждение восстановления с кодом: {user.password_reset_code}")
    result = UserService.confirm_password_reset(test_email, user.password_reset_code, new_password)
    print(f"[TEST] Результат подтверждения: {result}")

    # Проверяем, что код очищен
    user.refresh_from_db()
    assert user.password_reset_code is None, "Код восстановления должен быть очищен"
    assert user.password_reset_code_created_at is None, "Время создания кода должно быть очищено"

    # Проверяем, что пароль изменился
    assert user.check_password(new_password), "Пароль должен быть изменен"

    print("[TEST] ✅ Все тесты пройдены!")

    # Очистка
    user.delete()
    print(f"[TEST] Тестовый пользователь {test_email} удален")

if __name__ == "__main__":
    test_password_reset_flow()