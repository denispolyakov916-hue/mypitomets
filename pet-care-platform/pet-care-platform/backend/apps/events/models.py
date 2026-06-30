"""
Модели «Новости и Мероприятия» — публичный контент платформы.

Отдельно от ``apps.pets.CalendarEvent`` (тот питомец-скоупный, 1 питомец ↔ 1
пользователь). Здесь — ОБЩИЕ мероприятия (сходки/встречи/выставки/вебинары) и
новости, которые создаёт и публикует владелец. UUID7 PK, картинки — URL из
существующего S3-аплоада (как в shop), slug автогенерится из кириллицы.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from unidecode import unidecode

from core.utils import generate_uuid7


def _unique_slug(model_cls, title, instance_pk=None):
    """Уникальный slug из заголовка (с транслитерацией кириллицы)."""
    base = slugify(unidecode(title or '')) or 'item'
    slug = base
    i = 2
    qs = model_cls.objects.exclude(pk=instance_pk) if instance_pk else model_cls.objects.all()
    while qs.filter(slug=slug).exists():
        slug = f'{base}-{i}'
        i += 1
    return slug


class Event(models.Model):
    """Мероприятие: сходка/встреча/выставка/вебинар/мастер-класс/лекция."""

    EVENT_TYPES = [
        ('meetup', 'Сходка/встреча'),
        ('exhibition', 'Выставка'),
        ('webinar', 'Вебинар'),
        ('workshop', 'Мастер-класс'),
        ('lecture', 'Лекция'),
        ('other', 'Другое'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('published', 'Опубликовано'),
        ('cancelled', 'Отменено'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    title = models.CharField('Заголовок', max_length=200)
    slug = models.SlugField('Slug (URL)', max_length=220, unique=True, db_index=True, blank=True,
                            help_text='Можно оставить пустым — сгенерируется из заголовка.')
    summary = models.CharField('Краткое описание', max_length=300, blank=True)
    description = models.TextField('Описание', blank=True)
    event_type = models.CharField('Тип', max_length=20, choices=EVENT_TYPES, default='meetup', db_index=True)
    cover_image_url = models.URLField('Обложка (URL)', max_length=500, blank=True)
    start_at = models.DateTimeField('Начало', db_index=True)
    end_at = models.DateTimeField('Окончание', null=True, blank=True)
    is_online = models.BooleanField('Онлайн', default=False)
    location = models.CharField('Место', max_length=200, blank=True)
    online_url = models.URLField('Ссылка (онлайн)', max_length=500, blank=True)
    status = models.CharField('Статус', max_length=12, choices=STATUS_CHOICES, default='draft', db_index=True)
    is_featured = models.BooleanField('На главной', default=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='authored_events', verbose_name='Автор')
    published_at = models.DateTimeField('Опубликовано', null=True, blank=True)
    created_at = models.DateTimeField('Создано', default=timezone.now)
    updated_at = models.DateTimeField('Обновлено', auto_now=True)

    class Meta:
        db_table = 'events'
        ordering = ['start_at']
        indexes = [
            models.Index(fields=['status', 'start_at']),
            models.Index(fields=['event_type', 'status']),
        ]
        verbose_name = 'Мероприятие'
        verbose_name_plural = 'Мероприятия'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(Event, self.title, self.pk)
        if self.status == 'published' and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def to_dict(self):
        return {
            'id': str(self.id),
            'title': self.title,
            'slug': self.slug,
            'summary': self.summary,
            'description': self.description,
            'event_type': self.event_type,
            'event_type_display': self.get_event_type_display(),
            'cover_image_url': self.cover_image_url or None,
            'start_at': self.start_at.isoformat() if self.start_at else None,
            'end_at': self.end_at.isoformat() if self.end_at else None,
            'is_online': self.is_online,
            'location': self.location,
            'online_url': self.online_url or None,
            'status': self.status,
            'is_featured': self.is_featured,
            'published_at': self.published_at.isoformat() if self.published_at else None,
        }


class NewsPost(models.Model):
    """Новость/публикация."""

    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('published', 'Опубликовано'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    title = models.CharField('Заголовок', max_length=200)
    slug = models.SlugField('Slug (URL)', max_length=220, unique=True, db_index=True, blank=True,
                            help_text='Можно оставить пустым — сгенерируется из заголовка.')
    excerpt = models.CharField('Анонс', max_length=300, blank=True)
    body = models.TextField('Текст', blank=True)
    cover_image_url = models.URLField('Обложка (URL)', max_length=500, blank=True)
    category = models.CharField('Категория', max_length=40, blank=True, db_index=True)
    status = models.CharField('Статус', max_length=12, choices=STATUS_CHOICES, default='draft', db_index=True)
    is_featured = models.BooleanField('На главной', default=False)
    related_event = models.ForeignKey('Event', on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='news', verbose_name='Связанное мероприятие')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='authored_news', verbose_name='Автор')
    published_at = models.DateTimeField('Опубликовано', null=True, blank=True, db_index=True)
    created_at = models.DateTimeField('Создано', default=timezone.now)
    updated_at = models.DateTimeField('Обновлено', auto_now=True)

    class Meta:
        db_table = 'news_posts'
        ordering = ['-published_at', '-created_at']
        indexes = [models.Index(fields=['status', 'published_at'])]
        verbose_name = 'Новость'
        verbose_name_plural = 'Новости'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = _unique_slug(NewsPost, self.title, self.pk)
        if self.status == 'published' and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def to_dict(self, with_body=True):
        data = {
            'id': str(self.id),
            'title': self.title,
            'slug': self.slug,
            'excerpt': self.excerpt,
            'cover_image_url': self.cover_image_url or None,
            'category': self.category,
            'status': self.status,
            'is_featured': self.is_featured,
            'related_event_slug': self.related_event.slug if self.related_event_id else None,
            'published_at': self.published_at.isoformat() if self.published_at else None,
        }
        if with_body:
            data['body'] = self.body
        return data
