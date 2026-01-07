import json
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock

from apps.analytics.models import AnalyticMetric, ChartConfig


class AnalyticMetricsAPITestCase(APITestCase):
    def setUp(self):
        """Создание тестовых данных"""
        self.user = User.objects.create_superuser(
            username='testadmin',
            email='admin@test.com',
            password='testpass123'
        )

        # Создание тестовых метрик
        self.metric1 = AnalyticMetric.objects.create(
            id='users_count',
            name='Количество пользователей',
            description='Общее количество пользователей',
            category='users',
            data_type='integer',
            aggregation_types=['count'],
            dimensions=['date'],
            sql_template="SELECT COUNT(*) FROM users_user WHERE created_at >= '{{start_date}}'"
        )

        self.metric2 = AnalyticMetric.objects.create(
            id='orders_total',
            name='Сумма заказов',
            description='Общая сумма заказов',
            category='orders',
            data_type='decimal',
            units='₽',
            aggregation_types=['sum'],
            dimensions=['date', 'category'],
            sql_template="SELECT SUM(total) FROM shop_order WHERE created_at >= '{{start_date}}'"
        )

    def test_get_metrics_list(self):
        """Тест получения списка метрик"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/admin/analytics/metrics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIn('results', data)
        self.assertEqual(len(data['results']), 2)

        # Проверка структуры ответа
        metric_data = data['results'][0]
        expected_fields = ['id', 'name', 'description', 'category', 'data_type',
                          'aggregation_types', 'dimensions', 'units', 'is_active']
        for field in expected_fields:
            self.assertIn(field, metric_data)

    def test_get_metrics_filtered_by_category(self):
        """Тест фильтрации метрик по категории"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/admin/analytics/metrics/?category=users')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['category'], 'users')

    def test_get_metrics_search(self):
        """Тест поиска метрик"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/admin/analytics/metrics/?search=пользователей')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(len(data['results']), 1)
        self.assertIn('пользователей', data['results'][0]['name'].lower())

    def test_get_single_metric(self):
        """Тест получения одной метрики"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'/admin/analytics/metrics/{self.metric1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data['id'], self.metric1.id)
        self.assertEqual(data['name'], self.metric1.name)

    def test_create_metric(self):
        """Тест создания метрики"""
        self.client.force_authenticate(user=self.user)

        new_metric_data = {
            'id': 'products_views',
            'name': 'Просмотры товаров',
            'description': 'Количество просмотров товаров',
            'category': 'products',
            'data_type': 'integer',
            'aggregation_types': ['count', 'sum'],
            'dimensions': ['date', 'product_id'],
            'sql_template': "SELECT COUNT(*) FROM products_view WHERE viewed_at >= '{{start_date}}'"
        }

        response = self.client.post('/admin/analytics/metrics/', new_metric_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Проверка создания
        metric = AnalyticMetric.objects.get(id='products_views')
        self.assertEqual(metric.name, 'Просмотры товаров')

    def test_update_metric(self):
        """Тест обновления метрики"""
        self.client.force_authenticate(user=self.user)

        update_data = {
            'name': 'Обновленное количество пользователей',
            'description': 'Обновленное описание'
        }

        response = self.client.patch(
            f'/admin/analytics/metrics/{self.metric1.id}/',
            update_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Проверка обновления
        self.metric1.refresh_from_db()
        self.assertEqual(self.metric1.name, 'Обновленное количество пользователей')

    def test_delete_metric(self):
        """Тест удаления метрики"""
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f'/admin/analytics/metrics/{self.metric1.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Проверка удаления
        with self.assertRaises(AnalyticMetric.DoesNotExist):
            AnalyticMetric.objects.get(id=self.metric1.id)

    def test_unauthorized_access(self):
        """Тест доступа без авторизации"""
        response = self.client.get('/admin/analytics/metrics/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChartDataAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='testadmin',
            email='admin@test.com',
            password='testpass123'
        )

    @patch('apps.analytics.services.AnalyticsDataService.get_chart_data')
    def test_get_chart_data_success(self, mock_get_data):
        """Тест успешного получения данных графика"""
        self.client.force_authenticate(user=self.user)

        # Mock данные
        mock_data = {
            'data': [
                {'date': '2024-01-01', 'value': 100},
                {'date': '2024-01-02', 'value': 150}
            ],
            'metadata': {
                'execution_time': 0.25,
                'cache_hit': False,
                'total_rows': 2
            }
        }
        mock_get_data.return_value = mock_data

        request_data = {
            'config': {
                'metrics': [{'id': 'users_count', 'field': 'value'}],
                'dimensions': [],
                'filters': {},
                'limit': 1000
            },
            'data_limit': 1000
        }

        response = self.client.post(
            '/admin/analytics/constructor/data/',
            request_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), mock_data)

    def test_get_chart_data_invalid_config(self):
        """Тест с невалидной конфигурацией"""
        self.client.force_authenticate(user=self.user)

        request_data = {
            'config': {},  # Пустая конфигурация
            'data_limit': 1000
        }

        response = self.client.post(
            '/admin/analytics/constructor/data/',
            request_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('apps.analytics.services.AnalyticsDataService.get_chart_data')
    def test_chart_data_service_error(self, mock_get_data):
        """Тест обработки ошибок сервиса данных"""
        self.client.force_authenticate(user=self.user)

        mock_get_data.side_effect = Exception('Database error')

        request_data = {
            'config': {
                'metrics': [{'id': 'users_count', 'field': 'value'}],
                'dimensions': [],
                'filters': {},
                'limit': 1000
            },
            'data_limit': 1000
        }

        response = self.client.post(
            '/admin/analytics/constructor/data/',
            request_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChartConfigAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username='testadmin',
            email='admin@test.com',
            password='testpass123'
        )

    def test_create_chart_config(self):
        """Тест создания конфигурации графика"""
        self.client.force_authenticate(user=self.user)

        config_data = {
            'name': 'Тестовый график',
            'description': 'Описание тестового графика',
            'config': {
                'type': 'line',
                'axes': {
                    'x': {'field': 'date', 'type': 'time'},
                    'y': [{'field': 'value', 'type': 'linear'}]
                }
            },
            'is_template': False,
            'tags': ['test', 'analytics']
        }

        response = self.client.post(
            '/admin/analytics/constructor/configs/',
            config_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Проверка создания
        config = ChartConfig.objects.get(name='Тестовый график')
        self.assertEqual(config.created_by, self.user)
        self.assertEqual(config.tags, ['test', 'analytics'])

    def test_get_chart_configs(self):
        """Тест получения списка конфигураций"""
        # Создание тестовых конфигураций
        ChartConfig.objects.create(
            name='Config 1',
            config={'type': 'line'},
            created_by=self.user
        )
        ChartConfig.objects.create(
            name='Config 2',
            config={'type': 'bar'},
            created_by=self.user,
            is_template=True
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.get('/admin/analytics/constructor/configs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(len(data['results']), 2)

    def test_get_template_configs(self):
        """Тест получения шаблонов"""
        ChartConfig.objects.create(
            name='Template 1',
            config={'type': 'line'},
            created_by=self.user,
            is_template=True
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.get('/admin/analytics/constructor/configs/?is_template=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(len(data['results']), 1)
        self.assertTrue(data['results'][0]['is_template'])

    def test_update_chart_config(self):
        """Тест обновления конфигурации"""
        config = ChartConfig.objects.create(
            name='Original Config',
            config={'type': 'line'},
            created_by=self.user
        )

        self.client.force_authenticate(user=self.user)

        update_data = {
            'name': 'Updated Config',
            'description': 'Updated description'
        }

        response = self.client.patch(
            f'/admin/analytics/constructor/configs/{config.id}/',
            update_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        config.refresh_from_db()
        self.assertEqual(config.name, 'Updated Config')

    def test_delete_chart_config(self):
        """Тест удаления конфигурации"""
        config = ChartConfig.objects.create(
            name='Config to Delete',
            config={'type': 'line'},
            created_by=self.user
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.delete(f'/admin/analytics/constructor/configs/{config.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        with self.assertRaises(ChartConfig.DoesNotExist):
            ChartConfig.objects.get(id=config.id)


class AnalyticsQueryBuilderTestCase(TestCase):
    """Тесты для Query Builder"""

    def setUp(self):
        self.metric = AnalyticMetric.objects.create(
            id='test_metric',
            name='Test Metric',
            data_type='integer',
            sql_template="SELECT COUNT(*) as value FROM users_user WHERE created_at >= '{{start_date}}' AND created_at <= '{{end_date}}'"
        )

    @patch('django.db.connection.cursor')
    def test_build_query_simple(self, mock_cursor):
        """Тест построения простого запроса"""
        from apps.analytics.services import AnalyticsQueryBuilder

        builder = AnalyticsQueryBuilder()

        config = {
            'metrics': [{
                'id': 'test_metric',
                'field': 'value',
                'aggregation': 'count'
            }],
            'filters': {
                'date_range': {
                    'start': '2024-01-01',
                    'end': '2024-01-31'
                }
            }
        }

        query, params = builder.build_query(config)

        self.assertIn('SELECT', query.upper())
        self.assertIn('COUNT(*)', query.upper())
        self.assertEqual(params['start_date'], '2024-01-01')
        self.assertEqual(params['end_date'], '2024-01-31')

    @patch('django.db.connection.cursor')
    def test_build_query_with_dimensions(self, mock_cursor):
        """Тест запроса с измерениями"""
        from apps.analytics.services import AnalyticsQueryBuilder

        builder = AnalyticsQueryBuilder()

        config = {
            'metrics': [{
                'id': 'test_metric',
                'field': 'value'
            }],
            'dimensions': ['date'],
            'filters': {}
        }

        query, params = builder.build_query(config)

        # Проверяем наличие группировки по измерениям
        self.assertIn('GROUP BY', query.upper())

    def test_query_validation(self):
        """Тест валидации запросов"""
        from apps.analytics.services import AnalyticsQueryBuilder

        builder = AnalyticsQueryBuilder()

        # Валидный конфиг
        valid_config = {
            'metrics': [{'id': 'test_metric', 'field': 'value'}],
            'dimensions': [],
            'filters': {}
        }

        is_valid, errors = builder.validate_config(valid_config)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

        # Невалидный конфиг
        invalid_config = {
            'metrics': [],
            'dimensions': [],
            'filters': {}
        }

        is_valid, errors = builder.validate_config(invalid_config)
        self.assertFalse(is_valid)
        self.assertGreater(len(errors), 0)


class AnalyticsDataServiceTestCase(TestCase):
    """Тесты для Data Service"""

    @patch('apps.analytics.services.AnalyticsQueryBuilder')
    @patch('django.db.connection.cursor')
    def test_get_chart_data_success(self, mock_cursor, mock_query_builder):
        """Тест успешного получения данных"""
        from apps.analytics.services import AnalyticsDataService

        # Mock query builder
        mock_builder_instance = MagicMock()
        mock_builder_instance.build_query.return_value = (
            "SELECT COUNT(*) as value FROM users_user",
            {}
        )
        mock_query_builder.return_value = mock_builder_instance

        # Mock cursor
        mock_cursor_instance = MagicMock()
        mock_cursor_instance.fetchall.return_value = [
            {'value': 100, 'date': '2024-01-01'}
        ]
        mock_cursor_instance.description = [('value',), ('date',)]
        mock_cursor.return_value.__enter__.return_value = mock_cursor_instance

        service = AnalyticsDataService()
        config = {
            'metrics': [{'id': 'users_count', 'field': 'value'}],
            'dimensions': [],
            'filters': {},
            'limit': 1000
        }

        result = service.get_chart_data(config)

        self.assertIn('data', result)
        self.assertIn('metadata', result)
        self.assertEqual(len(result['data']), 1)
        self.assertEqual(result['data'][0]['value'], 100)

    @patch('apps.analytics.services.AnalyticsQueryBuilder')
    @patch('django.db.connection.cursor')
    def test_get_chart_data_with_virtualization(self, mock_cursor, mock_query_builder):
        """Тест получения данных с виртуализацией"""
        from apps.analytics.services import AnalyticsDataService

        # Создаем большой датасет
        large_dataset = Array.from({length: 1500}, (_, i) => ({
            value: Math.random() * 100,
            date: `2024-01-${String(i % 30 + 1).padStart(2, '0')}`
        }));

        # Mock возврата большого датасета
        mock_builder_instance = MagicMock()
        mock_query_builder.return_value = mock_builder_instance

        mock_cursor_instance = MagicMock()
        mock_cursor_instance.fetchall.return_value = large_dataset
        mock_cursor_instance.description = [('value',), ('date',)]
        mock_cursor.return_value.__enter__.return_value = mock_cursor_instance

        service = AnalyticsDataService()
        config = {
            'metrics': [{'id': 'users_count', 'field': 'value'}],
            'dimensions': [],
            'filters': {},
            'limit': 1000
        }

        result = service.get_chart_data(config)

        # Проверяем, что данные были виртуализированы
        self.assertLessEqual(len(result['data']), 1000)
        self.assertIn('virtualized', result['metadata'])
        self.assertTrue(result['metadata']['virtualized'])