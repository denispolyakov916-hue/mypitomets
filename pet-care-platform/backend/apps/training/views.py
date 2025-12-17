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

logger = logging.getLogger('apps.training')


class CourseListView(APIView):
    """
    Каталог курсов.
    
    GET /api/courses/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        pet_type = request.query_params.get('pet_type')
        
        courses = Course.objects.filter(is_active=True)
        
        if pet_type and pet_type in ['dog', 'cat', 'all']:
            courses = courses.filter(pet_type__in=[pet_type, 'all'])
        
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
        
        response_data = {'course': course.to_dict()}
        
        # Проверка владения для авторизованных пользователей
        if request.user.is_authenticated:
            response_data['is_owned'] = UserCourse.objects.filter(
                user=request.user,
                course=course
            ).exists()
        
        return Response(response_data, status=status.HTTP_200_OK)


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
        
        # Имитация оплаты для платных курсов
        if course.price > 0:
            logger.info(
                f"Имитация оплаты: user={request.user.email}, "
                f"course={course_id}, сумма={course.price}"
            )
        
        # Запись о покупке
        UserCourse.objects.create(user=request.user, course=course)
        
        action = 'приобретён' if course.price > 0 else 'добавлен'
        logger.info(f"Курс {action}: user={request.user.email}, course={course_id}")
        
        return Response({
            'message': f'Курс успешно {action}',
            'course': course.to_dict()
        }, status=status.HTTP_200_OK)


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
