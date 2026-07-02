"""
Доступ к калькулятору калорийности по pet_id (аудит user-flow, ревью 2026-07-02).

/api/v1/nutrition/calculate/ публичный для ручного ввода, но по pet_id раньше брал
питомца без проверки владельца (IDOR) и падал на несуществующем поле pet.calculated_size.
Теперь: по pet_id обязательна авторизация + выборка (id, owner); ручной ввод анониму доступен.

Запуск: docker compose exec -T backend python manage.py test apps.pets.tests.test_nutrition_calculate
"""

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.pets.models import Pet

User = get_user_model()
URL = '/api/v1/nutrition/calculate/'


@override_settings(SECURE_SSL_REDIRECT=False)
class NutritionCalculateAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(email='nutowner@t.local')
        cls.other = User.objects.create_user(email='nutother@t.local')
        cls.pet = Pet.objects.create(owner=cls.owner, name='Рекс', species='dog', weight=10)

    def test_anonymous_with_pet_id_denied(self):
        r = self.client.post(URL, {'pet_id': str(self.pet.id)}, format='json')
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED, getattr(r, 'data', None))

    def test_foreign_pet_not_found(self):
        self.client.force_authenticate(self.other)
        r = self.client.post(URL, {'pet_id': str(self.pet.id)}, format='json')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND, getattr(r, 'data', None))

    def test_owner_pet_ok(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post(URL, {'pet_id': str(self.pet.id)}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK, getattr(r, 'data', None))

    def test_anonymous_manual_input_ok(self):
        # Публичный калькулятор без pet_id по-прежнему доступен анониму.
        r = self.client.post(URL, {'species': 'dog', 'weight_kg': '10.0', 'age_months': 24}, format='json')
        self.assertEqual(r.status_code, status.HTTP_200_OK, getattr(r, 'data', None))
