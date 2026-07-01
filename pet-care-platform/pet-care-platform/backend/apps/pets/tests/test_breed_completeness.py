"""
Регрессия на дрейф полей Pet в сервисе сравнения пород (аудит user-flow 2026-07-01).

_calculate_completeness читал `pet.gender`, которого у модели нет (поле называется
`sex`) → AttributeError/500 на живом пути views_breeds → services_breeds.

Запуск: docker compose exec -T backend python manage.py test apps.pets.tests.test_breed_completeness
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.pets.models import Pet
from apps.pets.services_breeds import PetBreedComparisonService

User = get_user_model()


class BreedCompletenessTests(TestCase):
    def test_calculate_completeness_uses_sex_not_gender(self):
        user = User.objects.create_user(email='breed@t.local')
        pet = Pet.objects.create(owner=user, name='Рекс', species='dog', sex='male', weight=10)
        # Раньше падало AttributeError('gender'); теперь возвращает процент заполненности.
        result = PetBreedComparisonService()._calculate_completeness(pet)
        self.assertIsInstance(result, int)
        self.assertGreaterEqual(result, 0)
        self.assertLessEqual(result, 100)
