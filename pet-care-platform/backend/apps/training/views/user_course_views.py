"""
Views для управления курсами пользователя.

Этот модуль содержит views для:
- Просмотра купленных курсов пользователя
- Записи на бесплатные курсы без оформления заказа

Основные классы:
    - UserCoursesView: Список курсов пользователя с фильтрацией по питомцу
    - FreeCourseEnrollView: Прямая запись на бесплатные курсы

Особенности:
    - Поддержка персонализации по питомцам
    - Валидация соответствия типа курса и вида питомца
    - Согласие с условиями использования для бесплатных курсов
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import Course, UserCourse
from apps.pets.models import Pet

logger = logging.getLogger('apps.training')


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
                # Оптимизация: select_related для owner
                pet = Pet.objects.select_related('owner').get(id=pet_id, owner=request.user)
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
            from core.exceptions import ApiError
            raise ApiError.not_found('Курс не найден', error_code='COURSE_NOT_FOUND')

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
