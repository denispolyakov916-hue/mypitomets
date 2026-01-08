"""
Тесты для API питомцев
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.pets.models import Pet

User = get_user_model()


class PetsAPITestCase(APITestCase):
    """Тесты для эндпоинтов питомцев"""
    
    def setUp(self):
        """Создание тестовых данных"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Test123456!'
        )
        self.pet_data = {
            'name': 'Барсик',
            'species': 'dog',
            'breed': 'Лабрадор',
            'gender': 'male',
            'date_of_birth': '2020-01-15'
        }
    
    def test_create_pet_authenticated(self):
        """Тест создания питомца авторизованным пользователем"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/pets/', self.pet_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pet.objects.count(), 1)
        self.assertEqual(Pet.objects.first().owner, self.user)
    
    def test_create_pet_unauthenticated(self):
        """Тест создания питомца неавторизованным пользователем"""
        response = self.client.post('/api/pets/', self.pet_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_pets_list_authenticated(self):
        """Тест получения списка питомцев авторизованным пользователем"""
        Pet.objects.create(owner=self.user, **self.pet_data)
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/pets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_pets_list_only_own(self):
        """Тест что пользователь видит только своих питомцев"""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='Test123456!'
        )
        Pet.objects.create(owner=self.user, **self.pet_data)
        Pet.objects.create(owner=other_user, name='Чужой питомец', species='cat')
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/pets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Барсик')
    
    def test_pet_detail(self):
        """Тест получения деталей питомца"""
        pet = Pet.objects.create(owner=self.user, **self.pet_data)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/pets/{pet.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], pet.name)
    
    def test_pet_update(self):
        """Тест обновления питомца"""
        pet = Pet.objects.create(owner=self.user, **self.pet_data)
        self.client.force_authenticate(user=self.user)
        update_data = {'name': 'Новое имя', 'weight': 25}
        response = self.client.put(f'/api/pets/{pet.id}/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pet.refresh_from_db()
        self.assertEqual(pet.name, 'Новое имя')
    
    def test_pet_delete(self):
        """Тест удаления питомца"""
        pet = Pet.objects.create(owner=self.user, **self.pet_data)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/pets/{pet.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Pet.objects.count(), 0)

