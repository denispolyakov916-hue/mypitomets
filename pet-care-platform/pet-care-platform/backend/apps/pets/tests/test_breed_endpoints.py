"""
Тесты публичных эндпоинтов справочника пород (breeds).

Покрывают:
- GET /api/pets/breeds/?species=dog → 200, породы присутствуют;
- GET /api/pets/breeds/<int id>/ → 200;
- GET /api/pets/breeds/by-slug/<slug>/ → 200;
- GET /api/pets/breeds/<int id>/suggestions/ → 200 со стабильными ключами.

Запуск:
    .venv/bin/python manage.py test apps.pets.tests.test_breed_endpoints -v2

Эндпоинты пород имеют permission_classes=[AllowAny], аутентификация не нужна.
Тестовая БД пустая: породы создаём в setUpTestData.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.pets.breed_models import Breed, BreedHealth


class BreedEndpointTests(APITestCase):
    """Тесты справочника пород (без аутентификации)."""

    @classmethod
    def setUpTestData(cls):
        cls.dog_breed = Breed.objects.create(
            species='dog',
            name='Лабрадор Ретривер',
            name_en='Labrador Retriever',
            size_category='large',
            coat_type='short',
            base_activity_level='high',
            trainability='high',
            grooming_needs='moderate',
            short_description='Дружелюбная и активная порода.',
            weight_male_min=29,
            weight_male_max=36,
            weight_female_min=25,
            weight_female_max=32,
        )
        cls.cat_breed = Breed.objects.create(
            species='cat',
            name='Мейн-Кун',
            name_en='Maine Coon',
            size_category='large',
            coat_type='long',
            base_activity_level='moderate',
            trainability='moderate',
            grooming_needs='high',
            weight_male_min=6,
            weight_male_max=9,
            weight_female_min=4,
            weight_female_max=6,
        )
        # Риск здоровья для проверки health_warnings в подсказках.
        BreedHealth.objects.create(
            breed=cls.dog_breed,
            condition_name='Дисплазия тазобедренного сустава',
            condition_type='genetic',
            affected_system='musculoskeletal',
            severity='high',
            prevalence_percent=12.5,
            prevention='Контроль веса',
            screening='Рентген',
        )

    # --- Список пород с фильтром по виду ---------------------------------

    def test_breed_list_filtered_by_species_returns_200(self):
        url = reverse('breed-list')
        resp = self.client.get(url, {'species': 'dog'})

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertIn('breeds', resp.data)
        self.assertGreaterEqual(resp.data['count'], 1)
        names = [b['name'] for b in resp.data['breeds']]
        self.assertIn('Лабрадор Ретривер', names)
        # Кошачьих пород в выдаче для species=dog быть не должно.
        self.assertNotIn('Мейн-Кун', names)

    # --- Детали породы по ID ---------------------------------------------

    def test_breed_detail_by_id_returns_200(self):
        url = reverse('breed-detail', kwargs={'breed_id': self.dog_breed.id})
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['id'], self.dog_breed.id)
        self.assertEqual(resp.data['name'], 'Лабрадор Ретривер')
        self.assertEqual(resp.data['species'], 'dog')

    # --- Порода по slug --------------------------------------------------

    def test_breed_detail_by_slug_returns_200(self):
        # slug автогенерируется в Breed.save() как "{species}-{slugify(name_en)}".
        slug = self.dog_breed.slug
        self.assertTrue(slug)
        url = reverse('breed-by-slug', kwargs={'slug': slug})
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['id'], self.dog_breed.id)
        self.assertEqual(resp.data['slug'], slug)

    # --- Подсказки для автозаполнения ------------------------------------

    def test_breed_suggestions_returns_200_with_stable_keys(self):
        url = reverse('breed-suggestions', kwargs={'breed_id': self.dog_breed.id})
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        # Стабильные ключи верхнего уровня.
        for key in ('breed_id', 'breed_name', 'species', 'suggestions'):
            self.assertIn(key, resp.data)
        self.assertEqual(resp.data['breed_id'], str(self.dog_breed.id))
        self.assertEqual(resp.data['breed_name'], 'Лабрадор Ретривер')
        self.assertEqual(resp.data['species'], 'dog')
        self.assertIsInstance(resp.data['suggestions'], dict)
        # Подсказки содержат ожидаемые поля автозаполнения.
        self.assertIn('activity_level', resp.data['suggestions'])
        self.assertIn('size', resp.data['suggestions'])

    def test_breed_suggestions_unknown_breed_returns_404(self):
        url = reverse('breed-suggestions', kwargs={'breed_id': 999999})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND, resp.data)
