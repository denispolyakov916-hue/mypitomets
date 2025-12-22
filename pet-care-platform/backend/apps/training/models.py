"""
Модели для модуля обучения (Курсы)

Включает: Course, UserCourse (связь пользователь-курс)

Система категоризации курсов:
- category: Основы, Дрессировка, Уход, Здоровье, Питание, Поведение, Специализированные, Развлечения
- subcategory: Подкатегории внутри каждой категории
- level: Начинающий, Средний, Продвинутый, Эксперт
- format_type: Видео, Текст, Интерактивный, Смешанный, Вебинар, Мастер-класс

Фильтрация:
- pet_type: dog, cat, all (для всех)
- category: фильтр по основной категории
- subcategory: фильтр по подкатегории
- level: фильтр по уровню сложности
- format_type: фильтр по формату обучения
- min_price/max_price: фильтр по цене
- personal=true: персональная подборка по питомцам пользователя
"""

from django.db import models
from django.conf import settings


class Course(models.Model):
    """
    Модель образовательного курса.

    Курсы могут быть бесплатными (price=0) или платными.
    Поддерживают категоризацию, уровни сложности и форматы обучения.
    """

    PET_TYPE_CHOICES = [
        ('dog', 'Для собак'),
        ('cat', 'Для кошек'),
        ('all', 'Для всех'),
    ]

    CATEGORY_CHOICES = [
        ('basics', 'Основы'),
        ('training', 'Дрессировка'),
        ('care', 'Уход'),
        ('health', 'Здоровье'),
        ('nutrition', 'Питание'),
        ('behavior', 'Поведение'),
        ('specialized', 'Специализированные'),
        ('entertainment', 'Развлечения'),
    ]

    SUBCATEGORY_CHOICES = [
        # Основы
        ('first_steps', 'Первые шаги'),
        ('socialization', 'Социализация'),
        ('toilet_training', 'Приучение к туалету'),
        # Дрессировка
        ('obedience', 'Послушание'),
        ('tricks', 'Трюки'),
        ('sports', 'Спортивная'),
        ('service', 'Служебная'),
        # Уход
        ('grooming', 'Груминг'),
        ('hygiene', 'Гигиена'),
        ('coat_care', 'Уход за шерстью'),
        # Здоровье
        ('prevention', 'Профилактика'),
        ('first_aid', 'Первая помощь'),
        ('vaccination', 'Вакцинация'),
        # Питание
        ('feeding_basics', 'Основы кормления'),
        ('diet_selection', 'Выбор рациона'),
        ('natural_feeding', 'Натуральное питание'),
        # Поведение
        ('behavior_problems', 'Проблемы поведения'),
        ('aggression', 'Агрессия'),
        ('anxiety', 'Тревожность'),
        # Специализированные
        ('breeding', 'Разведение'),
        ('shows', 'Выставки'),
        ('therapy', 'Канистерапия'),
        # Развлечения
        ('games', 'Игры'),
        ('toys', 'Игрушки'),
        ('activities', 'Активности'),
    ]

    LEVEL_CHOICES = [
        ('beginner', 'Начинающий'),
        ('intermediate', 'Средний'),
        ('advanced', 'Продвинутый'),
        ('expert', 'Эксперт'),
    ]

    FORMAT_CHOICES = [
        ('video', 'Видео'),
        ('text', 'Текст'),
        ('interactive', 'Интерактивный'),
        ('mixed', 'Смешанный'),
        ('webinar', 'Вебинар'),
        ('workshop', 'Мастер-класс'),
    ]
    
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200, verbose_name='Название')
    description = models.TextField(blank=True, verbose_name='Описание')
    duration = models.PositiveIntegerField(
        help_text='Длительность в минутах',
        verbose_name='Длительность'
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Цена'
    )
    image_url = models.URLField(blank=True, null=True, verbose_name='URL обложки')
    
    pet_type = models.CharField(
        max_length=10,
        choices=PET_TYPE_CHOICES,
        default='all',
        verbose_name='Тип животного'
    )

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='basics',
        db_index=True,
        verbose_name='Категория'
    )

    subcategory = models.CharField(
        max_length=30,
        choices=SUBCATEGORY_CHOICES,
        blank=True,
        null=True,
        db_index=True,
        verbose_name='Подкатегория'
    )

    level = models.CharField(
        max_length=15,
        choices=LEVEL_CHOICES,
        default='beginner',
        db_index=True,
        verbose_name='Уровень сложности'
    )

    format_type = models.CharField(
        max_length=15,
        choices=FORMAT_CHOICES,
        default='video',
        db_index=True,
        verbose_name='Формат обучения'
    )
    
    # Дополнительные детали курса
    detailed_description = models.TextField(blank=True, null=True, verbose_name='Подробное описание')
    what_you_will_learn = models.TextField(
        blank=True, 
        null=True, 
        verbose_name='Чему вы научитесь',
        help_text='Список навыков и знаний, которые получит пользователь'
    )
    format_details = models.TextField(
        blank=True,
        null=True,
        verbose_name='Детали формата',
        help_text='Подробное описание формата обучения (количество видео, материалов и т.д.)'
    )
    completion_time = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Время прохождения',
        help_text='Оценка времени для прохождения курса (например, "2-3 недели", "1 месяц")'
    )
    lessons_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество уроков'
    )
    videos_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество видео'
    )
    materials_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество материалов'
    )
    instructor_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='Имя инструктора'
    )
    instructor_bio = models.TextField(
        blank=True,
        null=True,
        verbose_name='Биография инструктора'
    )
    requirements = models.TextField(
        blank=True,
        null=True,
        verbose_name='Требования',
        help_text='Что необходимо знать или иметь перед началом курса'
    )
    
    # Дополнительные изображения
    additional_images = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Дополнительные изображения',
        help_text='Массив URL дополнительных изображений курса'
    )

    is_active = models.BooleanField(default=True, verbose_name='Активен')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'courses'
        verbose_name = 'Курс'
        verbose_name_plural = 'Курсы'
        ordering = ['title']
        indexes = [
            models.Index(fields=['pet_type', 'category']),
            models.Index(fields=['pet_type', 'category', 'level']),
            models.Index(fields=['category', 'level']),
            models.Index(fields=['price']),
            models.Index(fields=['format_type']),
        ]
    
    def __str__(self):
        return self.title
    
    @property
    def is_free(self):
        """Является ли курс бесплатным."""
        return self.price == 0
    
    def get_category_display_name(self):
        """Получить название категории."""
        return dict(self.CATEGORY_CHOICES).get(self.category, self.category)
    
    def get_level_display_name(self):
        """Получить название уровня."""
        return dict(self.LEVEL_CHOICES).get(self.level, self.level)
    
    def get_format_display_name(self):
        """Получить название формата."""
        return dict(self.FORMAT_CHOICES).get(self.format_type, self.format_type)
    
    def get_pet_type_display_name(self):
        """Получить название типа животного."""
        return dict(self.PET_TYPE_CHOICES).get(self.pet_type, self.pet_type)
    
    def to_dict(self, detailed=False):
        """Сериализация для API."""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'duration': self.duration,
            'price': float(self.price),
            'image_url': self.image_url,
            'pet_type': self.pet_type,
            'category': self.category,
            'category_display': self.get_category_display_name(),
            'subcategory': self.subcategory,
            'level': self.level,
            'level_display': self.get_level_display_name(),
            'format_type': self.format_type,
            'format_display': self.get_format_display_name(),
            'is_free': self.is_free
        }
        
        if detailed:
            data.update({
                'detailed_description': self.detailed_description,
                'what_you_will_learn': self.what_you_will_learn,
                'format_details': self.format_details,
                'completion_time': self.completion_time,
                'lessons_count': self.lessons_count,
                'videos_count': self.videos_count,
                'materials_count': self.materials_count,
                'instructor_name': self.instructor_name,
                'instructor_bio': self.instructor_bio,
                'requirements': self.requirements,
                'additional_images': self.additional_images,
            })
        
        return data


class UserCourse(models.Model):
    """
    Связь пользователя с курсом.
    
    Отслеживает приобретённые курсы и прогресс прохождения.
    Может быть привязан к конкретному питомцу.
    """
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_courses',
        verbose_name='Пользователь'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='user_courses',
        verbose_name='Курс'
    )
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses',
        verbose_name='Питомец',
        help_text='Питомец, для которого приобретён курс (опционально)'
    )
    
    purchased_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата покупки')
    progress = models.PositiveIntegerField(
        default=0,
        help_text='Процент прохождения (0-100)',
        verbose_name='Прогресс'
    )
    
    class Meta:
        db_table = 'user_courses'
        verbose_name = 'Курс пользователя'
        verbose_name_plural = 'Курсы пользователей'
        unique_together = [['user', 'course', 'pet']]
    
    def __str__(self):
        if self.pet:
            return f"{self.user.email} - {self.course.title} ({self.pet.name})"
        return f"{self.user.email} - {self.course.title}"
    
    def to_dict(self):
        """Сериализация для API."""
        data = {
            'course': self.course.to_dict(),
            'purchased_at': self.purchased_at.isoformat() if self.purchased_at else None,
            'progress': self.progress
        }
        if self.pet:
            data['pet'] = {
                'id': str(self.pet.id),
                'name': self.pet.name,
                'species': self.pet.species
            }
        return data
