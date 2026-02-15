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
from decimal import Decimal
from django.utils import timezone
from core.utils import generate_uuid7
from core.validators import (
    validate_behavior_types, validate_activity_levels, validate_social_levels,
    validate_string_list, validate_url_list, validate_lesson_content,
    validate_content_block_content, validate_content_block_settings
)
from .managers import CourseManager


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
        default=Decimal('0.00'),
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
    # Автоматически рассчитывается на основе уроков
    lessons_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество уроков',
        help_text='Автоматически рассчитывается на основе связанных уроков'
    )
    videos_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество видео',
        help_text='Автоматически рассчитывается на основе видео-уроков'
    )
    materials_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество материалов',
        help_text='Автоматически рассчитывается на основе дополнительных материалов'
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

    # ===== ПЕРСОНАЛИЗАЦИЯ ПО ХАРАКТЕРИСТИКАМ ПИТОМЦА =====

    # Рекомендуемые типы поведения питомца
    recommended_behavior_types = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Рекомендуемые типы поведения',
        help_text='Список типов поведения, для которых подходит курс (calm, active, aggressive, shy, playful)',
        validators=[validate_behavior_types]
    )

    # Рекомендуемые уровни активности
    recommended_activity_levels = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Рекомендуемые уровни активности',
        help_text='Список уровней активности, для которых подходит курс (low, medium, high)',
        validators=[validate_activity_levels]
    )

    # Рекомендуемые уровни социализации
    recommended_social_levels = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Рекомендуемые уровни социализации',
        help_text='Список уровней социализации, для которых подходит курс (home_only, street, social, mixed)',
        validators=[validate_social_levels]
    )

    # Минимальный опыт дрессировки
    min_training_experience = models.CharField(
        max_length=20,
        choices=[
            ('none', 'Без опыта'),
            ('basic', 'Базовый'),
            ('intermediate', 'Средний'),
            ('advanced', 'Продвинутый'),
            ('professional', 'Профессиональный'),
        ],
        blank=True,
        null=True,
        verbose_name='Минимальный опыт дрессировки',
        help_text='Минимальный уровень опыта дрессировки для прохождения курса'
    )

    # Проблемы здоровья, с которыми совместим курс
    compatible_health_issues = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Совместимые проблемы здоровья',
        help_text='Список проблем здоровья, с которыми совместим курс',
        validators=[validate_string_list]
    )

    # Особые потребности, которые учитывает курс
    addresses_special_needs = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Учитываемые особые потребности',
        help_text='Список особых потребностей, которые учитывает курс',
        validators=[validate_string_list]
    )

    # Предпочитаемые активности питомца
    suitable_activities = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Подходящие активности',
        help_text='Виды активностей питомца, для которых подходит курс',
        validators=[validate_string_list]
    )

    # Поведенческие проблемы, которые решает курс
    addresses_behavioral_problems = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Решаемые поведенческие проблемы',
        help_text='Список поведенческих проблем, которые решает курс',
        validators=[validate_string_list]
    )

    # Популярность (количество покупок)
    order_count = models.PositiveIntegerField(default=0, verbose_name='Количество покупок')
    
    # Дополнительные изображения
    additional_images = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Дополнительные изображения',
        help_text='Массив URL дополнительных изображений курса',
        validators=[validate_url_list]
    )

    is_active = models.BooleanField(default=True, verbose_name='Активен')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Используем кастомный менеджер с оптимизированными запросами
    objects = CourseManager()
    
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
    
    def get_average_rating(self):
        """
        Средний рейтинг курса.

        Система рейтингов удалена - возвращаем 0.0
        """
        # Система рейтингов удалена
        return 0.0
    
    def get_reviews_count(self):
        """
        Количество одобренных отзывов.

        Система рейтингов удалена - возвращаем 0
        """
        # Система рейтингов удалена
        return 0

    def is_compatible_with_pet(self, pet):
        """
        Проверяет совместимость курса с питомцем на основе его характеристик.

        Args:
            pet: объект Pet с расширенным PetID

        Returns:
            dict: {
                'compatible': bool,
                'score': int (0-100),
                'reasons': list of str
            }
        """
        score = 50  # Базовый балл
        reasons = []

        # Проверяем тип поведения
        if self.recommended_behavior_types and pet.behavior_type:
            if pet.behavior_type in self.recommended_behavior_types:
                score += 20
                reasons.append(f"Подходит для {pet.get_behavior_type_display()}")
            else:
                score -= 10
                reasons.append(f"Не оптимально для {pet.get_behavior_type_display()}")

        # Проверяем уровень активности
        if self.recommended_activity_levels and pet.activity_level:
            if pet.activity_level in self.recommended_activity_levels:
                score += 15
                reasons.append(f"Соответствует уровню активности {pet.get_activity_level_display()}")
            else:
                score -= 8
                reasons.append(f"Не соответствует уровню активности {pet.get_activity_level_display()}")

        # Проверяем уровень социализации
        if self.recommended_social_levels and pet.social_level:
            if pet.social_level in self.recommended_social_levels:
                score += 15
                reasons.append(f"Подходит для уровня социализации {pet.get_social_level_display()}")
            else:
                score -= 8
                reasons.append(f"Не подходит для уровня социализации {pet.get_social_level_display()}")

        # Проверяем опыт дрессировки
        if self.min_training_experience and pet.training_experience:
            experience_levels = ['none', 'basic', 'intermediate', 'advanced', 'professional']
            min_level_index = experience_levels.index(self.min_training_experience)
            pet_level_index = experience_levels.index(pet.training_experience)

            if pet_level_index >= min_level_index:
                score += 10
                reasons.append("Достаточный опыт дрессировки")
            else:
                score -= 15
                reasons.append("Требуется больше опыта дрессировки")

        # Проверяем проблемы здоровья
        if self.compatible_health_issues and pet.health_issues:
            matching_issues = set(self.compatible_health_issues) & set(pet.health_issues)
            if matching_issues:
                score += 10
                reasons.append(f"Учитывает проблемы здоровья: {', '.join(matching_issues)}")
            else:
                score -= 5
                reasons.append("Не учитывает текущие проблемы здоровья")

        # Проверяем поведенческие проблемы
        if self.addresses_behavioral_problems and pet.behavioral_problems:
            matching_problems = set(self.addresses_behavioral_problems) & set(pet.behavioral_problems)
            if matching_problems:
                score += 20
                reasons.append(f"Решает проблемы поведения: {', '.join(matching_problems)}")

        # Проверяем особые потребности
        if self.addresses_special_needs and pet.special_needs:
            matching_needs = set(self.addresses_special_needs) & set(pet.special_needs)
            if matching_needs:
                score += 15
                reasons.append(f"Учитывает особые потребности: {', '.join(matching_needs)}")

        # Проверяем предпочтительные активности
        if self.suitable_activities and pet.preferred_activities:
            matching_activities = set(self.suitable_activities) & set(pet.preferred_activities)
            if matching_activities:
                score += 10
                reasons.append(f"Соответствует предпочтениям: {', '.join(matching_activities)}")

        # Ограничиваем балл диапазоном 0-100
        score = max(0, min(100, score))

        return {
            'compatible': score >= 60,
            'score': score,
            'reasons': reasons
        }

    def get_personalized_recommendations(self, pet):
        """
        Получает персонализированные рекомендации для питомца.

        Args:
            pet: объект Pet

        Returns:
            dict: рекомендации по прохождению курса
        """
        compatibility = self.is_compatible_with_pet(pet)

        recommendations = {
            'compatibility': compatibility,
            'difficulty_level': self._get_difficulty_for_pet(pet),
            'estimated_time': self._get_estimated_time_for_pet(pet),
            'tips': self._get_personalized_tips(pet),
            'warnings': self._get_warnings_for_pet(pet)
        }

        return recommendations

    def _get_difficulty_for_pet(self, pet):
        """Определяет уровень сложности курса для конкретного питомца."""
        if not pet.training_experience:
            return 'unknown'

        experience_levels = ['none', 'basic', 'intermediate', 'advanced', 'professional']
        pet_level_index = experience_levels.index(pet.training_experience)
        course_level_index = ['beginner', 'intermediate', 'advanced', 'expert'].index(self.level)

        if pet_level_index >= course_level_index:
            return 'suitable'
        elif pet_level_index == course_level_index - 1:
            return 'challenging'
        else:
            return 'difficult'

    def _get_estimated_time_for_pet(self, pet):
        """Оценивает время прохождения для конкретного питомца."""
        base_time = self.duration

        # Корректировка по уровню активности
        if pet.activity_level == 'high':
            base_time = int(base_time * 1.2)  # Активные питомцы быстрее обучаются
        elif pet.activity_level == 'low':
            base_time = int(base_time * 1.5)  # Менее активные нуждаются в большем времени

        # Корректировка по опыту
        if pet.training_experience == 'none':
            base_time = int(base_time * 1.8)
        elif pet.training_experience == 'professional':
            base_time = int(base_time * 0.8)

        return base_time

    def _get_personalized_tips(self, pet):
        """Получает персонализированные советы."""
        tips = []

        if pet.behavior_type == 'shy':
            tips.append("Начинайте обучение в спокойной обстановке, постепенно увеличивая интенсивность")
        elif pet.behavior_type == 'aggressive':
            tips.append("Обеспечьте безопасность и используйте положительное подкрепление")
        elif pet.behavior_type == 'active':
            tips.append("Чередуйте обучение с активными играми для поддержания внимания")

        if pet.activity_level == 'low':
            tips.append("Делайте частые перерывы и используйте мотивацию")
        elif pet.activity_level == 'high':
            tips.append("Поддерживайте темп обучения, чередуя активности")

        return tips

    def _get_warnings_for_pet(self, pet):
        """Получает предупреждения для конкретного питомца."""
        warnings = []

        if pet.health_issues:
            health_relevant = set(self.compatible_health_issues or []) & set(pet.health_issues)
            if not health_relevant:
                warnings.append("Проконсультируйтесь с ветеринаром перед началом обучения")

        if pet.special_needs and not self.addresses_special_needs:
            warnings.append("Возможно, потребуется адаптация методов обучения")

        if pet.behavioral_problems and not self.addresses_behavioral_problems:
            warnings.append("Курс может не решать текущие поведенческие проблемы")

        return warnings

    def update_counts(self):
        """
        Обновить счетчики уроков, видео и материалов на основе связанных уроков.
        """
        active_lessons = self.lessons.filter(is_active=True)

        self.lessons_count = active_lessons.count()
        self.videos_count = active_lessons.filter(content_type='video').count()

        # Подсчет дополнительных материалов
        materials_count = 0
        for lesson in active_lessons:
            materials_count += len(lesson.additional_materials) if lesson.additional_materials else 0

        self.materials_count = materials_count
        self.save()

    def get_lessons_ordered(self):
        """Получить уроки курса в правильном порядке."""
        return self.lessons.filter(is_active=True).order_by('order')

    def get_first_lesson(self):
        """Получить первый урок курса."""
        return self.get_lessons_ordered().first()

    def get_lesson_by_order(self, order):
        """Получить урок по порядковому номеру."""
        return self.get_lessons_ordered().filter(order=order).first()

    # ===== МЕТОДЫ ДЛЯ РАБОТЫ С НОВОЙ АРХИТЕКТУРОЙ (CoursePage) =====

    def get_pages_ordered(self):
        """Получить страницы курса в правильном порядке (новая архитектура)."""
        return CoursePage.objects.filter(course_id=self.id, is_active=True).order_by('order_number')

    def get_first_page(self):
        """Получить первую страницу курса (новая архитектура)."""
        return self.get_pages_ordered().first()

    def get_page_by_order(self, order_number):
        """Получить страницу по порядковому номеру (новая архитектура)."""
        return self.get_pages_ordered().filter(order_number=order_number).first()

    def has_pages(self):
        """Проверить, есть ли у курса страницы (новая архитектура)."""
        return CoursePage.objects.filter(course_id=self.id, is_active=True).exists()

    def has_lessons(self):
        """Проверить, есть ли у курса уроки (старая архитектура)."""
        return self.lessons.filter(is_active=True).exists()

    def get_content_items(self):
        """
        Универсальный метод для получения контента курса.
        Возвращает страницы (CoursePage), если они есть, иначе уроки (Lesson).
        """
        if self.has_pages():
            return self.get_pages_ordered()
        else:
            return self.get_lessons_ordered()
    
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
            'is_free': self.is_free,
            'rating': round(self.get_average_rating(), 1),
            'reviews_count': self.get_reviews_count(),
        }
        
        if detailed:
            # Получаем уроки для детального просмотра
            lessons_data = []
            for lesson in self.get_lessons_ordered():
                lessons_data.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'content_type': lesson.content_type,
                    'content_type_display': lesson.get_content_type_display_name(),
                    'duration': lesson.duration,
                    'order': lesson.order,
                    'is_required': lesson.is_required,
                })

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
                'lessons': lessons_data,
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


class Lesson(models.Model):
    """
    Модель урока курса.

    Урок - это отдельный элемент обучения в рамках курса.
    Поддерживает различные форматы контента: видео, текст, интерактив, смешанный.
    """

    CONTENT_TYPE_CHOICES = [
        ('video', 'Видео'),
        ('text', 'Текст'),
        ('interactive', 'Интерактивный'),
        ('mixed', 'Смешанный'),
        ('webinar', 'Вебинар'),
        ('workshop', 'Мастер-класс'),
    ]

    id = models.AutoField(primary_key=True)

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='lessons',
        verbose_name='Курс'
    )

    title = models.CharField(
        max_length=200,
        verbose_name='Название урока'
    )

    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPE_CHOICES,
        default='video',
        verbose_name='Тип контента'
    )

    # Структура контента зависит от типа (JSON поле для гибкости)
    content = models.JSONField(
        default=dict,
        verbose_name='Контент урока',
        help_text='JSON структура с контентом урока (зависит от типа)',
        validators=[validate_lesson_content]
    )

    # Метаданные урока
    duration = models.PositiveIntegerField(
        default=0,
        help_text='Длительность в минутах',
        verbose_name='Длительность'
    )

    order = models.PositiveIntegerField(
        default=1,
        verbose_name='Порядок в курсе',
        help_text='Порядковый номер урока в курсе'
    )

    is_required = models.BooleanField(
        default=True,
        verbose_name='Обязательный урок',
        help_text='Должен ли быть пройден для завершения курса'
    )

    # Дополнительные материалы
    additional_materials = models.JSONField(
        default=list,
        verbose_name='Дополнительные материалы',
        help_text='Список дополнительных материалов (PDF, ссылки и т.д.)',
        validators=[validate_url_list]
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name='Активен'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lessons'
        verbose_name = 'Урок'
        verbose_name_plural = 'Уроки'
        ordering = ['course', 'order']
        unique_together = [['course', 'order']]
        indexes = [
            models.Index(fields=['course', 'order']),
            models.Index(fields=['content_type']),
        ]

    def __str__(self):
        return f"{self.course.title} - Урок {self.order}: {self.title}"

    def get_content_type_display_name(self):
        """Получить название типа контента."""
        return dict(self.CONTENT_TYPE_CHOICES).get(self.content_type, self.content_type)


class UserCourseProgress(models.Model):
    """
    Прогресс пользователя по курсу.

    Расширенная модель прогресса с привязкой к питомцу.
    Отслеживает детальный прогресс прохождения курса.
    """

    STATUS_CHOICES = [
        ('not_started', 'Не начат'),
        ('in_progress', 'В процессе'),
        ('completed', 'Завершён'),
        ('paused', 'Приостановлен'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор прогресса"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='course_progress',
        verbose_name='Пользователь'
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='user_progress',
        verbose_name='Курс'
    )

    # Привязка к конкретному питомцу для персонализации
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='course_progress',
        verbose_name='Питомец',
        help_text='Питомец, для которого проходит курс'
    )

    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='not_started',
        verbose_name='Статус'
    )

    progress_percent = models.PositiveIntegerField(
        default=0,
        verbose_name='Процент выполнения',
        help_text='Процент завершения курса (0-100)'
    )

    # Временные метки
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата начала'
    )

    last_activity_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Последняя активность'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата завершения'
    )

    # Статистика прохождения
    total_time_spent = models.PositiveIntegerField(
        default=0,
        verbose_name='Общее время обучения',
        help_text='Время в минутах, потраченное на курс'
    )

    completed_lessons_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Завершённых уроков'
    )

    # Список ID завершённых страниц (для page-based курсов)
    completed_pages_ids = models.JSONField(
        default=list,
        blank=True,
        verbose_name='ID завершённых страниц',
        help_text='Список ID завершённых CoursePage для отслеживания прогресса'
    )

    # Настройки пользователя
    notifications_enabled = models.BooleanField(
        default=True,
        verbose_name='Уведомления включены'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_course_progress'
        verbose_name = 'Прогресс по курсу'
        verbose_name_plural = 'Прогресс по курсам'
        unique_together = [['user', 'course', 'pet']]
        ordering = ['-last_activity_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['course', 'status']),
            models.Index(fields=['pet', 'status']),
            models.Index(fields=['status', 'progress_percent']),
        ]

    def __str__(self):
        pet_name = f" ({self.pet.name})" if self.pet else ""
        return f"{self.user.email} - {self.course.title}{pet_name}"

    def update_progress(self):
        """Обновить общий прогресс курса на основе уроков."""
        from django.db.models import Count, Q

        total_lessons = self.course.lessons.filter(is_active=True).count()
        if total_lessons == 0:
            self.progress_percent = 0
            return

        completed_lessons = self.lesson_progress.filter(
            status='completed'
        ).count()

        required_lessons = self.course.lessons.filter(
            is_active=True, is_required=True
        ).count()

        if required_lessons > 0:
            completed_required = self.lesson_progress.filter(
                status='completed',
                lesson__is_required=True
            ).count()
            self.progress_percent = min(100, int((completed_required / required_lessons) * 100))
        else:
            self.progress_percent = min(100, int((completed_lessons / total_lessons) * 100))

        # Обновляем статус
        if self.progress_percent == 100 and self.status != 'completed':
            self.status = 'completed'
            self.completed_at = timezone.now()
        elif self.progress_percent > 0 and self.status == 'not_started':
            self.status = 'in_progress'
            if not self.started_at:
                self.started_at = timezone.now()

        self.save()

    def get_next_lesson(self):
        """Получить следующий урок для прохождения."""
        completed_lesson_ids = self.lesson_progress.filter(
            status='completed'
        ).values_list('lesson_id', flat=True)

        return self.course.lessons.filter(
            is_active=True
        ).exclude(
            id__in=completed_lesson_ids
        ).order_by('order').first()


class UserLessonProgress(models.Model):
    """
    Прогресс пользователя по конкретному уроку.

    Детальный трекинг прохождения каждого урока.
    """

    STATUS_CHOICES = [
        ('not_started', 'Не начат'),
        ('in_progress', 'В процессе'),
        ('viewed', 'Просмотрен'),
        ('completed', 'Завершён'),
        ('skipped', 'Пропущен'),
    ]

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор прогресса урока"
    )

    course_progress = models.ForeignKey(
        UserCourseProgress,
        on_delete=models.CASCADE,
        related_name='lesson_progress',
        verbose_name='Прогресс курса'
    )

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='user_progress',
        verbose_name='Урок'
    )

    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='not_started',
        verbose_name='Статус'
    )

    # Временные метки
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время начала'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Время завершения'
    )

    # Статистика просмотра
    time_spent = models.PositiveIntegerField(
        default=0,
        verbose_name='Время просмотра',
        help_text='Время в секундах, потраченное на урок'
    )

    # Для интерактивных уроков
    attempts_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество попыток',
        help_text='Количество попыток выполнения интерактивных заданий'
    )

    success_rate = models.PositiveIntegerField(
        default=0,
        verbose_name='Процент успешности',
        help_text='Процент успешного выполнения (0-100)'
    )

    # Пользовательские заметки
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Заметки пользователя'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_lesson_progress'
        verbose_name = 'Прогресс по уроку'
        verbose_name_plural = 'Прогресс по урокам'
        unique_together = [['course_progress', 'lesson']]
        ordering = ['lesson__order']
        indexes = [
            models.Index(fields=['course_progress', 'status']),
            models.Index(fields=['lesson', 'status']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.course_progress} - {self.lesson.title}"

    def mark_completed(self, time_spent=None):
        """Отметить урок как завершённый."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if time_spent:
            self.time_spent = time_spent
        self.save()

        # Обновить общий прогресс курса
        self.course_progress.update_progress()


class Comment(models.Model):
    """
    Комментарии к урокам и курсам.

    Поддерживает древовидную структуру для ответов на комментарии.
    """

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор комментария"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Автор'
    )

    # Комментарий может относиться либо к курсу, либо к уроку
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='comments',
        verbose_name='Курс'
    )

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='comments',
        verbose_name='Урок'
    )

    content = models.TextField(
        verbose_name='Текст комментария'
    )

    # Древовидная структура для ответов
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name='Родительский комментарий'
    )

    # Вложения
    attachments = models.JSONField(
        default=list,
        verbose_name='Вложения',
        help_text='Список URL вложений (фото, видео питомца и т.д.)',
        validators=[validate_url_list]
    )

    # Рейтинг комментария
    likes_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество лайков'
    )

    dislikes_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество дизлайков'
    )

    is_moderated = models.BooleanField(
        default=False,
        verbose_name='Промодерирован'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'comments'
        verbose_name = 'Комментарий'
        verbose_name_plural = 'Комментарии'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['course', '-created_at']),
            models.Index(fields=['lesson', '-created_at']),
            models.Index(fields=['parent', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        target = self.course.title if self.course else self.lesson.title
        return f"{self.user.email} - {target}"

    def get_replies(self):
        """Получить все ответы на комментарий."""
        return Comment.objects.filter(parent=self).order_by('created_at')

    def get_user_reaction(self, user):
        """
        Получить реакцию пользователя на комментарий.

        Returns:
            'like', 'dislike' или None
        """
        try:
            like = CommentLike.objects.get(comment=self, user=user)
            return 'like' if like.is_like else 'dislike'
        except CommentLike.DoesNotExist:
            return None

    def add_like(self, user, is_like=True):
        """
        Добавить лайк/дизлайк комментарию.

        Args:
            user: пользователь
            is_like: True для лайка, False для дизлайка

        Returns:
            tuple: (created, was_like)
        """
        like, created = CommentLike.objects.get_or_create(
            comment=self,
            user=user,
            defaults={'is_like': is_like}
        )

        if not created:
            # Если уже существует, обновляем
            was_like = like.is_like
            if like.is_like != is_like:
                like.is_like = is_like
                like.save()
                # Обновляем счетчики
                if is_like:
                    self.likes_count += 1
                    self.dislikes_count -= 1
                else:
                    self.likes_count -= 1
                    self.dislikes_count += 1
                self.save()
                return False, was_like
            # Если та же реакция, удаляем
            else:
                like.delete()
                if is_like:
                    self.likes_count -= 1
                else:
                    self.dislikes_count -= 1
                self.save()
                return False, was_like

        # Новая реакция
        if is_like:
            self.likes_count += 1
        else:
            self.dislikes_count += 1
        self.save()
        return True, None

    def can_edit(self, user):
        """Проверяет, может ли пользователь редактировать комментарий."""
        return self.user == user

    def can_delete(self, user):
        """Проверяет, может ли пользователь удалить комментарий."""
        return self.user == user

    def add_like(self, user):
        """Добавить лайк от пользователя."""
        CommentLike.objects.get_or_create(
            comment=self,
            user=user,
            defaults={'is_like': True}
        )
        self.update_rating()

    def add_dislike(self, user):
        """Добавить дизлайк от пользователя."""
        CommentLike.objects.get_or_create(
            comment=self,
            user=user,
            defaults={'is_like': False}
        )
        self.update_rating()

    def update_rating(self):
        """Обновить счетчики лайков/дизлайков."""
        self.likes_count = CommentLike.objects.filter(
            comment=self, is_like=True
        ).count()
        self.dislikes_count = CommentLike.objects.filter(
            comment=self, is_like=False
        ).count()
        self.save()


class CommentLike(models.Model):
    """
    Лайки/дизлайки комментариев.
    """

    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор лайка"
    )

    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='user_likes',
        verbose_name='Комментарий'
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comment_likes',
        verbose_name='Пользователь'
    )

    is_like = models.BooleanField(
        verbose_name='Лайк (True) или дизлайк (False)'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comment_likes'
        verbose_name = 'Лайк комментария'
        verbose_name_plural = 'Лайки комментариев'
        unique_together = [['comment', 'user']]
        indexes = [
            models.Index(fields=['comment', 'is_like']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        action = "лайкнул" if self.is_like else "дизлайкнул"
        return f"{self.user.email} {action} комментарий {self.comment.id}"


# Модель Rating удалена - система заменена на единую Review


# ===== НОВЫЕ МОДЕЛИ ДЛЯ КОНСТРУКТОРА КУРСОВ =====


class CourseModule(models.Model):
    """
    Модуль (раздел) курса — группирует страницы/уроки.
    Реализует трёхуровневую структуру: Курс → Модуль → Страница (Урок).
    Аналог "Секции" на Stepik.
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='modules',
        verbose_name='Курс',
    )
    title = models.CharField(
        max_length=200,
        verbose_name='Название модуля',
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name='Описание модуля',
    )
    order_number = models.PositiveIntegerField(
        default=1,
        verbose_name='Порядковый номер',
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активен',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_modules'
        verbose_name = 'Модуль курса'
        verbose_name_plural = 'Модули курсов'
        ordering = ['course', 'order_number']
        unique_together = ['course', 'order_number']

    def __str__(self):
        return f"{self.course.title} — Модуль {self.order_number}: {self.title}"

    def get_pages_ordered(self):
        """Получить страницы модуля в правильном порядке."""
        return self.pages.filter(is_active=True).order_by('order_number')


class CoursePage(models.Model):
    """
    Страница курса - контейнер для блоков контента.
    Заменяет монолитную структуру уроков.
    """

    course_id = models.PositiveIntegerField(
        verbose_name='ID курса',
        null=True,
        blank=True,
    )

    module = models.ForeignKey(
        CourseModule,
        on_delete=models.CASCADE,
        related_name='pages',
        null=True,
        blank=True,
        verbose_name='Модуль',
    )

    title = models.CharField(
        max_length=200,
        verbose_name='Название страницы'
    )

    order_number = models.PositiveIntegerField(
        default=1,
        verbose_name='Порядок'
    )

    # Тип страницы (опционально, может наследоваться от course.format_type)
    page_type = models.CharField(
        max_length=20,
        choices=[
            ('text', 'Текстовая'),
            ('video', 'Видео'),
            ('interactive', 'Интерактивная'),
            ('quiz', 'Тест'),
            ('webinar', 'Вебинар'),
            ('assignment', 'Задание'),
        ],
        blank=True,
        null=True,
        verbose_name='Тип страницы'
    )

    # Настройки страницы
    settings = models.JSONField(
        default=dict,
        verbose_name='Настройки страницы',
        help_text='JSON с настройками: required_completion, timer_enabled, allow_skipping и т.д.'
    )

    is_active = models.BooleanField(default=True, verbose_name='Активна')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_pages'
        verbose_name = 'Страница курса'
        verbose_name_plural = 'Страницы курсов'

    def __str__(self):
        return f"Курс {self.course_id} - Страница {self.order_number}: {self.title}"

    def get_blocks_ordered(self):
        """Получить блоки страницы в правильном порядке."""
        return self.blocks.filter(is_active=True).order_by('order')


class ContentBlock(models.Model):
    """
    Универсальный блок контента для страниц курсов.
    Основной строительный элемент конструктора.
    """

    page = models.ForeignKey(
        CoursePage,
        on_delete=models.CASCADE,
        related_name='blocks',
        verbose_name='Страница'
    )

    block_type = models.CharField(
        max_length=30,
        choices=[
            # Текстовые
            ('rich_text', 'Форматированный текст'),
            ('image', 'Изображение'),
            ('gallery', 'Галерея'),
            ('file_download', 'Файл для скачивания'),

            # Медиа
            ('video_player', 'Видео-плеер'),
            ('audio_player', 'Аудио-плеер'),
            ('embed', 'Встраиваемый контент'),

            # Интерактивные
            ('quiz', 'Тест/Викторина'),
            ('poll', 'Опрос'),
            ('checklist', 'Чек-лист'),
            ('timer', 'Таймер'),

            # Специализированные
            ('pet_action', 'Действие с питомцем'),
            ('progress_tracker', 'Трекер прогресса'),
            ('comment_section', 'Комментарии'),
            ('rating', 'Оценка'),
        ],
        verbose_name='Тип блока'
    )

    # Универсальное поле для данных блока
    content = models.JSONField(
        default=dict,
        verbose_name='Содержимое блока',
        help_text='JSON с данными блока (зависит от типа)',
        validators=[validate_content_block_content]
    )

    # Настройки конкретного блока
    settings = models.JSONField(
        default=dict,
        verbose_name='Настройки блока',
        help_text='JSON с настройками блока',
        validators=[validate_content_block_settings]
    )

    # Порядок в странице
    order = models.PositiveIntegerField(default=1, verbose_name='Порядок')

    is_active = models.BooleanField(default=True, verbose_name='Активен')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'content_blocks'
        verbose_name = 'Блок контента'
        verbose_name_plural = 'Блоки контента'
        ordering = ['page', 'order']
        unique_together = [['page', 'order']]
        indexes = [
            models.Index(fields=['page', 'order']),
            models.Index(fields=['block_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"Блок {self.block_type} (страница {self.page.title})"

    def get_block_type_display(self):
        """Получить название типа блока."""
        return dict(self._meta.get_field('block_type').choices).get(self.block_type, self.block_type)


class BlockTemplate(models.Model):
    """
    Шаблоны блоков для переиспользования.
    Позволяет сохранять часто используемые блоки.
    """

    name = models.CharField(max_length=200, verbose_name='Название шаблона')
    description = models.TextField(blank=True, verbose_name='Описание')

    BLOCK_TYPE_CHOICES = [
        ('rich_text', 'Форматированный текст'),
        ('image', 'Изображение'),
        ('gallery', 'Галерея'),
        ('file_download', 'Файл для скачивания'),
        ('video_player', 'Видео-плеер'),
        ('audio_player', 'Аудио-плеер'),
        ('embed', 'Встраиваемый контент'),
        ('quiz', 'Тест/Викторина'),
        ('poll', 'Опрос'),
        ('checklist', 'Чек-лист'),
        ('timer', 'Таймер'),
        ('pet_action', 'Действие с питомцем'),
        ('progress_tracker', 'Трекер прогресса'),
        ('comment_section', 'Комментарии'),
        ('rating', 'Оценка'),
    ]

    block_type = models.CharField(
        max_length=30,
        choices=BLOCK_TYPE_CHOICES,
        verbose_name='Тип блока'
    )

    content = models.JSONField(
        default=dict,
        verbose_name='Содержимое',
        help_text='JSON с данными блока',
        validators=[validate_content_block_content]
    )

    settings = models.JSONField(
        default=dict,
        verbose_name='Настройки',
        help_text='JSON с настройками блока',
        validators=[validate_content_block_settings]
    )

    # Категоризация шаблонов
    category = models.CharField(
        max_length=50,
        choices=[
            ('text', 'Текстовые'),
            ('media', 'Медиа'),
            ('interactive', 'Интерактивные'),
            ('pet_specific', 'Для питомцев'),
            ('utility', 'Утилиты'),
        ],
        default='text',
        verbose_name='Категория'
    )

    is_public = models.BooleanField(default=True, verbose_name='Публичный шаблон')

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='block_templates',
        verbose_name='Создатель'
    )

    usage_count = models.PositiveIntegerField(default=0, verbose_name='Количество использований')
    is_active = models.BooleanField(default=True, verbose_name='Активен')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'block_templates'
        verbose_name = 'Шаблон блока'
        verbose_name_plural = 'Шаблоны блоков'
        ordering = ['-usage_count', 'name']
        indexes = [
            models.Index(fields=['block_type']),
            models.Index(fields=['category']),
            models.Index(fields=['is_public']),
            models.Index(fields=['-usage_count']),
        ]

    def __str__(self):
        return f"Шаблон: {self.name} ({self.block_type})"

    def increment_usage(self):
        """Увеличить счетчик использования."""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])

    def create_block_from_template(self, page, order=None):
        """
        Создать блок на основе шаблона.

        Args:
            page: CoursePage для создания блока
            order: Порядок блока (опционально)

        Returns:
            ContentBlock: Созданный блок
        """
        if order is None:
            # Найти максимальный порядок на странице
            max_order = page.blocks.aggregate(models.Max('order'))['order__max'] or 0
            order = max_order + 1

        block = ContentBlock.objects.create(
            page=page,
            block_type=self.block_type,
            content=self.content.copy(),  # Глубокое копирование
            settings=self.settings.copy(),
            order=order
        )

        self.increment_usage()
        return block