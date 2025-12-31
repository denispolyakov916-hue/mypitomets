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
from .models import (
    Course, Lesson, UserCourse, UserCourseProgress, UserLessonProgress,
    Comment, CommentLike, Rating, CoursePage, ContentBlock, BlockTemplate
)


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


class CommentSerializer(serializers.ModelSerializer):
    """
    Сериализатор для комментариев к курсам и урокам.
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_avatar = serializers.CharField(source='user.profile.avatar', read_only=True)
    user_reaction = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'user_name', 'user_avatar', 'course', 'lesson',
            'content', 'parent', 'attachments', 'likes_count', 'dislikes_count',
            'user_reaction', 'replies_count', 'is_moderated', 'can_edit', 'can_delete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'likes_count', 'dislikes_count', 'created_at', 'updated_at']

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_user_reaction(request.user)
        return None

    def get_replies_count(self, obj):
        return obj.replies.count()

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return request and obj.can_edit(request.user)

    def get_can_delete(self, obj):
        request = self.context.get('request')
        return request and obj.can_delete(request.user)

    def validate(self, data):
        """Валидация данных комментария."""
        # Проверяем, что указан либо курс, либо урок, но не оба
        course = data.get('course')
        lesson = data.get('lesson')

        if not course and not lesson:
            raise serializers.ValidationError("Необходимо указать курс или урок для комментария")

        if course and lesson:
            raise serializers.ValidationError("Комментарий может относиться только к курсу ИЛИ уроку")

        return data


class CommentCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания комментариев.
    """
    class Meta:
        model = Comment
        fields = ['course', 'lesson', 'content', 'parent', 'attachments']

    def validate(self, data):
        """Валидация данных при создании комментария."""
        # Проверяем, что указан либо курс, либо урок, но не оба
        course = data.get('course')
        lesson = data.get('lesson')

        if not course and not lesson:
            raise serializers.ValidationError("Необходимо указать курс или урок для комментария")

        if course and lesson:
            raise serializers.ValidationError("Комментарий может относиться только к курсу ИЛИ уроку")

        # Если указан parent, проверяем что он существует и относится к тому же объекту
        parent = data.get('parent')
        if parent:
            if course and parent.course != course:
                raise serializers.ValidationError("Родительский комментарий должен относиться к тому же курсу")
            if lesson and parent.lesson != lesson:
                raise serializers.ValidationError("Родительский комментарий должен относиться к тому же уроку")

        return data


class RatingSerializer(serializers.ModelSerializer):
    """
    Сериализатор для оценок курсов.
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_avatar = serializers.CharField(source='user.profile.avatar', read_only=True)
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = [
            'id', 'user', 'user_name', 'user_avatar', 'course', 'pet', 'pet_name',
            'rating', 'review', 'is_approved', 'can_edit', 'can_delete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return request and obj.can_edit(request.user)

    def get_can_delete(self, obj):
        request = self.context.get('request')
        return request and obj.can_delete(request.user)


class RatingCreateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания оценок курсов.
    """
    class Meta:
        model = Rating
        fields = ['course', 'pet', 'rating', 'review']

    def validate_rating(self, value):
        """Валидация оценки (1-5 звезд)."""
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Оценка должна быть от 1 до 5 звезд")
        return value


class CommentLikeSerializer(serializers.ModelSerializer):
    """
    Сериализатор для лайков комментариев.
    """
    class Meta:
        model = CommentLike
        fields = ['id', 'comment', 'user', 'is_like', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


# ===== СЕРИАЛИЗАТОРЫ ДЛЯ КОНСТРУКТОРА КУРСОВ =====

class CoursePageSerializer(serializers.ModelSerializer):
    """
    Сериализатор для страниц курсов.
    """
    blocks_count = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = CoursePage
        fields = [
            'id', 'course', 'course_title', 'title', 'order_number',
            'page_type', 'settings', 'is_active', 'created_at', 'updated_at',
            'blocks_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'blocks_count']

    def get_blocks_count(self, obj):
        """Количество активных блоков на странице."""
        return obj.blocks.filter(is_active=True).count()


class ContentBlockSerializer(serializers.ModelSerializer):
    """
    Сериализатор для блоков контента.
    """
    page_title = serializers.CharField(source='page.title', read_only=True)
    block_type_display = serializers.CharField(source='get_block_type_display', read_only=True)

    class Meta:
        model = ContentBlock
        fields = [
            'id', 'page', 'page_title', 'block_type', 'block_type_display',
            'content', 'settings', 'order', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Валидация данных блока."""
        block_type = data.get('block_type')
        content = data.get('content', {})

        # Базовая валидация в зависимости от типа блока
        if block_type == 'rich_text' and 'html' not in content:
            raise serializers.ValidationError("Rich text блок должен содержать поле 'html'")

        if block_type == 'video_player' and 'video_url' not in content:
            raise serializers.ValidationError("Video блок должен содержать поле 'video_url'")

        return data


class BlockTemplateSerializer(serializers.ModelSerializer):
    """
    Сериализатор для шаблонов блоков.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = BlockTemplate
        fields = [
            'id', 'name', 'description', 'block_type', 'content', 'settings',
            'category', 'category_display', 'is_public', 'created_by',
            'created_by_name', 'usage_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']


class CourseBuilderPageSerializer(serializers.ModelSerializer):
    """
    Расширенный сериализатор страницы с блоками для конструктора.
    """
    blocks = ContentBlockSerializer(many=True, read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = CoursePage
        fields = [
            'id', 'course', 'course_title', 'title', 'order_number',
            'page_type', 'settings', 'is_active', 'blocks'
        ]


class CourseBuilderSerializer(serializers.ModelSerializer):
    """
    Сериализатор курса с страницами и блоками для конструктора.
    """
    pages = CourseBuilderPageSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'pages'
        ]