"""
API views для работы с породами
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Case, When, IntegerField
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Breed, Pet
from .serializers_breeds import (
    BreedListSerializer, BreedDetailSerializer,
    PetBreedComparisonSerializer
)
from .services_breeds import PetBreedComparisonService


# Популярные породы собак (по статистике регистрации в России)
POPULAR_DOG_BREEDS = [
    'Лабрадор Ретривер', 'Немецкая Овчарка', 'Французский Бульдог',
    'Йоркширский Терьер', 'Джек Рассел Терьер', 'Корги Пемброк',
    'Хаски', 'Такса', 'Шпиц', 'Чихуахуа', 'Бигль', 'Мопс',
    'Золотистый Ретривер', 'Кокер Спаниель', 'Ротвейлер',
    'Доберман', 'Боксёр', 'Акита', 'Шарпей', 'Самоед'
]

# Популярные породы кошек
POPULAR_CAT_BREEDS = [
    'Британская Короткошерстная', 'Шотландская Вислоухая', 'Мейн-Кун',
    'Сфинкс', 'Бенгальская', 'Сиамская', 'Персидская', 'Абиссинская',
    'Русская Голубая', 'Рэгдолл', 'Невская Маскарадная', 'Сибирская'
]


def calculate_weight_for_age(breed, age_months):
    """
    Рассчитывает ожидаемый вес породы для указанного возраста.
    
    Формула:
    - Щенок/котёнок до 12 мес: вес = взрослый_вес * (возраст_мес / 12) ^ 0.75
    - Взрослое животное (>12 мес): возвращаем диапазон взрослого веса
    """
    if not age_months or age_months <= 0:
        return None, None
    
    # Получаем взрослый вес
    adult_min = float(breed.weight_male_min or breed.weight_female_min or 0)
    adult_max = float(breed.weight_male_max or breed.weight_female_max or 0)
    
    if adult_min == 0 and adult_max == 0:
        return None, None
    
    # Для взрослых животных (>12 мес) возвращаем взрослый вес
    if age_months >= 12:
        return round(adult_min, 1), round(adult_max, 1)
    
    # Для молодых - расчёт по формуле роста
    # Коэффициент роста: (возраст/12)^0.75 даёт нелинейный рост
    growth_factor = (age_months / 12) ** 0.75
    
    expected_min = adult_min * growth_factor
    expected_max = adult_max * growth_factor
    
    return round(expected_min, 1), round(expected_max, 1)


class BreedListView(APIView):
    """
    Список пород с фильтрацией и поиском.
    
    GET /api/breeds/
    
    Параметры:
        species: dog | cat (обязательный)
        search: поиск по названию
        age_months: возраст питомца для расчёта ожидаемого веса
        popular_only: true - только популярные породы
        limit: максимальное количество результатов
    
    Возвращает: { count: N, breeds: [{id, name, weight_min, weight_max}, ...] }
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        queryset = Breed.objects.all()
        
        # Фильтр по виду (обязательный для оптимизации)
        species = request.query_params.get('species')
        if species:
            queryset = queryset.filter(species=species)
        
        # Поиск по названию
        search = request.query_params.get('search', '').strip()
        
        # Получаем параметры
        age_months = request.query_params.get('age_months')
        if age_months:
            try:
                age_months = int(age_months)
            except ValueError:
                age_months = None
        
        popular_only = request.query_params.get('popular_only', '').lower() == 'true'
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
            except ValueError:
                limit = None
        
        # Определяем популярные породы для вида
        popular_breeds = POPULAR_DOG_BREEDS if species == 'dog' else POPULAR_CAT_BREEDS
        
        if search:
            # Режим поиска - фильтруем по названию
            queryset = queryset.filter(name__icontains=search)
            # Сортировка: сначала точные совпадения с началом, потом остальные
            queryset = queryset.extra(
                select={'starts_with': "CASE WHEN LOWER(name) LIKE %s THEN 0 ELSE 1 END"},
                select_params=[search.lower() + '%']
            ).order_by('starts_with', 'name')
        elif popular_only:
            # Режим популярных пород - фильтруем и сортируем по списку
            # Используем Case/When для сортировки по порядку в списке
            popular_order = Case(
                *[When(name__icontains=name, then=pos) for pos, name in enumerate(popular_breeds)],
                default=len(popular_breeds),
                output_field=IntegerField()
            )
            queryset = queryset.annotate(popular_order=popular_order)
            queryset = queryset.filter(popular_order__lt=len(popular_breeds))
            queryset = queryset.order_by('popular_order')
        else:
            # Режим по умолчанию - сначала популярные, потом остальные по алфавиту
            popular_order = Case(
                *[When(name__icontains=name, then=pos) for pos, name in enumerate(popular_breeds)],
                default=999,
                output_field=IntegerField()
            )
            queryset = queryset.annotate(popular_order=popular_order)
            queryset = queryset.order_by('popular_order', 'name')
        
        # Применяем лимит
        if limit:
            queryset = queryset[:limit]
        
        # Формируем минимальный ответ
        breeds_data = []
        for breed in queryset:
            weight_min, weight_max = calculate_weight_for_age(breed, age_months)
            
            # Если возраст не указан, берём взрослый вес
            if weight_min is None:
                weight_min = float(breed.weight_male_min or breed.weight_female_min or 0) if breed.weight_male_min or breed.weight_female_min else None
                weight_max = float(breed.weight_male_max or breed.weight_female_max or 0) if breed.weight_male_max or breed.weight_female_max else None
            
            breeds_data.append({
                'id': breed.id,
                'name': breed.name,
                'weight_min': weight_min,
                'weight_max': weight_max,
            })
        
        return Response({
            'count': len(breeds_data),
            'breeds': breeds_data
        })


class BreedDetailView(generics.RetrieveAPIView):
    """
    Детальная информация о породе.
    
    GET /api/breeds/{id}/
    GET /api/breeds/{slug}/
    """
    
    queryset = Breed.objects.select_related('nutrition').prefetch_related(
        'health_risks', 'care_procedures'
    )
    serializer_class = BreedDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'
    
    def get_object(self):
        """Поддержка поиска по ID или slug"""
        lookup_value = self.kwargs.get('id') or self.kwargs.get('slug')
        
        # Пробуем найти по ID
        try:
            return self.queryset.get(id=int(lookup_value))
        except (ValueError, Breed.DoesNotExist):
            pass
        
        # Пробуем найти по slug
        return get_object_or_404(self.queryset, slug=lookup_value)


class PetBreedComparisonView(APIView):
    """
    Сравнение параметров питомца с эталоном породы.
    
    GET /api/pets/{pet_id}/breed-comparison/
    
    Возвращает:
    - Анализ веса (норма/избыток/недостаток)
    - Анализ активности (достаточная/недостаточная)
    - Риски здоровья породы
    - Рекомендации (корм, курсы, обследования)
    - Общий скор соответствия породе
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pet_id):
        # Получаем питомца
        pet = get_object_or_404(Pet, id=pet_id, owner=request.user)
        
        # Сервис сравнения
        comparison_service = PetBreedComparisonService()
        comparison_data = comparison_service.compare_pet_with_breed(pet)
        
        # Сериализация
        serializer = PetBreedComparisonSerializer(comparison_data)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class BreedHealthRisksView(APIView):
    """
    Получить риски здоровья для породы.
    
    GET /api/breeds/{breed_id}/health-risks/
    
    Параметры:
        severity: low | medium | high (фильтр по тяжести)
        min_prevalence: минимальная распространенность (%)
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, breed_id):
        breed = get_object_or_404(Breed, id=breed_id)
        
        # Фильтры (BreedHealth записи, не JSONField)
        risks = breed.breed_health_records.all()
        
        severity = request.query_params.get('severity')
        if severity:
            risks = risks.filter(severity=severity)
        
        min_prevalence = request.query_params.get('min_prevalence')
        if min_prevalence:
            risks = risks.filter(prevalence_percent__gte=float(min_prevalence))
        
        # Сериализация
        from .serializers_breeds import BreedHealthSerializer
        serializer = BreedHealthSerializer(risks, many=True)
        
        return Response({
            'breed_name': breed.name,
            'total_risks': risks.count(),
            'risks': serializer.data
        }, status=status.HTTP_200_OK)

