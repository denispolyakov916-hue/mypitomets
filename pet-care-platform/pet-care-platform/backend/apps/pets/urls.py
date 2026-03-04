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

from django.urls import path, include
from .views import (
    PetListCreateView, PetDetailView, PetAnalysisView,
    BreedListView as BreedListViewOld, BreedDetailView as BreedDetailViewOld, BreedSuggestionsView,
    CalendarEventListView, CalendarEventDetailView, CalendarEventCompleteView,
    CalendarEventCancelView, CalendarEventTodayView, CalendarEventUpcomingView,
    CalendarEventTypesView,
    PetCalorieCalculatorView, PetAutofillSuggestionsView,  # Новые views
)
from .urls_nutrition import pet_nutrition_patterns
from .views_pet_records import (
    PetVaccinationViewSet,
    PetMedicationViewSet,
)
from .views_vaccines import VaccineViewSet
from .views_medications import MedicationViewSet, MedicationCategoryView
from .views_breeds import (
    BreedListView, BreedDetailView,
    PetBreedComparisonView, BreedHealthRisksView
)
from .views_food import (
    PetDietCalculationView, PetFoodRecommendationsView, FoodStatisticsView,
    PetFeedingPlanView, PetFoodAlternativesView, PetActiveDayCaloriesView
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
    
    # Риски здоровья породы
    path('breeds/<int:breed_id>/health-risks/', BreedHealthRisksView.as_view(), name='breed-health-risks'),
    
    # ===== Операции с питомцем =====
    # GET, PUT, DELETE /api/pets/{uuid}/
    path('<uuid:pet_id>/', PetDetailView.as_view(), name='pet-detail'),
    
    # Анализ профиля питомца
    path('<uuid:pet_id>/analysis/', PetAnalysisView.as_view(), name='pet-analysis'),
    
    # Сравнение с эталоном породы
    path('<uuid:pet_id>/breed-comparison/', PetBreedComparisonView.as_view(), name='pet-breed-comparison'),
    
    # ===== Калькулятор калорий и автозаполнение =====
    # Расчёт дневной нормы калорий
    path('<uuid:pet_id>/calculate-calories/', PetCalorieCalculatorView.as_view(), name='pet-calculate-calories'),
    
    # Предложения автозаполнения из породы
    path('<uuid:pet_id>/autofill-suggestions/', PetAutofillSuggestionsView.as_view(), name='pet-autofill-suggestions'),

    # ===== Медицинские записи питомца (M2M) =====
    # Заболевания/аллергии/исключения продуктов
    path('', include(pet_nutrition_patterns)),

    # Вакцинации
    path(
        '<uuid:pet_id>/vaccinations/',
        PetVaccinationViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='pet-vaccinations-list'
    ),
    path(
        '<uuid:pet_id>/vaccinations/<str:pk>/',
        PetVaccinationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='pet-vaccinations-detail'
    ),

    # Справочник вакцин
    path(
        'vaccines/',
        VaccineViewSet.as_view({'get': 'list'}),
        name='vaccine-list'
    ),
    path(
        'vaccines/<str:code>/',
        VaccineViewSet.as_view({'get': 'retrieve'}),
        name='vaccine-detail'
    ),

    # Справочник медикаментов
    path(
        'medications/',
        MedicationViewSet.as_view({'get': 'list'}),
        name='medication-list'
    ),
    path(
        'medications/categories/',
        MedicationCategoryView.as_view(),
        name='medication-categories'
    ),
    path(
        'medications/<str:code>/',
        MedicationViewSet.as_view({'get': 'retrieve'}),
        name='medication-detail'
    ),

    # Препараты
    path(
        '<uuid:pet_id>/medications/',
        PetMedicationViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='pet-medications-list'
    ),
    path(
        '<uuid:pet_id>/medications/<str:pk>/',
        PetMedicationViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='pet-medications-detail'
    ),
    
    # ===== Расчет рациона и подбор корма =====
    # Расчёт калорийности
    path('<uuid:pet_id>/diet-calculation/', PetDietCalculationView.as_view(), name='pet-diet-calculation'),
    
    # Быстрый подбор корма (упрощённый)
    path('<uuid:pet_id>/recommend-food/', PetFoodRecommendationsView.as_view(), name='pet-recommend-food'),
    path('<uuid:pet_id>/food-recommendations/', PetFoodRecommendationsView.as_view(), name='pet-food-recommendations'),
    
    # Полный план питания (GET - по умолчанию, POST - с параметрами)
    path('<uuid:pet_id>/feeding-plan/', PetFeedingPlanView.as_view(), name='pet-feeding-plan'),
    
    # Альтернативные продукты для компонента
    path('<uuid:pet_id>/food-alternatives/<int:product_id>/', PetFoodAlternativesView.as_view(), name='pet-food-alternatives'),
    
    # Расчёт калорий для активного дня
    path('<uuid:pet_id>/active-day-calories/', PetActiveDayCaloriesView.as_view(), name='pet-active-day-calories'),
    
    # Статистика по кормам (бренды, типы, цены)
    path('food-statistics/', FoodStatisticsView.as_view(), name='food-statistics'),
    
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

    # ===== Календарь событий =====
    # Список / Создание событий
    path('calendar/events/', CalendarEventListView.as_view(), name='calendar-events-list'),

    # Специальные списки (должны быть перед {id})
    # События на сегодня
    path('calendar/events/today/', CalendarEventTodayView.as_view(), name='calendar-events-today'),

    # Предстоящие события
    path('calendar/events/upcoming/', CalendarEventUpcomingView.as_view(), name='calendar-events-upcoming'),

    # Справочник типов событий
    path('calendar/event-types/', CalendarEventTypesView.as_view(), name='calendar-event-types'),

    # Детали / Обновление / Удаление события
    path('calendar/events/<int:event_id>/', CalendarEventDetailView.as_view(), name='calendar-event-detail'),

    # Действия с событием
    path('calendar/events/<int:event_id>/complete/', CalendarEventCompleteView.as_view(), name='calendar-event-complete'),
    path('calendar/events/<int:event_id>/cancel/', CalendarEventCancelView.as_view(), name='calendar-event-cancel'),
]
