"""
Views для управления питомцами (PetID)

Этот модуль предоставляет CRUD API эндпоинты для профилей питомцев.
PetID является центральным элементом платформы Питомец+.

Классы View:
    - PetListCreateView: Список всех питомцев пользователя / Создание нового питомца
    - PetDetailView: Получение / Обновление / Удаление конкретного питомца

Авторизация:
    Все эндпоинты требуют аутентификации.
    Пользователи могут получить доступ только к своим питомцам (проверка владения).

Безопасность:
    - Требуется JWT аутентификация
    - Доступ только для владельца обеспечивается на уровне view
    - Валидация ввода через сериализаторы
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.data_store import data_store
from .serializers import PetCreateSerializer, PetUpdateSerializer

logger = logging.getLogger('apps.pets')


class PetListCreateView(APIView):
    """
    API эндпоинт для списка и создания питомцев.
    
    Обрабатывает две операции:
    - GET: Список всех питомцев, принадлежащих аутентифицированному пользователю
    - POST: Создание нового профиля питомца для пользователя
    
    Эндпоинты:
        GET  /api/pets/     - Список питомцев пользователя
        POST /api/pets/     - Создание нового питомца
    
    Авторизация:
        Требует валидный JWT токен. Пользователь может видеть/создавать только своих питомцев.
    
    GET ответ (200 OK):
        {
            "pets": [
                {
                    "id": "018d3e5f-8c7b-7abc-9def-1234567890ab",  // UUIDv7
                    "name": "Барсик",
                    "species": "cat",
                    "breed": "Персидская",
                    ...
                },
                ...
            ],
            "count": 2
        }
    
    POST запрос:
        {
            "name": "Барсик",
            "species": "cat",
            "breed": "Персидская",        // опционально
            "date_of_birth": "2020-05-15", // опционально
            "weight": 5.2                  // опционально
        }
    
    POST ответ (201 Created):
        {
            "message": "Питомец успешно добавлен",
            "pet": {...}
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Список всех питомцев для аутентифицированного пользователя.
        
        Получает всех питомцев из data_store, где owner_id совпадает
        с ID текущего пользователя из JWT токена.
        
        Аргументы:
            request: DRF Request с аутентифицированным пользователем
            
        Возвращает:
            Response со списком словарей питомцев и количеством
        """
        user_id = request.user_id
        
        # Получение всех питомцев, принадлежащих пользователю
        pets = data_store.get_user_pets(user_id)
        pets_data = [pet.to_dict() for pet in pets]
        
        logger.info(f"Получено {len(pets_data)} питомцев для пользователя {user_id}")
        
        return Response({
            'pets': pets_data,
            'count': len(pets_data)
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """
        Создание нового профиля питомца.
        
        Валидирует входные данные и создаёт нового питомца, связанного
        с аутентифицированным пользователем.
        
        Аргументы:
            request: DRF Request с данными питомца в теле
            
        Возвращает:
            Response с данными созданного питомца (201) или ошибками валидации (400)
            
        Процесс:
            1. Валидация ввода через PetCreateSerializer
            2. Создание питомца в data_store с owner_id из токена
            3. Возврат данных созданного питомца
        """
        serializer = PetCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            logger.warning(f"Ошибка валидации создания питомца: {serializer.errors}")
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.user_id
        
        # Создание питомца с валидированными данными
        pet = data_store.create_pet(
            owner_id=user_id,
            name=serializer.validated_data['name'],
            species=serializer.validated_data['species'],
            breed=serializer.validated_data.get('breed'),
            date_of_birth=serializer.validated_data.get('date_of_birth'),
            weight=serializer.validated_data.get('weight')
        )
        
        if not pet:
            # Это не должно произойти, если пользователь аутентифицирован
            return Response(
                {'error': 'Не удалось создать питомца'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"Питомец создан: id={pet.id}, name={pet.name}, owner={user_id}")
        
        return Response({
            'message': 'Питомец успешно добавлен',
            'pet': pet.to_dict()
        }, status=status.HTTP_201_CREATED)


class PetDetailView(APIView):
    """
    API эндпоинт для операций с одним питомцем.
    
    Обрабатывает операции с конкретным питомцем:
    - GET: Получение деталей питомца
    - PUT: Обновление информации о питомце
    - DELETE: Удаление профиля питомца
    
    Эндпоинты:
        GET    /api/pets/{id}/  - Получение деталей питомца
        PUT    /api/pets/{id}/  - Обновление питомца
        DELETE /api/pets/{id}/  - Удаление питомца
    
    Авторизация:
        Требует валидный JWT токен.
        Пользователь должен быть владельцем питомца.
    
    Ответы с ошибками:
        401 Unauthorized - Невалидный или отсутствующий токен
        403 Forbidden - Пользователь не является владельцем питомца
        404 Not Found - Питомец не существует
    
    Безопасность:
        Владение проверяется на каждый запрос для предотвращения
        доступа пользователей к питомцам других пользователей.
    """
    
    permission_classes = [IsAuthenticated]
    
    def _get_pet_with_auth(self, request, pet_id):
        """
        Вспомогательный метод для получения питомца с проверкой владения.
        
        Получает питомца и проверяет, что запрашивающий пользователь является владельцем.
        Возвращает кортеж (pet, error_response).
        
        Аргументы:
            request: DRF Request с аутентифицированным пользователем
            pet_id: UUIDv7 ID питомца для получения (может быть UUID объект или строка)
            
        Возвращает:
            tuple: (объект Pet, None) если авторизован
                   (None, Response) если ошибка (не найден или не авторизован)
        """
        # Конвертируем UUID объект в строку для поиска в data_store
        pet_id_str = str(pet_id)
        pet = data_store.get_pet_by_id(pet_id_str)
        
        if not pet:
            return None, Response(
                {'error': 'Питомец не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if pet.owner_id != request.user_id:
            logger.warning(
                f"Неавторизованный доступ к питомцу: user={request.user_id}, "
                f"pet={pet_id}, owner={pet.owner_id}"
            )
            return None, Response(
                {'error': 'Нет доступа к этому питомцу'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return pet, None
    
    def get(self, request, pet_id):
        """
        Получение деталей конкретного питомца.
        
        Аргументы:
            request: DRF Request
            pet_id: ID питомца для получения (из URL)
            
        Возвращает:
            Response с данными питомца или ошибкой
        """
        pet, error_response = self._get_pet_with_auth(request, pet_id)
        if error_response:
            return error_response
        
        return Response({
            'pet': pet.to_dict()
        }, status=status.HTTP_200_OK)
    
    def put(self, request, pet_id):
        """
        Обновление информации о питомце.
        
        Поддерживает частичное обновление - обновляются только предоставленные поля.
        
        Аргументы:
            request: DRF Request с данными для обновления в теле
            pet_id: ID питомца для обновления (из URL)
            
        Возвращает:
            Response с обновлёнными данными питомца или ошибкой
            
        Пример тела запроса:
            {
                "weight": 5.5,
                "breed": "Сибирская"
            }
        """
        pet, error_response = self._get_pet_with_auth(request, pet_id)
        if error_response:
            return error_response
        
        # Валидация данных обновления
        serializer = PetUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Фильтрация None значений (оставляем только предоставленные поля)
        update_data = {
            k: v for k, v in serializer.validated_data.items() 
            if v is not None
        }
        
        if not update_data:
            return Response(
                {'error': 'Нет данных для обновления'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Выполнение обновления (конвертируем UUID в строку)
        pet_id_str = str(pet_id)
        updated_pet = data_store.update_pet(
            pet_id=pet_id_str,
            owner_id=request.user_id,
            **update_data
        )
        
        if not updated_pet:
            return Response(
                {'error': 'Не удалось обновить данные питомца'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"Питомец обновлён: id={pet_id}, поля={list(update_data.keys())}")
        
        return Response({
            'message': 'Данные питомца обновлены',
            'pet': updated_pet.to_dict()
        }, status=status.HTTP_200_OK)
    
    def delete(self, request, pet_id):
        """
        Удаление профиля питомца.
        
        Необратимо удаляет питомца из системы.
        Это действие нельзя отменить.
        
        Аргументы:
            request: DRF Request
            pet_id: ID питомца для удаления (из URL)
            
        Возвращает:
            Response с подтверждением удаления или ошибкой
        """
        pet, error_response = self._get_pet_with_auth(request, pet_id)
        if error_response:
            return error_response
        
        # Выполнение удаления (конвертируем UUID в строку)
        pet_id_str = str(pet_id)
        success = data_store.delete_pet(pet_id=pet_id_str, owner_id=request.user_id)
        
        if not success:
            return Response(
                {'error': 'Не удалось удалить питомца'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        logger.info(f"Питомец удалён: id={pet_id}, owner={request.user_id}")
        
        return Response({
            'message': 'Питомец удалён'
        }, status=status.HTTP_200_OK)
