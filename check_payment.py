#!/usr/bin/env python
import os
import sys
import django

# Добавляем путь к проекту
sys.path.append('pet-care-platform/backend')

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.payments.models import Payment

# Проверяем платеж
payment_id = '0694c259-03e6-790a-8000-4fb04b96ff35'
try:
    payment = Payment.objects.get(id=payment_id)
    print(f"Payment found: {payment}")
    print(f"User: {payment.user}")
    print(f"Status: {payment.status}")
    print(f"Amount: {payment.amount}")
    print(f"Payment type: {payment.payment_type}")
except Payment.DoesNotExist:
    print(f"Payment with ID {payment_id} not found")
except Exception as e:
    print(f"Error: {e}")
