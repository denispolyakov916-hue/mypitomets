"""
Тесты для Admin API
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.shop.models import Product, Order
from apps.training.models import Course
from apps.pets.models import Pet

User = get_user_model()


class AdminAPITestCase(APITestCase):
    """Тесты для эндпоинтов админ API"""
    
    def setUp(self):
        """Создание тестовых данных"""
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='Admin123456!'
        )
        self.regular_user = User.objects.create_user(
            email='user@example.com',
            password='User123456!'
        )
    
    def test_admin_stats_requires_staff(self):
        """Тест что статистика доступна только для staff"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_stats_success(self):
        """Тест получения статистики администратором"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('users_count', response.data)
        self.assertIn('orders_count', response.data)
        self.assertIn('products_count', response.data)
        self.assertIn('courses_count', response.data)
    
    def test_admin_users_list(self):
        """Тест получения списка пользователей"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_admin_products_list(self):
        """Тест получения списка товаров"""
        Product.objects.create(name='Товар', price=1000, animal='dog')
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_admin_orders_list(self):
        """Тест получения списка заказов"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_admin_courses_list(self):
        """Тест получения списка курсов"""
        Course.objects.create(title='Курс', price=1000, pet_type='dog')
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

