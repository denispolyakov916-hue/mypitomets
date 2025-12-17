"""
Модели для профилей питомцев (PetID)

PetID - центральная сущность платформы Питомец+.
Содержит всю информацию о питомце.
"""

import uuid
from django.db import models
from django.conf import settings


class Pet(models.Model):
    """
    Модель профиля питомца.
    
    Связана с пользователем через ForeignKey.
    Поддерживает различные виды животных.
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
        ('bird', 'Птица'),
        ('rodent', 'Грызун'),
        ('fish', 'Рыбка'),
        ('reptile', 'Рептилия'),
        ('other', 'Другое'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Самец'),
        ('female', 'Самка'),
        ('unknown', 'Не указан'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets',
        verbose_name='Владелец'
    )
    
    name = models.CharField(max_length=100, verbose_name='Кличка')
    species = models.CharField(
        max_length=20,
        choices=SPECIES_CHOICES,
        verbose_name='Вид'
    )
    breed = models.CharField(max_length=100, blank=True, null=True, verbose_name='Порода')
    date_of_birth = models.DateField(blank=True, null=True, verbose_name='Дата рождения')
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name='Вес (кг)'
    )
    
    # Дополнительные поля базового паспорта
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        default='unknown',
        verbose_name='Пол'
    )
    is_neutered = models.BooleanField(default=False, verbose_name='Кастрирован/Стерилизован')
    photo = models.ImageField(
        upload_to='pets/photos/',
        blank=True,
        null=True,
        verbose_name='Фото'
    )
    
    # Вкусовые предпочтения и аллергии
    favorite_foods = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Любимые продукты/корма',
        help_text='Список названий продуктов или кормов, которые любит питомец'
    )
    allergies = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Аллергии',
        help_text='Список продуктов или ингредиентов, на которые у питомца аллергия'
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    class Meta:
        db_table = 'pets'
        verbose_name = 'Питомец'
        verbose_name_plural = 'Питомцы'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    def to_dict(self):
        """Сериализация для API."""
        # Обработка date_of_birth - может быть date объектом или строкой
        dob = None
        if self.date_of_birth:
            if hasattr(self.date_of_birth, 'isoformat'):
                dob = self.date_of_birth.isoformat()
            else:
                dob = str(self.date_of_birth)
        
        # Обработка фото - возвращаем URL если есть
        photo_url = None
        if self.photo:
            try:
                photo_url = self.photo.url
            except (ValueError, AttributeError):
                photo_url = None
        
        return {
            'id': str(self.id),
            'owner_id': str(self.owner_id),
            'name': self.name,
            'species': self.species,
            'breed': self.breed if self.breed else None,
            'date_of_birth': dob,
            'weight': float(self.weight) if self.weight is not None else None,
            'gender': self.gender,
            'is_neutered': self.is_neutered,
            'photo': photo_url,
            'favorite_foods': self.favorite_foods if self.favorite_foods else [],
            'allergies': self.allergies if self.allergies else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
