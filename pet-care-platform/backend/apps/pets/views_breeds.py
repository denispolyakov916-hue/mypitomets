"""
API views для работы с породами
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Breed, Pet
from .serializers_breeds import (
    BreedListSerializer, BreedDetailSerializer,
    PetBreedComparisonSerializer
)
from .services_breeds import PetBreedComparisonService


class BreedListView(generics.ListAPIView):
    """
    Список пород с фильтрацией и поиском.
    
    GET /api/breeds/
    
    Параметры:
        species: dog | cat
        size_category: toy | small | medium | large | giant
        energy_level: low | medium | high | very_high
        health_risk_level: low | medium | high
        brachycephalic: true | false
        apartment_friendly: true | false
        good_for_novice: true | false
        search: поиск по названию
    """
    
    queryset = Breed.objects.all()
    serializer_class = BreedListSerializer
    permission_classes = [AllowAny]
    filter_backends = [SearchFilter, OrderingFilter]
    
    search_fields = ['name', 'name_en']
    ordering_fields = ['name', 'size_category', 'energy_level']
    ordering = ['species', 'name']
    
    def get_queryset(self):
        """Фильтрация вручную"""
        queryset = super().get_queryset()
        
        # Фильтры из query params
        species = self.request.query_params.get('species')
        if species:
            queryset = queryset.filter(species=species)
        
        size_category = self.request.query_params.get('size_category')
        if size_category:
            queryset = queryset.filter(size_category=size_category)
        
        energy_level = self.request.query_params.get('energy_level')
        if energy_level:
            queryset = queryset.filter(energy_level=energy_level)
        
        health_risk_level = self.request.query_params.get('health_risk_level')
        if health_risk_level:
            queryset = queryset.filter(health_risk_level=health_risk_level)
        
        brachycephalic = self.request.query_params.get('brachycephalic')
        if brachycephalic:
            queryset = queryset.filter(brachycephalic=brachycephalic.lower() == 'true')
        
        apartment_friendly = self.request.query_params.get('apartment_friendly')
        if apartment_friendly:
            queryset = queryset.filter(apartment_friendly=apartment_friendly.lower() == 'true')
        
        good_for_novice = self.request.query_params.get('good_for_novice')
        if good_for_novice:
            queryset = queryset.filter(good_for_novice=good_for_novice.lower() == 'true')
        
        return queryset


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
        
        # Фильтры
        risks = breed.health_risks.all()
        
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

