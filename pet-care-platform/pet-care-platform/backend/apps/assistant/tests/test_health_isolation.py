"""
Тест изоляции владельца для способности «Здоровье» (требует БД → TestCase).

Гарантия: запрос про чужого (или несуществующего) питомца возвращает 404 и
никогда — данные другого пользователя.
"""

import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.assistant.services import health_service
from core.exceptions import ApiError

User = get_user_model()


@override_settings(ASSISTANT_LLM_BACKEND='stub')
class HealthOwnerIsolationTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email='a@example.com', password='pass12345')
        self.user_b = User.objects.create_user(email='b@example.com', password='pass12345')

    def test_unknown_pet_returns_404(self):
        with self.assertRaises(ApiError) as ctx:
            health_service.build(self.user_a, 'болеет?', uuid.uuid4())
        self.assertEqual(ctx.exception.status_code, 404)

    def test_other_users_pet_returns_404(self):
        from apps.pets.models import Pet
        pet_b = Pet.objects.create(owner=self.user_b, name='Барсик', species='cat')
        with self.assertRaises(ApiError) as ctx:
            health_service.build(self.user_a, 'как он?', pet_b.id)
        self.assertEqual(ctx.exception.status_code, 404)
