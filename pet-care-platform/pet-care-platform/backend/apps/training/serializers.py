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
    Comment, CommentLike, CourseModule, CoursePage, ContentBlock, BlockTemplate
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
    parent_id = serializers.CharField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Comment
        fields = ['course', 'lesson', 'page', 'content', 'parent', 'parent_id', 'attachments']

    def validate(self, data):
        # parent_id → parent для совместимости с разными клиентами
        parent_id = data.pop('parent_id', None)
        if parent_id and not data.get('parent'):
            data['parent'] = parent_id
        """Валидация данных при создании комментария."""
        course = data.get('course')
        lesson = data.get('lesson')
        page = data.get('page')

        provided = sum(1 for x in (course, lesson, page) if x is not None and x != '')
        if provided == 0:
            raise serializers.ValidationError("Необходимо указать курс, урок или страницу для комментария")
        if provided > 1:
            raise serializers.ValidationError("Комментарий может относиться только к курсу ИЛИ уроку ИЛИ странице")

        # Если указан parent, проверяем что он существует и относится к тому же объекту
        parent = data.get('parent')
        if parent:
            def _pk(val):
                if val is None or val == '':
                    return None
                if hasattr(val, 'pk'):
                    return val.pk
                try:
                    return int(val)
                except (TypeError, ValueError):
                    return None

            target_id = None
            if course is not None and course != '':
                target_id = ('course', _pk(course))
            elif lesson is not None and lesson != '':
                target_id = ('lesson', _pk(lesson))
            elif page is not None and page != '':
                target_id = ('page', _pk(page))

            if target_id:
                kind, tid = target_id
                if kind == 'course' and (not parent.course_id or parent.course_id != tid):
                    raise serializers.ValidationError("Родительский комментарий должен относиться к тому же курсу")
                if kind == 'lesson' and (not parent.lesson_id or parent.lesson_id != tid):
                    raise serializers.ValidationError("Родительский комментарий должен относиться к тому же уроку")
                if kind == 'page' and (not parent.page_id or parent.page_id != tid):
                    raise serializers.ValidationError("Родительский комментарий должен относиться к той же странице")

        return data


# Rating сериализаторы удалены - система заменена на единую Review


class CommentLikeSerializer(serializers.ModelSerializer):
    """
    Сериализатор для лайков комментариев.
    """
    class Meta:
        model = CommentLike
        fields = ['id', 'comment', 'user', 'is_like', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


# ===== СЕРИАЛИЗАТОРЫ ДЛЯ МОДУЛЕЙ КУРСОВ =====


class CourseModuleSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модулей (разделов) курса.
    """
    pages_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseModule
        fields = [
            'id', 'course', 'title', 'description', 'order_number',
            'is_active', 'created_at', 'updated_at', 'pages_count',
        ]
        read_only_fields = ['id', 'course', 'order_number', 'created_at', 'updated_at']

    def get_pages_count(self, obj):
        return obj.pages.filter(is_active=True).count()


class CourseModuleListSerializer(serializers.ModelSerializer):
    """
    Краткий сериализатор модуля для списков (например, оглавление).
    """
    pages_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseModule
        fields = ['id', 'title', 'description', 'order_number', 'pages_count']

    def get_pages_count(self, obj):
        return obj.pages.filter(is_active=True).count()


# ===== СЕРИАЛИЗАТОРЫ ДЛЯ КОНСТРУКТОРА КУРСОВ =====

class CoursePageSerializer(serializers.ModelSerializer):
    """
    Сериализатор для страниц курсов.
    """
    blocks_count = serializers.SerializerMethodField()
    module_title = serializers.CharField(source='module.title', read_only=True, default=None)

    class Meta:
        model = CoursePage
        fields = [
            'id', 'course_id', 'module', 'module_title', 'title', 'order_number',
            'page_type', 'settings', 'is_active', 'created_at', 'updated_at',
            'blocks_count',
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 'blocks_count']

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
        read_only_fields = ['id', 'order', 'created_at', 'updated_at']

    def validate(self, data):
        """Валидация данных блока."""
        block_type = data.get('block_type')
        content = data.get('content') or {}
        content = content.copy() if isinstance(content, dict) else {}

        # При создании пустого блока подставляем минимальную структуру
        if block_type == 'rich_text' and 'html' not in content:
            content['html'] = ''
        if block_type == 'video_player' and 'video_url' not in content and 'video_key' not in content:
            content['video_url'] = ''

        data['content'] = content
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
    module_title = serializers.CharField(source='module.title', read_only=True, default=None)

    class Meta:
        model = CoursePage
        fields = [
            'id', 'course_id', 'module', 'module_title', 'title', 'order_number',
            'page_type', 'settings', 'is_active', 'blocks',
        ]


class CourseBuilderModuleSerializer(serializers.ModelSerializer):
    """
    Сериализатор модуля с вложенными страницами для конструктора.
    """
    pages = CourseBuilderPageSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = [
            'id', 'title', 'description', 'order_number', 'is_active', 'pages',
        ]


class CourseBuilderSerializer(serializers.ModelSerializer):
    """
    Сериализатор курса с модулями, страницами и блоками для конструктора.
    """
    modules = CourseBuilderModuleSerializer(many=True, read_only=True)
    # Страницы без модуля (для обратной совместимости)
    orphan_pages = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'modules', 'orphan_pages',
        ]

    def get_orphan_pages(self, obj):
        """Страницы, не привязанные к модулю."""
        pages = CoursePage.objects.filter(
            course_id=obj.id, module__isnull=True, is_active=True
        ).order_by('order_number').prefetch_related('blocks')
        return CourseBuilderPageSerializer(pages, many=True).data


class CourseStructurePageSerializer(serializers.ModelSerializer):
    """
    Сериализатор страницы для отображения структуры курса (обучение).
    Включает статус прогресса пользователя.
    """
    blocks_count = serializers.SerializerMethodField()
    status = serializers.CharField(default='not_started', read_only=True)

    class Meta:
        model = CoursePage
        fields = [
            'id', 'title', 'order_number', 'page_type', 'blocks_count', 'status',
        ]

    def get_blocks_count(self, obj):
        return obj.blocks.filter(is_active=True).count()


class CourseStructureModuleSerializer(serializers.ModelSerializer):
    """
    Сериализатор модуля для отображения структуры курса (обучение).
    """
    pages = CourseStructurePageSerializer(many=True, read_only=True)
    progress_percent = serializers.FloatField(default=0, read_only=True)

    class Meta:
        model = CourseModule
        fields = [
            'id', 'title', 'description', 'order_number', 'pages', 'progress_percent',
        ]


class CourseStructureSerializer(serializers.Serializer):
    """
    Полная структура курса для страницы обучения.
    """
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    modules = CourseStructureModuleSerializer(many=True)
    progress_percent = serializers.FloatField(default=0)
    completed_pages = serializers.IntegerField(default=0)
    total_pages = serializers.IntegerField(default=0)