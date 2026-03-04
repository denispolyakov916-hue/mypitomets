"""
Кастомный AdminSite для расширенной функциональности.
"""

from django.contrib import admin
from django.urls import path


class PetCareAdminSite(admin.AdminSite):
    """Кастомный AdminSite с расширенными возможностями."""
    
    site_header = 'Питомец+ Администрирование'
    site_title = 'Питомец+ Админ'
    index_title = 'Панель управления'
    
    def get_app_list(self, request, app_label=None):
        """Добавляем кастомные ссылки в меню."""
        app_list = super().get_app_list(request, app_label=app_label)
        
        # Добавляем раздел с кастомными страницами
        custom_app = {
            'name': 'Аналитика и настройки',
            'app_label': 'analytics',
            'app_url': '/admin/dashboard/',
            'has_module_perms': True,
            'models': [
                {
                    'name': '📊 Дашборд',
                    'object_name': 'Dashboard',
                    'admin_url': '/admin/dashboard/',
                    'view_only': True,
                },
                {
                    'name': '💳 Аналитика платежей',
                    'object_name': 'PaymentAnalytics',
                    'admin_url': '/admin/payment-analytics/',
                    'view_only': True,
                },
                {
                    'name': '🐾 Аналитика PetID',
                    'object_name': 'PetAnalytics',
                    'admin_url': '/admin/pet-analytics/',
                    'view_only': True,
                },
                {
                    'name': '⚙️ Настройки рекомендаций',
                    'object_name': 'RecommendationSettings',
                    'admin_url': '/admin/recommendations/',
                    'view_only': True,
                },
            ]
        }
        
        # Вставляем в начало списка
        app_list.insert(0, custom_app)
        
        return app_list


# Создаём экземпляр кастомного AdminSite
# ПРИМЕЧАНИЕ: Чтобы использовать, нужно заменить admin.site в urls.py
# pet_care_admin = PetCareAdminSite(name='pet_care_admin')

