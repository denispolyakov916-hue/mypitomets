"""
Валидаторы для JSON полей моделей.

Обеспечивают валидацию структуры и содержимого JSON полей
для предотвращения некорректных данных в базе.
"""

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import re


def validate_json_list(value, allowed_values=None, item_type=str, max_length=None, min_length=None):
    """
    Валидация JSON списка.
    
    Args:
        value: Значение для валидации
        allowed_values: Список допустимых значений (опционально)
        item_type: Тип элементов списка (по умолчанию str)
        max_length: Максимальная длина списка (опционально)
        min_length: Минимальная длина списка (опционально)
    
    Raises:
        ValidationError: Если значение не соответствует требованиям
    """
    if not isinstance(value, list):
        raise ValidationError(_("Значение должно быть списком"))
    
    if min_length is not None and len(value) < min_length:
        raise ValidationError(_(f"Список должен содержать минимум {min_length} элементов"))
    
    if max_length is not None and len(value) > max_length:
        raise ValidationError(_(f"Список должен содержать максимум {max_length} элементов"))
    
    for item in value:
        if not isinstance(item, item_type):
            raise ValidationError(_(f"Все элементы списка должны быть типа {item_type.__name__}"))
        
        if allowed_values and item not in allowed_values:
            raise ValidationError(_(f"Недопустимое значение: {item}. Допустимые значения: {', '.join(allowed_values)}"))
    
    return value


def validate_json_dict(value, required_keys=None, allowed_keys=None, key_type=str, value_type=None):
    """
    Валидация JSON словаря.
    
    Args:
        value: Значение для валидации
        required_keys: Список обязательных ключей (опционально)
        allowed_keys: Список допустимых ключей (опционально)
        key_type: Тип ключей (по умолчанию str)
        value_type: Тип значений (опционально)
    
    Raises:
        ValidationError: Если значение не соответствует требованиям
    """
    if not isinstance(value, dict):
        raise ValidationError(_("Значение должно быть словарем"))
    
    if required_keys:
        missing_keys = set(required_keys) - set(value.keys())
        if missing_keys:
            raise ValidationError(_(f"Отсутствуют обязательные ключи: {', '.join(missing_keys)}"))
    
    if allowed_keys:
        invalid_keys = set(value.keys()) - set(allowed_keys)
        if invalid_keys:
            raise ValidationError(_(f"Недопустимые ключи: {', '.join(invalid_keys)}. Допустимые ключи: {', '.join(allowed_keys)}"))
    
    for key, val in value.items():
        if not isinstance(key, key_type):
            raise ValidationError(_(f"Все ключи должны быть типа {key_type.__name__}"))
        
        if value_type and not isinstance(val, value_type):
            raise ValidationError(_(f"Значение для ключа '{key}' должно быть типа {value_type.__name__}"))
    
    return value


def validate_url_list(value):
    """
    Валидация списка URL.
    
    Args:
        value: Список URL для валидации
    
    Raises:
        ValidationError: Если значение не является списком URL
    """
    if not isinstance(value, list):
        raise ValidationError(_("Значение должно быть списком"))
    
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    
    for url in value:
        if not isinstance(url, str):
            raise ValidationError(_("Все элементы должны быть строками"))
        if not url_pattern.match(url) and not url.startswith('/'):
            # Разрешаем относительные пути (начинающиеся с /)
            raise ValidationError(_(f"Некорректный URL: {url}"))
    
    return value


def validate_string_list(value, max_item_length=None):
    """
    Валидация списка строк.
    
    Args:
        value: Список строк для валидации
        max_item_length: Максимальная длина каждого элемента (опционально)
    
    Raises:
        ValidationError: Если значение не является списком строк
    """
    if not isinstance(value, list):
        raise ValidationError(_("Значение должно быть списком"))
    
    for item in value:
        if not isinstance(item, str):
            raise ValidationError(_("Все элементы должны быть строками"))
        if max_item_length and len(item) > max_item_length:
            raise ValidationError(_(f"Элемент '{item}' превышает максимальную длину {max_item_length} символов"))
    
    return value


# Специфичные валидаторы для моделей

def validate_behavior_types(value):
    """
    Валидация типов поведения.
    
    Допустимые значения: calm, active, aggressive, shy, playful
    """
    allowed_values = ['calm', 'active', 'aggressive', 'shy', 'playful']
    return validate_json_list(value, allowed_values=allowed_values)


def validate_activity_levels(value):
    """
    Валидация уровней активности.
    
    Допустимые значения: low, medium, high
    """
    allowed_values = ['low', 'medium', 'high']
    return validate_json_list(value, allowed_values=allowed_values)


def validate_social_levels(value):
    """
    Валидация уровней социализации.
    
    Допустимые значения: home_only, street, social, mixed
    """
    allowed_values = ['home_only', 'street', 'social', 'mixed']
    return validate_json_list(value, allowed_values=allowed_values)


def validate_product_params(value):
    """
    Валидация параметров товара.
    
    Параметры должны быть словарем с произвольными ключами-строками
    и значениями строкового или числового типа.
    """
    if not isinstance(value, dict):
        raise ValidationError(_("Параметры должны быть словарем"))
    
    for key, val in value.items():
        if not isinstance(key, str):
            raise ValidationError(_("Все ключи параметров должны быть строками"))
        if not isinstance(val, (str, int, float, bool)):
            raise ValidationError(_(f"Значение параметра '{key}' должно быть строкой, числом или булевым значением"))
    
    return value


def validate_lesson_content(value):
    """
    Валидация контента урока.
    
    Контент должен быть словарем с обязательными полями в зависимости от типа урока.
    """
    if not isinstance(value, dict):
        raise ValidationError(_("Контент урока должен быть словарем"))
    
    # Базовые проверки для всех типов контента
    content_type = value.get('type')
    
    if content_type == 'video':
        required_keys = ['video_url', 'title']
        validate_json_dict(value, required_keys=required_keys)
    elif content_type == 'text':
        required_keys = ['text', 'title']
        validate_json_dict(value, required_keys=required_keys)
    elif content_type == 'interactive':
        required_keys = ['interactive_data', 'title']
        validate_json_dict(value, required_keys=required_keys)
    
    return value


def validate_content_block_content(value):
    """
    Валидация контента блока конструктора курсов.
    
    Контент должен быть словарем с полями в зависимости от типа блока.
    """
    if not isinstance(value, dict):
        raise ValidationError(_("Контент блока должен быть словарем"))
    
    block_type = value.get('type')
    
    if not block_type:
        raise ValidationError(_("Контент блока должен содержать поле 'type'"))
    
    # Базовые проверки - тип должен быть строкой
    if not isinstance(block_type, str):
        raise ValidationError(_("Поле 'type' должно быть строкой"))
    
    return value


def validate_content_block_settings(value):
    """
    Валидация настроек блока конструктора курсов.
    
    Настройки должны быть словарем с произвольными ключами.
    """
    return validate_json_dict(value)


def validate_analytics_config(value):
    """
    Валидация конфигурации аналитики.
    
    Конфигурация должна быть словарем или списком в зависимости от типа метрики.
    """
    if not isinstance(value, (dict, list)):
        raise ValidationError(_("Конфигурация аналитики должна быть словарем или списком"))
    
    return value

