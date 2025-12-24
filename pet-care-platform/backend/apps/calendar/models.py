"""
Модели для системы календаря событий питомцев.
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class CalendarEvent(models.Model):
    """
    Событие в календаре питомца.
    """

    EVENT_TYPES = [
        ('veterinary', 'Ветеринарный визит'),
        ('vaccination', 'Прививка'),
        ('grooming', 'Уход за шерстью'),
        ('birthday', 'День рождения'),
        ('medication', 'Приём лекарств'),
        ('training', 'Тренировка'),
        ('walking', 'Прогулка'),
        ('feeding', 'Кормление'),
        ('other', 'Другое'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('urgent', 'Срочный'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Запланировано'),
        ('completed', 'Выполнено'),
        ('cancelled', 'Отменено'),
        ('missed', 'Пропущено'),
    ]

    # Основная информация
    title = models.CharField('Название события', max_length=200)
    description = models.TextField('Описание', blank=True)

    # Связи
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='calendar_events',
        verbose_name='Питомец'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_events',
        verbose_name='Владелец'
    )

    # Тип и приоритет
    event_type = models.CharField(
        'Тип события',
        max_length=20,
        choices=EVENT_TYPES,
        default='other'
    )
    priority = models.CharField(
        'Приоритет',
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )

    # Дата и время
    start_date = models.DateField('Дата начала')
    start_time = models.TimeField('Время начала', null=True, blank=True)
    end_date = models.DateField('Дата окончания', null=True, blank=True)
    end_time = models.TimeField('Время окончания', null=True, blank=True)

    # Статус и напоминания
    status = models.CharField(
        'Статус',
        max_length=10,
        choices=STATUS_CHOICES,
        default='scheduled'
    )
    is_recurring = models.BooleanField('Повторяющееся событие', default=False)
    recurrence_rule = models.CharField('Правило повторения', max_length=100, blank=True)

    # Уведомления
    notify_before = models.PositiveIntegerField(
        'Напомнить за (минут)',
        default=60,
        validators=[MinValueValidator(0), MaxValueValidator(1440)]
    )
    email_notification = models.BooleanField('Уведомление по email', default=True)
    push_notification = models.BooleanField('Push-уведомление', default=True)

    # Дополнительная информация
    location = models.CharField('Место проведения', max_length=200, blank=True)
    cost = models.DecimalField(
        'Стоимость',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    notes = models.TextField('Заметки', blank=True)

    # Системные поля
    created_at = models.DateTimeField('Создано', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлено', auto_now=True)
    completed_at = models.DateTimeField('Завершено', null=True, blank=True)

    class Meta:
        verbose_name = 'Событие календаря'
        verbose_name_plural = 'События календаря'
        ordering = ['start_date', 'start_time']

    def __str__(self):
        return f"{self.pet.name}: {self.title}"

    @property
    def is_past(self):
        """Проверка, прошло ли событие."""
        now = timezone.now()
        if self.start_time:
            event_datetime = timezone.datetime.combine(self.start_date, self.start_time)
            event_datetime = timezone.make_aware(event_datetime)
            return event_datetime < now
        return self.start_date < now.date()

    @property
    def is_today(self):
        """Проверка, происходит ли событие сегодня."""
        return self.start_date == timezone.now().date()

    @property
    def is_upcoming(self):
        """Проверка, предстоящее ли событие."""
        return not self.is_past and self.status == 'scheduled'

    def mark_completed(self):
        """Отметить событие как выполненное."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()

    def cancel_event(self):
        """Отменить событие."""
        self.status = 'cancelled'
        self.save()


class EventReminder(models.Model):
    """
    Напоминание о событии.
    """

    REMINDER_TYPES = [
        ('email', 'Email'),
        ('push', 'Push-уведомление'),
        ('sms', 'SMS'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('sent', 'Отправлено'),
        ('failed', 'Ошибка'),
    ]

    event = models.ForeignKey(
        CalendarEvent,
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name='Событие'
    )

    reminder_type = models.CharField(
        'Тип напоминания',
        max_length=10,
        choices=REMINDER_TYPES
    )

    scheduled_at = models.DateTimeField('Запланировано на')
    sent_at = models.DateTimeField('Отправлено', null=True, blank=True)

    status = models.CharField(
        'Статус',
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )

    error_message = models.TextField('Ошибка', blank=True)

    created_at = models.DateTimeField('Создано', auto_now_add=True)

    class Meta:
        verbose_name = 'Напоминание'
        verbose_name_plural = 'Напоминания'
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.event.title} - {self.get_reminder_type_display()}"
