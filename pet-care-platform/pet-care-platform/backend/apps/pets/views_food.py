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
            "food_type": "multi",       // dry, wet, multi
            "multi_ratio_preset": null, // при food_type=multi: more_dry, balanced, more_wet (см. опции по виду)
            "variant": "basic",
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
        species = getattr(pet, 'species', None) or 'dog'
        filters = FoodSearchFilters(
            species=species,
            food_type=params.get('food_type', 'multi'),
            multi_ratio_preset=params.get('multi_ratio_preset') or None,
            variant=params.get('variant', 'basic'),
            period_days=int(params.get('period_days', 14)),
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
            multi_ratio_preset=data.get('multi_ratio_preset') or None,
            variant=data.get('variant', 'basic'),
            period_days=int(data.get('period_days', 14)),
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
        
        # Парсим параметры запроса
        params = request.query_params
        
        # Строим фильтры из PetID (единая логика с feeding-plan)
        filters = food_recommendation_service._build_filters_from_pet(pet)
        allergy_codes = filters.allergy_codes or []
        health_condition_codes = filters.health_condition_codes or []
        filters.food_type = params.get('food_type', 'dry')
        filters.preferred_brands = params.get('brands', '').split(',') if params.get('brands') else []
        filters.min_price = Decimal(params['min_price']) if params.get('min_price') else None
        filters.max_price = Decimal(params['max_price']) if params.get('max_price') else None
        filters.period_days = int(params.get('period_days', 30))

        # Рассчитываем калории (после построения фильтров)
        daily_calories = None
        if pet.weight:
            result = calorie_calculator.calculate_daily_calories(pet)
            if result.calculation_method != 'failed':
                daily_calories = result.mer
        filters.daily_calories = daily_calories
        
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
        
        # Базовый queryset (новая структура)
        from django.db.models import Q
        queryset = Product.objects.filter(
            product_group='food',
            animal_type__in=[species, 'all'],
            is_available=True
        )
        
        # Бренды
        brands = list(queryset.values_list('brand__name', flat=True).distinct())
        brands = sorted([b for b in brands if b])
        
        # Типы кормов
        food_types = list(queryset.values_list('new_category__code', flat=True).distinct())
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


class PetSaveRationView(APIView):
    """POST /api/pets/{pet_id}/save-ration/ — сохранить ВЫБРАННУЮ комбинацию рациона в Pet.current_food.

    Тело: { "components": [{"component_type":"dry","recipe_id":..,"offer_id":..},
                           {"component_type":"wet","recipe_id":..,"offer_id":..}],
            "period_days": 30 }
    Клиент шлёт только выбранные recipe_id/offer_id (в т.ч. перелистнутые альтернативы).
    Сервер сам пересчитывает граммовку/дни/стоимость и проверяет пригодность/аллергию
    (медицинскую безопасность нельзя обойти даже при сохранении).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pet_id):
        import math
        from django.utils import timezone
        from .models import FoodRecipe, SupplierOffer
        from .food_recipe_candidate_provider import _pet_context

        pet = get_object_or_404(Pet, id=pet_id, owner=request.user)

        raw = request.data.get('components')
        if not isinstance(raw, list) or not raw:
            return Response({'error': 'components обязателен (список выбранных позиций)'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            period_days = int(request.data.get('period_days') or 30)
        except (TypeError, ValueError):
            period_days = 30

        warnings = []
        mer = None
        if pet.weight:
            try:
                mer = float(calorie_calculator.calculate_daily_calories(pet).mer)
            except Exception:  # noqa: BLE001
                warnings.append('расчёт калорий недоступен')
        else:
            warnings.append('нет веса питомца — граммовка/стоимость не рассчитаны')

        ctx = _pet_context(pet)
        types = [c.get('component_type') for c in raw]
        both = ('dry' in types and 'wet' in types)
        share_map = {'dry': 0.7 if both else 1.0, 'wet': 0.3 if both else 1.0, 'treat': 0.0}

        out_components = []
        for item in raw:
            ctype = item.get('component_type')
            recipe = FoodRecipe.objects.filter(id=item.get('recipe_id'), is_recommendable=True).first()
            if not recipe:
                return Response({'error': 'рецепт не найден или не разрешён в подбор: %s' % item.get('recipe_id')},
                                status=status.HTTP_400_BAD_REQUEST)
            offer = SupplierOffer.objects.filter(
                id=item.get('offer_id'), food_recipe=recipe,
                in_stock=True, price__isnull=False, package_weight_kg__isnull=False,
            ).first()
            if not offer:
                return Response({'error': 'оффер недоступен (нет в наличии/цены/веса): %s' % item.get('offer_id')},
                                status=status.HTTP_400_BAD_REQUEST)
            if recipe.species and pet.species and recipe.species != pet.species:
                return Response({'error': '%s: не для вида %s' % (recipe.name, pet.species)},
                                status=status.HTTP_400_BAD_REQUEST)
            # Аллергия — медицинская безопасность, нельзя обойти.
            text = ' '.join([recipe.main_protein or ''] + list(recipe.allergens or []) + list(recipe.ingredients or [])).lower()
            conflict = next((a for a in ctx['allergens'] if a and a in text), None)
            if conflict:
                return Response({'error': '%s: конфликт с аллергией «%s»' % (recipe.name, conflict)},
                                status=status.HTTP_400_BAD_REQUEST)

            share = share_map.get(ctype, 1.0)
            kcal100 = float(recipe.kcal_per_100g) if recipe.kcal_per_100g else None
            pack_g = float(offer.package_weight_kg) * 1000
            comp_kcal = (mer or 0) * share
            dg = round(comp_kcal / kcal100 * 100, 1) if (mer and kcal100) else None
            days = int(pack_g / dg) if (dg and pack_g) else None
            packs = max(1, math.ceil(period_days * dg / pack_g)) if (dg and pack_g) else None
            monthly = round(packs * float(offer.price), 2) if (packs and offer.price) else None

            out_components.append({
                'component_type': ctype,
                'recipe_id': str(recipe.id),
                'recipe_name': recipe.name,
                'brand': recipe.brand,
                'offer_id': str(offer.id),
                'article_number': offer.article_number,
                'source': recipe.source or 'dinozavrik',
                'kcal_per_100g': kcal100,
                'package_weight_kg': float(offer.package_weight_kg),
                'price': float(offer.price),
                'agency_percent': float(offer.agency_percent) if offer.agency_percent is not None else None,
                'daily_grams': dg,
                'days_supply': days,
                'packages_needed': packs,
                'estimated_monthly_cost': monthly,
            })

        total_monthly = sum(c['estimated_monthly_cost'] for c in out_components if c['estimated_monthly_cost'])
        current_food = {
            'source': 'recipe_ration',
            'saved_at': timezone.now().isoformat(),
            'period_days': period_days,
            'daily_calories': round(mer, 0) if mer else None,
            'total_monthly_cost': round(total_monthly, 2) if total_monthly else None,
            'components': out_components,
            'warnings': warnings,
        }
        pet.current_food = current_food
        pet.save(update_fields=['current_food', 'updated_at'])
        return Response({'current_food': current_food}, status=status.HTTP_200_OK)
