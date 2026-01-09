"""
Views для управления питомцами (PetID) и справочником пород.

CRUD API для профилей питомцев.
API справочника пород для автозаполнения.
"""

import logging
from datetime import datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q

from .models import Pet
from .breed_models import Breed
from .serializers import (
    PetCreateSerializer, PetUpdateSerializer,
    BreedSerializer, BreedListSerializer
)

logger = logging.getLogger('apps.pets')


class PetListCreateView(APIView):
    """
    Список питомцев и создание нового.
    
    GET  /api/pets/ - список питомцев пользователя
    POST /api/pets/ - создание питомца
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Список питомцев пользователя."""
        # Оптимизация: select_related для owner (хотя owner уже известен, но для консистентности)
        pets_query = Pet.objects.select_related('owner').filter(owner=request.user)

        # Фильтр по черновикам
        is_draft = request.query_params.get('is_draft')
        if is_draft == 'true':
            pets_query = pets_query.filter(is_draft=True)
        elif is_draft == 'false':
            pets_query = pets_query.filter(is_draft=False)

        pets = pets_query
        pets_data = [pet.to_dict() for pet in pets]

        return Response({
            'pets': pets_data,
            'count': len(pets_data)
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Создание нового питомца."""
        logger.info(f"Creating pet with data: {request.data}")
        serializer = PetCreateSerializer(data=request.data)

        if not serializer.is_valid():
            logger.error(f"Serializer validation errors: {serializer.errors}")
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Конвертация даты из строки
        date_of_birth = serializer.validated_data.get('date_of_birth')
        if date_of_birth and isinstance(date_of_birth, str):
            date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d').date()

        # Контакты владельца: по умолчанию из User, но можно переопределить
        owner_phone = serializer.validated_data.get('owner_phone') or request.user.phone
        owner_email = serializer.validated_data.get('owner_email') or request.user.email
        owner_city = serializer.validated_data.get('owner_city') or request.user.city

        # Создание питомца
        pet = Pet.objects.create(
            owner=request.user,
            name=serializer.validated_data['name'],
            species=serializer.validated_data['species'],
            breed=serializer.validated_data.get('breed'),
            date_of_birth=date_of_birth,
            weight=serializer.validated_data.get('weight'),
            gender=serializer.validated_data.get('gender', 'unknown'),
            is_neutered=serializer.validated_data.get('is_neutered', False),
            favorite_foods=serializer.validated_data.get('favorite_foods', []),
            allergies=serializer.validated_data.get('allergies', []),
            health_issues=serializer.validated_data.get('health_issues', []),
            behavioral_problems=serializer.validated_data.get('behavioral_problems', []),
            # Расширенные поля для курсов
            behavior_type=serializer.validated_data.get('behavior_type'),
            social_level=serializer.validated_data.get('social_level'),
            training_experience=serializer.validated_data.get('training_experience'),
            special_needs=serializer.validated_data.get('special_needs', []),
            preferred_activities=serializer.validated_data.get('preferred_activities', []),
            # Новые поля PetID
            size=serializer.validated_data.get('size'),
            body_type=serializer.validated_data.get('body_type'),
            activity_level=serializer.validated_data.get('activity_level', 'medium'),
            # Питание
            diet_type=serializer.validated_data.get('diet_type'),
            feeding_frequency=serializer.validated_data.get('feeding_frequency'),
            sensitive_digestion=serializer.validated_data.get('sensitive_digestion', False),
            excluded_ingredients=serializer.validated_data.get('excluded_ingredients', []),
            vitamins_supplements=serializer.validated_data.get('vitamins_supplements', []),
            # Поведение
            character_traits=serializer.validated_data.get('character_traits', []),
            training_goals=serializer.validated_data.get('training_goals', []),
            # Здоровье
            chronic_conditions=serializer.validated_data.get('chronic_conditions', []),
            vaccinations=serializer.validated_data.get('vaccinations', []),
            medications=serializer.validated_data.get('medications', []),
            dental_health=serializer.validated_data.get('dental_health'),
            vet_visits=serializer.validated_data.get('vet_visits', ''),
            # Образ жизни
            housing_type=serializer.validated_data.get('housing_type'),
            has_yard=serializer.validated_data.get('has_yard', False),
            other_pets=serializer.validated_data.get('other_pets', []),
            has_children=serializer.validated_data.get('has_children', False),
            walk_frequency=serializer.validated_data.get('walk_frequency'),
            walk_duration=serializer.validated_data.get('walk_duration'),
            # Контакты владельца
            owner_phone=owner_phone,
            owner_email=owner_email,
            owner_city=owner_city,
            is_extended_profile=True
        )
        
        # Обработка фото если загружено
        if 'photo' in request.FILES:
            pet.photo = request.FILES['photo']
            pet.save(update_fields=['photo'])
        
        logger.info(f"Питомец создан: {pet.name}, owner={request.user.email}")
        
        return Response({
            'message': 'Питомец успешно добавлен',
            'pet': pet.to_dict()
        }, status=status.HTTP_201_CREATED)


class PetDetailView(APIView):
    """
    Операции с конкретным питомцем.
    
    GET    /api/pets/{id}/ - детали питомца
    PUT    /api/pets/{id}/ - обновление
    DELETE /api/pets/{id}/ - удаление
    """
    
    permission_classes = [IsAuthenticated]
    
    def _get_pet(self, request, pet_id):
        """Получение питомца с проверкой владения."""
        try:
            # Оптимизация: select_related для owner
            pet = Pet.objects.select_related('owner').get(id=pet_id)
        except Pet.DoesNotExist:
            return None, Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if pet.owner_id != request.user.id:
            return None, Response(
                {'error': 'Нет доступа к этому питомцу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return pet, None
    
    def get(self, request, pet_id):
        """Детали питомца."""
        pet, error = self._get_pet(request, pet_id)
        if error:
            return error
        
        return Response({'pet': pet.to_dict()}, status=status.HTTP_200_OK)
    
    def put(self, request, pet_id):
        """Обновление питомца."""
        pet, error = self._get_pet(request, pet_id)
        if error:
            return error
        
        serializer = PetUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновление только предоставленных полей
        update_fields = []
        # Все поля, которые можно обновлять
        all_fields = [
            # Основные поля
            'name', 'species', 'breed', 'date_of_birth', 'weight', 'gender', 'is_neutered',
            'favorite_foods', 'allergies', 'activity_level',
            # Расширенные поля для курсов
            'behavior_type', 'social_level', 'training_experience', 'special_needs', 'preferred_activities', 'behavioral_problems',
            # Новые поля PetID
            'size', 'body_type',
            # Питание
            'diet_type', 'feeding_frequency', 'sensitive_digestion', 'excluded_ingredients', 'vitamins_supplements',
            # Поведение
            'character_traits', 'training_goals',
            # Здоровье
            'chronic_conditions', 'vaccinations', 'medications', 'dental_health', 'vet_visits',
            # Образ жизни
            'housing_type', 'has_yard', 'other_pets', 'has_children', 'walk_frequency', 'walk_duration',
            # Контакты владельца
            'owner_phone', 'owner_email', 'owner_city'
        ]

        for field in all_fields:
            value = serializer.validated_data.get(field)
            if value is not None:
                # Конвертация даты из строки
                if field == 'date_of_birth' and isinstance(value, str):
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                setattr(pet, field, value)
                update_fields.append(field)
        
        # Обработка фото если загружено
        if 'photo' in request.FILES:
            pet.photo = request.FILES['photo']
            update_fields.append('photo')
        
        if not update_fields:
            return Response(
                {'error': 'Нет данных для обновления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pet.save(update_fields=update_fields + ['updated_at'])
        
        logger.info(f"Питомец обновлён: {pet.id}")
        
        return Response({
            'message': 'Данные питомца обновлены',
            'pet': pet.to_dict()
        }, status=status.HTTP_200_OK)
    
    def delete(self, request, pet_id):
        """Удаление питомца."""
        pet, error = self._get_pet(request, pet_id)
        if error:
            return error
        
        pet.delete()
        
        logger.info(f"Питомец удалён: {pet_id}")
        
        return Response({'message': 'Питомец удалён'}, status=status.HTTP_200_OK)


# ===== СПРАВОЧНИК ПОРОД =====

class BreedListView(APIView):
    """
    Список пород для автодополнения.
    
    GET /api/pets/breeds/ - все породы
    GET /api/pets/breeds/?species=dog - породы собак
    GET /api/pets/breeds/?search=лабрадор - поиск по названию
    """
    
    permission_classes = [AllowAny]  # Справочник доступен всем
    
    def get(self, request):
        """Список пород с фильтрацией."""
        breeds = Breed.objects.filter(is_active=True)
        
        # Фильтр по виду животного
        species = request.query_params.get('species')
        if species in ['dog', 'cat']:
            breeds = breeds.filter(species=species)
        
        # Поиск по названию
        search = request.query_params.get('search')
        if search:
            breeds = breeds.filter(name__icontains=search)
        
        # Сортировка
        order_by = request.query_params.get('order_by', '-popularity_rank')
        if order_by in ['name', '-name', 'popularity_rank', '-popularity_rank']:
            breeds = breeds.order_by(order_by)
        else:
            breeds = breeds.order_by('-popularity_rank', 'name')
        
        # Лимит (по умолчанию 50 для автодополнения)
        limit = request.query_params.get('limit', 50)
        try:
            limit = min(int(limit), 200)
        except (TypeError, ValueError):
            limit = 50
        
        breeds = breeds[:limit]
        serializer = BreedListSerializer(breeds, many=True)
        
        return Response({
            'breeds': serializer.data,
            'count': len(serializer.data)
        }, status=status.HTTP_200_OK)


class BreedDetailView(APIView):
    """
    Детальная информация о породе.
    
    GET /api/pets/breeds/{id}/ - полные данные породы
    GET /api/pets/breeds/by-slug/{slug}/ - поиск по slug
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, breed_id=None, slug=None):
        """Детали породы с подсказками для автозаполнения."""
        try:
            if breed_id:
                breed = Breed.objects.get(id=breed_id, is_active=True)
            elif slug:
                breed = Breed.objects.get(slug=slug, is_active=True)
            else:
                return Response(
                    {'error': 'Укажите ID или slug породы'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Breed.DoesNotExist:
            return Response(
                {'error': 'Порода не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = BreedSerializer(breed)
        return Response({'breed': serializer.data}, status=status.HTTP_200_OK)


class BreedSuggestionsView(APIView):
    """
    Получение подсказок для автозаполнения PetID на основе породы.
    
    GET /api/pets/breeds/{id}/suggestions/ - подсказки для создания PetID
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, breed_id):
        """Подсказки для автозаполнения на основе породы."""
        try:
            breed = Breed.objects.get(id=breed_id, is_active=True)
        except Breed.DoesNotExist:
            return Response(
                {'error': 'Порода не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        suggestions = breed.get_suggestions_for_pet()
        
        return Response({
            'breed_id': str(breed.id),
            'breed_name': breed.name,
            'species': breed.species,
            'suggestions': suggestions,
            'description': breed.description,
            'health_warnings': breed.genetic_risks,
        }, status=status.HTTP_200_OK)


class PetAnalysisView(APIView):
    """
    Анализ профиля питомца.
    
    GET /api/pets/{id}/analysis/ - анализ здоровья и рекомендации
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        """Получение анализа профиля питомца."""
        try:
            pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            return Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Базовый анализ профиля
        analysis = {
            'pet_id': str(pet.id),
            'pet_name': pet.name,
            'profile_completeness': pet.profile_completeness,
            'basic_info': {
                'age': pet.age,
                'age_months': pet.age_months,
                'age_category': pet.age_category,
                'calculated_size': pet.calculated_size,
            },
        }
        
        # Анализ веса (если есть порода в справочнике)
        weight_analysis = self._analyze_weight(pet)
        if weight_analysis:
            analysis['weight_analysis'] = weight_analysis
        
        # Рекомендации
        analysis['recommendations'] = self._get_recommendations(pet)
        
        # Риски здоровья
        analysis['health_risks'] = self._get_health_risks(pet)
        
        # Предупреждения
        analysis['alerts'] = self._get_alerts(pet)
        
        return Response({'analysis': analysis}, status=status.HTTP_200_OK)
    
    def _analyze_weight(self, pet):
        """Анализ веса относительно породы."""
        if not pet.weight or not pet.breed:
            return None
        
        # Пытаемся найти породу в справочнике
        try:
            breed = Breed.objects.get(name__iexact=pet.breed, species=pet.species)
        except Breed.DoesNotExist:
            return None
        
        avg_weight = breed.average_weight
        pet_weight = float(pet.weight)
        ratio = pet_weight / avg_weight
        
        if ratio < 0.8:
            status_text = 'underweight'
            risk = 'medium'
            message = f'Вес {pet_weight} кг ниже нормы для породы {breed.name}'
        elif ratio > 1.2:
            status_text = 'overweight'
            risk = 'high'
            message = f'Вес {pet_weight} кг выше нормы для породы {breed.name}'
        else:
            status_text = 'normal'
            risk = 'low'
            message = 'Вес в пределах нормы для породы'
        
        return {
            'current_weight': pet_weight,
            'breed_average': avg_weight,
            'breed_range': f'{breed.weight_min}-{breed.weight_max} кг',
            'ratio': round(ratio, 2),
            'status': status_text,
            'risk_level': risk,
            'message': message
        }
    
    def _get_recommendations(self, pet):
        """Генерация рекомендаций."""
        recommendations = {
            'products': [],
            'courses': [],
            'actions': []
        }
        
        # Рекомендации по заполнению профиля
        if pet.profile_completeness < 50:
            recommendations['actions'].append({
                'type': 'profile',
                'priority': 'high',
                'message': 'Заполните профиль питомца для получения персонализированных рекомендаций'
            })
        
        # Рекомендации по возрасту
        if pet.age_category == 'senior':
            recommendations['products'].append('senior_food')
            recommendations['products'].append('joint_supplements')
            recommendations['courses'].append('senior_care')
        elif pet.age_category in ['puppy', 'kitten']:
            recommendations['products'].append('puppy_food')
            recommendations['courses'].append('basic_training')
        
        # Рекомендации по проблемам здоровья
        if pet.health_issues:
            for issue in pet.health_issues:
                if 'weight' in issue.lower() or 'ожирение' in issue.lower():
                    recommendations['products'].append('diet_food')
                elif 'сустав' in issue.lower() or 'joint' in issue.lower():
                    recommendations['products'].append('joint_supplements')
        
        # Рекомендации по поведению
        if pet.behavioral_problems:
            recommendations['courses'].append('behavior_correction')
        
        return recommendations
    
    def _get_health_risks(self, pet):
        """Определение рисков здоровья."""
        risks = []
        
        # Риски по возрасту
        if pet.age and pet.age > 10:
            risks.append({
                'type': 'age',
                'level': 'medium',
                'message': f'Пожилой возраст ({pet.age} лет) - рекомендуются частые ветеринарные осмотры'
            })
        
        # Риски породы
        if pet.breed:
            try:
                breed = Breed.objects.get(name__iexact=pet.breed, species=pet.species)
                if breed.health_risk_level == 'high':
                    risks.append({
                        'type': 'breed',
                        'level': 'high',
                        'message': f'Порода {breed.name} имеет повышенные риски здоровья',
                        'genetic_risks': breed.genetic_risks
                    })
            except Breed.DoesNotExist:
                pass
        
        return risks
    
    def _get_alerts(self, pet):
        """Генерация предупреждений."""
        alerts = []
        
        # Предупреждение о низкой заполненности
        if pet.profile_completeness < 30:
            alerts.append({
                'type': 'profile',
                'priority': 'warning',
                'message': 'Профиль питомца заполнен менее чем на 30%'
            })
        
        # Предупреждение о хронических заболеваниях
        if pet.chronic_conditions:
            alerts.append({
                'type': 'health',
                'priority': 'info',
                'message': 'Есть хронические заболевания - следите за регулярностью лечения'
            })
        
        return alerts
