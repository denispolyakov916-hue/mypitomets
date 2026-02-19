"""
Модели пользователей для платформы Питомец+

Использует кастомную модель User с UUID первичным ключом
и email в качестве основного идентификатора.
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class UserManager(BaseUserManager):
    """Менеджер для кастомной модели User."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Создание обычного пользователя."""
        if not email:
            raise ValueError('Email обязателен')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Создание суперпользователя."""
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя.
    
    Использует email вместо username для аутентификации.
    UUID в качестве первичного ключа для безопасности.
    Роль определяется полем role; is_staff/is_superuser синхронизируются автоматически.
    """

    ROLE_CHOICES = [
        ('user', 'Пользователь'),
        ('course_creator', 'Создатель курсов'),
        ('admin', 'Администратор'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name='Email')
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='user',
        db_index=True,
        verbose_name='Роль',
    )
    
    # Дополнительные поля профиля
    first_name = models.CharField(max_length=150, blank=True, verbose_name='Имя')
    last_name = models.CharField(max_length=150, blank=True, verbose_name='Фамилия')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    default_address = models.TextField(blank=True, verbose_name='Адрес доставки по умолчанию')
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Поля для активации через email
    is_activated = models.BooleanField(
        default=False,
        help_text="Активирован ли аккаунт через email"
    )
    
    activation_link = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text="Ссылка для активации аккаунта"
    )
    
    activation_code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text="Код активации (6 цифр) для подтверждения email"
    )

    password_reset_code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
        help_text="Код восстановления пароля (6 цифр)"
    )

    code_created_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Время создания кода активации для проверки срока действия"
    )

    password_reset_code_created_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Время создания кода восстановления пароля для проверки срока действия"
    )

    # Расширенные настройки профиля
    avatar = models.ImageField(
        upload_to='users/avatars/',
        blank=True,
        null=True,
        verbose_name='Аватар'
    )
    bio = models.TextField(blank=True, verbose_name='О себе')
    date_of_birth = models.DateField(blank=True, null=True, verbose_name='Дата рождения')
    city = models.CharField(max_length=100, blank=True, verbose_name='Город')
    website = models.URLField(blank=True, verbose_name='Сайт')

    # Настройки уведомлений
    email_notifications = models.BooleanField(default=True, verbose_name='Email уведомления')
    push_notifications = models.BooleanField(default=True, verbose_name='Push уведомления')
    order_notifications = models.BooleanField(default=True, verbose_name='Уведомления о заказах')
    marketing_notifications = models.BooleanField(default=False, verbose_name='Маркетинговые уведомления')

    # Предпочтения персонализации
    preferred_pet_types = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Предпочитаемые типы питомцев',
        help_text='Список предпочитаемых типов питомцев для персонализации'
    )

    created_at = models.DateTimeField(default=timezone.now, verbose_name='Дата регистрации')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if self.role == 'admin':
            self.is_staff = True
            self.is_superuser = True
        else:
            self.is_staff = False
            self.is_superuser = False
        super().save(*args, **kwargs)
    
    def to_dict(self):
        """Сериализация для API (DTO)."""
        return {
            'id': str(self.id),
            'email': self.email,
            'role': self.role,
            'isActivated': self.is_activated,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
        }
    
    def to_dict_full(self):
        """Полная сериализация для API."""
        # Обработка аватара
        avatar_url = None
        if self.avatar:
            try:
                avatar_url = self.avatar.url
            except (ValueError, AttributeError):
                avatar_url = None

        return {
            'id': str(self.id),
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'default_address': self.default_address,
            'avatar': avatar_url,
            'bio': self.bio,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'city': self.city,
            'website': self.website,
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'order_notifications': self.order_notifications,
            'marketing_notifications': self.marketing_notifications,
            'preferred_pet_types': self.preferred_pet_types,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'isActivated': self.is_activated,
            'role': self.role,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
        }


class Token(models.Model):
    """
    Модель для хранения refresh токенов пользователей.
    
    Хранит refresh токены в базе данных для возможности их отзыва
    и проверки валидности при обновлении access токенов.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tokens',
        help_text="Пользователь, которому принадлежит токен"
    )
    
    refresh_token = models.TextField(
        unique=True,
        help_text="Refresh токен (JWT строка)"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Дата создания токена"
    )
    
    class Meta:
        verbose_name = 'Токен'
        verbose_name_plural = 'Токены'
        db_table = 'tokens'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Token for {self.user.email}"
