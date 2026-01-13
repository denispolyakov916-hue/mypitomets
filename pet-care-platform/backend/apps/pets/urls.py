"""
URL маршруты для эндпоинтов питомцев (PetID) и напоминаний.

Эндпоинты питомцев:
    GET    /api/pets/              - Список питомцев пользователя
    POST   /api/pets/              - Создание нового питомца
    GET    /api/pets/{uuid}/       - Детали питомца
    PUT    /api/pets/{uuid}/       - Обновление питомца
    DELETE /api/pets/{uuid}/       - Удаление питомца

Эндпоинты напоминаний:
    GET    /api/pets/reminders/              - Список напоминаний
    POST   /api/pets/reminders/              - Создание напоминания
    GET    /api/pets/reminders/categories/   - Категории напоминаний
    GET    /api/pets/reminders/upcoming/     - Предстоящие напоминания
    GET    /api/pets/reminders/{uuid}/       - Детали напоминания
    PUT    /api/pets/reminders/{uuid}/       - Обновление напоминания
    DELETE /api/pets/reminders/{uuid}/       - Удаление напоминания
    POST   /api/pets/reminders/{uuid}/complete/ - Отметить выполненным

Все пути имеют префикс /api/pets/ в главном urls.py
"""

from django.urls import path
from .views import PetListCreateView, PetDetailView
from .reminder_views import (
    ReminderListView,
    ReminderDetailView,
    ReminderCompleteView,
    ReminderCategoriesView,
    UpcomingRemindersView,
)
from .breed_views import (
    BreedListView,
    BreedDetailView,
    BreedHealthView,
    PetBreedComparisonView,
)

urlpatterns = [
    # Список всех питомцев / Создание нового питомца
    # GET, POST /api/pets/
    path('', PetListCreateView.as_view(), name='pet-list-create'),
    
    # Операции с конкретным питомцем
    # GET, PUT, DELETE /api/pets/{uuid}/
    path('<uuid:pet_id>/', PetDetailView.as_view(), name='pet-detail'),
    
    # ===== Напоминания =====
    # Список / Создание напоминаний
    path('reminders/', ReminderListView.as_view(), name='reminder-list-create'),
    
    # Категории и частоты напоминаний
    path('reminders/categories/', ReminderCategoriesView.as_view(), name='reminder-categories'),
    
    # Предстоящие напоминания (для дашборда)
    path('reminders/upcoming/', UpcomingRemindersView.as_view(), name='reminder-upcoming'),
    
    # Операции с конкретным напоминанием
    path('reminders/<uuid:reminder_id>/', ReminderDetailView.as_view(), name='reminder-detail'),
    
    # Отметить напоминание выполненным
    path('reminders/<uuid:reminder_id>/complete/', ReminderCompleteView.as_view(), name='reminder-complete'),
    
    # ===== Породы =====
    # Список пород с фильтрацией
    path('breeds/', BreedListView.as_view(), name='breed-list'),
    
    # Детали породы
    path('breeds/<slug:slug>/', BreedDetailView.as_view(), name='breed-detail'),
    
    # Риски здоровья породы
    path('breeds/<slug:slug>/health/', BreedHealthView.as_view(), name='breed-health'),
    
    # Сравнение питомца с эталоном породы
    path('<uuid:pet_id>/breed-comparison/', PetBreedComparisonView.as_view(), name='pet-breed-comparison'),
]
