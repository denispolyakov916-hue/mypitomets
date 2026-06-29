"""
Тесты харднинга создания/редактирования питомца (PetID).

Покрывают недавно реализованный контракт POST /api/pets/:
- требуется аутентификация (IsAuthenticated → 401 для анонима);
- known breed → 201, breed проставлен;
- is_mixed_breed=true → 201, breed_display_name по виду, breed=None;
- порода чужого вида → 400 с ошибкой по полю 'breed';
- невалидный вес → 400;
- будущая дата рождения → 400;
- E2E-смоук: создание + GET, проверка персистентности в БД.

Запуск:
    .venv/bin/python manage.py test apps.pets.tests.test_pet_hardening -v2

Тестовая БД пустая: всех User/Breed создаём в setUp/setUpTestData.
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.pets.models import Pet
from apps.pets.breed_models import Breed

User = get_user_model()


def make_breed(species='dog', name='Лабрадор Ретривер', **overrides):
    """Создать породу нужного вида с разумными дефолтами для веса."""
    defaults = dict(
        species=species,
        name=name,
        size_category='large' if species == 'dog' else 'medium',
        coat_type='short',
        base_activity_level='high',
        trainability='high',
        grooming_needs='moderate',
        weight_male_min=25,
        weight_male_max=36,
        weight_female_min=22,
        weight_female_max=32,
    )
    defaults.update(overrides)
    return Breed.objects.create(**defaults)


class PetCreateHardeningTests(APITestCase):
    """Тесты POST /api/pets/ — создание питомца."""

    @classmethod
    def setUpTestData(cls):
        # Пароль не используется (аутентификация в тестах через force_authenticate),
        # держим короткий плейсхолдер, чтобы не цеплять секрет-сканер прекоммита.
        cls.user = User.objects.create_user(
            email='owner@example.com',
            password='pw-test',
        )
        # Породы обоих видов для проверок соответствия вида.
        cls.dog_breed = make_breed(species='dog', name='Лабрадор Ретривер')
        cls.cat_breed = make_breed(
            species='cat',
            name='Мейн-Кун',
            size_category='large',
            coat_type='long',
            weight_male_min=6,
            weight_male_max=9,
            weight_female_min=4,
            weight_female_max=6,
        )

    def setUp(self):
        self.url = reverse('pet-list-create')
        self.client.force_authenticate(user=self.user)

    def base_payload(self, **overrides):
        payload = {
            'name': 'Рекс',
            'species': 'dog',
            'date_of_birth': '2022-01-01',
            'sex': 'male',
            'weight_kg': 30,
            'is_neutered': False,
        }
        payload.update(overrides)
        return payload

    # --- 1. Создание с известной породой ---------------------------------

    def test_create_with_known_breed_returns_201_and_sets_breed(self):
        payload = self.base_payload(breed_id=self.dog_breed.id)
        resp = self.client.post(self.url, payload, format='json')

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        pet_id = resp.data['data']['id']
        pet = Pet.objects.get(id=pet_id)
        self.assertEqual(pet.breed_id, self.dog_breed.id)
        self.assertEqual(resp.data['data']['breed_id'], self.dog_breed.id)
        self.assertEqual(resp.data['data']['breed_name'], self.dog_breed.name)
        self.assertFalse(pet.is_mixed_breed)

    # --- 2. Метис / беспородный ------------------------------------------

    def test_create_mixed_breed_dog_returns_201_and_display_name(self):
        payload = self.base_payload(is_mixed_breed=True)
        # breed не передаём вовсе
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        pet_id = resp.data['data']['id']
        detail_url = reverse('pet-detail', kwargs={'pet_id': pet_id})
        get_resp = self.client.get(detail_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK, get_resp.data)

        body = get_resp.data['data']
        self.assertTrue(body['is_mixed_breed'])
        self.assertEqual(body['breed_display_name'], 'Дворняга / Метис')
        self.assertIsNone(body['breed_id'])

        pet = Pet.objects.get(id=pet_id)
        self.assertIsNone(pet.breed)
        self.assertTrue(pet.is_mixed_breed)

    def test_create_mixed_breed_cat_returns_201_and_display_name(self):
        payload = self.base_payload(
            name='Мурка',
            species='cat',
            sex='female',
            weight_kg=4,
            is_mixed_breed=True,
        )
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        pet_id = resp.data['data']['id']
        detail_url = reverse('pet-detail', kwargs={'pet_id': pet_id})
        get_resp = self.client.get(detail_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK, get_resp.data)

        body = get_resp.data['data']
        self.assertTrue(body['is_mixed_breed'])
        self.assertEqual(body['breed_display_name'], 'Беспородная / Метис')
        self.assertIsNone(body['breed_id'])

    # --- 3. Порода чужого вида -------------------------------------------

    def test_create_with_species_mismatched_breed_returns_400(self):
        # Питомец — собака, а порода кошачья.
        payload = self.base_payload(species='dog', breed_id=self.cat_breed.id)
        resp = self.client.post(self.url, payload, format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, resp.data)
        # Ошибка должна ссылаться на поле 'breed'.
        body = str(resp.data).lower()
        self.assertIn('breed', body)
        # Питомец не должен быть создан.
        self.assertFalse(Pet.objects.filter(name='Рекс').exists())

    # --- 4. Невалидный вес -----------------------------------------------

    def test_create_with_zero_weight_returns_400(self):
        payload = self.base_payload(weight_kg=0)
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, resp.data)

    def test_create_with_out_of_range_weight_returns_400(self):
        payload = self.base_payload(weight_kg=500)
        resp = self.client.post(self.url, payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, resp.data)

    # --- 5. Будущая дата рождения ----------------------------------------

    def test_create_with_future_dob_returns_400(self):
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        payload = self.base_payload(date_of_birth=tomorrow)
        resp = self.client.post(self.url, payload, format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, resp.data)
        self.assertIn('date_of_birth', str(resp.data).lower())
        self.assertFalse(Pet.objects.filter(name='Рекс').exists())

    # --- 6. Аноним -------------------------------------------------------

    def test_unauthenticated_post_returns_401_not_500(self):
        self.client.force_authenticate(user=None)
        payload = self.base_payload(breed_id=self.dog_breed.id)
        resp = self.client.post(self.url, payload, format='json')

        self.assertEqual(
            resp.status_code,
            status.HTTP_401_UNAUTHORIZED,
            f'Ожидался 401, получен {resp.status_code}: {resp.data}',
        )
        self.assertNotEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class PetCreateE2ESmokeTests(APITestCase):
    """E2E-смоук: полный цикл создания и чтения питомца (чистая БД)."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email='smoke@example.com',
            password='pw-test',  # не используется (force_authenticate); короткий — мимо секрет-сканера
        )
        cls.breed = make_breed(species='dog', name='Бигль', size_category='small')

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_full_create_then_get_persists_fields(self):
        create_url = reverse('pet-list-create')
        payload = {
            'name': 'Бим',
            'species': 'dog',
            'date_of_birth': '2021-06-15',
            'sex': 'male',
            'weight_kg': 12.5,
            'is_neutered': True,
            'breed_id': self.breed.id,
        }
        create_resp = self.client.post(create_url, payload, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED, create_resp.data)
        pet_id = create_resp.data['data']['id']

        # Проверка персистентности напрямую в БД.
        pet = Pet.objects.get(id=pet_id)
        self.assertEqual(pet.name, 'Бим')
        self.assertEqual(pet.species, 'dog')
        self.assertEqual(pet.sex, 'male')
        self.assertTrue(pet.is_neutered)
        self.assertEqual(pet.breed_id, self.breed.id)
        self.assertEqual(pet.date_of_birth, date(2021, 6, 15))
        self.assertEqual(float(pet.weight), 12.5)
        self.assertEqual(pet.owner_id, self.user.id)

        # Проверка через GET API.
        detail_url = reverse('pet-detail', kwargs={'pet_id': pet_id})
        get_resp = self.client.get(detail_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK, get_resp.data)
        data = get_resp.data['data']
        self.assertEqual(data['name'], 'Бим')
        self.assertEqual(data['species'], 'dog')
        self.assertEqual(data['sex'], 'male')
        self.assertTrue(data['is_neutered'])
        self.assertEqual(data['breed_id'], self.breed.id)
        self.assertEqual(data['date_of_birth'], '2021-06-15')
        self.assertEqual(float(data['weight_kg']), 12.5)
        self.assertEqual(data['breed_display_name'], self.breed.name)

        # Никаких сторонних питомцев в чистой БД.
        self.assertEqual(Pet.objects.count(), 1)
