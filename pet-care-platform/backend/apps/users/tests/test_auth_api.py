"""
Тесты для API аутентификации
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class AuthAPITestCase(APITestCase):
    """Тесты для эндпоинтов аутентификации"""
    
    def setUp(self):
        """Создание тестовых данных"""
        self.user_data = {
            'email': 'test@example.com',
            'password': 'Test123456!',
            'password_confirm': 'Test123456!',
            'first_name': 'Тест',
            'last_name': 'Пользователь'
        }
        
    def test_registration_success(self):
        """Тест успешной регистрации"""
        response = self.client.post('/api/auth/registration/', self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertTrue(User.objects.filter(email=self.user_data['email']).exists())
    
    def test_registration_duplicate_email(self):
        """Тест регистрации с существующим email"""
        User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        response = self.client.post('/api/auth/registration/', self.user_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_registration_password_mismatch(self):
        """Тест регистрации с несовпадающими паролями"""
        data = self.user_data.copy()
        data['password_confirm'] = 'DifferentPassword123!'
        response = self.client.post('/api/auth/registration/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_registration_weak_password(self):
        """Тест регистрации со слабым паролем"""
        data = self.user_data.copy()
        data['password'] = '123'
        data['password_confirm'] = '123'
        response = self.client.post('/api/auth/registration/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_success(self):
        """Тест успешного входа"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        user.is_activated = True
        user.save()
        
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post('/api/auth/login/', login_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_login_invalid_credentials(self):
        """Тест входа с неверными учетными данными"""
        login_data = {
            'email': 'wrong@example.com',
            'password': 'WrongPassword123!'
        }
        response = self.client.post('/api/auth/login/', login_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_login_inactive_user(self):
        """Тест входа неактивированного пользователя"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        user.is_activated = False
        user.save()
        
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        response = self.client.post('/api/auth/login/', login_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout_authenticated(self):
        """Тест выхода авторизованного пользователя"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        self.client.force_authenticate(user=user)
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_refresh_token(self):
        """Тест обновления токена"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        user.is_activated = True
        user.save()
        
        # Получаем refresh токен через вход
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        login_response = self.client.post('/api/auth/login/', login_data)
        refresh_token = login_response.cookies.get('refresh_token')
        
        if refresh_token:
            self.client.cookies['refresh_token'] = refresh_token.value
            response = self.client.get('/api/auth/refresh/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('access', response.data)

