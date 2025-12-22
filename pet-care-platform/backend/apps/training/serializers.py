"""
Сериализаторы для модуля обучения (Курсы)

Этот модуль содержит сериализаторы для операций с курсами:
- Просмотр каталога курсов
- Покупка/запись на курс
- Список курсов пользователя

Классы сериализаторов:
    - CourseSerializer: Данные курса для каталога и деталей
    - UserCourseSerializer: Курс пользователя с прогрессом
    - PurchaseCourseSerializer: Валидация запросов на покупку курса
"""

from rest_framework import serializers


class CourseSerializer(serializers.Serializer):
    """
    Сериализатор для данных курса.
    
    Используется для сериализации объектов Course для API каталога.
    
    Поля:
        id (int): ID курса
        title (str): Название курса
        description (str): Описание курса
        duration (int): Длительность в минутах
        price (float): Цена в рублях (0 для бесплатных)
        image_url (str): URL обложки курса
        pet_type (str): Целевое животное (dog, cat, all)
        is_free (bool): Вычисляемое поле - True если цена равна 0
    """
    
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    duration = serializers.IntegerField(read_only=True)
    price = serializers.FloatField(read_only=True)
    image_url = serializers.CharField(read_only=True)
    pet_type = serializers.CharField(read_only=True)
    is_free = serializers.BooleanField(read_only=True)


class UserCourseSerializer(serializers.Serializer):
    """
    Сериализатор для курса, принадлежащего пользователю.
    
    Включает данные курса и прогресс пользователя.
    Используется в списке "Мои курсы".
    
    Поля:
        course (dict): Данные курса (через CourseSerializer)
        purchased_at (str): Дата приобретения (ISO формат)
        progress (int): Прогресс прохождения в процентах (0-100)
        pet (dict, optional): Информация о питомце, для которого приобретён курс
    """
    
    course = CourseSerializer(read_only=True)
    purchased_at = serializers.CharField(read_only=True)
    progress = serializers.IntegerField(read_only=True)
    pet = serializers.DictField(read_only=True, required=False)


class PurchaseCourseSerializer(serializers.Serializer):
    """
    Сериализатор для запросов покупки/записи на курс.
    
    Поля:
        course_id (int): ID курса для покупки - опционально (обычно передаётся в URL)
        pet_id (str): ID питомца, для которого покупается курс - опционально
        disclaimer_accepted (bool): Согласие с условиями - требуется для платных курсов
    """
    
    course_id = serializers.IntegerField(
        required=False,
        help_text="ID курса для покупки (обычно передаётся в URL)"
    )
    pet_id = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="ID питомца, для которого покупается курс"
    )
    disclaimer_accepted = serializers.BooleanField(
        required=False,
        help_text="Согласие с условиями использования (требуется для платных курсов)"
    )
    
    def validate_course_id(self, value):
        """
        Валидация ID курса.
        
        Аргументы:
            value (int): ID курса
            
        Возвращает:
            int: Валидированный ID курса
            
        Исключения:
            ValidationError: Если ID не положительный
        """
        if value and value <= 0:
            raise serializers.ValidationError(
                "ID курса должен быть положительным числом"
            )
        return value
