"""
URL маршруты для эндпоинтов питомцев (PetID).

Эндпоинты:
    GET    /api/pets/              - Список питомцев пользователя
    POST   /api/pets/              - Создание нового питомца
    GET    /api/pets/{uuid}/       - Детали питомца
    PUT    /api/pets/{uuid}/       - Обновление питомца
    DELETE /api/pets/{uuid}/       - Удаление питомца

Все пути имеют префикс /api/pets/ в главном urls.py

Идентификаторы:
    Используется UUIDv7 для идентификации питомцев.
    Формат: 018d3e5f-8c7b-7abc-9def-1234567890ab
"""

from django.urls import path
from .views import PetListCreateView, PetDetailView

urlpatterns = [
    # Список всех питомцев / Создание нового питомца
    # GET, POST /api/pets/
    path('', PetListCreateView.as_view(), name='pet-list-create'),
    
    # Операции с конкретным питомцем
    # GET, PUT, DELETE /api/pets/{uuid}/
    # Используем uuid конвертер для валидации UUIDv7
    path('<uuid:pet_id>/', PetDetailView.as_view(), name='pet-detail'),
]
