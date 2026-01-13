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
from .serializers import (
    PetCreateSerializer, PetUpdateSerializer,
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
        return Pet.objects.select_related('owner').filter(owner=self.request.user)

    def filter_queryset(self, queryset, request):
        """Применить фильтры к queryset."""
        is_draft = request.query_params.get('is_draft')
        if is_draft == 'true':
            queryset = queryset.filter(is_draft=True)
        elif is_draft == 'false':
            queryset = queryset.filter(is_draft=False)
        return queryset

    @safe_api_operation("create_pet")
    def perform_create(self, serializer):
        """Создание питомца через PetService."""
        logger.info(f"Raw request data: {self.request.data}")
        logger.info(f"Raw breed value: {self.request.data.get('breed')} (type: {type(self.request.data.get('breed'))})")
        logger.info(f"Creating pet with validated data: {serializer.validated_data}")

        # Конвертация даты из строки
        data = serializer.validated_data.copy()
        date_of_birth = data.get('date_of_birth')
        if date_of_birth and isinstance(date_of_birth, str):
            from datetime import datetime
            data['date_of_birth'] = datetime.strptime(date_of_birth, '%Y-%m-%d').date()

        # Контакты владельца: по умолчанию из User, но можно переопределить
        if 'owner_phone' not in data or not data['owner_phone']:
            data['owner_phone'] = self.request.user.phone
        if 'owner_email' not in data or not data['owner_email']:
            data['owner_email'] = self.request.user.email
        if 'owner_city' not in data or not data['owner_city']:
            data['owner_city'] = self.request.user.city

        # Создание питомца через сервис
        pet = pet_service.create_pet(data, self.request.user)

        # Обработка фото если загружено
        if 'photo' in self.request.FILES:
            pet.photo = self.request.FILES['photo']
            pet.save(update_fields=['photo'])

        logger.info(f"Питомец создан: {pet.name}, owner={self.request.user.email}")
        return pet


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
    lookup_field = 'pet_id'
    lookup_url_kwarg = 'pet_id'

    def get_queryset(self):
        """Получить queryset с оптимизацией."""
        return Pet.objects.select_related('owner')

    def check_object_permissions(self, request, obj):
        """Проверить права доступа к питомцу."""
        if obj.owner_id != request.user.id:
            raise ApiError.forbidden("Нет доступа к этому питомцу")

    def perform_update(self, serializer):
        """Обновление питомца с дополнительной логикой."""
        all_fields = [
            # Основные поля
            'name', 'species', 'breed', 'date_of_birth', 'weight', 'gender', 'is_neutered',
            'favorite_foods', 'allergies', 'activity_level',
            # Расширенные поля для курсов
            'behavior_type', 'social_level', 'training_experience', 'special_needs', 
            'preferred_activities', 'behavioral_problems',
            # Новые поля PetID
            'size', 'body_type',
            # Питание
            'diet_type', 'feeding_frequency', 'sensitive_digestion', 'excluded_ingredients', 
            'vitamins_supplements',
            # Поведение
            'character_traits', 'training_goals',
            # Здоровье
            'chronic_conditions', 'vaccinations', 'medications', 'dental_health', 'vet_visits',
            # Образ жизни
            'housing_type', 'has_yard', 'other_pets', 'has_children', 'walk_frequency', 'walk_duration',
            # Контакты владельца
            'owner_phone', 'owner_email', 'owner_city'
        ]

        pet = serializer.instance
        update_fields = []
        
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
        """Получить активные породы."""
        return Breed.objects.filter(is_active=True)

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
        order_by = request.query_params.get('order_by', '-popularity_rank')
        if order_by in ['name', '-name', 'popularity_rank', '-popularity_rank']:
            queryset = queryset.order_by(order_by)
        else:
            queryset = queryset.order_by('-popularity_rank', 'name')
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
        """Получить активные породы."""
        return Breed.objects.filter(is_active=True)

    def get_object(self):
        """Получить породу по ID или slug."""
        breed_id = self.kwargs.get('breed_id')
        slug = self.kwargs.get('slug')

        if breed_id:
            return super().get_object()
        elif slug:
            try:
                return self.get_queryset().get(slug=slug, is_active=True)
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
            breed = Breed.objects.get(id=breed_id, is_active=True)
        except Breed.DoesNotExist:
            raise ApiError.not_found("Порода не найдена")

        suggestions = breed.get_suggestions_for_pet()

        return Response({
            'breed_id': str(breed.id),
            'breed_name': breed.name,
            'species': breed.species,
            'suggestions': suggestions,
            'description': breed.description,
            'health_warnings': breed.genetic_risks,
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
