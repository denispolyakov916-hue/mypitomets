"""
Модели для системы напоминаний по уходу за питомцами.
"""

import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


class ReminderCategory(models.TextChoices):
    """Категории напоминаний."""
    FEEDING = 'feeding', 'Кормление'
    MEDICATION = 'medication', 'Лекарства'
    VACCINATION = 'vaccination', 'Вакцинация'
    VET_VISIT = 'vet_visit', 'Посещение ветеринара'
    GROOMING = 'grooming', 'Уход за шерстью'
    WALK = 'walk', 'Прогулка'
    TRAINING = 'training', 'Тренировка'
    HYGIENE = 'hygiene', 'Гигиена'
    OTHER = 'other', 'Другое'


class ReminderFrequency(models.TextChoices):
    """Частота повторения напоминаний."""
    ONCE = 'once', 'Однократно'
    DAILY = 'daily', 'Ежедневно'
    WEEKLY = 'weekly', 'Еженедельно'
    BIWEEKLY = 'biweekly', 'Раз в две недели'
    MONTHLY = 'monthly', 'Ежемесячно'
    QUARTERLY = 'quarterly', 'Раз в квартал'
    YEARLY = 'yearly', 'Ежегодно'


class Reminder(models.Model):
    """
    Модель напоминания для ухода за питомцем.
    
    Позволяет пользователям создавать напоминания о:
    - Кормлении
    - Приёме лекарств
    - Вакцинации
    - Посещении ветеринара
    - Уходе за шерстью
    - Прогулках
    - И других важных событиях
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name='Владелец'
    )
    
    pet = models.ForeignKey(
        'pets.Pet',
        on_delete=models.CASCADE,
        related_name='reminders',
        verbose_name='Питомец'
    )
    
    title = models.CharField(
        max_length=255,
        verbose_name='Название'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='Описание'
    )
    
    category = models.CharField(
        max_length=20,
        choices=ReminderCategory.choices,
        default=ReminderCategory.OTHER,
        verbose_name='Категория'
    )
    
    frequency = models.CharField(
        max_length=20,
        choices=ReminderFrequency.choices,
        default=ReminderFrequency.ONCE,
        verbose_name='Частота повторения'
    )
    
    # Время напоминания
    reminder_date = models.DateField(
        verbose_name='Дата напоминания'
    )
    
    reminder_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name='Время напоминания'
    )
    
    # Статус
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активно'
    )
    
    is_completed = models.BooleanField(
        default=False,
        verbose_name='Выполнено'
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата выполнения'
    )
    
    # Настройки уведомлений
    notify_email = models.BooleanField(
        default=True,
        verbose_name='Уведомлять по email'
    )
    
    notify_push = models.BooleanField(
        default=True,
        verbose_name='Push-уведомление'
    )
    
    # Напоминать заранее (в минутах)
    notify_before = models.PositiveIntegerField(
        default=60,
        verbose_name='Напоминать за (минут)'
    )
    
    # Системные поля
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Обновлено')
    
    class Meta:
        db_table = 'reminders'
        verbose_name = 'Напоминание'
        verbose_name_plural = 'Напоминания'
        ordering = ['reminder_date', 'reminder_time']
    
    def __str__(self):
        return f"{self.title} - {self.pet.name}"
    
    @property
    def is_overdue(self):
        """Проверяет, просрочено ли напоминание."""
        if self.is_completed:
            return False
        now = timezone.now()
        reminder_datetime = timezone.make_aware(
            timezone.datetime.combine(self.reminder_date, self.reminder_time or timezone.datetime.min.time())
        )
        return reminder_datetime < now
    
    @property
    def is_upcoming(self):
        """Проверяет, является ли напоминание предстоящим (в ближайшие 24 часа)."""
        if self.is_completed:
            return False
        now = timezone.now()
        reminder_datetime = timezone.make_aware(
            timezone.datetime.combine(self.reminder_date, self.reminder_time or timezone.datetime.min.time())
        )
        return now <= reminder_datetime <= now + timedelta(hours=24)
    
    def mark_completed(self):
        """Отмечает напоминание как выполненное."""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=['is_completed', 'completed_at', 'updated_at'])
        
        # Если это повторяющееся напоминание, создаём следующее
        if self.frequency != ReminderFrequency.ONCE:
            self.create_next_reminder()
    
    def create_next_reminder(self):
        """Создаёт следующее напоминание для повторяющихся событий."""
        next_date = self.reminder_date
        
        if self.frequency == ReminderFrequency.DAILY:
            next_date += timedelta(days=1)
        elif self.frequency == ReminderFrequency.WEEKLY:
            next_date += timedelta(weeks=1)
        elif self.frequency == ReminderFrequency.BIWEEKLY:
            next_date += timedelta(weeks=2)
        elif self.frequency == ReminderFrequency.MONTHLY:
            next_date += timedelta(days=30)
        elif self.frequency == ReminderFrequency.QUARTERLY:
            next_date += timedelta(days=90)
        elif self.frequency == ReminderFrequency.YEARLY:
            next_date += timedelta(days=365)
        else:
            return None
        
        return Reminder.objects.create(
            user=self.user,
            pet=self.pet,
            title=self.title,
            description=self.description,
            category=self.category,
            frequency=self.frequency,
            reminder_date=next_date,
            reminder_time=self.reminder_time,
            is_active=True,
            notify_email=self.notify_email,
            notify_push=self.notify_push,
            notify_before=self.notify_before,
        )
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'pet_id': str(self.pet.id),
            'pet_name': self.pet.name,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'category_display': self.get_category_display(),
            'frequency': self.frequency,
            'frequency_display': self.get_frequency_display(),
            'reminder_date': self.reminder_date.isoformat(),
            'reminder_time': self.reminder_time.isoformat() if self.reminder_time else None,
            'is_active': self.is_active,
            'is_completed': self.is_completed,
            'is_overdue': self.is_overdue,
            'is_upcoming': self.is_upcoming,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notify_email': self.notify_email,
            'notify_push': self.notify_push,
            'notify_before': self.notify_before,
            'created_at': self.created_at.isoformat(),
        }

