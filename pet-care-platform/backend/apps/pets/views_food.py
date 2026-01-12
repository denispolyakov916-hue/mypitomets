"""
API views для подбора корма и расчета рациона
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Pet
from .services_food import FoodRecommendationService
from apps.shop.serializers import ProductSerializer


class PetDietCalculationView(APIView):
    """
    Расчет персонального рациона для питомца.
    
    GET /api/pets/{pet_id}/diet-calculation/
    
    Возвращает:
    - Дневную потребность в калориях (DER)
    - Расчет БЖУ (белки, жиры, углеводы)
    - Частоту кормлений
    - Размер порций
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        pet = get_object_or_404(Pet, id=pet_id, owner=request.user)
        
        food_service = FoodRecommendationService()
        
        # Расчет калорий
        calories_data = food_service.calculate_daily_calories(pet)
        
        if not calories_data:
            return Response({
                'error': 'Недостаточно данных для расчета',
                'message': 'Укажите вес питомца'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        der = calories_data['der']
        
        # Расчет БЖУ
        macros = food_service.calculate_macros(pet, der)
        
        # Расчет порций
        portions = food_service.calculate_portions(pet, der)
        
        return Response({
            'pet_id': pet.id,
            'pet_name': pet.name,
            'breed': pet.breed.name if pet.breed else None,
            
            'calories': calories_data,
            'macros': macros,
            'portions': portions,
            
            'recommendations': {
                'protein_sources': 'Курица, говядина, рыба' if pet.species == 'dog' else 'Курица, рыба, индейка',
                'feeding_schedule': f"{portions['meals_per_day']} раза в день в {', '.join(portions['feeding_times'])}",
                'notes': self._get_diet_notes(pet)
            }
        }, status=status.HTTP_200_OK)
    
    def _get_diet_notes(self, pet):
        """Дополнительные заметки по питанию"""
        notes = []
        
        if pet.breed and pet.breed.brachycephalic:
            notes.append("Брахицефал - мелкие кусочки, легкоусвояемая пища")
        
        if 'чувствительное пищеварение' in (pet.health_issues or []):
            notes.append("Корм с пробиотиками, легкоусвояемый белок")
        
        if 'лишний вес' in (pet.health_issues or []):
            notes.append("Диетический корм, контроль порций")
        
        if pet.allergies:
            notes.append(f"Исключить: {', '.join(pet.allergies)}")
        
        return notes


class PetFoodRecommendationsView(APIView):
    """
    Подбор подходящих кормов для питомца.
    
    GET /api/pets/{pet_id}/recommend-food/
    
    Параметры:
        limit: количество рекомендаций (по умолчанию 20)
    
    Возвращает:
    - Список подходящих кормов
    - Причины рекомендации
    - Скор релевантности
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        pet = get_object_or_404(Pet, id=pet_id, owner=request.user)
        
        food_service = FoodRecommendationService()
        
        # Подбор кормов
        recommended_foods = food_service.recommend_foods(pet)
        
        # Сериализация
        serializer = ProductSerializer(recommended_foods, many=True)
        
        return Response({
            'pet_id': pet.id,
            'pet_name': pet.name,
            'breed': pet.breed.name if pet.breed else None,
            'total_recommendations': len(recommended_foods),
            'foods': serializer.data,
            'filters_applied': {
                'species': pet.species,
                'allergies_excluded': pet.allergies or [],
                'health_considerations': pet.health_issues or []
            }
        }, status=status.HTTP_200_OK)

