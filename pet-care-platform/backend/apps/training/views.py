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
        # Базовые фильтры
        pet_type = request.query_params.get('pet_type')
        category = request.query_params.get('category')
        subcategory = request.query_params.get('subcategory')
        level = request.query_params.get('level')
        format_type = request.query_params.get('format_type')
        personal = request.query_params.get('personal')  # Персональная подборка

        # Фильтры цены
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')

        courses = Course.objects.filter(is_active=True)

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
        if category:
            courses = courses.filter(category=category)

        # Фильтрация по подкатегории
        if subcategory:
            courses = courses.filter(subcategory=subcategory)

        # Фильтрация по уровню
        if level:
            courses = courses.filter(level=level)

        # Фильтрация по формату
        if format_type:
            courses = courses.filter(format_type=format_type)

        # Фильтрация по цене
        if min_price:
            try:
                min_price_val = float(min_price)
                courses = courses.filter(price__gte=min_price_val)
            except ValueError:
                pass

        if max_price:
            try:
                max_price_val = float(max_price)
                courses = courses.filter(price__lte=max_price_val)
            except ValueError:
                pass

        courses_data = [c.to_dict() for c in courses]

        return Response({
            'courses': courses_data,
            'count': len(courses_data)
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
