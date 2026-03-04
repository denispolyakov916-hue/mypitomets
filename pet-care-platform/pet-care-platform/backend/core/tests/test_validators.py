"""Тесты для валидаторов core."""

from django.test import TestCase

from core.validators import validate_password_strength


class PasswordStrengthTest(TestCase):
    """Тесты валидации сложности пароля."""

    def test_valid_password(self):
        errors = validate_password_strength('Str0ng!Pass')
        self.assertEqual(errors, [])

    def test_too_short(self):
        errors = validate_password_strength('Ab1!')
        self.assertTrue(any('8 символов' in e for e in errors))

    def test_no_letter(self):
        errors = validate_password_strength('12345678!')
        self.assertTrue(any('букву' in e for e in errors))

    def test_no_digit(self):
        errors = validate_password_strength('Abcdefgh!')
        self.assertTrue(any('цифру' in e for e in errors))

    def test_no_special_char(self):
        errors = validate_password_strength('Abcdefg1')
        self.assertTrue(any('специальный' in e for e in errors))

    def test_common_password(self):
        errors = validate_password_strength('password')
        self.assertTrue(len(errors) > 0)

    def test_cyrillic_letters_accepted(self):
        errors = validate_password_strength('Пароль1!')
        no_letter_errors = [e for e in errors if 'букву' in e]
        self.assertEqual(no_letter_errors, [])
