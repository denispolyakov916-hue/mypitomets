"""
Сериализаторы для модуля управления питомцами (PetID)

Этот модуль содержит сериализаторы DRF для валидации и сериализации
данных питомцев. Обрабатывает операции создания и обновления питомцев.

Классы сериализаторов:
    - PetCreateSerializer: Валидация данных для создания нового питомца
    - PetUpdateSerializer: Валидация данных для обновления существующего питомца
    - PetSerializer: Сериализация данных питомца для API ответов

Допустимые виды животных:
    - dog (собака)
    - cat (кошка)
    - bird (птица)
    - rodent (грызун)
    - fish (рыбка)
    - reptile (рептилия)
    - other (другое)
"""

from rest_framework import serializers
from datetime import datetime

# Допустимые виды животных
SPECIES_CHOICES = [
    ('dog', 'Собака'),
    ('cat', 'Кошка'),
    ('bird', 'Птица'),
    ('rodent', 'Грызун'),
    ('fish', 'Рыбка'),
    ('reptile', 'Рептилия'),
    ('other', 'Другое'),
]

# Извлечение только ключей для валидации
VALID_SPECIES = [choice[0] for choice in SPECIES_CHOICES]


class PetCreateSerializer(serializers.Serializer):
    """
    Сериализатор для создания нового питомца.
    
    Валидирует все данные, необходимые для создания нового профиля питомца (PetID).
    Обязательные поля: name, species.
    Опциональные поля: breed, date_of_birth, weight.
    
    Поля:
        name (str): Кличка питомца - обязательное, 1-100 символов
        species (str): Вид животного - обязательное, одно из VALID_SPECIES
        breed (str): Порода - опционально, до 100 символов
        date_of_birth (str): Дата рождения в формате ISO (YYYY-MM-DD) - опционально
        weight (float): Вес в кг - опционально, положительное число
    
    Пример валидного ввода:
        {
            "name": "Барсик",
            "species": "cat",
            "breed": "Персидская",
            "date_of_birth": "2020-05-15",
            "weight": 5.2
        }
    
    Ошибки валидации:
        - name: пустое значение, превышение длины
        - species: невалидное значение
        - date_of_birth: неверный формат, дата в будущем
        - weight: отрицательное или нулевое значение
    """
    
    name = serializers.CharField(
        required=True,
        max_length=100,
        help_text="Кличка питомца (обязательно, до 100 символов)"
    )
    
    species = serializers.ChoiceField(
        required=True,
        choices=SPECIES_CHOICES,
        help_text="Вид животного (dog, cat, bird, rodent, fish, reptile, other)"
    )
    
    breed = serializers.CharField(
        required=False,
        max_length=100,
        allow_blank=True,
        allow_null=True,
        help_text="Порода питомца (опционально)"
    )
    
    date_of_birth = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Дата рождения в формате YYYY-MM-DD (опционально)"
    )
    
    weight = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Вес в килограммах (опционально)"
    )
    
    def validate_name(self, value):
        """
        Валидация клички питомца.
        
        Выполняет очистку и проверку клички:
        - Удаление пробелов по краям
        - Проверка на непустое значение
        
        Аргументы:
            value (str): Введённая кличка
            
        Возвращает:
            str: Очищенная кличка
            
        Исключения:
            ValidationError: Если кличка пустая после очистки
        """
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Кличка питомца обязательна")
        return value
    
    def validate_date_of_birth(self, value):
        """
        Валидация даты рождения питомца.
        
        Проверки:
        - Корректный формат ISO даты (YYYY-MM-DD)
        - Дата не в будущем
        
        Аргументы:
            value (str): Строка с датой
            
        Возвращает:
            str: Валидированная строка даты или None
            
        Исключения:
            ValidationError: Неверный формат или дата в будущем
        """
        if not value:
            return None
        
        try:
            date_obj = datetime.strptime(value, '%Y-%m-%d').date()
            
            # Проверка, что дата не в будущем
            if date_obj > datetime.now().date():
                raise serializers.ValidationError(
                    "Дата рождения не может быть в будущем"
                )
            
            return value
            
        except ValueError:
            raise serializers.ValidationError(
                "Неверный формат даты. Используйте формат YYYY-MM-DD"
            )
    
    def validate_weight(self, value):
        """
        Валидация веса питомца.
        
        Проверки:
        - Вес должен быть положительным числом
        - Разумный диапазон (0.01 - 500 кг)
        
        Аргументы:
            value (float): Значение веса
            
        Возвращает:
            float: Валидированный вес или None
            
        Исключения:
            ValidationError: Если вес отрицательный или вне разумного диапазона
        """
        if value is None:
            return None
        
        if value <= 0:
            raise serializers.ValidationError(
                "Вес должен быть положительным числом"
            )
        
        if value > 500:
            raise serializers.ValidationError(
                "Вес не может превышать 500 кг"
            )
        
        return round(value, 2)


class PetUpdateSerializer(serializers.Serializer):
    """
    Сериализатор для обновления существующего питомца.
    
    Все поля опциональны для поддержки частичного обновления.
    Обновляются только предоставленные поля.
    
    Поля:
        name (str): Кличка питомца - опционально
        species (str): Вид животного - опционально
        breed (str): Порода - опционально
        date_of_birth (str): Дата рождения - опционально
        weight (float): Вес в кг - опционально
    
    Пример частичного обновления:
        {
            "weight": 5.8
        }
    
    Примечание:
        Если поле передано как null или пустая строка, оно будет
        обновлено соответствующим образом в хранилище.
    """
    
    name = serializers.CharField(
        required=False,
        max_length=100,
        allow_blank=False,
        allow_null=True,
        help_text="Новая кличка питомца"
    )
    
    species = serializers.ChoiceField(
        required=False,
        choices=SPECIES_CHOICES,
        allow_null=True,
        help_text="Новый вид животного"
    )
    
    breed = serializers.CharField(
        required=False,
        max_length=100,
        allow_blank=True,
        allow_null=True,
        help_text="Новая порода"
    )
    
    date_of_birth = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Новая дата рождения (YYYY-MM-DD)"
    )
    
    weight = serializers.FloatField(
        required=False,
        allow_null=True,
        help_text="Новый вес в килограммах"
    )
    
    def validate_name(self, value):
        """Валидация клички при обновлении."""
        if value is None:
            return None
        
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Кличка не может быть пустой")
        return value
    
    def validate_date_of_birth(self, value):
        """Валидация даты рождения при обновлении."""
        if not value:
            return None
        
        try:
            date_obj = datetime.strptime(value, '%Y-%m-%d').date()
            
            if date_obj > datetime.now().date():
                raise serializers.ValidationError(
                    "Дата рождения не может быть в будущем"
                )
            
            return value
            
        except ValueError:
            raise serializers.ValidationError(
                "Неверный формат даты. Используйте формат YYYY-MM-DD"
            )
    
    def validate_weight(self, value):
        """Валидация веса при обновлении."""
        if value is None:
            return None
        
        if value <= 0:
            raise serializers.ValidationError(
                "Вес должен быть положительным числом"
            )
        
        if value > 500:
            raise serializers.ValidationError(
                "Вес не может превышать 500 кг"
            )
        
        return round(value, 2)


class PetSerializer(serializers.Serializer):
    """
    Сериализатор для вывода данных питомца в API ответах.
    
    Используется для сериализации объектов питомца при возврате данных клиенту.
    Все поля только для чтения.
    
    Поля:
        id (str): Уникальный идентификатор питомца (UUIDv7)
        owner_id (str): UUIDv7 ID владельца питомца
        name (str): Кличка питомца
        species (str): Вид животного
        breed (str): Порода
        date_of_birth (str): Дата рождения
        weight (float): Вес в кг
        created_at (str): Дата создания профиля
        updated_at (str): Дата последнего обновления
        
    Заметка по идентификаторам:
        Используется UUIDv7 - сортируемый по времени UUID, обеспечивающий
        глобальную уникальность и оптимальную производительность индексов в PostgreSQL.
    """
    
    id = serializers.CharField(read_only=True, help_text="UUIDv7 идентификатор питомца")
    owner_id = serializers.CharField(read_only=True, help_text="UUIDv7 идентификатор владельца")
    name = serializers.CharField(read_only=True)
    species = serializers.CharField(read_only=True)
    breed = serializers.CharField(read_only=True, allow_null=True)
    date_of_birth = serializers.CharField(read_only=True, allow_null=True)
    weight = serializers.FloatField(read_only=True, allow_null=True)
    created_at = serializers.CharField(read_only=True)
    updated_at = serializers.CharField(read_only=True)
