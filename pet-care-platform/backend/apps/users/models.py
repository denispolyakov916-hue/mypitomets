"""
Модели для приложения пользователей

Кастомная модель User с поддержкой UUIDv7 и Argon2id хэширования паролей.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from core.utils import generate_uuid7


class UserManager(BaseUserManager):
    """Менеджер для кастомной модели User."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Создание обычного пользователя."""
        if not email:
            raise ValueError('Email обязателен для создания пользователя')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Создание суперпользователя."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Суперпользователь должен иметь is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Суперпользователь должен иметь is_superuser=True')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя с UUIDv7 идентификатором.
    
    Использует email как уникальный идентификатор для входа.
    Пароли хэшируются с использованием Argon2id (настроено в settings.py).
    """
    
    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False,
        help_text="UUIDv7 идентификатор пользователя"
    )
    
    email = models.EmailField(
        unique=True,
        max_length=255,
        help_text="Email адрес (используется как логин)"
    )
    
    # Дополнительные поля профиля
    first_name = models.CharField(max_length=150, blank=True, verbose_name='Имя')
    last_name = models.CharField(max_length=150, blank=True, verbose_name='Фамилия')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    default_address = models.TextField(blank=True, verbose_name='Адрес доставки по умолчанию')
    
    is_active = models.BooleanField(
        default=True,
        help_text="Активен ли аккаунт"
    )
    
    is_staff = models.BooleanField(
        default=False,
        help_text="Имеет ли доступ к админ-панели"
    )
    
    date_joined = models.DateTimeField(
        default=timezone.now,
        help_text="Дата регистрации"
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
        db_table = 'users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return self.email
    
    def get_short_name(self):
        return self.email.split('@')[0]
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'default_address': self.default_address,
            'date_joined': self.date_joined.isoformat() if self.date_joined else None
        }
