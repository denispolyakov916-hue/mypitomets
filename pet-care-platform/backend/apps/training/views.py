"""
Views для модуля обучения (Курсы)

API для каталога курсов и покупки.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404

from .models import (
    Course, UserCourse, Lesson, UserCourseProgress, UserLessonProgress,
    Comment, CommentLike, Rating, CoursePage, ContentBlock, BlockTemplate
)
from .serializers import (
    CoursePageSerializer, ContentBlockSerializer, BlockTemplateSerializer,
    CourseBuilderSerializer, CourseBuilderPageSerializer
)
from apps.pets.models import Pet

logger = logging.getLogger('apps.training')


class CourseListView(APIView):
    """
    Каталог курсов.
    
    GET /api/courses/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.db.models import Min, Max
        
        # Используем оптимизированный каталог с предзагруженными рейтингами
        # Это устраняет N+1 проблему при вызове to_dict()
        courses = Course.objects.catalog()
        
        # Фильтр по питомцу (персональная подборка)
        pet_id = request.query_params.get('pet_id')
        pet_type = request.query_params.get('pet_type')
        personal = request.query_params.get('personal')
        
        # Если указан pet_id, получаем вид питомца
        if pet_id and request.user.is_authenticated:
            try:
                pet = Pet.objects.get(id=pet_id, owner=request.user)
                if pet.species in ['dog', 'cat']:
                    pet_type = pet.species
            except Exception:
                pass
        
        # Персональная подборка по питомцам пользователя
        if personal == 'true':
            if request.user.is_authenticated:
                # Получаем питомцев пользователя
                user_pets = Pet.objects.filter(owner=request.user)

                if user_pets.exists():
                    # Если указан конкретный pet_id, используем его
                    if pet_id:
                        try:
                            pet = user_pets.get(id=pet_id)
                            courses = Course.objects.filter_by_pet_characteristics(pet)
                        except Pet.DoesNotExist:
                            # Если pet_id не найден, используем первого питомца
                            courses = Course.objects.filter_by_pet_characteristics(user_pets.first())
                    else:
                        # Используем первого питомца пользователя
                        courses = Course.objects.filter_by_pet_characteristics(user_pets.first())
                else:
                    # Если питомцев нет, показываем универсальные курсы
                    courses = courses.filter(pet_types__contains=['all'])
            else:
                # Для неавторизованных пользователей показываем универсальные курсы
                courses = courses.filter(pet_types__contains=['all'])
        else:
            # Стандартная фильтрация по типу животного
            if pet_type and pet_type in ['dog', 'cat']:
                courses = courses.for_pet_type(pet_type)
            # Для pet_type='all' или отсутствия фильтра - показываем все

        # Фильтрация по категории и подкатегории
        category = request.query_params.get('category')
        subcategory = request.query_params.get('subcategory')
        courses = courses.in_category(category, subcategory)

        # Фильтрация по уровню
        level = request.query_params.get('level')
        courses = courses.by_level(level)

        # Фильтрация по формату
        format_type = request.query_params.get('format_type')
        courses = courses.by_format(format_type)
        
        # Фильтр по типу цены
        price_type = request.query_params.get('price_type')
        if price_type == 'free':
            courses = courses.free()
        elif price_type == 'paid':
            courses = courses.paid()

        # Фильтрация по цене
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        try:
            min_price_val = float(min_price) if min_price else None
            max_price_val = float(max_price) if max_price else None
            courses = courses.by_price_range(min_price_val, max_price_val)
        except ValueError:
            pass
        
        # Поиск по названию
        search = request.query_params.get('search')
        courses = courses.search(search)

        # Фильтр по рейтингу (оптимизировано - используем SQL аннотацию)
        min_rating = request.query_params.get('min_rating')
        if min_rating:
            try:
                min_rating_val = float(min_rating)
                courses = courses.with_min_rating(min_rating_val)
            except ValueError:
                pass

        # Фильтр по популярности (количеству покупок)
        min_orders = request.query_params.get('min_orders')
        if min_orders:
            try:
                min_orders_val = int(min_orders)
                courses = courses.filter(order_count__gte=min_orders_val)
            except ValueError:
                pass

        # Сортировка (оптимизировано - сортировка по рейтингу теперь через SQL)
        sort_by = request.query_params.get('sort_by')
        if sort_by == 'rating':
            courses = courses.order_by_rating()
        elif sort_by == 'popularity':
            courses = courses.order_by_popularity()
        elif sort_by == 'price_asc':
            courses = courses.order_by('price')
        elif sort_by == 'price_desc':
            courses = courses.order_by('-price')
        else:
            # По умолчанию сортировка по ID (новые курсы)
            courses = courses.order_by('-id')
        
        # Общее количество до пагинации
        total_count = courses.count()
        
        # Пагинация
        try:
            page = max(1, int(request.query_params.get('page', 1)))
            per_page = min(50, max(1, int(request.query_params.get('per_page', 12))))
        except ValueError:
            page = 1
            per_page = 12
        
        offset = (page - 1) * per_page
        courses = courses[offset:offset + per_page]

        courses_data = [c.to_dict() for c in courses]
        
        # Сбор доступных фильтров
        filter_query = Course.objects.filter(is_active=True)
        if pet_type and pet_type != 'all':
            filter_query = filter_query.filter(pet_type__in=[pet_type, 'all'])
        if category:
            filter_query = filter_query.filter(category=category)
        
        # Диапазон цен
        price_range = filter_query.aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        # Получение питомцев пользователя для персональных подборок
        user_pets = []
        if request.user.is_authenticated:
            try:
                pets = Pet.objects.filter(owner=request.user)
                user_pets = [
                    {
                        'id': str(pet.id),
                        'name': pet.name,
                        'species': pet.species,
                        'species_label': pet.get_species_display(),
                    }
                    for pet in pets
                ]
            except Exception:
                pass

        return Response({
            'courses': courses_data,
            'pagination': {
                'total': total_count,
                'page': page,
                'per_page': per_page,
                'total_pages': (total_count + per_page - 1) // per_page if total_count > 0 else 0
            },
            'filters': {
                'pet_types': [
                    {'value': 'dog', 'label': 'Для собак'},
                    {'value': 'cat', 'label': 'Для кошек'},
                    {'value': 'all', 'label': 'Для всех'},
                ],
                'categories': [
                    {'value': 'basics', 'label': 'Основы'},
                    {'value': 'training', 'label': 'Дрессировка'},
                    {'value': 'care', 'label': 'Уход'},
                    {'value': 'health', 'label': 'Здоровье'},
                    {'value': 'nutrition', 'label': 'Питание'},
                    {'value': 'behavior', 'label': 'Поведение'},
                    {'value': 'specialized', 'label': 'Специализированные'},
                    {'value': 'entertainment', 'label': 'Развлечения'},
                ],
                'levels': [
                    {'value': 'beginner', 'label': 'Начинающий'},
                    {'value': 'intermediate', 'label': 'Средний'},
                    {'value': 'advanced', 'label': 'Продвинутый'},
                    {'value': 'expert', 'label': 'Эксперт'},
                ],
                'formats': [
                    {'value': 'video', 'label': 'Видео'},
                    {'value': 'text', 'label': 'Текст'},
                    {'value': 'interactive', 'label': 'Интерактивный'},
                    {'value': 'mixed', 'label': 'Смешанный'},
                    {'value': 'webinar', 'label': 'Вебинар'},
                    {'value': 'workshop', 'label': 'Мастер-класс'},
                ],
                'price_types': [
                    {'value': 'free', 'label': 'Бесплатные'},
                    {'value': 'paid', 'label': 'Платные'},
                ],
                'price_range': {
                    'min': float(price_range['min_price']) if price_range['min_price'] else 0,
                    'max': float(price_range['max_price']) if price_range['max_price'] else 0,
                },
                'user_pets': user_pets,
            }
        }, status=status.HTTP_200_OK)

    def _get_personalization_info(self, request, pet_id=None):
        """
        Получить информацию о персонализации для текущего запроса.
        """
        info = {
            'is_personalized': False,
            'pet_info': None,
            'recommendations': []
        }

        if not request.user.is_authenticated:
            return info

        try:
            # Определяем питомца
            pet = None
            if pet_id:
                pet = Pet.objects.get(id=pet_id, owner=request.user)
            else:
                user_pets = Pet.objects.filter(owner=request.user)
                if user_pets.exists():
                    pet = user_pets.first()

            if pet:
                info['is_personalized'] = True
                info['pet_info'] = {
                    'id': str(pet.id),
                    'name': pet.name,
                    'species': pet.species,
                    'behavior_type': pet.behavior_type,
                    'activity_level': pet.activity_level,
                    'training_experience': pet.training_experience
                }

                # Получить рекомендации по проблемам
                problem_courses = Course.objects.get_recommended_for_pet_problems(pet, limit=3)
                if problem_courses.exists():
                    info['recommendations'].append({
                        'type': 'problems',
                        'title': 'Курсы для решения проблем',
                        'courses': [
                            {
                                'id': str(course.id),
                                'title': course.title,
                                'image': course.image
                            } for course in problem_courses
                        ]
                    })

                # Получить курсы по предпочтениям активностей
                activity_courses = Course.objects.get_by_pet_activity_preferences(pet, limit=3)
                if activity_courses.exists():
                    info['recommendations'].append({
                        'type': 'activities',
                        'title': 'Курсы по вашим интересам',
                        'courses': [
                            {
                                'id': str(course.id),
                                'title': course.title,
                                'image': course.image
                            } for course in activity_courses
                        ]
                    })

        except Exception as e:
            # В случае ошибки возвращаем базовую информацию
            pass

        return info


class CourseDetailView(APIView):
    """
    Детали курса.
    
    GET /api/courses/{id}/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Используем detailed=True для полной информации
        course_data = course.to_dict(detailed=True)
        response_data = {'course': course_data}

        # Добавляем персонализированную информацию
        pet_id = request.query_params.get('pet_id')
        if pet_id and request.user.is_authenticated:
            try:
                pet = Pet.objects.get(id=pet_id, owner=request.user)
                personalization = course.get_personalized_recommendations(pet)
                response_data['personalization'] = personalization
            except Pet.DoesNotExist:
                pass
        
        # Проверка владения для авторизованных пользователей
        if request.user.is_authenticated:
            is_owned = UserCourse.objects.filter(
                user=request.user,
                course=course
            ).exists()
            response_data['is_owned'] = is_owned
            # Добавляем is_purchased для совместимости с фронтендом
            response_data['course']['is_purchased'] = is_owned
        
        return Response(response_data, status=status.HTTP_200_OK)


class CourseCheckoutView(APIView):
    """
    Страница оформления курса с детальной информацией.
    
    GET /api/courses/{id}/checkout/
    Возвращает детальную информацию о курсе для оформления.
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, course_id):
        """Получение информации для оформления курса."""
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка, не куплен ли уже
        is_owned = UserCourse.objects.filter(user=request.user, course=course).exists()
        if is_owned:
            return Response(
                {'error': 'Вы уже приобрели этот курс'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получение питомцев пользователя для выбора
        user_pets = []
        if course.pet_type in ['dog', 'cat', 'all']:
            pets = Pet.objects.filter(owner=request.user)
            if course.pet_type != 'all':
                species_to_pet_type = {
                    'dog': 'dog',
                    'cat': 'cat',
                }
                pets = pets.filter(species__in=[
                    k for k, v in species_to_pet_type.items() 
                    if v == course.pet_type
                ])
            
            user_pets = [
                {
                    'id': str(pet.id),
                    'name': pet.name,
                    'species': pet.species,
                    'species_label': pet.get_species_display(),
                }
                for pet in pets
            ]
        
        # Детальная информация о курсе
        course_data = course.to_dict(detailed=True)
        
        # Форматирование длительности
        duration_hours = course.duration // 60
        duration_minutes = course.duration % 60
        duration_display = f"{duration_hours} ч {duration_minutes} мин" if duration_hours > 0 else f"{duration_minutes} мин"
        
        # Текст соглашения (дисклеймер)
        disclaimer_text = (
            "Приобретая данный курс, вы подтверждаете, что понимаете и соглашаетесь с тем, "
            "что мы не гарантируем стопроцентного результата. Результаты обучения зависят от "
            "индивидуальных особенностей питомца, усердия в выполнении рекомендаций и других факторов."
        )
        
        return Response({
            'course': course_data,
            'duration_display': duration_display,
            'price': float(course.price),
            'is_free': course.is_free,
            'user_pets': user_pets,
            'disclaimer': {
                'text': disclaimer_text,
                'required': True
            },
            'summary': {
                'title': course.title,
                'instructor': course.instructor_name or 'Инструктор',
                'format': course.get_format_display_name(),
                'level': course.get_level_display_name(),
                'duration': duration_display,
                'completion_time': course.completion_time or 'Не указано',
                'lessons_count': course.lessons_count,
                'videos_count': course.videos_count,
                'materials_count': course.materials_count,
            }
        }, status=status.HTTP_200_OK)


class CoursePurchaseView(APIView):
    """
    Покупка/запись на курс.
    
    POST /api/courses/{id}/purchase/
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, course_id):
        logger.info(f"Начало покупки курса: user={request.user.email}, course_id={course_id}")

        try:
            course = Course.objects.get(id=course_id, is_active=True)
            logger.info(f"Курс найден: {course.title}, price={course.price}, pet_type={course.pet_type}")
        except Course.DoesNotExist:
            logger.warning(f"Курс не найден: {course_id}")
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получение pet_id из запроса (опционально)
        pet_id = request.data.get('pet_id')
        logger.info(f"Получен pet_id: {pet_id}")
        pet = None

        if pet_id:
            try:
                pet = Pet.objects.get(id=pet_id, owner=request.user)
                logger.info(f"Питомец найден: {pet.name}, species={pet.species}")

                # Валидация соответствия типа курса и вида питомца
                if course.pet_type != 'all':
                    species_to_pet_type = {
                        'dog': 'dog',
                        'cat': 'cat',
                    }
                    pet_type = species_to_pet_type.get(pet.species)
                    logger.info(f"Проверка типа: course.pet_type={course.pet_type}, pet_type={pet_type}")
                    if pet_type != course.pet_type:
                        logger.warning(f"Несоответствие типов: курс для {course.pet_type}, питомец {pet.species}")
                        return Response(
                            {
                                'error': f'Этот курс предназначен для {course.get_pet_type_display_name()}, '
                                       f'а ваш питомец - {pet.get_species_display()}'
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
            except Pet.DoesNotExist:
                logger.warning(f"Питомец не найден: {pet_id}")
                return Response(
                    {'error': 'Питомец не найден или не принадлежит вам'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Проверка, не куплен ли уже (с учетом питомца)
        existing_query = UserCourse.objects.filter(user=request.user, course=course)
        if pet:
            existing_query = existing_query.filter(pet=pet)
        else:
            existing_query = existing_query.filter(pet__isnull=True)

        if existing_query.exists():
            logger.warning(f"Курс уже куплен: user={request.user.email}, course={course_id}")
            return Response(
                {'error': 'Вы уже приобрели этот курс' + (f' для {pet.name}' if pet else '')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка согласия с дисклеймером (требуется только для платных курсов)
        if course.price > 0:
            disclaimer_accepted = request.data.get('disclaimer_accepted', False)
            logger.info(f"Проверка дисклеймера: price={course.price}, disclaimer_accepted={disclaimer_accepted}")
            if not disclaimer_accepted:
                logger.warning(f"Дисклеймер не принят: user={request.user.email}, course={course_id}")
                return Response(
                    {'error': 'Необходимо согласиться с условиями использования'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Оплата через единую систему платежей
        payment = None
        if course.price > 0:
            logger.info(f"Создание платежа: amount={course.price}")
            from apps.payments.services import PaymentService

            try:
                payment = PaymentService.create_payment(
                    user=request.user,
                    payment_type='course',
                    object_id=str(course.id),
                    amount=course.price,
                    payment_method='card',
                    metadata={
                        'course_id': str(course.id),
                        'pet_id': str(pet.id) if pet else None
                    }
                )
                logger.info(f"Платеж создан: {payment.id}")

                # Обработка платежа (имитация)
                success = PaymentService.process_payment(payment)
                logger.info(f"Обработка платежа: success={success}")
                if not success:
                    logger.error(f"Не удалось обработать платеж: {payment.id}")
                    return Response(
                        {'error': 'Не удалось обработать платеж'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                logger.info(
                    f"Оплата курса успешна: user={request.user.email}, course={course_id}, "
                    f"pet={pet.name if pet else 'None'}, сумма={course.price}"
                )

            except ValueError as e:
                logger.error(f"Ошибка при создании платежа: {str(e)}")
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Запись о покупке
        UserCourse.objects.create(user=request.user, course=course, pet=pet)

        action = 'приобретён' if course.price > 0 else 'добавлен'
        pet_info = f" для {pet.name}" if pet else ""
        logger.info(f"Курс {action}{pet_info}: user={request.user.email}, course={course_id}")

        response_data = {
            'message': f'Курс успешно {action}' + pet_info,
            'course': course.to_dict()
        }
        
        if pet:
            response_data['pet'] = {
                'id': str(pet.id),
                'name': pet.name
            }

        if payment:
            response_data['payment_id'] = str(payment.id)

        return Response(response_data, status=status.HTTP_200_OK)


class UserCoursesView(APIView):
    """
    Курсы пользователя.
    
    GET /api/courses/my/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_courses = UserCourse.objects.filter(
            user=request.user
        ).select_related('course', 'pet')
        
        # Фильтрация по питомцу (опционально)
        pet_id = request.query_params.get('pet_id')
        if pet_id:
            try:
                pet = Pet.objects.get(id=pet_id, owner=request.user)
                user_courses = user_courses.filter(pet=pet)
            except Pet.DoesNotExist:
                return Response(
                    {'error': 'Питомец не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        courses_data = [uc.to_dict() for uc in user_courses]
        
        return Response({
            'courses': courses_data,
            'count': len(courses_data)
        }, status=status.HTTP_200_OK)


class FreeCourseEnrollView(APIView):
    """
    Прямая запись на бесплатный курс без добавления в корзину.
    
    POST /api/courses/{id}/enroll/
    
    Требует согласие с условиями использования (disclaimer_accepted: true).
    Работает только для бесплатных курсов (price=0).
    """
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, course_id):
        logger.info(f"Запись на бесплатный курс: user={request.user.email}, course_id={course_id}")

        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка, что курс бесплатный
        if course.price > 0:
            return Response(
                {'error': 'Этот курс платный. Используйте оформление заказа для покупки.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка согласия с условиями
        disclaimer_accepted = request.data.get('disclaimer_accepted', False)
        if not disclaimer_accepted:
            return Response(
                {'error': 'Необходимо согласиться с условиями использования'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Получение pet_id из запроса (опционально)
        pet_id = request.data.get('pet_id')
        pet = None

        if pet_id:
            try:
                pet = Pet.objects.get(id=pet_id, owner=request.user)

                # Валидация соответствия типа курса и вида питомца
                if course.pet_type != 'all':
                    species_to_pet_type = {
                        'dog': 'dog',
                        'cat': 'cat',
                    }
                    pet_type = species_to_pet_type.get(pet.species)
                    if pet_type != course.pet_type:
                        return Response(
                            {
                                'error': f'Этот курс предназначен для {course.get_pet_type_display_name()}, '
                                       f'а ваш питомец - {pet.get_species_display()}'
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
            except Pet.DoesNotExist:
                return Response(
                    {'error': 'Питомец не найден или не принадлежит вам'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Проверка, не записан ли уже (с учетом питомца)
        existing_query = UserCourse.objects.filter(user=request.user, course=course)
        if pet:
            existing_query = existing_query.filter(pet=pet)
        else:
            existing_query = existing_query.filter(pet__isnull=True)

        if existing_query.exists():
            return Response(
                {'error': 'Вы уже записаны на этот курс' + (f' для {pet.name}' if pet else '')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Запись на курс
        user_course = UserCourse.objects.create(user=request.user, course=course, pet=pet)

        pet_info = f" для {pet.name}" if pet else ""
        logger.info(f"Бесплатный курс добавлен{pet_info}: user={request.user.email}, course={course_id}")

        response_data = {
            'message': f'Вы успешно записались на курс' + pet_info,
            'course': course.to_dict(),
            'user_course_id': user_course.id
        }
        
        if pet:
            response_data['pet'] = {
                'id': str(pet.id),
                'name': pet.name
            }

        return Response(response_data, status=status.HTTP_201_CREATED)


# ===== НОВЫЕ ВЬЮСЫ ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ =====

class CourseLessonsView(APIView):
    """
    Уроки курса.

    GET /api/courses/{course_id}/lessons/
    Возвращает список уроков курса в правильном порядке.
    """

    permission_classes = [AllowAny]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        lessons = course.get_lessons_ordered()
        lessons_data = []

        for lesson in lessons:
            lesson_data = {
                'id': lesson.id,
                'title': lesson.title,
                'content_type': lesson.content_type,
                'content_type_display': lesson.get_content_type_display_name(),
                'duration': lesson.duration,
                'order': lesson.order,
                'is_required': lesson.is_required,
            }

            # Для авторизованных пользователей добавляем статус прогресса
            if request.user.is_authenticated:
                try:
                    course_progress = UserCourseProgress.objects.get(
                        user=request.user,
                        course=course,
                        pet_id=request.query_params.get('pet_id')
                    )
                    lesson_progress = UserLessonProgress.objects.filter(
                        course_progress=course_progress,
                        lesson=lesson
                    ).first()

                    if lesson_progress:
                        lesson_data['progress'] = {
                            'status': lesson_progress.status,
                            'time_spent': lesson_progress.time_spent,
                            'completed_at': lesson_progress.completed_at.isoformat() if lesson_progress.completed_at else None,
                        }
                except UserCourseProgress.DoesNotExist:
                    pass

            lessons_data.append(lesson_data)

        return Response({
            'lessons': lessons_data,
            'count': len(lessons_data)
        }, status=status.HTTP_200_OK)


class LessonDetailView(APIView):
    """
    Детали урока.

    GET /api/lessons/{id}/
    Возвращает полную информацию об уроке.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        lesson_data = {
            'id': lesson.id,
            'course_id': lesson.course.id,
            'title': lesson.title,
            'content_type': lesson.content_type,
            'content_type_display': lesson.get_content_type_display_name(),
            'content': lesson.content,
            'duration': lesson.duration,
            'order': lesson.order,
            'is_required': lesson.is_required,
            'additional_materials': lesson.additional_materials,
        }

        # Прогресс пользователя по уроку
        pet_id = request.query_params.get('pet_id')
        try:
            course_progress = UserCourseProgress.objects.get(
                user=request.user,
                course=lesson.course,
                pet_id=pet_id
            )
            lesson_progress = UserLessonProgress.objects.filter(
                course_progress=course_progress,
                lesson=lesson
            ).first()

            if lesson_progress:
                lesson_data['progress'] = {
                    'id': str(lesson_progress.id),
                    'status': lesson_progress.status,
                    'time_spent': lesson_progress.time_spent,
                    'attempts_count': lesson_progress.attempts_count,
                    'success_rate': lesson_progress.success_rate,
                    'notes': lesson_progress.notes,
                    'started_at': lesson_progress.started_at.isoformat() if lesson_progress.started_at else None,
                    'completed_at': lesson_progress.completed_at.isoformat() if lesson_progress.completed_at else None,
                }
            else:
                lesson_data['progress'] = None
        except UserCourseProgress.DoesNotExist:
            lesson_data['progress'] = None

        return Response({'lesson': lesson_data}, status=status.HTTP_200_OK)


class LessonCompleteView(APIView):
    """
    Завершение урока.

    POST /api/lessons/{id}/complete/
    Отмечает урок как завершённый и обновляет прогресс.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        pet_id = request.data.get('pet_id')
        time_spent = request.data.get('time_spent', 0)

        try:
            course_progress = UserCourseProgress.objects.get(
                user=request.user,
                course=lesson.course,
                pet_id=pet_id
            )
        except UserCourseProgress.DoesNotExist:
            return Response(
                {'error': 'Прогресс по курсу не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем или создаем прогресс по уроку
        lesson_progress, created = UserLessonProgress.objects.get_or_create(
            course_progress=course_progress,
            lesson=lesson,
            defaults={
                'status': 'not_started',
            }
        )

        # Отмечаем урок как завершённый
        lesson_progress.mark_completed(time_spent)

        return Response({
            'message': 'Урок успешно завершён',
            'lesson_progress': {
                'id': str(lesson_progress.id),
                'status': lesson_progress.status,
                'completed_at': lesson_progress.completed_at.isoformat(),
                'time_spent': lesson_progress.time_spent,
            },
            'course_progress': {
                'progress_percent': course_progress.progress_percent,
                'status': course_progress.status,
            }
        }, status=status.HTTP_200_OK)


class UserCourseProgressView(APIView):
    """
    Прогресс пользователя по курсу.

    GET /api/courses/{course_id}/progress/
    Возвращает детальный прогресс по курсу для указанного питомца.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        pet_id = request.query_params.get('pet_id')
        if not pet_id:
            return Response(
                {'error': 'Необходимо указать pet_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course_progress = UserCourseProgress.objects.select_related(
                'course', 'pet'
            ).get(
                user=request.user,
                course=course,
                pet_id=pet_id
            )
        except UserCourseProgress.DoesNotExist:
            # Создаем прогресс если его нет
            course_progress = UserCourseProgress.objects.create(
                user=request.user,
                course=course,
                pet_id=pet_id,
                status='not_started'
            )

        # Получаем прогресс по всем урокам
        lessons_progress = []
        for lesson in course.get_lessons_ordered():
            lesson_progress = UserLessonProgress.objects.filter(
                course_progress=course_progress,
                lesson=lesson
            ).first()

            lesson_data = {
                'lesson_id': lesson.id,
                'title': lesson.title,
                'order': lesson.order,
                'is_required': lesson.is_required,
                'progress': None
            }

            if lesson_progress:
                lesson_data['progress'] = {
                    'id': str(lesson_progress.id),
                    'status': lesson_progress.status,
                    'time_spent': lesson_progress.time_spent,
                    'attempts_count': lesson_progress.attempts_count,
                    'success_rate': lesson_progress.success_rate,
                    'completed_at': lesson_progress.completed_at.isoformat() if lesson_progress.completed_at else None,
                }

            lessons_progress.append(lesson_data)

        progress_data = {
            'id': str(course_progress.id),
            'course_id': course.id,
            'pet_id': str(course_progress.pet_id) if course_progress.pet else None,
            'pet_name': course_progress.pet.name if course_progress.pet else None,
            'status': course_progress.status,
            'progress_percent': course_progress.progress_percent,
            'started_at': course_progress.started_at.isoformat() if course_progress.started_at else None,
            'last_activity_at': course_progress.last_activity_at.isoformat(),
            'completed_at': course_progress.completed_at.isoformat() if course_progress.completed_at else None,
            'total_time_spent': course_progress.total_time_spent,
            'completed_lessons_count': course_progress.completed_lessons_count,
            'notifications_enabled': course_progress.notifications_enabled,
            'lessons_progress': lessons_progress,
        }

        return Response({'progress': progress_data}, status=status.HTTP_200_OK)


class LessonProgressView(APIView):
    """
    Обновление прогресса по уроку.

    PUT /api/lessons/{id}/progress/
    Обновляет время просмотра, статус и другие метрики урока.
    """

    permission_classes = [IsAuthenticated]

    def put(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('course').get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка доступа к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому уроку'},
                status=status.HTTP_403_FORBIDDEN
            )

        pet_id = request.data.get('pet_id')
        if not pet_id:
            return Response(
                {'error': 'Необходимо указать pet_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course_progress = UserCourseProgress.objects.get(
                user=request.user,
                course=lesson.course,
                pet_id=pet_id
            )
        except UserCourseProgress.DoesNotExist:
            return Response(
                {'error': 'Прогресс по курсу не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем или создаем прогресс по уроку
        lesson_progress, created = UserLessonProgress.objects.get_or_create(
            course_progress=course_progress,
            lesson=lesson,
            defaults={
                'status': 'in_progress',
                'started_at': timezone.now(),
            }
        )

        # Обновляем данные прогресса
        if not lesson_progress.started_at:
            lesson_progress.started_at = timezone.now()

        lesson_progress.status = request.data.get('status', lesson_progress.status)
        lesson_progress.time_spent = request.data.get('time_spent', lesson_progress.time_spent)
        lesson_progress.attempts_count = request.data.get('attempts_count', lesson_progress.attempts_count)
        lesson_progress.success_rate = request.data.get('success_rate', lesson_progress.success_rate)
        lesson_progress.notes = request.data.get('notes', lesson_progress.notes)

        lesson_progress.save()

        # Если урок завершён, обновляем общий прогресс курса
        if lesson_progress.status == 'completed' and not lesson_progress.completed_at:
            lesson_progress.mark_completed()

        return Response({
            'lesson_progress': {
                'id': str(lesson_progress.id),
                'status': lesson_progress.status,
                'time_spent': lesson_progress.time_spent,
                'attempts_count': lesson_progress.attempts_count,
                'success_rate': lesson_progress.success_rate,
                'updated_at': lesson_progress.updated_at.isoformat(),
            }
        }, status=status.HTTP_200_OK)


class LessonCommentsView(APIView):
    """
    Комментарии к уроку.

    GET /api/lessons/{id}/comments/ - получить комментарии
    POST /api/lessons/{id}/comments/ - добавить комментарий
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        comments = Comment.objects.filter(
            lesson=lesson,
            parent__isnull=True  # Только корневые комментарии
        ).select_related('user').order_by('-created_at')

        comments_data = []
        for comment in comments:
            comment_data = {
                'id': str(comment.id),
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'email': comment.user.email,
                },
                'content': comment.content,
                'attachments': comment.attachments,
                'likes_count': comment.likes_count,
                'dislikes_count': comment.dislikes_count,
                'replies_count': comment.get_replies().count(),
                'created_at': comment.created_at.isoformat(),
                'updated_at': comment.updated_at.isoformat(),
            }

            # Добавляем информацию о лайке пользователя
            if request.user.is_authenticated:
                user_like = CommentLike.objects.filter(
                    comment=comment,
                    user=request.user
                ).first()
                comment_data['user_like'] = {
                    'is_liked': user_like.is_like if user_like else None
                } if user_like else None

            comments_data.append(comment_data)

        return Response({
            'comments': comments_data,
            'count': len(comments_data)
        }, status=status.HTTP_200_OK)

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id, is_active=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Урок не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {'error': 'Текст комментария обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parent_id = request.data.get('parent_id')
        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, lesson=lesson)
            except Comment.DoesNotExist:
                return Response(
                    {'error': 'Родительский комментарий не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

        comment = Comment.objects.create(
            user=request.user,
            lesson=lesson,
            content=content,
            parent=parent,
            attachments=request.data.get('attachments', [])
        )

        return Response({
            'message': 'Комментарий добавлен',
            'comment': {
                'id': str(comment.id),
                'content': comment.content,
                'created_at': comment.created_at.isoformat(),
            }
        }, status=status.HTTP_201_CREATED)


class CourseCommentsView(APIView):
    """
    Комментарии к курсу.

    GET /api/courses/{id}/comments/
    """

    permission_classes = [AllowAny]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        comments = Comment.objects.filter(
            course=course,
            parent__isnull=True
        ).select_related('user').order_by('-created_at')

        comments_data = []
        for comment in comments:
            comment_data = {
                'id': str(comment.id),
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'email': comment.user.email,
                },
                'content': comment.content,
                'attachments': comment.attachments,
                'likes_count': comment.likes_count,
                'dislikes_count': comment.dislikes_count,
                'replies_count': comment.get_replies().count(),
                'created_at': comment.created_at.isoformat(),
            }

            if request.user.is_authenticated:
                user_like = CommentLike.objects.filter(
                    comment=comment,
                    user=request.user
                ).first()
                comment_data['user_like'] = {
                    'is_liked': user_like.is_like if user_like else None
                } if user_like else None

            comments_data.append(comment_data)

        return Response({
            'comments': comments_data,
            'count': len(comments_data)
        }, status=status.HTTP_200_OK)


class CommentLikeView(APIView):
    """
    Лайк/дизлайк комментария.

    POST /api/comments/{id}/like/
    DELETE /api/comments/{id}/like/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        is_like = request.data.get('is_like', True)

        if is_like:
            comment.add_like(request.user)
            action = 'лайк'
        else:
            comment.add_dislike(request.user)
            action = 'дизлайк'

        return Response({
            'message': f'{action.capitalize()} добавлен',
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count,
        }, status=status.HTTP_200_OK)

    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        CommentLike.objects.filter(
            comment=comment,
            user=request.user
        ).delete()

        comment.update_rating()

        return Response({
            'message': 'Лайк удалён',
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count,
        }, status=status.HTTP_200_OK)


class CourseRatingsView(APIView):
    """
    Оценки курса.

    GET /api/courses/{id}/ratings/ - получить оценки
    POST /api/courses/{id}/ratings/ - поставить оценку
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        ratings = Rating.objects.filter(
            course=course,
            is_approved=True
        ).select_related('user', 'pet').order_by('-created_at')

        ratings_data = []
        for rating in ratings:
            rating_data = {
                'id': str(rating.id),
                'user': {
                    'id': rating.user.id,
                    'username': rating.user.username,
                },
                'rating': rating.rating,
                'review': rating.review,
                'pet_name': rating.pet.name if rating.pet else None,
                'created_at': rating.created_at.isoformat(),
            }
            ratings_data.append(rating_data)

        # Статистика рейтингов
        from django.db.models import Avg, Count
        stats = ratings.aggregate(
            avg_rating=Avg('rating'),
            total_ratings=Count('id')
        )

        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = ratings.filter(rating=i).count()

        return Response({
            'ratings': ratings_data,
            'stats': {
                'average_rating': round(stats['avg_rating'], 1) if stats['avg_rating'] else 0,
                'total_ratings': stats['total_ratings'],
                'distribution': rating_distribution,
            }
        }, status=status.HTTP_200_OK)

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка, что пользователь имеет доступ к курсу
        if not UserCourse.objects.filter(
            user=request.user,
            course=course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        rating_value = request.data.get('rating')
        if not rating_value or not isinstance(rating_value, int) or rating_value < 1 or rating_value > 5:
            return Response(
                {'error': 'Оценка должна быть целым числом от 1 до 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review_text = request.data.get('review', '').strip()
        pet_id = request.data.get('pet_id')

        # Проверка, не ставил ли уже оценку
        existing_rating = Rating.objects.filter(
            user=request.user,
            course=course,
            pet_id=pet_id
        ).first()

        if existing_rating:
            # Обновляем существующую оценку
            existing_rating.rating = rating_value
            existing_rating.review = review_text
            existing_rating.save()
            message = 'Оценка обновлена'
        else:
            # Создаем новую оценку
            pet = None
            if pet_id:
                try:
                    pet = Pet.objects.get(id=pet_id, owner=request.user)
                except Pet.DoesNotExist:
                    pass

            Rating.objects.create(
                user=request.user,
                course=course,
                rating=rating_value,
                review=review_text,
                pet=pet
            )
            message = 'Оценка добавлена'

        return Response({
            'message': message,
            'rating': rating_value,
            'review': review_text,
        }, status=status.HTTP_201_CREATED)


# ===== ВЬЮСЫ ДЛЯ КОММЕНТАРИЕВ =====

class CommentListView(APIView):
    """
    Список комментариев к курсу или уроку.

    GET /api/courses/{course_id}/comments/ - комментарии к курсу
    GET /api/lessons/{lesson_id}/comments/ - комментарии к уроку
    """
    permission_classes = [AllowAny]

    def get(self, request, course_id=None, lesson_id=None):
        if course_id:
            try:
                course = Course.objects.get(id=course_id, is_active=True)
            except Course.DoesNotExist:
                return Response(
                    {'error': 'Курс не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Получаем только корневые комментарии (без parent)
            comments = Comment.objects.filter(
                course=course,
                parent__isnull=True,
                is_moderated=True
            ).order_by('-created_at').prefetch_related('replies', 'user')

        elif lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                return Response(
                    {'error': 'Урок не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Получаем только корневые комментарии (без parent)
            comments = Comment.objects.filter(
                lesson=lesson,
                parent__isnull=True,
                is_moderated=True
            ).order_by('-created_at').prefetch_related('replies', 'user')
        else:
            return Response(
                {'error': 'Необходимо указать course_id или lesson_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Пагинация
        page = request.query_params.get('page', 1)
        per_page = min(int(request.query_params.get('per_page', 10)), 50)

        paginator = Paginator(comments, per_page)
        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)

        serializer = CommentSerializer(
            page_obj,
            many=True,
            context={'request': request}
        )

        return Response({
            'comments': serializer.data,
            'pagination': {
                'total': paginator.count,
                'page': page_obj.number,
                'per_page': per_page,
                'total_pages': paginator.num_pages,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            }
        })


class CommentCreateView(APIView):
    """
    Создание комментария к курсу или уроку.

    POST /api/courses/{course_id}/comments/ - комментарий к курсу
    POST /api/lessons/{lesson_id}/comments/ - комментарий к уроку
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id=None, lesson_id=None):
        if course_id:
            try:
                course = Course.objects.get(id=course_id, is_active=True)
            except Course.DoesNotExist:
                return Response(
                    {'error': 'Курс не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Проверяем доступ к курсу
            if not UserCourse.objects.filter(user=request.user, course=course).exists():
                return Response(
                    {'error': 'У вас нет доступа к этому курсу'},
                    status=status.HTTP_403_FORBIDDEN
                )

            data = request.data.copy()
            data['course'] = course.id

        elif lesson_id:
            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                return Response(
                    {'error': 'Урок не найден'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Проверяем доступ к уроку через курс
            if not UserCourse.objects.filter(user=request.user, course=lesson.course).exists():
                return Response(
                    {'error': 'У вас нет доступа к этому уроку'},
                    status=status.HTTP_403_FORBIDDEN
                )

            data = request.data.copy()
            data['lesson'] = lesson.id
        else:
            return Response(
                {'error': 'Необходимо указать course_id или lesson_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CommentCreateSerializer(data=data)
        if serializer.is_valid():
            comment = serializer.save(user=request.user)
            # Возвращаем созданный комментарий с дополнительной информацией
            response_serializer = CommentSerializer(
                comment,
                context={'request': request}
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommentDetailView(APIView):
    """
    Детали, редактирование и удаление комментария.

    GET /api/comments/{id}/ - детали комментария
    PUT /api/comments/{id}/ - редактирование
    DELETE /api/comments/{id}/ - удаление
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к комментарию
        if comment.course and not UserCourse.objects.filter(
            user=request.user, course=comment.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if comment.lesson and not UserCourse.objects.filter(
            user=request.user, course=comment.lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data)

    def put(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на редактирование
        if not comment.can_edit(request.user):
            return Response(
                {'error': 'У вас нет прав на редактирование этого комментария'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CommentCreateSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            updated_comment = serializer.save()
            response_serializer = CommentSerializer(
                updated_comment,
                context={'request': request}
            )
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, comment_id):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на удаление
        if not comment.can_delete(request.user):
            return Response(
                {'error': 'У вас нет прав на удаление этого комментария'},
                status=status.HTTP_403_FORBIDDEN
            )

        comment.delete()
        return Response(
            {'message': 'Комментарий удален'},
            status=status.HTTP_204_NO_CONTENT
        )


class CommentReactionView(APIView):
    """
    Добавление/удаление реакции на комментарий (лайк/дизлайк).

    POST /api/comments/{id}/like/ - лайк
    POST /api/comments/{id}/dislike/ - дизлайк
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, comment_id, action):
        try:
            comment = Comment.objects.get(id=comment_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': 'Комментарий не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к комментарию
        if comment.course and not UserCourse.objects.filter(
            user=request.user, course=comment.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        if comment.lesson and not UserCourse.objects.filter(
            user=request.user, course=comment.lesson.course
        ).exists():
            return Response(
                {'error': 'У вас нет доступа к этому комментарию'},
                status=status.HTTP_403_FORBIDDEN
            )

        is_like = action == 'like'
        created, was_like = comment.add_like(request.user, is_like)

        return Response({
            'message': 'Реакция добавлена' if created else 'Реакция обновлена',
            'action': action,
            'likes_count': comment.likes_count,
            'dislikes_count': comment.dislikes_count
        })


class CourseRatingListView(APIView):
    """
    Список оценок курса (улучшенная версия).

    GET /api/courses/{course_id}/ratings/
    """
    permission_classes = [AllowAny]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем одобренные оценки с пагинацией
        ratings = Rating.objects.filter(
            course=course,
            is_approved=True
        ).select_related('user', 'pet').order_by('-created_at')

        # Пагинация
        page = request.query_params.get('page', 1)
        per_page = min(int(request.query_params.get('per_page', 10)), 50)

        paginator = Paginator(ratings, per_page)
        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)

        serializer = RatingSerializer(
            page_obj,
            many=True,
            context={'request': request}
        )

        # Статистика оценок
        stats = Rating.objects.filter(course=course, is_approved=True).aggregate(
            avg_rating=Avg('rating'),
            total_ratings=Count('id')
        )

        # Распределение по звездам
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = Rating.objects.filter(
                course=course,
                rating=i,
                is_approved=True
            ).count()

        return Response({
            'results': serializer.data,
            'stats': {
                'average_rating': round(stats['avg_rating'], 1) if stats['avg_rating'] else 0,
                'total_ratings': stats['total_ratings'],
                'distribution': rating_distribution,
            },
            'all_user_ratings': all_user_ratings,
            'total_ratings': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'per_page': per_page
        })


class CourseRatingCreateView(APIView):
    """
    Создание оценки курса.

    POST /api/courses/{course_id}/ratings/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к курсу
        if not UserCourse.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'error': 'У вас нет доступа к этому курсу'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RatingCreateSerializer(data=request.data)
        if serializer.is_valid():
            rating = serializer.save(user=request.user, course=course)

            response_serializer = RatingSerializer(
                rating,
                context={'request': request}
            )
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RatingDetailView(APIView):
    """
    Детали, редактирование и удаление оценки.

    GET /api/ratings/{id}/ - детали оценки
    PUT /api/ratings/{id}/ - редактирование
    DELETE /api/ratings/{id}/ - удаление
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, rating_id):
        try:
            rating = Rating.objects.get(id=rating_id)
        except Rating.DoesNotExist:
            return Response(
                {'error': 'Оценка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем доступ к оценке
        if not rating.can_edit(request.user) and not request.user.is_staff:
            return Response(
                {'error': 'У вас нет доступа к этой оценке'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RatingSerializer(rating, context={'request': request})
        return Response(serializer.data)

    def put(self, request, rating_id):
        try:
            rating = Rating.objects.get(id=rating_id)
        except Rating.DoesNotExist:
            return Response(
                {'error': 'Оценка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на редактирование
        if not rating.can_edit(request.user):
            return Response(
                {'error': 'У вас нет прав на редактирование этой оценки'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = RatingCreateSerializer(rating, data=request.data, partial=True)
        if serializer.is_valid():
            updated_rating = serializer.save()
            response_serializer = RatingSerializer(
                updated_rating,
                context={'request': request}
            )
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, rating_id):
        try:
            rating = Rating.objects.get(id=rating_id)
        except Rating.DoesNotExist:
            return Response(
                {'error': 'Оценка не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем права на удаление
        if not rating.can_delete(request.user):
            return Response(
                {'error': 'У вас нет прав на удаление этой оценки'},
                status=status.HTTP_403_FORBIDDEN
            )

        rating.delete()
        return Response(
            {'message': 'Оценка удалена'},
            status=status.HTTP_204_NO_CONTENT
        )


# ===== VIEWS ДЛЯ КОНСТРУКТОРА КУРСОВ =====

class CourseBuilderView(APIView):
    """
    View для получения полной структуры курса с страницами и блоками.
    Используется в конструкторе курсов.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        """Получить структуру курса для конструктора."""
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # TODO: Добавить проверку прав доступа (админ или владелец курса)

        serializer = CourseBuilderSerializer(course)
        return Response(serializer.data)


class CoursePageViewSet(ModelViewSet):
    """
    ViewSet для управления страницами курсов.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CoursePageSerializer

    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        return CoursePage.objects.filter(course_id=course_id, is_active=True)

    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_id')
        course = get_object_or_404(Course, id=course_id)

        # TODO: Добавить проверку прав доступа

        # Автоматически устанавливаем order_number
        max_order = CoursePage.objects.filter(course=course).aggregate(
            max_order=models.Max('order_number')
        )['max_order'] or 0
        serializer.save(course=course, order_number=max_order + 1)


class ContentBlockViewSet(ModelViewSet):
    """
    ViewSet для управления блоками контента.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ContentBlockSerializer

    def get_queryset(self):
        page_id = self.kwargs.get('page_id')
        return ContentBlock.objects.filter(page_id=page_id, is_active=True)

    def perform_create(self, serializer):
        page_id = self.kwargs.get('page_id')
        page = get_object_or_404(CoursePage, id=page_id)

        # TODO: Добавить проверку прав доступа

        # Автоматически устанавливаем order
        max_order = ContentBlock.objects.filter(page=page).aggregate(
            max_order=models.Max('order')
        )['max_order'] or 0
        serializer.save(page=page, order=max_order + 1)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, page_id=None, pk=None):
        """Дублировать блок."""
        block = self.get_object()
        page = block.page

        # TODO: Добавить проверку прав доступа

        # Создаем копию блока
        max_order = ContentBlock.objects.filter(page=page).aggregate(
            max_order=models.Max('order')
        )['max_order'] or 0

        new_block = ContentBlock.objects.create(
            page=page,
            block_type=block.block_type,
            content=block.content.copy() if block.content else {},
            settings=block.settings.copy() if block.settings else {},
            order=max_order + 1
        )

        serializer = self.get_serializer(new_block)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BlockTemplateViewSet(ModelViewSet):
    """
    ViewSet для управления шаблонами блоков.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = BlockTemplateSerializer

    def get_queryset(self):
        queryset = BlockTemplate.objects.filter(is_active=True)

        # Фильтр по публичным шаблонам и шаблонам пользователя
        user = self.request.user
        queryset = queryset.filter(
            models.Q(is_public=True) | models.Q(created_by=user)
        )

        # Фильтр по типу блока
        block_type = self.request.query_params.get('block_type')
        if block_type:
            queryset = queryset.filter(block_type=block_type)

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset.order_by('-usage_count', 'name')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def use_template(self, request, pk=None):
        """Использовать шаблон для создания блока."""
        template = self.get_object()
        page_id = request.data.get('page_id')

        if not page_id:
            return Response(
                {'error': 'page_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            page = CoursePage.objects.get(id=page_id)
        except CoursePage.DoesNotExist:
            return Response(
                {'error': 'Страница не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        # TODO: Добавить проверку прав доступа

        # Создаем блок из шаблона
        block = template.create_block_from_template(page)
        serializer = ContentBlockSerializer(block)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
