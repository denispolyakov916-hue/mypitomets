"""
Views для модуля обучения (Курсы)

Этот модуль предоставляет API эндпоинты для:
- Просмотра каталога курсов
- Покупки/записи на курс
- Списка курсов пользователя

Классы View:
    - CourseListView: Каталог курсов
    - CourseDetailView: Детали конкретного курса
    - CoursePurchaseView: Покупка/запись на курс
    - UserCoursesView: Список курсов пользователя

Бизнес-логика:
    - Бесплатные курсы доступны для записи сразу
    - Платные курсы имитируют покупку (реальная оплата в продакшене)
    - Пользователь может приобрести каждый курс только один раз
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.data_store import data_store

logger = logging.getLogger('apps.training')


class CourseListView(APIView):
    """
    API эндпоинт для каталога курсов.
    
    Возвращает список всех доступных курсов.
    Публичный эндпоинт - авторизация не требуется.
    
    Эндпоинт: GET /api/courses/
    
    Query параметры:
        pet_type (str): Фильтр по типу животного ('dog', 'cat', 'all')
    
    Успешный ответ (200 OK):
        {
            "courses": [
                {
                    "id": 1,
                    "title": "Основы дрессировки собак",
                    "description": "...",
                    "duration": 120,
                    "price": 0,
                    "is_free": true,
                    "pet_type": "dog",
                    ...
                },
                ...
            ],
            "count": 7
        }
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Получение каталога курсов.
        
        Опционально фильтрует по параметру pet_type.
        
        Аргументы:
            request: DRF Request с query параметрами
            
        Возвращает:
            Response со списком курсов и количеством
        """
        pet_type = request.query_params.get('pet_type')
        
        # Валидация pet_type
        valid_pet_types = ['dog', 'cat', 'all']
        if pet_type and pet_type not in valid_pet_types:
            pet_type = None
        
        courses = data_store.get_all_courses(pet_type=pet_type)
        courses_data = [c.to_dict() for c in courses]
        
        logger.info(f"Курсы получены: количество={len(courses_data)}, фильтр={pet_type}")
        
        return Response({
            'courses': courses_data,
            'count': len(courses_data)
        }, status=status.HTTP_200_OK)


class CourseDetailView(APIView):
    """
    API эндпоинт для деталей конкретного курса.
    
    Возвращает подробную информацию о курсе.
    Если пользователь авторизован, также показывает, владеет ли он курсом.
    
    Эндпоинт: GET /api/courses/{id}/
    
    Успешный ответ (200 OK):
        {
            "course": {...},
            "is_owned": false  // только для авторизованных
        }
    
    Ответ с ошибкой (404 Not Found):
        {
            "error": "Курс не найден"
        }
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, course_id):
        """
        Получение деталей курса.
        
        Аргументы:
            request: DRF Request
            course_id: ID курса из URL
            
        Возвращает:
            Response с данными курса или ошибкой 404
        """
        course = data_store.get_course_by_id(course_id)
        
        if not course:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response_data = {'course': course.to_dict()}
        
        # Проверка, владеет ли авторизованный пользователь курсом
        if hasattr(request, 'user_id') and request.user_id:
            response_data['is_owned'] = data_store.has_course(
                request.user_id, course_id
            )
        
        return Response(response_data, status=status.HTTP_200_OK)


class CoursePurchaseView(APIView):
    """
    API эндпоинт для покупки/записи на курс.
    
    Для бесплатных курсов: немедленная запись.
    Для платных курсов: имитация покупки (реальная оплата в продакшене).
    
    Эндпоинт: POST /api/courses/{id}/purchase/
    
    Запрос: {} (пустое тело, course_id из URL)
    
    Успешный ответ (200 OK):
        {
            "message": "Курс успешно приобретён",
            "course": {...}
        }
    
    Ответы с ошибками:
        400 - Курс уже приобретён
        404 - Курс не найден
    
    Бизнес-логика:
        - Проверка существования курса
        - Проверка, что пользователь ещё не владеет курсом
        - Для платных курсов: обработка оплаты (имитация для MVP)
        - Запись о покупке в user_courses
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, course_id):
        """
        Покупка или запись на курс.
        
        Аргументы:
            request: DRF Request с аутентифицированным пользователем
            course_id: ID курса для покупки (из URL)
            
        Возвращает:
            Response с данными курса или ошибкой
        """
        user_id = request.user_id
        
        # Проверка существования курса
        course = data_store.get_course_by_id(course_id)
        if not course:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка, не куплен ли уже курс
        if data_store.has_course(user_id, course_id):
            return Response(
                {'error': 'Вы уже приобрели этот курс'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Для MVP: имитация оплаты для платных курсов
        # В продакшене здесь будет интеграция с платёжным шлюзом
        if course.price > 0:
            logger.info(
                f"Имитация оплаты: user={user_id}, course={course_id}, "
                f"сумма={course.price}"
            )
        
        # Запись о покупке
        user_course = data_store.purchase_course(user_id, course_id)
        
        if not user_course:
            return Response(
                {'error': 'Не удалось оформить курс'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        action = 'приобретён' if course.price > 0 else 'добавлен'
        logger.info(f"Курс {action}: user={user_id}, course={course_id}")
        
        return Response({
            'message': f'Курс успешно {action}',
            'course': course.to_dict()
        }, status=status.HTTP_200_OK)


class UserCoursesView(APIView):
    """
    API эндпоинт для курсов пользователя.
    
    Возвращает список курсов, которые пользователь приобрёл или на которые записался.
    
    Эндпоинт: GET /api/courses/my/
    
    Требуемые заголовки:
        Authorization: Bearer <access_token>
    
    Успешный ответ (200 OK):
        {
            "courses": [
                {
                    "course": {...},
                    "purchased_at": "2024-01-15T10:30:00",
                    "progress": 0
                },
                ...
            ],
            "count": 3
        }
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Получение курсов пользователя.
        
        Аргументы:
            request: DRF Request с аутентифицированным пользователем
            
        Возвращает:
            Response со списком курсов пользователя
        """
        user_id = request.user_id
        user_courses = data_store.get_user_courses(user_id)
        
        return Response({
            'courses': user_courses,
            'count': len(user_courses)
        }, status=status.HTTP_200_OK)
