"""
=============================================================================
VIEWS ДЛЯ МОДУЛЯ ПИТОМЦЕВ (PetID)
=============================================================================

Файл содержит все views для работы с питомцами и справочником пород.

СОДЕРЖИМОЕ:
- PetListCreateView: список и создание питомцев (GET/POST /api/pets/)
- PetDetailView: детали/обновление/удаление питомца (GET/PUT/DELETE /api/pets/{id}/)
- BreedListView: список пород с фильтрацией (GET /api/pets/breeds/)
- BreedDetailView: детали породы (GET /api/pets/breeds/{id}/)
- BreedSuggestionsView: подсказки для PetID на основе породы
- PetAnalysisView: анализ профиля питомца с рекомендациями

ИСПОЛЬЗУЕТСЯ В:
- config/urls.py → api/pets/*
- Фронтенд: страницы PetID, создание/редактирование питомцев

ЗАВИСИМОСТИ:
- core.crud_views: базовые CRUD классы
- core.permissions: проверка владельца
- core.exceptions: обработка ошибок
=============================================================================
"""

import logging
from datetime import datetime, date, timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from django.shortcuts import get_object_or_404

from core.crud_views import BaseListCreateView, BaseDetailView, BaseReadOnlyView
from core.permissions import IsOwner
from core.exceptions import ApiError, safe_api_operation

from .models import Pet, CalendarEvent
from .models import Breed
from .services import pet_service
from .autofill_service import pet_autofill
from .calorie_calculator import calorie_calculator
from .serializers import (
    PetCreateSerializer, PetUpdateSerializer, PetSerializer,
    BreedSerializer, BreedListSerializer,
    CalendarEventSerializer, CalendarEventListSerializer, CalendarEventCreateSerializer
)

logger = logging.getLogger('apps.pets')


# =============================================================================
# CRUD ПИТОМЦЕВ
# =============================================================================

class PetListCreateView(BaseListCreateView):
    """
    Список питомцев и создание нового.

    GET  /api/pets/ - список питомцев пользователя
    POST /api/pets/ - создание питомца

    Query params:
        is_draft: true/false - фильтр по черновикам
    """

    model = Pet
    serializer_class = PetCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Получить питомцев текущего пользователя."""
        return Pet.objects.select_related('owner', 'breed').filter(owner=self.request.user)

    def filter_queryset(self, queryset, request):
        """Применить фильтры к queryset."""
        is_draft = request.query_params.get('is_draft')
        if is_draft == 'true':
            queryset = queryset.filter(is_draft=True)
        elif is_draft == 'false':
            queryset = queryset.filter(is_draft=False)
        return queryset

    def get(self, request, *args, **kwargs):
        """Получить список питомцев с полными данными."""
        try:
            queryset = self.get_queryset()
            queryset = self.filter_queryset(queryset, request)
            
            # Используем PetSerializer для полного вывода данных
            serializer = PetSerializer(queryset, many=True)
            return Response({
                'pets': serializer.data,
                'count': len(serializer.data)
            })
        except Exception as exc:
            return self.handle_exception(exc)

    def post(self, request, *args, **kwargs):
        """
        Создание питомца через PetService.
        После создания вызывается автозаполнение из породы.
        
        Возвращает созданного питомца с id для фронтенда.
        """
        try:
            logger.info(f"POST /api/pets/ - request.data: {request.data}")
            logger.info(f"User: {request.user}, authenticated: {request.user.is_authenticated}")
            
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Creating pet with data: {serializer.validated_data}")

            # Конвертация даты из строки
            data = serializer.validated_data.copy()
            date_of_birth = data.get('date_of_birth')
            if date_of_birth and isinstance(date_of_birth, str):
                data['date_of_birth'] = datetime.strptime(date_of_birth, '%Y-%m-%d').date()

            # Удаляем поля, которых нет в модели Pet
            data.pop('is_draft', None)
            data.pop('draft_step', None)

            # Преобразуем breed ID в объект Breed
            breed_id = data.get('breed')
            if breed_id:
                try:
                    data['breed'] = Breed.objects.get(id=breed_id)
                except Breed.DoesNotExist:
                    return Response(
                        {'error': f'Порода с ID {breed_id} не найдена'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Создание питомца через сервис
            pet = pet_service.create_pet(data, request.user)

            # АВТОЗАПОЛНЕНИЕ из породы
            autofilled = pet_autofill.autofill_from_breed(pet)
            if autofilled:
                logger.info(f"Autofilled fields for pet {pet.id}: {autofilled}")

            # Обработка фото если загружено
            if 'photo' in request.FILES:
                pet.photo = request.FILES['photo']
                pet.save(update_fields=['photo'])

            logger.info(f"Питомец создан: {pet.name}, owner={request.user.email}")
            
            # Возвращаем данные питомца с ID
            return Response({
                'message': 'Питомец успешно создан',
                'data': {
                    'id': str(pet.id),
                    'name': pet.name,
                    'species': pet.species,
                    'breed_id': pet.breed_id,
                    'weight': float(pet.weight) if pet.weight else None,
                    'date_of_birth': pet.date_of_birth.isoformat() if pet.date_of_birth else None,
                    'sex': pet.sex,
                    'is_neutered': pet.is_neutered,
                    'profile_completeness': pet.profile_completeness,
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as exc:
            import traceback
            logger.error(f"Error creating pet: {exc}")
            logger.error(traceback.format_exc())
            return self.handle_exception(exc)


class PetDetailView(BaseDetailView):
    """
    Операции с конкретным питомцем.

    GET    /api/pets/{id}/ - детали питомца
    PUT    /api/pets/{id}/ - обновление
    DELETE /api/pets/{id}/ - удаление
    """

    model = Pet
    serializer_class = PetUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'pet_id'

    def get_serializer_class(self):
        """Разные сериализаторы для чтения и записи."""
        if self.request.method == 'GET':
            return PetSerializer
        return PetUpdateSerializer

    def get_queryset(self):
        """Получить queryset с оптимизацией."""
        return Pet.objects.select_related('owner', 'breed')

    def check_object_permissions(self, request, obj):
        """Проверить права доступа к питомцу."""
        if obj.owner_id != request.user.id:
            raise ApiError.forbidden("Нет доступа к этому питомцу")

    def perform_update(self, serializer):
        """
        Обновление питомца (Этап 2 - Расширенный профиль).
        Все поля соответствуют документации Integration_PetID_Breeds_Calculator.md
        
        При изменении breed или weight — пересчитываются автозаполняемые поля.
        """
        # Полный список полей по документации
        all_fields = [
            # Базовые данные (Этап 1)
            'name', 'species', 'breed', 'date_of_birth', 'weight', 'sex', 'is_neutered',
            
            # Автозаполняемые поля (могут быть переопределены)
            'size_category', 'coat_type', 'ideal_weight_kg', 'activity_level',
            
            # Жильё и условия (Этап 2)
            'housing_type', 'has_yard', 'yard_size', 'has_children', 'has_other_pets',
            
            # Питание (Этап 2)
            'diet_type', 'feeding_frequency', 'current_food', 'sensitive_digestion',
            
            # Репродукция (Этап 2)
            'neutering_date', 'reproductive_state', 'pregnancy_week', 'litter_size', 'lactation_week',
            
            # Поведение (Этап 2)
            'temperament', 'social_level', 'behavioral_problems',
            
            # Здоровье (Этап 2)
            'chronic_conditions_notes', 'last_vet_visit', 'body_condition_score',
            
            # Климат и прогулки
            'living_climate', 'walk_frequency', 'walk_duration',
            
            # Флаги
            'is_extended_profile', 'is_draft',
        ]

        pet = serializer.instance
        update_fields = []
        
        # Запоминаем старые значения для проверки изменений
        old_breed_id = pet.breed_id
        old_weight = float(pet.weight) if pet.weight else None
        
        for field in all_fields:
            value = serializer.validated_data.get(field)
            if value is not None:
                if field == 'date_of_birth' and isinstance(value, str):
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                setattr(pet, field, value)
                update_fields.append(field)

        # Обработка фото если загружено
        if 'photo' in self.request.FILES:
            pet.photo = self.request.FILES['photo']
            update_fields.append('photo')

        if not update_fields:
            raise ApiError.bad_request("Нет данных для обновления")

        pet.save(update_fields=update_fields + ['updated_at'])
        
        # АВТОЗАПОЛНЕНИЕ: если изменилась порода — пересчитываем всё
        new_breed_id = pet.breed_id
        new_weight = float(pet.weight) if pet.weight else None
        
        if new_breed_id != old_breed_id:
            # Изменилась порода — полный пересчёт (только незаполненные поля)
            autofilled = pet_autofill.autofill_from_breed(pet)
            if autofilled:
                logger.info(f"Autofilled on breed change for pet {pet.id}: {autofilled}")
        elif new_weight != old_weight and not pet.breed_id:
            # Изменился вес у дворняги — пересчёт размера
            recalculated = pet_autofill.recalculate_on_weight_change(pet, old_weight)
            if recalculated:
                logger.info(f"Size recalculated for pet {pet.id}: {recalculated}")
        
        logger.info(f"Питомец обновлён: {pet.id}")
        return pet

    def perform_delete(self, instance):
        """Удаление питомца с логированием."""
        logger.info(f"Питомец удалён: {instance.id}")
        super().perform_delete(instance)


# =============================================================================
# СПРАВОЧНИК ПОРОД
# =============================================================================

class BreedListView(BaseReadOnlyView):
    """
    Список пород для автодополнения.

    GET /api/pets/breeds/ - все породы
    
    Query params:
        species: dog/cat - фильтр по виду
        search: str - поиск по названию
        limit: int - ограничение результатов (max 200)
        order_by: name/-name/popularity_rank/-popularity_rank
    """

    model = Breed
    serializer_class = BreedListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Получить все породы."""
        return Breed.objects.all()

    def filter_queryset(self, queryset, request):
        """Применить фильтры к справочнику пород."""
        species = request.query_params.get('species')
        if species in ['dog', 'cat']:
            queryset = queryset.filter(species=species)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def order_queryset(self, queryset, request):
        """Сортировка пород."""
        order_by = request.query_params.get('order_by', 'name')
        if order_by in ['name', '-name', 'species', '-species']:
            queryset = queryset.order_by(order_by)
        else:
            queryset = queryset.order_by('species', 'name')
        return queryset

    def paginate_queryset(self, queryset, request):
        """Ограничение количества результатов."""
        limit = request.query_params.get('limit', 50)
        try:
            limit = min(int(limit), 200)
        except (TypeError, ValueError):
            limit = 50
        return queryset[:limit]


class BreedDetailView(BaseReadOnlyView):
    """
    Детальная информация о породе.

    GET /api/pets/breeds/{id}/ - полные данные породы
    GET /api/pets/breeds/by-slug/{slug}/ - поиск по slug
    """

    model = Breed
    serializer_class = BreedSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Получить все породы."""
        return Breed.objects.all()

    def get_object(self):
        """Получить породу по ID или slug."""
        breed_id = self.kwargs.get('breed_id')
        slug = self.kwargs.get('slug')

        if breed_id:
            return super().get_object()
        elif slug:
            try:
                return self.get_queryset().get(slug=slug)
            except Breed.DoesNotExist:
                raise ApiError.not_found("Порода не найдена")
        else:
            raise ApiError.bad_request("Укажите ID или slug породы")


class BreedSuggestionsView(APIView):
    """
    Получение подсказок для автозаполнения PetID на основе породы.

    GET /api/pets/breeds/{id}/suggestions/ - подсказки для создания PetID
    
    Возвращает рекомендуемые значения полей PetID на основе характеристик породы.
    """

    permission_classes = [AllowAny]

    def get(self, request, breed_id):
        """Подсказки для автозаполнения на основе породы."""
        try:
            breed = Breed.objects.get(id=breed_id)
        except Breed.DoesNotExist:
            raise ApiError.not_found("Порода не найдена")

        # Получаем связанные риски здоровья
        health_risks = list(breed.health_risks.values_list('condition_name', flat=True)[:5])

        suggestions = {
            'activity_level': breed.energy_level,
            'size': breed.size_category,
            'trainability': breed.trainability,
            'grooming_needs': breed.grooming_frequency,
            'good_for_apartment': breed.apartment_friendly,
            'good_for_novice': breed.good_for_novice,
        }

        return Response({
            'breed_id': str(breed.id),
            'breed_name': breed.name,
            'species': breed.species,
            'suggestions': suggestions,
            'description': breed.description or '',
            'health_warnings': health_risks,
        })


# =============================================================================
# АНАЛИЗ ПРОФИЛЯ
# =============================================================================

class PetAnalysisView(APIView):
    """
    Анализ профиля питомца.

    GET /api/pets/{id}/analysis/ - анализ здоровья и рекомендации
    
    Возвращает:
    - Базовую информацию (возраст, категория, размер)
    - Анализ веса относительно породы
    - Рекомендации по товарам и курсам
    - Риски здоровья
    - Предупреждения
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pet_id):
        """Получение анализа профиля питомца."""
        try:
            pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            raise ApiError.not_found("Питомец не найден")

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

        # Рекомендации, риски и предупреждения
        analysis['recommendations'] = self._get_recommendations(pet)
        analysis['health_risks'] = self._get_health_risks(pet)
        analysis['alerts'] = self._get_alerts(pet)

        return Response({'analysis': analysis})

    def _analyze_weight(self, pet):
        """Анализ веса относительно породы."""
        if not pet.weight or not pet.breed:
            return None

        try:
            breed = Breed.objects.get(name__iexact=pet.breed, species=pet.species)
        except Breed.DoesNotExist:
            return None

        avg_weight = breed.average_weight
        pet_weight = float(pet.weight)
        ratio = pet_weight / avg_weight

        if ratio < 0.8:
            status_text, risk = 'underweight', 'medium'
            message = f'Вес {pet_weight} кг ниже нормы для породы {breed.name}'
        elif ratio > 1.2:
            status_text, risk = 'overweight', 'high'
            message = f'Вес {pet_weight} кг выше нормы для породы {breed.name}'
        else:
            status_text, risk = 'normal', 'low'
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
        recommendations = {'products': [], 'courses': [], 'actions': []}

        # По заполненности профиля
        if pet.profile_completeness < 50:
            recommendations['actions'].append({
                'type': 'profile',
                'priority': 'high',
                'message': 'Заполните профиль питомца для получения персонализированных рекомендаций'
            })

        # По возрасту
        if pet.age_category == 'senior':
            recommendations['products'].extend(['senior_food', 'joint_supplements'])
            recommendations['courses'].append('senior_care')
        elif pet.age_category in ['puppy', 'kitten']:
            recommendations['products'].append('puppy_food')
            recommendations['courses'].append('basic_training')

        # По проблемам здоровья
        if pet.health_issues:
            for issue in pet.health_issues:
                if 'weight' in issue.lower() or 'ожирение' in issue.lower():
                    recommendations['products'].append('diet_food')
                elif 'сустав' in issue.lower() or 'joint' in issue.lower():
                    recommendations['products'].append('joint_supplements')

        # По поведению
        if pet.behavioral_problems:
            recommendations['courses'].append('behavior_correction')

        return recommendations

    def _get_health_risks(self, pet):
        """Определение рисков здоровья."""
        risks = []

        # По возрасту
        if pet.age and pet.age > 10:
            risks.append({
                'type': 'age',
                'level': 'medium',
                'message': f'Пожилой возраст ({pet.age} лет) - рекомендуются частые ветеринарные осмотры'
            })

        # По породе
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

        if pet.profile_completeness < 30:
            alerts.append({
                'type': 'profile',
                'priority': 'warning',
                'message': 'Профиль питомца заполнен менее чем на 30%'
            })

        if pet.chronic_conditions:
            alerts.append({
                'type': 'health',
                'priority': 'info',
                'message': 'Есть хронические заболевания - следите за регулярностью лечения'
            })

        return alerts


# =============================================================================
# КАЛЕНДАРЬ СОБЫТИЙ
# =============================================================================

class CalendarEventListView(APIView):
    """
    Список событий календаря / Создание события.

    GET /api/pets/calendar/events/
        Параметры:
            - pet: UUID питомца (фильтр)
            - month: Месяц в формате YYYY-MM (фильтр)
            - event_type: Тип события (фильтр)
            - status: Статус события (фильтр)

        Возвращает: {events: [...], count: int}

    POST /api/pets/calendar/events/
        Создание нового события.

        Возвращает: {event: {...}}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Получение списка событий с фильтрацией."""
        events = CalendarEvent.objects.filter(user=request.user)

        # Фильтр по питомцу
        pet_id = request.query_params.get('pet')
        if pet_id:
            events = events.filter(pet_id=pet_id)

        # Фильтр по месяцу (YYYY-MM)
        month = request.query_params.get('month')
        if month:
            try:
                year, month_num = month.split('-')
                events = events.filter(
                    start_date__year=int(year),
                    start_date__month=int(month_num)
                )
            except (ValueError, AttributeError):
                pass

        # Фильтр по типу события
        event_type = request.query_params.get('event_type')
        if event_type:
            events = events.filter(event_type=event_type)

        # Фильтр по статусу
        event_status = request.query_params.get('status')
        if event_status:
            events = events.filter(status=event_status)

        events = events.select_related('pet').order_by('start_date', 'start_time')

        serializer = CalendarEventListSerializer(events, many=True)

        return Response({
            'events': serializer.data,
            'count': events.count()
        })

    def post(self, request):
        """Создание нового события."""
        serializer = CalendarEventCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            event = serializer.save()
            return Response({
                'event': CalendarEventSerializer(event).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CalendarEventDetailView(APIView):
    """
    Детали события / Обновление / Удаление.

    GET /api/pets/calendar/events/{id}/
        Возвращает: {event: {...}}

    PUT /api/pets/calendar/events/{id}/
        Полное обновление события.

    PATCH /api/pets/calendar/events/{id}/
        Частичное обновление события.

    DELETE /api/pets/calendar/events/{id}/
        Удаление события.
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, request, event_id):
        """Получение события с проверкой владельца."""
        return get_object_or_404(
            CalendarEvent.objects.select_related('pet'),
            id=event_id,
            user=request.user
        )

    def get(self, request, event_id):
        """Получение деталей события."""
        event = self.get_object(request, event_id)
        serializer = CalendarEventSerializer(event)

        return Response({'event': serializer.data})

    def put(self, request, event_id):
        """Полное обновление события."""
        event = self.get_object(request, event_id)
        serializer = CalendarEventSerializer(
            event,
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response({'event': serializer.data})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, event_id):
        """Частичное обновление события."""
        event = self.get_object(request, event_id)
        serializer = CalendarEventSerializer(
            event,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response({'event': serializer.data})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, event_id):
        """Удаление события."""
        event = self.get_object(request, event_id)
        event.delete()

        return Response(
            {'message': 'Событие успешно удалено'},
            status=status.HTTP_204_NO_CONTENT
        )


class CalendarEventCompleteView(APIView):
    """
    Отметить событие как выполненное.

    POST /api/pets/calendar/events/{id}/complete/
        Возвращает: {event: {...}}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
        """Отметить событие выполненным."""
        event = get_object_or_404(
            CalendarEvent,
            id=event_id,
            user=request.user
        )

        event.mark_completed()
        serializer = CalendarEventSerializer(event)

        return Response({
            'message': 'Событие отмечено как выполненное',
            'event': serializer.data
        })


class CalendarEventCancelView(APIView):
    """
    Отменить событие.

    POST /api/pets/calendar/events/{id}/cancel/
        Возвращает: {event: {...}}
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
        """Отменить событие."""
        event = get_object_or_404(
            CalendarEvent,
            id=event_id,
            user=request.user
        )

        event.cancel_event()
        serializer = CalendarEventSerializer(event)

        return Response({
            'message': 'Событие отменено',
            'event': serializer.data
        })


class CalendarEventTodayView(APIView):
    """
    События на сегодня.

    GET /api/pets/calendar/events/today/
        Возвращает: {events: [...], count: int}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Получение событий на сегодня."""
        today = date.today()

        events = CalendarEvent.objects.filter(
            user=request.user,
            start_date=today,
            status='scheduled'
        ).select_related('pet').order_by('start_time')

        serializer = CalendarEventListSerializer(events, many=True)

        return Response({
            'events': serializer.data,
            'count': events.count(),
            'date': today.isoformat()
        })


class CalendarEventUpcomingView(APIView):
    """
    Предстоящие события (следующие 7 дней).

    GET /api/pets/calendar/events/upcoming/
        Параметры:
            - days: Количество дней (по умолчанию 7)
            - limit: Максимальное количество событий (по умолчанию 10)

        Возвращает: {events: [...], count: int}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Получение предстоящих событий."""
        days = int(request.query_params.get('days', 7))
        limit = int(request.query_params.get('limit', 10))

        today = date.today()
        end_date = today + timedelta(days=days)

        events = CalendarEvent.objects.filter(
            user=request.user,
            start_date__gte=today,
            start_date__lte=end_date,
            status='scheduled'
        ).select_related('pet').order_by('start_date', 'start_time')[:limit]

        serializer = CalendarEventListSerializer(events, many=True)

        return Response({
            'events': serializer.data,
            'count': len(serializer.data),
            'period': {
                'start': today.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            }
        })


# =============================================================================
# КАЛЬКУЛЯТОР КАЛОРИЙ
# =============================================================================

class PetCalorieCalculatorView(APIView):
    """
    Расчёт дневной нормы калорий для питомца.
    
    GET /api/pets/{pet_id}/calculate-calories/
        Возвращает: CalorieResult с RER, MER, рекомендациями по кормлению
    
    POST /api/pets/{pet_id}/calculate-calories/
        Body: {food_calorie_density: 3500}  — опционально
        Возвращает: CalorieResult с расчётом для указанного корма
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        """Расчёт калорий для питомца."""
        try:
            pet = Pet.objects.select_related('breed').get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            raise ApiError.not_found("Питомец не найден")
        
        result = calorie_calculator.calculate_daily_calories(pet)
        
        return Response({
            'success': True,
            'pet_id': str(pet.id),
            'pet_name': pet.name,
            'result': result.to_dict()
        })
    
    def post(self, request, pet_id):
        """Расчёт калорий с учётом калорийности конкретного корма."""
        try:
            pet = Pet.objects.select_related('breed').get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            raise ApiError.not_found("Питомец не найден")
        
        food_calorie_density = request.data.get('food_calorie_density')
        days = request.data.get('days', 7)
        
        # Базовый расчёт
        result = calorie_calculator.calculate_daily_calories(pet)
        
        # План кормления если указана калорийность корма
        feeding_plan = None
        if food_calorie_density:
            feeding_plan = calorie_calculator.calculate_feeding_plan(
                pet, 
                food_calorie_density=float(food_calorie_density),
                days=int(days)
            )
        
        return Response({
            'success': True,
            'pet_id': str(pet.id),
            'pet_name': pet.name,
            'result': result.to_dict(),
            'feeding_plan': feeding_plan,
        })


class PetAutofillSuggestionsView(APIView):
    """
    Предварительный просмотр автозаполнения перед сохранением.
    
    GET /api/pets/{pet_id}/autofill-suggestions/
        Возвращает: предложенные значения из породы
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        """Получить предложения автозаполнения."""
        try:
            pet = Pet.objects.select_related('breed').get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            raise ApiError.not_found("Питомец не найден")
        
        suggestions = pet_autofill.get_autofill_suggestions(pet)
        
        return Response({
            'success': True,
            'pet_id': str(pet.id),
            'suggestions': suggestions
        })


class CalendarEventTypesView(APIView):
    """
    Получение доступных типов событий.

    GET /api/pets/calendar/event-types/
        Возвращает: {event_types: [...], priorities: [...], statuses: [...]}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Получение справочников."""
        return Response({
            'event_types': [
                {'value': value, 'label': label}
                for value, label in CalendarEvent.EVENT_TYPES
            ],
            'priorities': [
                {'value': value, 'label': label}
                for value, label in CalendarEvent.PRIORITY_CHOICES
            ],
            'statuses': [
                {'value': value, 'label': label}
                for value, label in CalendarEvent.STATUS_CHOICES
            ]
        })



# =============================================================================
# ЭКСПОРТЫ
# =============================================================================

__all__ = [
    # Pet CRUD
    'PetListCreateView',
    'PetDetailView',
    # Breeds
    'BreedListView',
    'BreedDetailView',
    'BreedSuggestionsView',
    'BreedListSerializer',
    'BreedSerializer',
    # Analysis
    'PetAnalysisView',
    # Калькулятор и автозаполнение
    'PetCalorieCalculatorView',
    'PetAutofillSuggestionsView',
    # Calendar
    'CalendarEventListView',
    'CalendarEventDetailView',
    'CalendarEventCompleteView',
    'CalendarEventCancelView',
    'CalendarEventTodayView',
    'CalendarEventUpcomingView',
    'CalendarEventTypesView',
    'CalendarEventSerializer',
    'CalendarEventListSerializer',
    'CalendarEventCreateSerializer',
]
