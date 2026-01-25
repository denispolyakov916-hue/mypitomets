"""
API Views для калькулятора питания и подбора корма.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from decimal import Decimal
import json
import os

from .models import Pet
from .nutrition_models import (
    HealthCondition, Allergy,
    PetHealthCondition, PetAllergy, PetFoodExclusion
)
from .serializers_nutrition import (
    HealthConditionSerializer, HealthConditionListSerializer,
    AllergySerializer, AllergyListSerializer,
    PetHealthConditionSerializer, PetHealthConditionCreateSerializer,
    PetAllergySerializer, PetAllergyCreateSerializer,
    PetFoodExclusionSerializer,
    NutritionCalculatorInputSerializer, NutritionCalculatorOutputSerializer,
    FoodSearchInputSerializer
)


class HealthConditionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для справочника заболеваний.
    
    GET /api/v1/nutrition/conditions/ - список заболеваний
    GET /api/v1/nutrition/conditions/{code}/ - детали заболевания
    """
    queryset = HealthCondition.objects.all()
    permission_classes = [AllowAny]
    lookup_field = 'code'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return HealthConditionListSerializer
        return HealthConditionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтры
        species = self.request.query_params.get('species')
        if species:
            queryset = queryset.filter(species__in=[species, 'both'])
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset


class AllergyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API для справочника аллергий.
    
    GET /api/v1/nutrition/allergies/ - список аллергий
    GET /api/v1/nutrition/allergies/{code}/ - детали аллергии
    """
    queryset = Allergy.objects.all()
    permission_classes = [AllowAny]
    lookup_field = 'code'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AllergyListSerializer
        return AllergySerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Фильтры
        animal_type = self.request.query_params.get('animal_type')
        if animal_type:
            queryset = queryset.filter(animal_type__in=[animal_type, 'Both'])
        
        allergen_type = self.request.query_params.get('allergen_type')
        if allergen_type:
            queryset = queryset.filter(allergen_type=allergen_type)
        
        # Поиск
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(display_name__icontains=search)
        
        return queryset


class PetHealthConditionViewSet(viewsets.ModelViewSet):
    """
    API для управления заболеваниями питомца.
    
    GET /api/v1/pets/{pet_id}/health-conditions/ - список заболеваний питомца
    POST /api/v1/pets/{pet_id}/health-conditions/ - добавить заболевание
    DELETE /api/v1/pets/{pet_id}/health-conditions/{id}/ - удалить
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        pet_id = self.kwargs.get('pet_id')
        return PetHealthCondition.objects.filter(
            pet_id=pet_id,
            pet__owner=self.request.user
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PetHealthConditionCreateSerializer
        return PetHealthConditionSerializer
    
    def perform_create(self, serializer):
        pet_id = self.kwargs.get('pet_id')
        pet = get_object_or_404(Pet, id=pet_id, owner=self.request.user)
        serializer.save(pet=pet)


class PetAllergyViewSet(viewsets.ModelViewSet):
    """
    API для управления аллергиями питомца.
    
    GET /api/v1/pets/{pet_id}/allergies/ - список аллергий питомца
    POST /api/v1/pets/{pet_id}/allergies/ - добавить аллергию
    DELETE /api/v1/pets/{pet_id}/allergies/{id}/ - удалить
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        pet_id = self.kwargs.get('pet_id')
        return PetAllergy.objects.filter(
            pet_id=pet_id,
            pet__owner=self.request.user
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PetAllergyCreateSerializer
        return PetAllergySerializer
    
    def perform_create(self, serializer):
        pet_id = self.kwargs.get('pet_id')
        pet = get_object_or_404(Pet, id=pet_id, owner=self.request.user)
        serializer.save(pet=pet)


class PetFoodExclusionViewSet(viewsets.ModelViewSet):
    """
    API для управления исключениями продуктов.
    """
    serializer_class = PetFoodExclusionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        pet_id = self.kwargs.get('pet_id')
        return PetFoodExclusion.objects.filter(
            pet_id=pet_id,
            pet__owner=self.request.user
        )
    
    def perform_create(self, serializer):
        pet_id = self.kwargs.get('pet_id')
        pet = get_object_or_404(Pet, id=pet_id, owner=self.request.user)
        serializer.save(pet=pet)


class NutritionCalculatorView(viewsets.ViewSet):
    """
    Калькулятор суточной калорийности.
    
    POST /api/v1/nutrition/calculate/
    """
    permission_classes = [AllowAny]
    
    def _load_coefficients(self):
        """Загрузка коэффициентов из JSON файла."""
        # Путь к файлу коэффициентов
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        json_path = os.path.join(
            base_path, 'docs', '1 petID + breeds + подбор корма', 
            'data', 'coefficients_nutrition.json'
        )
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return None
    
    def _get_coefficient(self, coefficients, category, species, code):
        """Получение коэффициента по категории и коду."""
        if not coefficients:
            return 1.0
        
        category_data = coefficients.get(category, {})
        
        # Попробуем найти для вида
        species_data = category_data.get(species, category_data.get('both', []))
        
        if isinstance(species_data, list):
            for item in species_data:
                if item.get('code') == code:
                    return item.get('coefficient', 1.0)
        
        return 1.0
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """
        Расчёт суточной калорийности.
        
        Формула для собак: RER = 70 × (weight_kg)^0.75
        Формула для кошек: RER = 70 × (weight_kg)^0.67
        MER = RER × K_age × K_neutering × K_activity × K_size × K_coat × K_climate × K_housing
        """
        serializer = NutritionCalculatorInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Загрузка коэффициентов
        coefficients = self._load_coefficients()
        
        # Получение данных питомца или из запроса
        pet = None
        if data.get('pet_id'):
            try:
                pet = Pet.objects.get(id=data['pet_id'])
                species = pet.species
                weight_kg = float(pet.weight) if pet.weight else data.get('weight_kg', 10)
                age_months = pet.age_months or data.get('age_months', 24)
                is_neutered = pet.is_neutered
                activity_level = pet.activity_level or 'moderate'
                size_category = pet.calculated_size or data.get('size_category', 'medium')
                coat_type = pet.coat_type or data.get('coat_type', 'short')
                housing_type = pet.housing_type or data.get('housing_type', 'apartment')
                living_climate = pet.living_climate or data.get('living_climate', 'warm')
                reproductive_state = pet.reproductive_state or 'none'
                litter_size = pet.litter_size
            except Pet.DoesNotExist:
                return Response(
                    {'error': 'Питомец не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            species = data['species']
            weight_kg = float(data['weight_kg'])
            age_months = data['age_months']
            is_neutered = data.get('is_neutered', True)
            activity_level = data.get('activity_level', 'moderate')
            size_category = data.get('size_category', 'medium')
            coat_type = data.get('coat_type', 'short')
            housing_type = data.get('housing_type', 'apartment')
            living_climate = data.get('living_climate', 'warm')
            reproductive_state = data.get('reproductive_state', 'none')
            litter_size = data.get('litter_size')
        
        warnings = []
        
        # 1. Расчёт RER (Resting Energy Requirement)
        if species == 'dog':
            rer = 70 * (weight_kg ** 0.75)
        else:  # cat
            rer = 70 * (weight_kg ** 0.67)
        
        # 2. Сбор коэффициентов
        applied_coefficients = {}
        
        # K_size (только для собак)
        if species == 'dog':
            k_size = self._get_coefficient(coefficients, 'size_category', 'dog', size_category)
        else:
            k_size = 1.0
        applied_coefficients['size'] = k_size
        
        # K_activity
        k_activity = self._get_coefficient(coefficients, 'activity_level', species, activity_level)
        applied_coefficients['activity'] = k_activity
        
        # K_neutering
        neutering_code = 'neutered' if is_neutered else 'intact'
        k_neutering = self._get_coefficient(coefficients, 'neutering', species, neutering_code)
        applied_coefficients['neutering'] = k_neutering
        
        # K_coat
        k_coat = self._get_coefficient(coefficients, 'coat_type', species, coat_type)
        applied_coefficients['coat'] = k_coat
        
        # K_climate
        k_climate = self._get_coefficient(coefficients, 'climate', 'both', living_climate)
        applied_coefficients['climate'] = k_climate
        
        # K_housing
        k_housing = self._get_coefficient(coefficients, 'housing_type', 'both', housing_type)
        applied_coefficients['housing'] = k_housing
        
        # K_reproductive (для некастрированных самок)
        k_reproductive = 1.0
        if not is_neutered and reproductive_state != 'none':
            if reproductive_state == 'pregnant':
                k_reproductive = 1.4
                warnings.append('Беременность: увеличенная потребность в калориях')
            elif reproductive_state == 'lactating':
                if litter_size:
                    if litter_size <= 2:
                        k_reproductive = 2.0
                    elif litter_size <= 4:
                        k_reproductive = 2.5
                    elif litter_size <= 6:
                        k_reproductive = 3.0
                    else:
                        k_reproductive = 3.5
                else:
                    k_reproductive = 2.5
                warnings.append(f'Лактация ({litter_size or "?"} детёнышей): значительно увеличенная потребность')
        applied_coefficients['reproductive'] = k_reproductive
        
        # K_health (заболевания)
        k_health = 1.0
        health_conditions = data.get('health_conditions', [])
        if pet:
            pet_conditions = PetHealthCondition.objects.filter(
                pet=pet, is_active=True
            ).values_list('condition__code', flat=True)
            health_conditions.extend(list(pet_conditions))
        
        if health_conditions:
            conditions = HealthCondition.objects.filter(code__in=health_conditions)
            for condition in conditions:
                k_health *= condition.coefficient
                if condition.direction == 'DECREASE':
                    warnings.append(f'{condition.name_ru}: рекомендуется снижение калорий')
                elif condition.direction == 'INCREASE':
                    warnings.append(f'{condition.name_ru}: рекомендуется увеличение калорий')
        applied_coefficients['health'] = round(k_health, 2)
        
        # 3. Расчёт MER
        mer = rer * k_size * k_activity * k_neutering * k_coat * k_climate * k_housing * k_reproductive * k_health
        
        # 4. Диапазон калорий (±10%)
        kcal_min = int(mer * 0.9)
        kcal_max = int(mer * 1.1)
        kcal_recommended = int(mer)
        
        # 5. Расчёт нутриентов (базовые AAFCO нормы на 1000 ккал)
        nutrient_profiles = coefficients.get('nutrient_profiles', {}).get(species, {})
        life_stage = 'growth' if age_months < 12 else 'maintenance'
        profile = nutrient_profiles.get(life_stage, {})
        
        nutrients = {}
        if profile:
            kcal_factor = mer / 1000
            nutrients = {
                'protein_g': round(profile.get('protein_g_min', 45) * kcal_factor, 1),
                'fat_g': round(profile.get('fat_g_min', 14) * kcal_factor, 1),
                'fiber_g': round(profile.get('fiber_g_recommended', 3) * kcal_factor, 1),
                'calcium_g': round(profile.get('calcium_g_min', 1) * kcal_factor, 2),
                'phosphorus_g': round(profile.get('phosphorus_g_min', 0.75) * kcal_factor, 2),
            }
            if species == 'cat':
                nutrients['taurine_mg'] = round(profile.get('taurine_mg_min', 250) * kcal_factor, 0)
        
        # Формирование ответа
        result = {
            'rer_kcal': round(rer, 2),
            'mer_kcal': round(mer, 2),
            'coefficients': applied_coefficients,
            'kcal_min': kcal_min,
            'kcal_max': kcal_max,
            'kcal_recommended': kcal_recommended,
            'nutrients': nutrients,
            'warnings': warnings
        }
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def coefficients(self, request):
        """
        Получение всех коэффициентов для калькулятора.
        
        GET /api/v1/nutrition/coefficients/
        """
        coefficients = self._load_coefficients()
        if not coefficients:
            return Response(
                {'error': 'Файл коэффициентов не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(coefficients)
