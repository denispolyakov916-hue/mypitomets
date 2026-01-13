"""
API Views для работы с породами.

Эндпоинты:
- GET /api/pets/breeds/ - список пород с фильтрацией
- GET /api/pets/breeds/{slug}/ - детали породы
- GET /api/pets/breeds/{slug}/health/ - риски здоровья породы
- GET /api/pets/{pet_id}/breed-comparison/ - сравнение питомца с эталоном породы
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404

from .breed_models import Breed, BreedHealth, BreedNutrition, BreedCare
from .models import Pet


class BreedListView(APIView):
    """
    Список пород с фильтрацией.
    
    GET /api/pets/breeds/
    
    Параметры:
        species: dog | cat
        size: tiny | small | medium | large | giant
        hypoallergenic: true | false
        apartment_friendly: true | false
        good_for_novice: true | false
        search: поиск по названию
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        breeds = Breed.objects.all()
        
        # Фильтры
        species = request.query_params.get('species')
        if species:
            breeds = breeds.filter(species=species)
        
        size = request.query_params.get('size')
        if size:
            breeds = breeds.filter(size_category=size)
        
        hypoallergenic = request.query_params.get('hypoallergenic')
        if hypoallergenic:
            breeds = breeds.filter(hypoallergenic=hypoallergenic.lower() == 'true')
        
        apartment = request.query_params.get('apartment_friendly')
        if apartment:
            breeds = breeds.filter(apartment_friendly=apartment.lower() == 'true')
        
        novice = request.query_params.get('good_for_novice')
        if novice:
            breeds = breeds.filter(good_for_novice=novice.lower() == 'true')
        
        search = request.query_params.get('search')
        if search:
            breeds = breeds.filter(name__icontains=search)
        
        # Сортировка
        breeds = breeds.order_by('species', 'name')
        
        return Response({
            'count': breeds.count(),
            'breeds': [breed.to_dict() for breed in breeds]
        })


class BreedDetailView(APIView):
    """
    Детали породы.
    
    GET /api/pets/breeds/{slug}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        breed = get_object_or_404(Breed, slug=slug)
        
        # Получаем связанные данные
        health_risks = [h.to_dict() for h in breed.health_risks.all()]
        nutrition = None
        if breed.nutrition_recommendations.exists():
            nutrition = breed.nutrition_recommendations.first().to_dict()
        care = [c.to_dict() for c in breed.care_procedures.all()]
        
        data = breed.to_dict()
        data['health_risks'] = health_risks
        data['nutrition'] = nutrition
        data['care_procedures'] = care
        
        return Response(data)


class BreedHealthView(APIView):
    """
    Риски здоровья породы.
    
    GET /api/pets/breeds/{slug}/health/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        breed = get_object_or_404(Breed, slug=slug)
        health_risks = breed.health_risks.all().order_by('-prevalence_percent')
        
        return Response({
            'breed': breed.name,
            'health_risk_level': breed.health_risk_level,
            'risks': [h.to_dict() for h in health_risks]
        })


class PetBreedComparisonView(APIView):
    """
    Полное сравнение параметров питомца с эталоном породы.
    
    GET /api/pets/{pet_id}/breed-comparison/
    
    Возвращает:
    - Анализ веса (норма/избыток/недостаток)
    - Анализ активности
    - Анализ питания
    - Анализ поведения
    - Анализ здоровья
    - Анализ условий содержания
    - Риски здоровья породы
    - Персонализированные рекомендации
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        pet = get_object_or_404(Pet, id=pet_id, owner=request.user)
        
        if not pet.breed:
            return Response({
                'error': 'У питомца не указана порода',
                'has_breed': False,
                'pet': self._get_pet_summary(pet)
            })
        
        # Поиск породы в базе знаний
        breed = Breed.objects.filter(name__icontains=pet.breed).first()
        if not breed:
            # Попробуем по slug
            slug = pet.breed.lower().replace(' ', '-').replace('ё', 'е')
            breed = Breed.objects.filter(slug__icontains=slug).first()
        
        if not breed:
            # Попробуем по английскому названию
            breed = Breed.objects.filter(name_en__icontains=pet.breed).first()
        
        if not breed:
            return Response({
                'error': 'Порода не найдена в базе знаний',
                'breed_name': pet.breed,
                'has_breed': True,
                'breed_found': False,
                'pet': self._get_pet_summary(pet)
            })
        
        # Полный анализ параметров
        weight_analysis = self._analyze_weight(pet, breed)
        activity_analysis = self._analyze_activity(pet, breed)
        nutrition_analysis = self._analyze_nutrition(pet, breed)
        behavior_analysis = self._analyze_behavior(pet, breed)
        health_analysis = self._analyze_health(pet, breed)
        housing_analysis = self._analyze_housing(pet, breed)
        
        # Риски здоровья породы
        health_risks = [h.to_dict() for h in breed.health_risks.all()[:5]]
        
        # Рекомендации по питанию породы
        nutrition_info = None
        if breed.nutrition_recommendations.exists():
            nutrition_info = breed.nutrition_recommendations.first().to_dict()
        
        # Рекомендации по уходу
        care_info = [c.to_dict() for c in breed.care_procedures.all()[:5]]
        
        # Общий скор соответствия
        score = self._calculate_score(
            weight_analysis, activity_analysis, nutrition_analysis,
            behavior_analysis, health_analysis, housing_analysis
        )
        
        # Персонализированные рекомендации
        recommendations = self._generate_recommendations(
            pet, breed, weight_analysis, activity_analysis,
            nutrition_analysis, behavior_analysis, health_analysis, housing_analysis
        )
        
        return Response({
            'pet': self._get_pet_summary(pet),
            'breed_standard': {
                'name': breed.name,
                'name_en': breed.name_en,
                'slug': breed.slug,
                'description': breed.short_description,
                'weight_min': float(breed.weight_min),
                'weight_max': float(breed.weight_max),
                'height_min': breed.height_min,
                'height_max': breed.height_max,
                'lifespan_min': breed.lifespan_min,
                'lifespan_max': breed.lifespan_max,
                'energy_level': breed.energy_level,
                'energy_level_display': breed.get_energy_level_display(),
                'size_category': breed.size_category,
                'trainability': breed.trainability,
                'intelligence': breed.intelligence,
                'friendliness_to_children': breed.friendliness_to_children,
                'friendliness_to_pets': breed.friendliness_to_pets,
                'grooming_frequency': breed.grooming_frequency,
                'shedding_level': breed.shedding_level,
                'coat_type': breed.coat_type,
                'health_risk_level': breed.health_risk_level,
                'apartment_friendly': breed.apartment_friendly,
                'good_for_novice': breed.good_for_novice,
                'exercise_needs': breed.exercise_needs,
                'hypoallergenic': breed.hypoallergenic,
                'brachycephalic': breed.brachycephalic,
            },
            'analysis': {
                'weight': weight_analysis,
                'activity': activity_analysis,
                'nutrition': nutrition_analysis,
                'behavior': behavior_analysis,
                'health': health_analysis,
                'housing': housing_analysis,
            },
            'health_risks': health_risks,
            'nutrition_recommendations': nutrition_info,
            'care_procedures': care_info,
            'overall_score': score,
            'recommendations': recommendations,
            'has_breed': True,
            'breed_found': True,
        })
    
    def _get_pet_summary(self, pet):
        """Краткая информация о питомце."""
        from datetime import date
        age = None
        if pet.date_of_birth:
            today = date.today()
            age = today.year - pet.date_of_birth.year
            if today.month < pet.date_of_birth.month or \
               (today.month == pet.date_of_birth.month and today.day < pet.date_of_birth.day):
                age -= 1
        
        return {
            'id': str(pet.id),
            'name': pet.name,
            'species': pet.species,
            'breed': pet.breed,
            'gender': pet.gender,
            'age': age,
            'weight': float(pet.weight) if pet.weight else None,
            'activity_level': pet.activity_level,
            'diet_type': pet.diet_type,
            'feeding_frequency': pet.feeding_frequency,
            'behavior_type': pet.behavior_type,
            'social_level': pet.social_level,
            'training_experience': pet.training_experience,
            'housing_type': pet.housing_type,
            'has_yard': pet.has_yard,
            'has_children': pet.has_children,
            'health_issues': pet.health_issues or [],
            'allergies': pet.allergies or [],
            'chronic_conditions': pet.chronic_conditions,
            'dental_health': pet.dental_health,
            'is_neutered': pet.is_neutered,
        }
    
    def _analyze_weight(self, pet, breed):
        """Анализ веса питомца относительно стандарта породы."""
        if not pet.weight:
            return {
                'status': 'unknown',
                'status_label': 'Не указан',
                'message': 'Вес питомца не указан',
                'score': 50
            }
        
        weight = float(pet.weight)
        min_w = float(breed.weight_min)
        max_w = float(breed.weight_max)
        ideal = (min_w + max_w) / 2
        
        if weight < min_w * 0.85:
            status = 'severely_underweight'
            deviation = ((min_w - weight) / min_w) * 100
            message = f'Значительный недостаток веса ({deviation:.1f}% ниже нормы)'
            recommendation = 'Срочно обратитесь к ветеринару для обследования'
            score = 30
        elif weight < min_w * 0.95:
            status = 'underweight'
            deviation = ((min_w - weight) / min_w) * 100
            message = f'Небольшой недостаток веса ({deviation:.1f}% ниже нормы)'
            recommendation = 'Рекомендуется корректировка питания'
            score = 60
        elif weight > max_w * 1.2:
            status = 'obese'
            deviation = ((weight - max_w) / max_w) * 100
            message = f'Ожирение ({deviation:.1f}% выше нормы)'
            recommendation = 'Срочно требуется диета и консультация ветеринара'
            score = 20
        elif weight > max_w * 1.05:
            status = 'overweight'
            deviation = ((weight - max_w) / max_w) * 100
            message = f'Избыточный вес ({deviation:.1f}% выше нормы)'
            recommendation = 'Рекомендуется диета и увеличение физической активности'
            score = 55
        else:
            status = 'normal'
            message = 'Вес в пределах нормы для породы'
            recommendation = 'Поддерживайте текущий режим питания'
            score = 100
        
        status_labels = {
            'severely_underweight': 'Сильный недовес',
            'underweight': 'Недовес',
            'normal': 'Норма',
            'overweight': 'Избыток',
            'obese': 'Ожирение'
        }
        
        return {
            'status': status,
            'status_label': status_labels.get(status, status),
            'current_weight': weight,
            'ideal_min': min_w,
            'ideal_max': max_w,
            'ideal_average': ideal,
            'message': message,
            'recommendation': recommendation,
            'score': score
        }
    
    def _analyze_activity(self, pet, breed):
        """Анализ уровня активности."""
        energy_map = {
            'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5
        }
        energy_labels = {
            'very_low': 'Очень низкая', 'low': 'Низкая', 'medium': 'Средняя',
            'high': 'Высокая', 'very_high': 'Очень высокая'
        }
        
        pet_level = energy_map.get(pet.activity_level, 3)
        breed_level = energy_map.get(breed.energy_level, 3)
        
        diff = pet_level - breed_level
        
        if abs(diff) <= 1:
            status = 'normal'
            message = 'Уровень активности соответствует породе'
            recommendation = None
            score = 100
        elif diff < -1:
            status = 'insufficient'
            message = 'Активность ниже рекомендуемой для породы'
            recommendation = 'Рекомендуется увеличить физические нагрузки'
            score = 60
        else:
            status = 'excessive'
            message = 'Активность выше типичной для породы'
            recommendation = 'Убедитесь, что питомец получает достаточно отдыха'
            score = 75
        
        status_labels = {
            'normal': 'Соответствует',
            'insufficient': 'Недостаточная',
            'excessive': 'Избыточная'
        }
        
        return {
            'status': status,
            'status_label': status_labels.get(status, status),
            'pet_activity': pet.activity_level,
            'pet_activity_label': energy_labels.get(pet.activity_level, 'Не указан'),
            'breed_energy': breed.energy_level,
            'breed_energy_label': energy_labels.get(breed.energy_level, 'Средняя'),
            'message': message,
            'recommendation': recommendation,
            'score': score
        }
    
    def _analyze_nutrition(self, pet, breed):
        """Анализ питания относительно потребностей породы."""
        issues = []
        score = 100
        
        # Проверка типа питания
        diet_type = pet.diet_type
        if not diet_type:
            issues.append('Тип питания не указан')
            score -= 10
        
        # Проверка частоты кормления
        feeding_freq = pet.feeding_frequency
        if not feeding_freq:
            issues.append('Частота кормления не указана')
            score -= 10
        
        # Проверка чувствительного пищеварения
        if pet.sensitive_digestion:
            issues.append('Требуется специальный корм для чувствительного пищеварения')
            score -= 5
        
        # Проверка аллергий
        allergies = pet.allergies or []
        if allergies:
            issues.append(f'Учитывайте аллергии: {", ".join(allergies[:3])}')
            score -= 5
        
        # Получаем рекомендации по питанию породы
        nutrition_rec = breed.nutrition_recommendations.first()
        recommended_diet = None
        if nutrition_rec:
            recommended_diet = {
                'protein_range': f'{nutrition_rec.protein_min_percent}-{nutrition_rec.protein_max_percent}%',
                'fat_range': f'{nutrition_rec.fat_min_percent}-{nutrition_rec.fat_max_percent}%',
                'recommended_ingredients': nutrition_rec.recommended_ingredients or [],
                'avoid_ingredients': nutrition_rec.avoid_ingredients or [],
            }
        
        if not issues:
            message = 'Питание настроено корректно'
            status = 'good'
        elif len(issues) <= 2:
            message = 'Питание требует внимания'
            status = 'attention'
        else:
            message = 'Питание требует корректировки'
            status = 'needs_improvement'
        
        status_labels = {
            'good': 'Хорошо',
            'attention': 'Требует внимания',
            'needs_improvement': 'Требует улучшения'
        }
        
        return {
            'status': status,
            'status_label': status_labels.get(status, status),
            'current_diet': diet_type,
            'feeding_frequency': feeding_freq,
            'has_allergies': bool(allergies),
            'sensitive_digestion': pet.sensitive_digestion,
            'issues': issues,
            'message': message,
            'recommended_diet': recommended_diet,
            'score': max(0, score)
        }
    
    def _analyze_behavior(self, pet, breed):
        """Анализ поведения относительно характеристик породы."""
        issues = []
        score = 100
        
        trainability_map = {
            'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5
        }
        
        # Проверка типа поведения
        if pet.behavior_type:
            if pet.behavior_type == 'aggressive' and breed.friendliness_to_strangers in ['high', 'very_high']:
                issues.append('Агрессивное поведение нетипично для породы')
                score -= 20
            elif pet.behavior_type == 'shy' and breed.friendliness_to_strangers in ['high', 'very_high']:
                issues.append('Застенчивость нетипична для породы')
                score -= 10
        
        # Проверка опыта дрессировки
        training_map = {'none': 0, 'basic': 1, 'intermediate': 2, 'advanced': 3, 'professional': 4}
        breed_trainability = trainability_map.get(breed.trainability, 3)
        pet_training = training_map.get(pet.training_experience, 0)
        
        if breed_trainability >= 4 and pet_training < 2:
            issues.append(f'Порода {breed.name} хорошо поддаётся дрессировке - используйте этот потенциал')
        
        # Проверка поведенческих проблем
        behavioral_problems = pet.behavioral_problems or []
        if behavioral_problems:
            issues.append(f'Обратите внимание на поведенческие проблемы: {", ".join(behavioral_problems[:3])}')
            score -= len(behavioral_problems) * 5
        
        # Проверка социализации
        if pet.social_level:
            if pet.social_level == 'home_only' and breed.friendliness_to_pets in ['high', 'very_high']:
                issues.append('Порода хорошо социализируется - рекомендуется больше контактов')
                score -= 10
        
        if not issues:
            message = 'Поведение соответствует породе'
            status = 'good'
        elif len(issues) <= 2:
            message = 'Есть особенности поведения'
            status = 'attention'
        else:
            message = 'Требуется работа с поведением'
            status = 'needs_work'
        
        status_labels = {
            'good': 'Хорошо',
            'attention': 'Требует внимания',
            'needs_work': 'Требует работы'
        }
        
        return {
            'status': status,
            'status_label': status_labels.get(status, status),
            'behavior_type': pet.behavior_type,
            'social_level': pet.social_level,
            'training_experience': pet.training_experience,
            'behavioral_problems': behavioral_problems,
            'breed_trainability': breed.trainability,
            'issues': issues,
            'message': message,
            'score': max(0, score)
        }
    
    def _analyze_health(self, pet, breed):
        """Анализ здоровья с учётом рисков породы."""
        issues = []
        warnings = []
        score = 100
        
        # Проверка указанных проблем здоровья
        health_issues = pet.health_issues or []
        if health_issues:
            issues.extend(health_issues[:5])
            score -= len(health_issues) * 10
        
        # Проверка хронических заболеваний
        if pet.chronic_conditions:
            issues.append(f'Хронические заболевания: {pet.chronic_conditions}')
            score -= 15
        
        # Проверка состояния зубов
        if pet.dental_health == 'needs_attention':
            issues.append('Состояние зубов требует внимания')
            score -= 10
        elif pet.dental_health == 'fair':
            warnings.append('Следите за состоянием зубов')
            score -= 5
        
        # Риски породы
        breed_risks = list(breed.health_risks.all()[:3])
        risk_warnings = []
        for risk in breed_risks:
            if risk.severity in ['high', 'critical']:
                risk_warnings.append(f'{risk.condition_name} ({risk.severity})')
        
        if risk_warnings:
            warnings.append(f'Породные риски: {", ".join(risk_warnings)}')
        
        # Брахицефалы требуют особого внимания
        if breed.brachycephalic:
            warnings.append('Брахицефальная порода - следите за дыханием в жару')
        
        if not issues and not warnings:
            message = 'Состояние здоровья хорошее'
            status = 'good'
        elif not issues:
            message = 'Обратите внимание на предупреждения'
            status = 'attention'
        else:
            message = 'Требуется внимание к здоровью'
            status = 'needs_attention'
        
        status_labels = {
            'good': 'Хорошо',
            'attention': 'Внимание',
            'needs_attention': 'Требует внимания'
        }
        
        return {
            'status': status,
            'status_label': status_labels.get(status, status),
            'health_issues': issues,
            'warnings': warnings,
            'breed_risk_level': breed.health_risk_level,
            'is_brachycephalic': breed.brachycephalic,
            'is_neutered': pet.is_neutered,
            'message': message,
            'score': max(0, score)
        }
    
    def _analyze_housing(self, pet, breed):
        """Анализ условий содержания."""
        issues = []
        score = 100
        
        housing = pet.housing_type
        has_yard = pet.has_yard
        has_children = pet.has_children
        
        # Проверка совместимости с квартирой
        if housing == 'apartment' and not breed.apartment_friendly:
            issues.append(f'Порода {breed.name} не рекомендуется для содержания в квартире')
            score -= 25
        
        # Проверка наличия двора для активных пород
        if breed.exercise_needs in ['high', 'very_high'] and not has_yard:
            issues.append('Для породы с высокой потребностью в нагрузках рекомендуется двор')
            score -= 15
        
        # Проверка совместимости с детьми
        if has_children and breed.friendliness_to_children in ['low', 'very_low']:
            issues.append('Порода может быть не идеальна для семей с детьми')
            score -= 20
        
        if not issues:
            message = 'Условия содержания подходящие'
            status = 'good'
        elif len(issues) == 1:
            message = 'Есть особенности содержания'
            status = 'attention'
        else:
            message = 'Условия содержания требуют внимания'
            status = 'needs_improvement'
        
        status_labels = {
            'good': 'Подходящие',
            'attention': 'Требуют внимания',
            'needs_improvement': 'Требуют улучшения'
        }
        
        return {
            'status': status,
            'status_label': status_labels.get(status, status),
            'housing_type': housing,
            'has_yard': has_yard,
            'has_children': has_children,
            'breed_apartment_friendly': breed.apartment_friendly,
            'breed_exercise_needs': breed.exercise_needs,
            'breed_good_for_novice': breed.good_for_novice,
            'issues': issues,
            'message': message,
            'score': max(0, score)
        }
    
    def _calculate_score(self, weight_analysis, activity_analysis, nutrition_analysis,
                        behavior_analysis, health_analysis, housing_analysis):
        """Расчёт общего скора соответствия (0-100)."""
        weights = {
            'weight': 0.20,
            'activity': 0.15,
            'nutrition': 0.15,
            'behavior': 0.15,
            'health': 0.20,
            'housing': 0.15,
        }
        
        total_score = (
            weight_analysis.get('score', 50) * weights['weight'] +
            activity_analysis.get('score', 50) * weights['activity'] +
            nutrition_analysis.get('score', 50) * weights['nutrition'] +
            behavior_analysis.get('score', 50) * weights['behavior'] +
            health_analysis.get('score', 50) * weights['health'] +
            housing_analysis.get('score', 50) * weights['housing']
        )
        
        return round(total_score)
    
    def _generate_recommendations(self, pet, breed, weight_analysis, activity_analysis,
                                  nutrition_analysis, behavior_analysis, health_analysis, housing_analysis):
        """Генерация персонализированных рекомендаций."""
        recommendations = []
        
        # По весу
        if weight_analysis['status'] in ['overweight', 'obese']:
            recommendations.append({
                'category': 'weight',
                'priority': 'high',
                'icon': '⚖️',
                'title': 'Контроль веса',
                'description': weight_analysis['recommendation'],
                'actions': [
                    'Уменьшите порции на 10-15%',
                    'Увеличьте длительность прогулок',
                    'Выберите диетический корм',
                    'Исключите лакомства или замените на низкокалорийные'
                ]
            })
        elif weight_analysis['status'] in ['underweight', 'severely_underweight']:
            recommendations.append({
                'category': 'weight',
                'priority': 'high',
                'icon': '⚖️',
                'title': 'Набор веса',
                'description': weight_analysis['recommendation'],
                'actions': [
                    'Проконсультируйтесь с ветеринаром',
                    'Рассмотрите высококалорийный корм',
                    'Проверьте на наличие паразитов',
                    'Увеличьте частоту кормления'
                ]
            })
        
        # По активности
        if activity_analysis['status'] == 'insufficient':
            energy_label = activity_analysis.get('breed_energy_label', 'рекомендуемую')
            recommendations.append({
                'category': 'activity',
                'priority': 'medium',
                'icon': '🏃',
                'title': 'Повышение активности',
                'description': activity_analysis['recommendation'],
                'actions': [
                    f'Для породы рекомендуется {energy_label.lower()} активность',
                    'Добавьте игровые сессии 2-3 раза в день',
                    'Увеличьте время прогулок',
                    'Используйте интерактивные игрушки'
                ]
            })
        
        # По питанию
        if nutrition_analysis['status'] in ['attention', 'needs_improvement']:
            actions = ['Проконсультируйтесь с ветеринаром о рационе']
            if nutrition_analysis.get('recommended_diet'):
                rec_diet = nutrition_analysis['recommended_diet']
                if rec_diet.get('recommended_ingredients'):
                    actions.append(f'Рекомендуемые ингредиенты: {", ".join(rec_diet["recommended_ingredients"][:3])}')
                if rec_diet.get('avoid_ingredients'):
                    actions.append(f'Избегайте: {", ".join(rec_diet["avoid_ingredients"][:3])}')
            
            recommendations.append({
                'category': 'nutrition',
                'priority': 'medium',
                'icon': '🍖',
                'title': 'Питание',
                'description': nutrition_analysis['message'],
                'actions': actions
            })
        
        # По поведению
        if behavior_analysis['status'] in ['attention', 'needs_work']:
            recommendations.append({
                'category': 'behavior',
                'priority': 'medium',
                'icon': '🐕',
                'title': 'Поведение и дрессировка',
                'description': behavior_analysis['message'],
                'actions': behavior_analysis.get('issues', []) + [
                    'Рассмотрите занятия с кинологом' if pet.species == 'dog' else 'Обеспечьте обогащение среды'
                ]
            })
        
        # По здоровью породы
        if health_analysis['status'] in ['attention', 'needs_attention']:
            actions = ['Регулярные осмотры у ветеринара (минимум раз в год)']
            if health_analysis.get('warnings'):
                actions.extend(health_analysis['warnings'][:2])
            if health_analysis.get('is_brachycephalic'):
                actions.append('Избегайте физических нагрузок в жару')
            
            recommendations.append({
                'category': 'health',
                'priority': 'high',
                'icon': '🏥',
                'title': 'Профилактика здоровья',
                'description': health_analysis['message'],
                'actions': actions
            })
        
        # По условиям содержания
        if housing_analysis['status'] in ['attention', 'needs_improvement']:
            recommendations.append({
                'category': 'housing',
                'priority': 'low',
                'icon': '🏠',
                'title': 'Условия содержания',
                'description': housing_analysis['message'],
                'actions': housing_analysis.get('issues', []) + [
                    'Обеспечьте достаточно места для активности'
                ]
            })
        
        # По уходу за шерстью
        if breed.grooming_frequency in ['daily', 'professional']:
            recommendations.append({
                'category': 'grooming',
                'priority': 'low',
                'icon': '✂️',
                'title': 'Уход за шерстью',
                'description': f'Порода требует {breed.get_grooming_frequency_display().lower()} ухода',
                'actions': [
                    'Регулярное расчёсывание' if breed.grooming_frequency != 'professional' else 'Профессиональный груминг раз в 1-2 месяца',
                    'Следите за состоянием шерсти',
                    'Купание по необходимости'
                ]
            })
        
        # Сортируем по приоритету
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 2))
        
        return recommendations

