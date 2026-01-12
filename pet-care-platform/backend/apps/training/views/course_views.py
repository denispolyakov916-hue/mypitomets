"""
Views для работы с каталогом курсов и покупкой.

Этот модуль содержит views для:
- Просмотра каталога курсов с фильтрацией и персонализацией
- Детального просмотра курса
- Оформления покупки курса
- Обработки платежей за курсы

Основные классы:
    - CourseListView: Каталог курсов с кэшированием и персонализацией
    - CourseDetailView: Детали курса с персонализированными рекомендациями
    - CourseCheckoutView: Страница оформления с информацией о питомцах
    - CoursePurchaseView: Обработка покупки курса через платежную систему

Используемые сервисы:
    - Course.objects.catalog(): Оптимизированный каталог с рейтингами
    - Course.objects.filter_by_pet_characteristics(): Персонализация по питомцу
    - PaymentService: Единая система платежей
"""

import logging
from django.core.cache import cache
from django.conf import settings
from django.db.models import Min, Max
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from ..models import Course, UserCourse
from apps.pets.models import Pet

logger = logging.getLogger('apps.training')


class CourseListView(APIView):
    """
    Каталог курсов.

    GET /api/courses/
    """

    permission_classes = [AllowAny]

    @staticmethod
    def _get_cache_key(request):
        """Генерация ключа кэша на основе параметров запроса."""
        from core.cache_utils import make_cache_key
        query_params = dict(request.query_params)
        # Исключаем параметры пагинации для более широкого кэширования
        query_params.pop('page', None)
        query_params.pop('per_page', None)
        return make_cache_key('courses_list', query_params)

    def get(self, request):
        from django.core.cache import cache
        from django.conf import settings

        # Проверяем кэш
        cache_key = self._get_cache_key(request)
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            # Восстанавливаем пагинацию из запроса
            try:
                page = max(1, int(request.query_params.get('page', 1)))
                per_page = min(50, max(1, int(request.query_params.get('per_page', 12))))
            except ValueError:
                page = 1
                per_page = 12

            # Применяем пагинацию к кэшированным данным
            total = cached_response.get('pagination', {}).get('total', 0)
            all_courses = cached_response.get('courses', [])

            offset = (page - 1) * per_page
            courses_page = all_courses[offset:offset + per_page]

            response_data = cached_response.copy()
            response_data['courses'] = courses_page
            response_data['pagination'] = {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
            }

            return Response(response_data, status=status.HTTP_200_OK)
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

        # Фильтр по ID курсов (для избранного)
        ids = request.query_params.get('ids')
        if ids:
            try:
                ids_list = [int(id.strip()) for id in ids.split(',') if id.strip()]
                if ids_list:
                    courses = courses.filter(id__in=ids_list)
            except ValueError:
                pass

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

        response_data = {
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
        }

        # Сохраняем в кэш (без пагинации, чтобы кэшировать все курсы)
        from django.core.cache import cache
        from django.conf import settings
        cache_timeout = getattr(settings, 'CACHE_TIMEOUTS', {}).get('courses_list', 300)
        cache.set(cache_key, response_data, cache_timeout)

        return Response(response_data, status=status.HTTP_200_OK)

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
            # Оптимизация: используем with_ratings() для предзагрузки рейтинга
            course = Course.objects.with_ratings().get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

        # Используем detailed=True для полной информации
        course_data = course.to_dict(detailed=True)
        response_data = {'course': course_data}

        # Добавляем персонализированную информацию
        pet_id = request.query_params.get('pet_id')
        if pet_id and request.user.is_authenticated:
            try:
                # Оптимизация: select_related для owner
                pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
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
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

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
