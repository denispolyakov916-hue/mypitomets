"""
Тесты для API товаров
"""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.shop.models import Product, Category

User = get_user_model()


class ProductsAPITestCase(APITestCase):
    """Тесты для эндпоинтов товаров"""
    
    def setUp(self):
        """Создание тестовых данных"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Test123456!'
        )
        self.category = Category.objects.create(name='Корм')
        self.product = Product.objects.create(
            name='Тестовый корм',
            price=1000,
            animal='dog',
            category=self.category,
            in_stock=True,
            stock_count=10
        )
    
    def test_products_list_public(self):
        """Тест получения списка товаров (публичный доступ)"""
        response = self.client.get('/api/shop/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
    
    def test_products_list_filter_by_animal(self):
        """Тест фильтрации товаров по типу животного"""
        Product.objects.create(
            name='Корм для кошек',
            price=800,
            animal='cat',
            category=self.category,
            in_stock=True
        )
        response = self.client.get('/api/shop/products/?animal=dog')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Все товары должны быть для собак
        for product in response.data['results']:
            self.assertEqual(product['animal'], 'dog')
    
    def test_product_detail(self):
        """Тест получения деталей товара"""
        response = self.client.get(f'/api/shop/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.product.name)
        self.assertEqual(response.data['price'], str(self.product.price))
    
    def test_product_detail_not_found(self):
        """Тест получения несуществующего товара"""
        response = self.client.get('/api/shop/products/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_products_list_pagination(self):
        """Тест пагинации списка товаров"""
        # Создаем больше товаров для пагинации
        for i in range(25):
            Product.objects.create(
                name=f'Товар {i}',
                price=1000 + i,
                animal='dog',
                category=self.category,
                in_stock=True
            )
        
        response = self.client.get('/api/shop/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)

