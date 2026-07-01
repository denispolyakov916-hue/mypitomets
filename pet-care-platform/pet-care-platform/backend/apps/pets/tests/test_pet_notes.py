"""
Единый подход к необязательным NOT NULL текст-полям питомца (аудит user-flow 2026-07-01).

Колонки pets.vet_notes и pets.chronic_conditions_notes — NOT NULL. Сериализатор
принимает клиентский null и приводит его к '' (а не роняет IntegrityError).

Запуск: docker compose exec -T backend python manage.py test apps.pets.tests.test_pet_notes
"""

from django.test import TestCase

from apps.pets.serializers import PetUpdateSerializer


class PetNotesCoercionTests(TestCase):
    def test_null_notes_coerced_to_empty_string(self):
        s = PetUpdateSerializer()
        self.assertEqual(s.validate_vet_notes(None), '')
        self.assertEqual(s.validate_chronic_conditions_notes(None), '')

    def test_nonempty_notes_preserved(self):
        s = PetUpdateSerializer()
        self.assertEqual(s.validate_vet_notes('осмотр'), 'осмотр')
        self.assertEqual(s.validate_chronic_conditions_notes('аллергия'), 'аллергия')
