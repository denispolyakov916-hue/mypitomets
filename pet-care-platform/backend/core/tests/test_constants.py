"""Тесты для модуля констант."""

from decimal import Decimal
from django.test import TestCase

from core.constants import (
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
    ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX,
    REFRESH_TOKEN_COOKIE_MAX_AGE,
    MAX_PETS_PER_USER,
    RESERVATION_TIMEOUT_MINUTES,
    DELIVERY_COSTS,
    UserRole, OrderStatus,
    SIZE_THRESHOLDS,
    COURSE_TIME_MULTIPLIERS,
)


class ConstantsTest(TestCase):
    """Проверка корректности констант."""

    def test_pagination_constants(self):
        self.assertGreater(DEFAULT_PAGE_SIZE, 0)
        self.assertGreater(MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE)

    def test_activation_code_range(self):
        self.assertEqual(len(str(ACTIVATION_CODE_MIN)), 6)
        self.assertEqual(len(str(ACTIVATION_CODE_MAX)), 6)
        self.assertLess(ACTIVATION_CODE_MIN, ACTIVATION_CODE_MAX)

    def test_cookie_max_age_is_30_days(self):
        self.assertEqual(REFRESH_TOKEN_COOKIE_MAX_AGE, 30 * 24 * 60 * 60)

    def test_delivery_costs_are_decimal(self):
        for cost in DELIVERY_COSTS.values():
            self.assertIsInstance(cost, Decimal)

    def test_user_role_choices(self):
        role_values = [c[0] for c in UserRole.CHOICES]
        self.assertIn(UserRole.USER, role_values)
        self.assertIn(UserRole.ADMIN, role_values)
        self.assertIn(UserRole.COURSE_CREATOR, role_values)

    def test_order_status_choices(self):
        status_values = [c[0] for c in OrderStatus.CHOICES]
        self.assertIn(OrderStatus.PENDING, status_values)
        self.assertIn(OrderStatus.CANCELLED, status_values)

    def test_size_thresholds_structure(self):
        self.assertIn('dog', SIZE_THRESHOLDS)
        self.assertIn('cat', SIZE_THRESHOLDS)
        for species_thresholds in SIZE_THRESHOLDS.values():
            self.assertIn('small', species_thresholds)
            self.assertIn('medium', species_thresholds)

    def test_course_time_multipliers(self):
        self.assertIn('default', COURSE_TIME_MULTIPLIERS)
        self.assertEqual(COURSE_TIME_MULTIPLIERS['default'], 1.0)
