"""
URL конфигурация для API калькулятора питания.

Эндпоинты:
- /api/v1/nutrition/conditions/ - справочник заболеваний
- /api/v1/nutrition/allergies/ - справочник аллергий
- /api/v1/nutrition/calculate/ - калькулятор калорийности
- /api/v1/nutrition/coefficients/ - коэффициенты

Эндпоинты питомца:
- /api/v1/pets/{pet_id}/health-conditions/ - заболевания питомца
- /api/v1/pets/{pet_id}/allergies/ - аллергии питомца
- /api/v1/pets/{pet_id}/food-exclusions/ - исключения продуктов
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_nutrition import (
    HealthConditionViewSet,
    AllergyViewSet,
    PetHealthConditionViewSet,
    PetAllergyViewSet,
    PetFoodExclusionViewSet,
    NutritionCalculatorView
)

# Роутер для справочников
nutrition_router = DefaultRouter()
nutrition_router.register(r'conditions', HealthConditionViewSet, basename='health-conditions')
nutrition_router.register(r'allergies', AllergyViewSet, basename='allergies')

# Роутер для калькулятора
calculator_router = DefaultRouter()
calculator_router.register(r'', NutritionCalculatorView, basename='nutrition-calculator')

# URLs для справочников и калькулятора
urlpatterns = [
    # Справочники
    path('', include(nutrition_router.urls)),
    
    # Калькулятор
    path('calculate/', NutritionCalculatorView.as_view({'post': 'calculate'}), name='nutrition-calculate'),
    path('coefficients/', NutritionCalculatorView.as_view({'get': 'coefficients'}), name='nutrition-coefficients'),
]

# URLs для данных питомца (вложенные в /pets/{pet_id}/)
pet_nutrition_patterns = [
    path(
        '<str:pet_id>/health-conditions/',
        PetHealthConditionViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='pet-health-conditions-list'
    ),
    path(
        '<str:pet_id>/health-conditions/<int:pk>/',
        PetHealthConditionViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='pet-health-conditions-detail'
    ),
    path(
        '<str:pet_id>/allergies/',
        PetAllergyViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='pet-allergies-list'
    ),
    path(
        '<str:pet_id>/allergies/<int:pk>/',
        PetAllergyViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='pet-allergies-detail'
    ),
    path(
        '<str:pet_id>/food-exclusions/',
        PetFoodExclusionViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='pet-food-exclusions-list'
    ),
    path(
        '<str:pet_id>/food-exclusions/<int:pk>/',
        PetFoodExclusionViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='pet-food-exclusions-detail'
    ),
]
