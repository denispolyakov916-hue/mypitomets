"""
Views для модуля обучения (Курсы)

API для каталога курсов и покупки.
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import Course, UserCourse
from apps.pets.models import Pet

logger = logging.getLogger('apps.training')


class CourseListView(APIView):
    """
    Каталог курсов.
    
    GET /api/courses/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.db.models import Count, Min, Max
        
        # Базовый queryset - активные курсы
        courses = Course.objects.filter(is_active=True)
        
        # Фильтр по питомцу (персональная подборка)
        pet_id = request.query_params.get('pet_id')
        pet_type = request.query_params.get('pet_type')
        personal = request.query_params.get('personal')
        
        # Если указан pet_id, получаем вид питомца
        if pet_id and request.user.is_authenticated:
            try:
                pet = Pet.objects.get(id=pet_id, owner=request.user)
                species_to_pet_type = {
                    'dog': 'dog',
                    'cat': 'cat',
                }
                if pet.species in species_to_pet_type:
                    pet_type = species_to_pet_type[pet.species]
            except Exception:
                pass
        
        # Персональная подборка по питомцам пользователя
        if personal == 'true':
            if request.user.is_authenticated:
                user_pets = Pet.objects.filter(owner=request.user)
                if user_pets.exists():
                    # Собираем все виды животных пользователя
                    user_species = set()
                    for pet in user_pets:
                        if pet.species in ['dog', 'cat']:
                            user_species.add(pet.species)

                    if user_species:
                        # Показываем курсы для видов животных пользователя + универсальные
                        courses = courses.filter(pet_type__in=list(user_species) + ['all'])
                    else:
                        # Если у пользователя нет собак/кошек, показываем универсальные курсы
                        courses = courses.filter(pet_type='all')
                else:
                    # Если у пользователя нет питомцев, показываем универсальные курсы
                    courses = courses.filter(pet_type='all')
            else:
                # Для неавторизованных пользователей показываем универсальные курсы
                courses = courses.filter(pet_type='all')
        else:
            # Стандартная фильтрация по типу животного
            if pet_type and pet_type in ['dog', 'cat', 'all']:
                if pet_type == 'all':
                    # Для фильтра "Для всех" показываем ВСЕ курсы
                    pass  # не фильтруем, показываем все
                else:
                    # Для конкретных типов показываем курсы этого типа + универсальные
                    courses = courses.filter(pet_type__in=[pet_type, 'all'])

        # Фильтрация по категории
        category = request.query_params.get('category')
        if category:
            courses = courses.filter(category=category)

        # Фильтрация по подкатегории
        subcategory = request.query_params.get('subcategory')
        if subcategory:
            courses = courses.filter(subcategory=subcategory)

        # Фильтрация по уровню
        level = request.query_params.get('level')
        if level:
            courses = courses.filter(level=level)

        # Фильтрация по формату
        format_type = request.query_params.get('format_type')
        if format_type:
            courses = courses.filter(format_type=format_type)
        
        # Фильтр по типу цены
        price_type = request.query_params.get('price_type')
        if price_type == 'free':
            courses = courses.filter(price=0)
        elif price_type == 'paid':
            courses = courses.filter(price__gt=0)

        # Фильтрация по цене
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        if min_price:
            try:
                courses = courses.filter(price__gte=float(min_price))
            except ValueError:
                pass
        if max_price:
            try:
                courses = courses.filter(price__lte=float(max_price))
            except ValueError:
                pass
        
        # Поиск по названию
        search = request.query_params.get('search')
        if search:
            courses = courses.filter(title__icontains=search)
        
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
        response_data = {'course': course.to_dict(detailed=True)}
        
        # Проверка владения для авторизованных пользователей
        if request.user.is_authenticated:
            response_data['is_owned'] = UserCourse.objects.filter(
                user=request.user,
                course=course
            ).exists()
        
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
        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Курс не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Проверка, не куплен ли уже
        if UserCourse.objects.filter(user=request.user, course=course).exists():
            return Response(
                {'error': 'Вы уже приобрели этот курс'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверка согласия с дисклеймером (требуется только для платных курсов)
        if course.price > 0:
            disclaimer_accepted = request.data.get('disclaimer_accepted', False)
            if not disclaimer_accepted:
                return Response(
                    {'error': 'Необходимо согласиться с условиями использования'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Оплата через единую систему платежей
        payment = None
        if course.price > 0:
            from apps.payments.services import PaymentService

            try:
                payment = PaymentService.create_payment(
                    user=request.user,
                    payment_type='course',
                    object_id=str(course.id),
                    amount=course.price,
                    payment_method='card',  # Можно передать в request.data
                    metadata={'course_id': str(course.id)}
                )

                # Обработка платежа (имитация)
                success = PaymentService.process_payment(payment)
                if not success:
                    return Response(
                        {'error': 'Не удалось обработать платеж'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

                logger.info(f"Оплата курса: user={request.user.email}, course={course_id}, сумма={course.price}")

            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Запись о покупке
        UserCourse.objects.create(user=request.user, course=course)

        action = 'приобретён' if course.price > 0 else 'добавлен'
        logger.info(f"Курс {action}: user={request.user.email}, course={course_id}")

        response_data = {
            'message': f'Курс успешно {action}',
            'course': course.to_dict()
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
        ).select_related('course')
        
        courses_data = [uc.to_dict() for uc in user_courses]
        
        return Response({
            'courses': courses_data,
            'count': len(courses_data)
        }, status=status.HTTP_200_OK)
