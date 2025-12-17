"""
Views для управления питомцами (PetID)

CRUD API для профилей питомцев.
"""

import logging
from datetime import datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Pet
from .serializers import PetCreateSerializer, PetUpdateSerializer

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
        pets = Pet.objects.filter(owner=request.user)
        pets_data = [pet.to_dict() for pet in pets]
        
        return Response({
            'pets': pets_data,
            'count': len(pets_data)
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Создание нового питомца."""
        serializer = PetCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Конвертация даты из строки
        date_of_birth = serializer.validated_data.get('date_of_birth')
        if date_of_birth and isinstance(date_of_birth, str):
            date_of_birth = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
        
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
            allergies=serializer.validated_data.get('allergies', [])
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
            pet = Pet.objects.get(id=pet_id)
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
        for field in ['name', 'species', 'breed', 'date_of_birth', 'weight', 'gender', 'is_neutered', 'favorite_foods', 'allergies']:
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
