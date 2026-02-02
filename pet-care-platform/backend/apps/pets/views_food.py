"""
API views для подбора корма и расчета рациона.

Endpoints:
- GET /api/pets/{pet_id}/diet-calculation/ - расчёт калорийности
- GET /api/pets/{pet_id}/recommend-food/ - подбор корма (простой)
- GET /api/pets/{pet_id}/feeding-plan/ - план питания (полный)
- POST /api/pets/{pet_id}/feeding-plan/ - сформировать план с параметрами
- GET /api/pets/{pet_id}/food-alternatives/{component_id}/ - альтернативы компоненту
- GET /api/pets/food-statistics/ - статистика по кормам
"""
from datetime import date
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Pet
from .calorie_calculator import calorie_calculator
from .food_recommendation_service import (
    FoodRecommendationService, 
    FoodSearchFilters,
    food_recommendation_service
)


class PetDietCalculationView(APIView):
    """
    Расчет персонального рациона для питомца.
    
    GET /api/pets/{pet_id}/diet-calculation/
    
    Возвращает:
    - RER (базовый метаболизм)
    - MER (дневная норма)
    - Коэффициенты, применённые при расчёте
    - Рекомендации по кормлению
    - Граммы сухого/влажного корма
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        pet = get_object_or_404(
            Pet.objects.select_related('breed'),
            id=pet_id, 
            owner=request.user
        )
        
        if not pet.weight:
            return Response({
                'error': 'Недостаточно данных для расчета',
                'message': 'Укажите вес питомца'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Расчёт калорий через новый сервис
        result = calorie_calculator.calculate_daily_calories(pet)
        
        if result.calculation_method == 'failed':
            return Response({
                'error': 'Ошибка расчёта',
                'warnings': result.warnings
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'pet_id': str(pet.id),
            'pet_name': pet.name,
            'breed': pet.breed.name if pet.breed else None,
            'weight_kg': float(pet.weight),
            
            **result.to_dict(),
            
            'feeding_schedule': {
                'meals_per_day': result.meals_per_day,
                'calories_per_meal': round(result.calories_per_meal, 1),
            },
        }, status=status.HTTP_200_OK)


class PetFeedingPlanView(APIView):
    """
    Полный план питания для питомца.
    
    GET /api/pets/{pet_id}/feeding-plan/
        Возвращает план с параметрами по умолчанию (30 дней, мультипитание, базовый)
    
    POST /api/pets/{pet_id}/feeding-plan/
        Body:
        {
            "food_type": "multi",  // dry, wet, multi
            "variant": "basic",    // basic, advanced
            "period_days": 30,
            "preferred_brands": ["Royal Canin", "Hill's"],
            "min_price": 500,
            "max_price": 5000
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        """Получить план питания с параметрами по умолчанию."""
        pet = get_object_or_404(
            Pet.objects.select_related('breed'),
            id=pet_id, 
            owner=request.user
        )
        
        if not pet.weight:
            return Response({
                'error': 'Недостаточно данных',
                'message': 'Укажите вес питомца для расчёта рациона'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Парсим query params
        params = request.query_params
        
        filters = FoodSearchFilters(
            food_type=params.get('food_type', 'multi'),
            variant=params.get('variant', 'basic'),
            period_days=int(params.get('period_days', 30)),
        )
        
        # Получаем план
        plan = food_recommendation_service.get_recommendations_for_pet(pet, filters)
        
        return Response(
            food_recommendation_service.to_dict(plan),
            status=status.HTTP_200_OK
        )
    
    def post(self, request, pet_id):
        """Сформировать план питания с конкретными параметрами."""
        pet = get_object_or_404(
            Pet.objects.select_related('breed'),
            id=pet_id, 
            owner=request.user
        )
        
        if not pet.weight:
            return Response({
                'error': 'Недостаточно данных',
                'message': 'Укажите вес питомца'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = request.data
        
        # Строим фильтры из запроса
        filters = FoodSearchFilters(
            species=pet.species or 'dog',
            food_type=data.get('food_type', 'multi'),
            variant=data.get('variant', 'basic'),
            period_days=int(data.get('period_days', 30)),
            preferred_brands=data.get('preferred_brands', []),
            priority_brands=data.get('priority_brands', []),
            min_price=Decimal(str(data['min_price'])) if data.get('min_price') else None,
            max_price=Decimal(str(data['max_price'])) if data.get('max_price') else None,
        )
        
        # Получаем план
        plan = food_recommendation_service.get_recommendations_for_pet(pet, filters)
        
        # Проверяем совместимость
        compatibility_warnings = food_recommendation_service.check_compatibility(plan.components)
        if compatibility_warnings:
            plan.warnings.extend(compatibility_warnings)
        
        return Response(
            food_recommendation_service.to_dict(plan),
            status=status.HTTP_200_OK
        )


class PetFoodAlternativesView(APIView):
    """
    Получение альтернативных продуктов для компонента рациона.
    
    GET /api/pets/{pet_id}/food-alternatives/{product_id}/
    
    Query Params:
        component_type: dry_food, wet_food, treat, supplement
        limit: количество альтернатив (по умолчанию 10)
        period_days: период подбора (по умолчанию 30)
        food_type: тип питания dry/wet/multi (по умолчанию multi)
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id, product_id):
        pet = get_object_or_404(
            Pet.objects.select_related('breed'),
            id=pet_id, 
            owner=request.user
        )
        
        params = request.query_params
        component_type = params.get('component_type', 'dry_food')
        limit = int(params.get('limit', 10))
        period_days = int(params.get('period_days', 30))
        food_type = params.get('food_type', 'multi')
        
        # Строим фильтры на основе PetID
        filters = food_recommendation_service._build_filters_from_pet(pet)
        
        # Устанавливаем период и тип питания
        filters.period_days = period_days
        filters.food_type = food_type
        filters.has_gi_issues = food_recommendation_service._has_gi_issues(filters)
        filters.calorie_distribution = food_recommendation_service._get_calorie_distribution(pet, filters)
        
        # Рассчитываем калории
        calorie_result = calorie_calculator.calculate_daily_calories(pet)
        
        if calorie_result.calculation_method != 'failed':
            # Передаём полную калорийность - распределение сделает get_alternatives
            filters.daily_calories = calorie_result.mer
        
        # Создаём "пустой" компонент для поиска альтернатив
        from .food_recommendation_service import FoodComponent
        current_component = FoodComponent(
            product_id=product_id,
            product_name='',
            product_type=component_type,
            match_score=0,
        )
        
        # Получаем альтернативы
        alternatives = food_recommendation_service.get_alternatives(
            current_component, 
            filters, 
            limit
        )
        
        return Response({
            'pet_id': str(pet.id),
            'current_product_id': product_id,
            'component_type': component_type,
            'alternatives': [
                {
                    'product_id': a.product_id,
                    'product_name': a.product_name,
                    'product_type': a.product_type,  # ВАЖНО: тип компонента для карточки
                    'match_score': a.match_score,
                    'daily_grams': a.daily_grams,
                    'daily_kcal': a.daily_kcal,
                    'price': str(a.price) if a.price else None,
                    'weight_grams': a.weight_grams,
                    'packages_needed': a.packages_needed,
                    'days_supply': a.days_supply,
                    'reasons': a.reasons,
                    'warnings': a.warnings,
                    'badges': a.badges,
                    # Расширенные поля для UI
                    'short_description': a.short_description,
                    'image_url': str(a.image_url) if a.image_url else None,
                    'shop_url': a.shop_url,
                    'kcal_per_100g': float(a.kcal_per_100g) if a.kcal_per_100g else None,
                    # БЖУ и минералы
                    'nutrition': {
                        'protein': a.nutrition_protein,
                        'fat': a.nutrition_fat,
                        'fiber': a.nutrition_fiber,
                        'moisture': a.nutrition_moisture,
                        'ash': a.nutrition_ash,
                        'calcium': a.nutrition_calcium,
                        'phosphorus': a.nutrition_phosphorus,
                        'omega3': a.nutrition_omega3,
                        'omega6': a.nutrition_omega6,
                    },
                    # Лакомства
                    'pieces_per_day': a.pieces_per_day,
                }
                for a in alternatives
            ],
            'total': len(alternatives),
        }, status=status.HTTP_200_OK)


class PetFoodRecommendationsView(APIView):
    """
    Подбор подходящих кормов для питомца (упрощённый API).
    
    GET /api/pets/{pet_id}/recommend-food/
    
    Query Params:
        food_type: тип корма (dry, wet, canned, etc.)
        min_price: минимальная цена
        max_price: максимальная цена
        brands: список брендов через запятую
        limit: количество рекомендаций (по умолчанию 20)
        offset: смещение для пагинации
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        pet = get_object_or_404(
            Pet.objects.select_related('breed'),
            id=pet_id, 
            owner=request.user
        )
        
        # Рассчитываем калории
        daily_calories = None
        if pet.weight:
            result = calorie_calculator.calculate_daily_calories(pet)
            if result.calculation_method != 'failed':
                daily_calories = result.mer
        
        # Получаем аллергии питомца из M2M
        allergy_codes = []
        excluded_ingredients = []
        health_condition_codes = []
        
        try:
            from .nutrition_models import PetAllergy, PetHealthCondition, PetFoodExclusion
            allergy_codes = list(
                PetAllergy.objects.filter(pet=pet, is_active=True)
                .values_list('allergy__code', flat=True)
            )
            excluded_ingredients = list(
                PetFoodExclusion.objects.filter(pet=pet)
                .values_list('ingredient_name', flat=True)
            )
            health_condition_codes = list(
                PetHealthCondition.objects.filter(pet=pet, is_active=True)
                .values_list('condition__code', flat=True)
            )
        except Exception as e:
            pass
        
        # Парсим параметры запроса
        params = request.query_params
        
        filters = FoodSearchFilters(
            species=pet.species or 'dog',
            size_category=getattr(pet, 'size_category', None),
            age_months=pet.age_months,
            daily_calories=daily_calories,
            allergy_codes=allergy_codes,
            excluded_ingredients=excluded_ingredients,
            health_condition_codes=health_condition_codes,
            food_type=params.get('food_type', 'dry'),
            preferred_brands=params.get('brands', '').split(',') if params.get('brands') else [],
            min_price=Decimal(params['min_price']) if params.get('min_price') else None,
            max_price=Decimal(params['max_price']) if params.get('max_price') else None,
            period_days=int(params.get('period_days', 30)),
        )
        
        # Получаем план и возвращаем только компоненты
        plan = food_recommendation_service.get_recommendations_for_pet(pet, filters)
        
        return Response({
            'pet': {
                'id': str(pet.id),
                'name': pet.name,
                'species': pet.species,
                'breed': pet.breed.name if pet.breed else None,
                'daily_calories': daily_calories,
                'size_category': getattr(pet, 'size_category', None),
                'allergies_count': len(allergy_codes),
                'health_conditions_count': len(health_condition_codes)
            },
            'daily_calories': plan.daily_calories,
            'recommendations': [
                {
                    'product_id': c.product_id,
                    'product_name': c.product_name,
                    'match_score': c.match_score,
                    'daily_grams': c.daily_grams,
                    'price': str(c.price) if c.price else None,
                    'reasons': c.reasons,
                    'warnings': c.warnings,
                    'badges': c.badges,
                    'alternatives_count': c.alternatives_count,
                }
                for c in plan.components
            ],
            'total': len(plan.components),
            'warnings': plan.warnings,
        }, status=status.HTTP_200_OK)


class PetActiveDayCaloriesView(APIView):
    """
    Расчёт калорий для активного дня.
    
    POST /api/pets/{pet_id}/active-day-calories/
    Body:
    {
        "activities": [
            {"type": "running", "duration_minutes": 30},
            {"type": "playing", "duration_minutes": 45}
        ]
    }
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pet_id):
        pet = get_object_or_404(
            Pet.objects.select_related('breed'),
            id=pet_id, 
            owner=request.user
        )
        
        if not pet.weight:
            return Response({
                'error': 'Укажите вес питомца'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        activities = request.data.get('activities', [])
        
        if not activities:
            return Response({
                'error': 'Укажите список активностей'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Рассчитываем для активного дня
        result = calorie_calculator.calculate_active_day_calories(pet, activities)
        
        # Базовый расчёт для сравнения
        base_result = calorie_calculator.calculate_daily_calories(pet)
        
        return Response({
            'pet_id': str(pet.id),
            'pet_name': pet.name,
            
            'base_day': {
                'rer_kcal': round(base_result.rer, 1),
                'mer_kcal': round(base_result.mer, 1),
                'dry_food_grams': round(base_result.dry_food_grams, 0) if base_result.dry_food_grams else None,
            },
            
            'active_day': {
                'rer_kcal': round(result.rer, 1),
                'mer_kcal': round(result.mer, 1),
                'dry_food_grams': round(result.dry_food_grams, 0) if result.dry_food_grams else None,
                'extra_activities': result.coefficients_applied.get('extra_activities', {}),
            },
            
            'difference': {
                'extra_kcal': round(result.mer - base_result.mer, 0),
                'extra_percent': round((result.mer / base_result.mer - 1) * 100, 1),
                'extra_dry_grams': round((result.dry_food_grams or 0) - (base_result.dry_food_grams or 0), 0),
            },
            
            'recommendations': result.recommendations,
        }, status=status.HTTP_200_OK)


class FoodStatisticsView(APIView):
    """
    Получение статистики по доступным кормам.
    
    GET /api/pets/food-statistics/
        Возвращает: бренды, типы кормов, ценовые диапазоны
        
    Query params:
        species: dog | cat (default: dog)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Получить статистику по кормам."""
        species = request.query_params.get('species', 'dog')
        if species not in ['dog', 'cat']:
            species = 'dog'
        
        from apps.shop.models import Product
        
        # Базовый queryset (используем новые поля + legacy для совместимости)
        from django.db.models import Q
        queryset = Product.objects.filter(
            Q(product_group='food') | Q(category='food'),
            Q(animal_type__in=[species, 'all']) | Q(animal=species),
            Q(is_available=True) | Q(in_stock=True)
        )
        
        # Бренды
        brands = list(queryset.values_list('vendor', flat=True).distinct())
        brands = sorted([b for b in brands if b])
        
        # Типы кормов
        food_types = list(queryset.values_list('subcategory', flat=True).distinct())
        food_types = [ft for ft in food_types if ft]
        
        # Ценовой диапазон
        prices = queryset.values_list('price', flat=True)
        prices = [float(p) for p in prices if p]
        
        return Response({
            'species': species,
            'total_products': queryset.count(),
            'brands': brands,
            'brands_count': len(brands),
            'food_types': food_types,
            'price_range': {
                'min': min(prices) if prices else 0,
                'max': max(prices) if prices else 0,
                'avg': round(sum(prices) / len(prices), 2) if prices else 0
            }
        })
