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
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя.
    
    Использует email вместо username для аутентификации.
    UUID в качестве первичного ключа для безопасности.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name='Email')
    
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
    
    def to_dict(self):
        """Сериализация для API (DTO)."""
        return {
            'id': str(self.id),
            'email': self.email,
            'isActivated': self.is_activated,
        }
    
    def to_dict_full(self):
        """Полная сериализация для API."""
        return {
            'id': str(self.id),
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'default_address': self.default_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'isActivated': self.is_activated,
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
