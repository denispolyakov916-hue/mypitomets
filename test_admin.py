#!/usr/bin/env python
"""
Проверка синтаксиса админки.
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'pet-care-platform', 'backend'))
django.setup()

try:
    # Проверяем импорты админок
    from apps.payments.admin import PaymentAdmin
    from apps.reviews.admin import ReviewAdmin
    from apps.calendar.admin import CalendarEventAdmin
    from apps.shop.admin_views import admin_dashboard, payment_analytics

    print("✅ Все импорты админок успешны!")

    # Проверяем модели
    from apps.calendar.models import CalendarEvent, EventReminder
    print("✅ Модели календаря импортированы!")

    print("🎉 Админка готова к работе!")

except ImportError as e:
    print(f"❌ Ошибка импорта: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Ошибка: {e}")
    sys.exit(1)
