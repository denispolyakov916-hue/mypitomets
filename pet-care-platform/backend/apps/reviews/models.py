"""
Модели для системы рейтингов и отзывов.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class Review(models.Model):
    """
    Отзыв на товар или курс.
    
    Пользователь может оставить только один отзыв на каждый товар/курс.
    Отзыв можно редактировать и удалять.
    """
    
    REVIEW_TYPE_CHOICES = [
        ('product', 'Отзыв на товар'),
        ('course', 'Отзыв на курс'),
    ]
    
    id = models.AutoField(primary_key=True)
    
    # Тип отзыва и связь с объектом
    review_type = models.CharField(
        max_length=20,
        choices=REVIEW_TYPE_CHOICES,
        verbose_name='Тип отзыва'
    )
    product = models.ForeignKey(
        'shop.Product',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name='Товар'
    )
    course = models.ForeignKey(
        'training.Course',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name='Курс'
    )
    
    # Пользователь
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='Пользователь'
    )
    
    # Рейтинг (1-5)
    rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='Рейтинг'
    )
    
    # Комментарий
    comment = models.TextField(
        max_length=2000,
        blank=True,
        null=True,
        verbose_name='Комментарий'
    )
    
    # Подтверждение покупки
    is_verified_purchase = models.BooleanField(
        default=False,
        verbose_name='Подтвержденная покупка',
        help_text='Отмечает, что пользователь действительно приобрел товар/курс'
    )
    
    # Модерация
    is_approved = models.BooleanField(
        default=True,
        verbose_name='Одобрен',
        help_text='Отзыв виден всем пользователям'
    )
    is_edited = models.BooleanField(
        default=False,
        verbose_name='Отредактирован'
    )
    
    # Временные метки
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлен')
    
    class Meta:
        db_table = 'reviews'
        verbose_name = 'Отзыв'
        verbose_name_plural = 'Отзывы'
        ordering = ['-created_at']
        # Один отзыв от пользователя на товар/курс
        # Ограничения уникальности будут добавлены в миграции
        indexes = [
            models.Index(fields=['product', 'is_approved']),
            models.Index(fields=['course', 'is_approved']),
            models.Index(fields=['user', 'review_type']),
        ]
    
    def __str__(self):
        item = self.product or self.course
        return f"Отзыв от {self.user.email} на {item}"
    
    def clean(self):
        """Валидация: должен быть указан либо product, либо course."""
        if not self.product and not self.course:
            raise ValidationError('Необходимо указать товар или курс')
        if self.product and self.course:
            raise ValidationError('Нельзя указывать и товар, и курс одновременно')
        
        # Устанавливаем review_type автоматически
        if self.product:
            self.review_type = 'product'
        elif self.course:
            self.review_type = 'course'
    
    def save(self, *args, **kwargs):
        """Переопределяем save для вызова clean и проверки уникальности."""
        self.clean()
        
        # Проверка уникальности на уровне Python (дополнительно к БД)
        existing_review = None
        if self.product_id:
            existing_review = Review.objects.filter(
                user=self.user,
                product_id=self.product_id
            ).exclude(pk=self.pk).first()
        elif self.course_id:
            existing_review = Review.objects.filter(
                user=self.user,
                course_id=self.course_id
            ).exclude(pk=self.pk).first()
        
        if existing_review:
            raise ValidationError('Вы уже оставили отзыв на этот товар/курс')
        
        super().save(*args, **kwargs)
    
    # Ответ (reply) на другой отзыв
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name='Родительский отзыв',
    )

    # Счётчики лайков/дизлайков
    likes_count = models.PositiveIntegerField(default=0, verbose_name='Лайки')
    dislikes_count = models.PositiveIntegerField(default=0, verbose_name='Дизлайки')

    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'user_name': self.user.first_name or self.user.email.split('@')[0],
            'rating': self.rating,
            'comment': self.comment,
            'is_verified_purchase': self.is_verified_purchase,
            'is_edited': self.is_edited,
            'likes_count': self.likes_count,
            'dislikes_count': self.dislikes_count,
            'parent_id': self.parent_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class ReviewLike(models.Model):
    """
    Лайк/дизлайк на отзыв.
    Один пользователь — одна реакция на отзыв.
    """
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='reactions',
        verbose_name='Отзыв',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='review_reactions',
        verbose_name='Пользователь',
    )
    is_like = models.BooleanField(verbose_name='Лайк (True) / Дизлайк (False)')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_likes'
        verbose_name = 'Реакция на отзыв'
        verbose_name_plural = 'Реакции на отзывы'
        unique_together = ['review', 'user']

    def __str__(self):
        return f"{'Like' if self.is_like else 'Dislike'} от {self.user.email} на отзыв #{self.review_id}"

