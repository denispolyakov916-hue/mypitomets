"""Тесты для базовых сервисов core."""

from django.test import TestCase

from core.services import ServiceResult, BaseCRUDService, BaseService


class ServiceResultTest(TestCase):
    """Тесты для ServiceResult."""

    def test_success_result(self):
        result = ServiceResult(success=True, data={'id': 1}, message='ok')
        self.assertTrue(result)
        self.assertTrue(result.success)
        self.assertEqual(result.data, {'id': 1})

    def test_failure_result(self):
        result = ServiceResult(
            success=False,
            message='Ошибка',
            errors=['поле обязательно'],
            error_code='VALIDATION_ERROR',
        )
        self.assertFalse(result)
        self.assertEqual(result.error_code, 'VALIDATION_ERROR')
        self.assertEqual(len(result.errors), 1)

    def test_to_dict_success(self):
        result = ServiceResult(success=True, data='data', message='ok')
        d = result.to_dict()
        self.assertTrue(d['success'])
        self.assertEqual(d['data'], 'data')
        self.assertNotIn('errors', d)

    def test_to_dict_failure(self):
        result = ServiceResult(
            success=False,
            message='err',
            errors=['e1'],
            error_code='ERR',
        )
        d = result.to_dict()
        self.assertFalse(d['success'])
        self.assertIn('errors', d)
        self.assertEqual(d['error_code'], 'ERR')

    def test_repr(self):
        result = ServiceResult(success=True, message='test')
        self.assertIn('success=True', repr(result))


class BaseServiceTest(TestCase):
    """Тесты для BaseService."""

    def test_validate_required_fields_success(self):
        data = {'name': 'test', 'age': 5}
        self.assertTrue(BaseService.validate_required_fields(data, ['name', 'age']))

    def test_validate_required_fields_missing(self):
        data = {'name': 'test'}
        with self.assertRaises(ValueError):
            BaseService.validate_required_fields(data, ['name', 'age'])

    def test_safe_get(self):
        data = {'key': 'value'}
        self.assertEqual(BaseService.safe_get(data, 'key'), 'value')
        self.assertIsNone(BaseService.safe_get(data, 'missing'))
        self.assertEqual(BaseService.safe_get(data, 'missing', 'default'), 'default')
