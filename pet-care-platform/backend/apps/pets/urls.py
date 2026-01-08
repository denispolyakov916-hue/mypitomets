"""
URL маршруты для эндпоинтов питомцев (PetID), пород и напоминаний.

Эндпоинты питомцев:
    GET    /api/pets/              - Список питомцев пользователя
    POST   /api/pets/              - Создание нового питомца
    GET    /api/pets/{uuid}/       - Детали питомца
    PUT    /api/pets/{uuid}/       - Обновление питомца
    DELETE /api/pets/{uuid}/       - Удаление питомца
    GET    /api/pets/{uuid}/analysis/ - Анализ профиля питомца

Эндпоинты справочника пород:
    GET    /api/pets/breeds/                    - Список пород (с фильтрами)
    GET    /api/pets/breeds/{uuid}/             - Детали породы
    GET    /api/pets/breeds/by-slug/{slug}/     - Порода по slug
    GET    /api/pets/breeds/{uuid}/suggestions/ - Подсказки для автозаполнения

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
from .views import (
    PetListCreateView, PetDetailView, PetAnalysisView,
    BreedListView, BreedDetailView, BreedSuggestionsView
)
from .reminder_views import (
    ReminderListView,
    ReminderDetailView,
    ReminderCompleteView,
    ReminderCategoriesView,
    UpcomingRemindersView,
)

urlpatterns = [
    # Список всех питомцев / Создание нового питомца
    # GET, POST /api/pets/
    path('', PetListCreateView.as_view(), name='pet-list-create'),
    
    # ===== Справочник пород =====
    # Список пород с фильтрацией
    # GET /api/pets/breeds/?species=dog&search=лабрадор
    path('breeds/', BreedListView.as_view(), name='breed-list'),
    
    # Порода по slug (для SEO-friendly URLs)
    path('breeds/by-slug/<slug:slug>/', BreedDetailView.as_view(), name='breed-by-slug'),
    
    # Детали породы
    path('breeds/<uuid:breed_id>/', BreedDetailView.as_view(), name='breed-detail'),
    
    # Подсказки для автозаполнения PetID
    path('breeds/<uuid:breed_id>/suggestions/', BreedSuggestionsView.as_view(), name='breed-suggestions'),
    
    # ===== Операции с питомцем =====
    # GET, PUT, DELETE /api/pets/{uuid}/
    path('<uuid:pet_id>/', PetDetailView.as_view(), name='pet-detail'),
    
    # Анализ профиля питомца
    path('<uuid:pet_id>/analysis/', PetAnalysisView.as_view(), name='pet-analysis'),
    
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
]
