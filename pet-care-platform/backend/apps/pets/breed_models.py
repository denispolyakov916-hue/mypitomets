"""
Модель справочника пород для системы PetID.

Содержит полные данные о породах собак и кошек для:
- Автозаполнения характеристик при создании PetID
- Персонализации рекомендаций
- Анализа здоровья и рисков
"""

from django.db import models
from django.utils.text import slugify
from core.utils import generate_uuid7
import re


class Breed(models.Model):
    """
    Справочник пород собак и кошек.
    
    Используется для:
    - Автозаполнения характеристик питомца по породе
    - Персонализации товаров и курсов
    - Оценки рисков здоровья
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]
    
    HEALTH_RISK_CHOICES = [
        ('low', 'Низкий риск'),
        ('medium', 'Средний риск'),
        ('high', 'Высокий риск'),
    ]
    
    ENERGY_LEVEL_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
        ('very_high', 'Очень высокий'),
    ]
    
    GROOMING_LEVEL_CHOICES = [
        ('minimal', 'Минимальный'),
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
    ]
    
    TRAINABILITY_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    
    SIZE_CATEGORY_CHOICES = [
        ('toy', 'Миниатюрный (до 5 кг)'),
        ('small', 'Маленький (5-10 кг)'),
        ('medium', 'Средний (10-25 кг)'),
        ('large', 'Крупный (25-45 кг)'),
        ('giant', 'Гигантский (45+ кг)'),
    ]
    
    # Основные поля
    id = models.CharField(
        primary_key=True,
        max_length=36,
        default=generate_uuid7,
        editable=False
    )
    
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Название породы'
    )
    
    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
        verbose_name='URL-slug'
    )
    
    species = models.CharField(
        max_length=10,
        choices=SPECIES_CHOICES,
        verbose_name='Вид животного'
    )
    
    description = models.TextField(
        verbose_name='Описание породы',
        help_text='Полное описание породы'
    )
    
    # Здоровье и генетика
    health_risk_level = models.CharField(
        max_length=20,
        choices=HEALTH_RISK_CHOICES,
        default='medium',
        verbose_name='Уровень риска здоровья'
    )
    
    genetic_risks = models.JSONField(
        default=list,
        verbose_name='Генетические риски',
        help_text='Список генетических заболеваний породы'
    )
    
    lifespan_min = models.IntegerField(
        default=10,
        verbose_name='Минимальная продолжительность жизни (лет)'
    )
    
    lifespan_max = models.IntegerField(
        default=15,
        verbose_name='Максимальная продолжительность жизни (лет)'
    )
    
    dental_health_notes = models.TextField(
        blank=True,
        verbose_name='Особенности стоматологического здоровья'
    )
    
    # Питание и вес
    weight_min = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        verbose_name='Минимальный вес (кг)'
    )
    
    weight_max = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        verbose_name='Максимальный вес (кг)'
    )
    
    size_category = models.CharField(
        max_length=20,
        choices=SIZE_CATEGORY_CHOICES,
        verbose_name='Категория размера'
    )
    
    diet_recommendations = models.TextField(
        blank=True,
        verbose_name='Рекомендации по питанию'
    )
    
    digestion_sensitivity = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Низкая'),
            ('medium', 'Средняя'),
            ('high', 'Высокая'),
        ],
        default='medium',
        verbose_name='Чувствительность пищеварения'
    )
    
    metabolism_notes = models.TextField(
        blank=True,
        verbose_name='Особенности метаболизма'
    )
    
    # Физическая активность
    energy_level = models.CharField(
        max_length=20,
        choices=ENERGY_LEVEL_CHOICES,
        default='medium',
        verbose_name='Уровень энергии'
    )
    
    exercise_needs = models.TextField(
        blank=True,
        verbose_name='Рекомендации по прогулкам/играм'
    )
    
    favorite_activities = models.JSONField(
        default=list,
        verbose_name='Любимые активности'
    )
    
    activity_notes = models.TextField(
        blank=True,
        verbose_name='Особенности активности'
    )
    
    # Уход и гигиена
    grooming_level = models.CharField(
        max_length=20,
        choices=GROOMING_LEVEL_CHOICES,
        default='medium',
        verbose_name='Уровень ухода за шерстью'
    )
    
    bathing_frequency = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Частота купания'
    )
    
    grooming_notes = models.TextField(
        blank=True,
        verbose_name='Особенности ухода'
    )
    
    # Поведение и социализация
    temperament = models.JSONField(
        default=list,
        verbose_name='Черты темперамента'
    )
    
    trainability = models.CharField(
        max_length=20,
        choices=TRAINABILITY_CHOICES,
        default='medium',
        verbose_name='Обучаемость'
    )
    
    children_compatibility = models.CharField(
        max_length=20,
        choices=[
            ('excellent', 'Отличная'),
            ('good', 'Хорошая'),
            ('moderate', 'Средняя'),
            ('poor', 'Низкая'),
        ],
        default='good',
        verbose_name='Совместимость с детьми'
    )
    
    socialization_notes = models.TextField(
        blank=True,
        verbose_name='Особенности социализации'
    )
    
    # Метаданные
    popularity_rank = models.IntegerField(
        default=0,
        verbose_name='Рейтинг популярности'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Активна'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        db_table = 'breeds'
        ordering = ['species', 'name']
        indexes = [
            models.Index(fields=['species', 'is_active']),
            models.Index(fields=['slug']),
            models.Index(fields=['popularity_rank']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            # Генерируем slug из названия породы (транслитерация кириллицы)
            base_slug = self._transliterate_to_slug(self.name)
            self.slug = base_slug
            
            # Убеждаемся в уникальности slug
            counter = 1
            while Breed.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        
        # Автоматически определяем size_category по весу если не задан
        if not self.size_category and self.weight_min and self.weight_max:
            avg_weight = (float(self.weight_min) + float(self.weight_max)) / 2
            if avg_weight < 5:
                self.size_category = 'toy'
            elif avg_weight < 10:
                self.size_category = 'small'
            elif avg_weight < 25:
                self.size_category = 'medium'
            elif avg_weight < 45:
                self.size_category = 'large'
            else:
                self.size_category = 'giant'
        
        super().save(*args, **kwargs)
    
    @staticmethod
    def _transliterate_to_slug(text):
        """Транслитерация кириллицы в латиницу для slug."""
        translit_map = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
            'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        }
        text = text.lower()
        result = []
        for char in text:
            if char in translit_map:
                result.append(translit_map[char])
            elif char.isalnum():
                result.append(char)
            elif char in ' -_':
                result.append('-')
        slug = ''.join(result)
        slug = re.sub(r'-+', '-', slug)  # Убираем множественные дефисы
        return slug.strip('-')
    
    @property
    def average_weight(self):
        """Средний вес породы."""
        return (float(self.weight_min) + float(self.weight_max)) / 2
    
    @property
    def average_lifespan(self):
        """Средняя продолжительность жизни."""
        return (self.lifespan_min + self.lifespan_max) / 2
    
    def get_suggestions_for_pet(self):
        """
        Возвращает рекомендуемые значения для автозаполнения при создании PetID.
        """
        return {
            'activity_level': self.energy_level,
            'size': self.size_category,
            'health_issues': self.genetic_risks,
            'diet_recommendations': self.diet_recommendations,
            'grooming_needs': self.grooming_level,
            'trainability': self.trainability,
            'temperament': self.temperament,
        }
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'species': self.species,
            'description': self.description,
            # Здоровье
            'health_risk_level': self.health_risk_level,
            'genetic_risks': self.genetic_risks,
            'lifespan_min': self.lifespan_min,
            'lifespan_max': self.lifespan_max,
            'average_lifespan': self.average_lifespan,
            'dental_health_notes': self.dental_health_notes,
            # Вес и размер
            'weight_min': float(self.weight_min),
            'weight_max': float(self.weight_max),
            'average_weight': self.average_weight,
            'size_category': self.size_category,
            'diet_recommendations': self.diet_recommendations,
            'digestion_sensitivity': self.digestion_sensitivity,
            'metabolism_notes': self.metabolism_notes,
            # Активность
            'energy_level': self.energy_level,
            'exercise_needs': self.exercise_needs,
            'favorite_activities': self.favorite_activities,
            'activity_notes': self.activity_notes,
            # Уход
            'grooming_level': self.grooming_level,
            'bathing_frequency': self.bathing_frequency,
            'grooming_notes': self.grooming_notes,
            # Поведение
            'temperament': self.temperament,
            'trainability': self.trainability,
            'children_compatibility': self.children_compatibility,
            'socialization_notes': self.socialization_notes,
            # Мета
            'popularity_rank': self.popularity_rank,
            'suggestions': self.get_suggestions_for_pet(),
        }

