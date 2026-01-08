"""
Тесты для API курсов
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.training.models import Course

User = get_user_model()


class CoursesAPITestCase(APITestCase):
    """Тесты для эндпоинтов курсов"""
    
    def setUp(self):
        """Создание тестовых данных"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Test123456!'
        )
        self.course = Course.objects.create(
            title='Тестовый курс',
            description='Описание курса',
            price=1000,
            pet_type='dog',
            is_active=True
        )
    
    def test_courses_list_public(self):
        """Тест получения списка курсов (публичный доступ)"""
        response = self.client.get('/api/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_courses_list_filter_by_pet_type(self):
        """Тест фильтрации курсов по типу животного"""
        Course.objects.create(
            title='Курс для кошек',
            price=800,
            pet_type='cat',
            is_active=True
        )
        response = self.client.get('/api/courses/?pet_type=dog')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Все курсы должны быть для собак
        for course in response.data['results']:
            self.assertEqual(course['pet_type'], 'dog')
    
    def test_course_detail(self):
        """Тест получения деталей курса"""
        response = self.client.get(f'/api/courses/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.course.title)
        self.assertEqual(response.data['price'], str(self.course.price))
    
    def test_course_detail_not_found(self):
        """Тест получения несуществующего курса"""
        response = self.client.get('/api/courses/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_courses_list_only_active(self):
        """Тест что возвращаются только активные курсы"""
        Course.objects.create(
            title='Неактивный курс',
            price=500,
            pet_type='dog',
            is_active=False
        )
        response = self.client.get('/api/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Все курсы должны быть активными
        for course in response.data['results']:
            self.assertTrue(course['is_active'])

