"""Тесты для сериализаторов users."""

from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.users.serializers import (
    UserShortSerializer,
    UserFullSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()


class UserShortSerializerTest(TestCase):
    """Тесты для UserShortSerializer (замена User.to_dict())."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Test123!@#',
            is_activated=True,
        )

    def test_serializes_required_fields(self):
        data = UserShortSerializer(self.user).data
        self.assertEqual(data['email'], 'test@example.com')
        self.assertIn('id', data)
        self.assertIn('role', data)
        self.assertIn('isActivated', data)
        self.assertTrue(data['isActivated'])

    def test_does_not_expose_password(self):
        data = UserShortSerializer(self.user).data
        self.assertNotIn('password', data)


class UserFullSerializerTest(TestCase):
    """Тесты для UserFullSerializer (замена User.to_dict_full())."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='full@example.com',
            password='Test123!@#',
            first_name='Иван',
            last_name='Иванов',
            city='Москва',
        )

    def test_serializes_profile_fields(self):
        data = UserFullSerializer(self.user).data
        self.assertEqual(data['first_name'], 'Иван')
        self.assertEqual(data['last_name'], 'Иванов')
        self.assertEqual(data['city'], 'Москва')
        self.assertIn('email_notifications', data)
        self.assertIn('created_at', data)

    def test_avatar_is_none_when_empty(self):
        data = UserFullSerializer(self.user).data
        self.assertIsNone(data['avatar'])


class UserProfileUpdateSerializerTest(TestCase):
    """Тесты для UserProfileUpdateSerializer."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='update@example.com',
            password='Test123!@#',
        )

    def test_valid_update(self):
        serializer = UserProfileUpdateSerializer(
            data={'first_name': 'Пётр', 'city': 'СПб'},
            context={'user': self.user},
        )
        self.assertTrue(serializer.is_valid())

    def test_duplicate_email_rejected(self):
        User.objects.create_user(email='other@example.com', password='Test123!@#')
        serializer = UserProfileUpdateSerializer(
            data={'email': 'other@example.com'},
            context={'user': self.user},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)

    def test_same_email_accepted(self):
        serializer = UserProfileUpdateSerializer(
            data={'email': 'update@example.com'},
            context={'user': self.user},
        )
        self.assertTrue(serializer.is_valid())


class PasswordValidationTest(TestCase):
    """Проверка, что валидация пароля работает одинаково в обоих сериализаторах."""

    def test_registration_rejects_weak_password(self):
        data = {
            'email': 'new@example.com',
            'password': '123',
            'password_confirm': '123',
        }
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)

    def test_password_reset_rejects_weak_password(self):
        data = {
            'email': 'new@example.com',
            'code': '123456',
            'new_password': '123',
            'new_password_confirm': '123',
        }
        serializer = PasswordResetConfirmSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('new_password', serializer.errors)
