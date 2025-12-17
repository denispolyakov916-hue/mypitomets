"""
Модели для модуля обучения (Курсы)

Включает: Course, UserCourse (связь пользователь-курс)
"""

from django.db import models
from django.conf import settings


class Course(models.Model):
    """
    Модель образовательного курса.
    
    Курсы могут быть бесплатными (price=0) или платными.
    """
    
    PET_TYPE_CHOICES = [
        ('dog', 'Для собак'),
        ('cat', 'Для кошек'),
        ('all', 'Для всех'),
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
    
    is_active = models.BooleanField(default=True, verbose_name='Активен')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'courses'
        verbose_name = 'Курс'
        verbose_name_plural = 'Курсы'
        ordering = ['title']
    
    def __str__(self):
        return self.title
    
    @property
    def is_free(self):
        """Является ли курс бесплатным."""
        return self.price == 0
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'duration': self.duration,
            'price': float(self.price),
            'image_url': self.image_url,
            'pet_type': self.pet_type,
            'is_free': self.is_free
        }


class UserCourse(models.Model):
    """
    Связь пользователя с курсом.
    
    Отслеживает приобретённые курсы и прогресс прохождения.
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
        unique_together = ['user', 'course']
    
    def __str__(self):
        return f"{self.user.email} - {self.course.title}"
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'course': self.course.to_dict(),
            'purchased_at': self.purchased_at.isoformat() if self.purchased_at else None,
            'progress': self.progress
        }
