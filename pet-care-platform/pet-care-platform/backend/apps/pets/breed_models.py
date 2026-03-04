"""
Модели базы знаний о породах собак и кошек.

Содержит:
- Breed - основная информация о породе (для собак FCI, для кошек WCF)
- BreedHealth - генетические риски здоровья
- BreedNutrition - рекомендации по питанию
- BreedCare - рекомендации по уходу

Данные загружаются из:
- breeds.json (собаки, FCI классификация)
- cats_breeds.json (кошки, WCF классификация)
"""

from django.db import models
from django.utils.text import slugify
from unidecode import unidecode


class Breed(models.Model):
    """
    Справочник пород собак и кошек.
    
    Содержит стандартные характеристики породы для:
    - Сравнения параметров питомца с эталоном
    - Персонализированных рекомендаций
    - Подбора корма и товаров
    - Автозаполнения PetID
    """
    
    SPECIES_CHOICES = [
        ('dog', 'Собака'),
        ('cat', 'Кошка'),
    ]
    
    SIZE_CHOICES = [
        ('toy', 'Карликовый'),  # < 5 кг
        ('small', 'Маленький'),  # 5-10 кг
        ('medium', 'Средний'),   # 10-25 кг
        ('large', 'Крупный'),    # 25-45 кг
        ('giant', 'Гигантский'), # > 45 кг
    ]
    
    ACTIVITY_CHOICES = [
        ('very_low', 'Очень низкая'),
        ('low', 'Низкая'),
        ('moderate', 'Умеренная'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    
    TRAINABILITY_CHOICES = [
        ('very_low', 'Очень низкая'),
        ('low', 'Низкая'),
        ('moderate', 'Умеренная'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    
    COAT_CHOICES = [
        ('hairless', 'Бесшёрстная'),
        ('short', 'Короткая'),
        ('medium', 'Средняя'),
        ('long', 'Длинная'),
        ('wire', 'Жёсткая'),
        ('curly', 'Курчавая'),
        ('double', 'Двойная'),
    ]
    
    GROOMING_CHOICES = [
        ('minimal', 'Минимальный'),
        ('low', 'Низкий'),
        ('moderate', 'Умеренный'),
        ('high', 'Высокий'),
        ('very_high', 'Очень высокий'),
    ]
    
    # === Основная информация ===
    external_id = models.CharField(
        max_length=20, unique=True, db_index=True,
        null=True, blank=True,
        verbose_name='Внешний ID',
        help_text='ID из JSON файла (7001 для собак FCI, 1001 для кошек WCF)'
    )
    species = models.CharField(max_length=10, choices=SPECIES_CHOICES, db_index=True, verbose_name='Вид')
    name = models.CharField(max_length=200, verbose_name='Название породы (рус)')
    name_en = models.CharField(max_length=200, blank=True, verbose_name='Название породы (англ)')
    slug = models.SlugField(max_length=200, unique=True, verbose_name='URL-имя')
    
    # === Классификация FCI (для собак) ===
    fci_number = models.PositiveIntegerField(null=True, blank=True, verbose_name='FCI номер')
    fci_group = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='FCI группа')
    fci_section = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='FCI секция')
    fci_subsection = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='FCI подсекция')
    
    # === Классификация WCF (для кошек) ===
    wcf_code = models.CharField(max_length=10, blank=True, verbose_name='WCF код')
    wcf_category = models.CharField(max_length=50, blank=True, verbose_name='WCF категория')
    
    # === Общая информация ===
    country_origin = models.CharField(max_length=100, blank=True, verbose_name='Страна происхождения')
    purpose = models.CharField(max_length=100, blank=True, verbose_name='Назначение')
    
    # === Описания ===
    short_description = models.TextField(blank=True, verbose_name='Краткое описание (рус)')
    short_description_en = models.TextField(blank=True, verbose_name='Краткое описание (англ)')
    
    # === Физические характеристики ===
    size_category = models.CharField(
        max_length=20, choices=SIZE_CHOICES, db_index=True,
        verbose_name='Размер',
        help_text='Категория размера для автозаполнения PetID'
    )
    coat_type = models.CharField(
        max_length=20, choices=COAT_CHOICES, 
        verbose_name='Тип шерсти',
        help_text='Для автозаполнения PetID'
    )
    average_lifespan = models.PositiveIntegerField(
        default=12,
        verbose_name='Средняя продолжительность жизни (лет)'
    )
    
    # === Вес (из JSON ideal_weight) ===
    weight_male_min = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name='Мин. вес самца (кг)'
    )
    weight_male_max = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name='Макс. вес самца (кг)'
    )
    weight_female_min = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name='Мин. вес самки (кг)'
    )
    weight_female_max = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        verbose_name='Макс. вес самки (кг)'
    )
    
    # === Характер и поведение ===
    base_activity_level = models.CharField(
        max_length=20, choices=ACTIVITY_CHOICES, default='moderate',
        verbose_name='Базовый уровень активности',
        help_text='Для автозаполнения PetID'
    )
    trainability = models.CharField(
        max_length=20, choices=TRAINABILITY_CHOICES, default='moderate',
        verbose_name='Обучаемость'
    )
    
    # === Уход ===
    grooming_needs = models.CharField(
        max_length=20, choices=GROOMING_CHOICES, default='moderate',
        verbose_name='Потребность в уходе'
    )
    
    # === Риски здоровья (JSON из breeds.json) ===
    health_risks = models.JSONField(
        default=list, blank=True,
        verbose_name='Риски здоровья',
        help_text='JSON: [{"condition_code": "hip_dysplasia", "risk_level": "high"}, ...]'
    )
    
    # === Риски аллергий (JSON из breeds.json) ===
    allergy_risks = models.JSONField(
        default=list, blank=True,
        verbose_name='Риски аллергий',
        help_text='JSON: [{"allergen_code": "chicken_protein", "risk_level": "common"}, ...]'
    )
    
    # === Метаданные ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Порода'
        verbose_name_plural = 'Породы'
        db_table = 'breeds'
        ordering = ['species', 'name']
        indexes = [
            models.Index(fields=['species', 'name']),
            models.Index(fields=['external_id']),
            models.Index(fields=['slug']),
            models.Index(fields=['size_category']),
            models.Index(fields=['coat_type']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    @property
    def is_brachycephalic(self) -> bool:
        """Определяет брахицефальность по health_risks JSON."""
        brachy_codes = {'brachycephalic_syndrome', 'boas', 'brachycephalic'}
        for risk in (self.health_risks or []):
            code = (risk.get('condition_code') or '').lower()
            if code in brachy_codes or 'brachycephal' in code:
                return True
        return False

    def save(self, *args, **kwargs):
        """Автогенерация slug если не задан."""
        if not self.slug:
            base_slug = slugify(unidecode(self.name_en or self.name))
            self.slug = f"{self.species}-{base_slug}"
        super().save(*args, **kwargs)
    
    def to_dict(self):
        """Сериализация для API."""
        return {
            'id': self.id,
            'external_id': self.external_id,
            'species': self.species,
            'name': self.name,
            'name_en': self.name_en,
            'slug': self.slug,
            'short_description': self.short_description,
            'size_category': self.size_category,
            'coat_type': self.coat_type,
            'average_lifespan': self.average_lifespan,
            'base_activity_level': self.base_activity_level,
            'energy_level': self.base_activity_level,  # alias
            'trainability': self.trainability,
            'grooming_needs': self.grooming_needs,
            'ideal_weight': self.ideal_weight,
            'weight_min': float(self.weight_min) if self.weight_min else None,
            'weight_max': float(self.weight_max) if self.weight_max else None,
            'min_weight': float(self.min_weight) if self.min_weight else None,
            'max_weight': float(self.max_weight) if self.max_weight else None,
            'average_weight': float(self.average_weight) if self.average_weight else None,
            'health_risks': self.health_risks,
            'allergy_risks': self.allergy_risks,
        }
    
    @property
    def ideal_weight(self):
        """Возвращает идеальный диапазон веса."""
        return {
            'male': {
                'min': float(self.weight_male_min) if self.weight_male_min else None,
                'max': float(self.weight_male_max) if self.weight_male_max else None,
            },
            'female': {
                'min': float(self.weight_female_min) if self.weight_female_min else None,
                'max': float(self.weight_female_max) if self.weight_female_max else None,
            }
        }
    
    @property
    def weight_min(self):
        """Минимальный вес породы (усреднённый по полам)."""
        weights = [w for w in [self.weight_male_min, self.weight_female_min] if w is not None]
        return min(weights) if weights else None
    
    @property
    def weight_max(self):
        """Максимальный вес породы (усреднённый по полам)."""
        weights = [w for w in [self.weight_male_max, self.weight_female_max] if w is not None]
        return max(weights) if weights else None
    
    @property
    def min_weight(self):
        """Алиас для weight_min (для фронтенда)."""
        return self.weight_min
    
    @property
    def max_weight(self):
        """Алиас для weight_max (для фронтенда)."""
        return self.weight_max
    
    @property
    def average_weight(self):
        """Средний вес породы."""
        if self.weight_min and self.weight_max:
            return (float(self.weight_min) + float(self.weight_max)) / 2
        return None
    
    def get_ideal_weight_for_sex(self, sex):
        """Возвращает средний идеальный вес для пола."""
        if sex == 'male' and self.weight_male_min and self.weight_male_max:
            return (float(self.weight_male_min) + float(self.weight_male_max)) / 2
        elif sex == 'female' and self.weight_female_min and self.weight_female_max:
            return (float(self.weight_female_min) + float(self.weight_female_max)) / 2
        # Fallback на мужской вес или None
        if self.weight_male_min and self.weight_male_max:
            return (float(self.weight_male_min) + float(self.weight_male_max)) / 2
        return None
    
    def get_autofill_data(self, pet_sex='male'):
        """
        Возвращает данные для автозаполнения PetID.
        Используется триггером автозаполнения при создании питомца.
        """
        return {
            'size_category': self.size_category,
            'coat_type': self.coat_type,
            'activity_level': self.base_activity_level,
            'ideal_weight_kg': self.get_ideal_weight_for_sex(pet_sex),
        }


class BreedHealth(models.Model):
    """
    Генетические риски здоровья породы.
    Соответствует схеме migration 0009.
    """
    
    CONDITION_TYPE_CHOICES = [
        ('genetic', 'Генетическое'),
        ('congenital', 'Врожденное'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
    ]
    
    AFFECTED_SYSTEM_CHOICES = [
        ('musculoskeletal', 'Опорно-двигательная'),
        ('cardiovascular', 'Сердечно-сосудистая'),
        ('respiratory', 'Дыхательная'),
        ('digestive', 'Пищеварительная'),
        ('urinary', 'Мочевыделительная'),
        ('reproductive', 'Репродуктивная'),
        ('endocrine', 'Эндокринная'),
        ('nervous', 'Нервная'),
        ('immune', 'Иммунная'),
        ('integumentary', 'Кожа и шерсть'),
        ('ophthalmologic', 'Офтальмологическая'),
        ('dental', 'Стоматологическая'),
        ('renal', 'Почечная'),
        ('neurological', 'Неврологическая'),
        ('general', 'Общая'),
    ]
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='breed_health_records', verbose_name='Порода')
    condition_name = models.CharField(max_length=200, verbose_name='Название заболевания')
    condition_type = models.CharField(max_length=20, choices=CONDITION_TYPE_CHOICES, default='genetic')
    affected_system = models.CharField(max_length=50, choices=AFFECTED_SYSTEM_CHOICES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, db_index=True, verbose_name='Тяжесть')
    prevalence_percent = models.DecimalField(max_digits=5, decimal_places=2, verbose_name='Распространённость %')
    age_of_onset = models.CharField(max_length=50, blank=True, verbose_name='Возраст проявления')
    prevention = models.TextField(verbose_name='Профилактика')
    screening = models.TextField(verbose_name='Рекомендуемые обследования')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Риск здоровья породы'
        verbose_name_plural = 'Риски здоровья пород'
        db_table = 'breed_health'
        ordering = ['breed', '-severity', '-prevalence_percent']
    
    def __str__(self):
        return f"{self.breed.name}: {self.condition_name}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'condition_name': self.condition_name,
            'condition_type': self.condition_type,
            'affected_system': self.affected_system,
            'severity': self.severity,
            'prevalence_percent': float(self.prevalence_percent),
            'age_of_onset': self.age_of_onset,
            'prevention': self.prevention,
            'screening': self.screening,
        }


class BreedNutrition(models.Model):
    """
    Рекомендации по питанию для породы.
    Соответствует схеме migration 0009.
    """
    
    LEVEL_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('very_high', 'Очень высокая'),
    ]
    
    CALORIE_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
    ]
    
    DIET_TYPE_CHOICES = [
        ('dry', 'Сухой'),
        ('wet', 'Влажный'),
        ('mixed', 'Смешанный'),
    ]
    
    breed = models.OneToOneField(
        Breed, 
        on_delete=models.CASCADE, 
        primary_key=True,
        related_name='nutrition', 
        verbose_name='Порода'
    )
    protein_need = models.CharField(max_length=20, choices=LEVEL_CHOICES, verbose_name='Потребность в белке')
    calorie_density = models.CharField(max_length=20, choices=CALORIE_CHOICES, verbose_name='Калорийность')
    diet_type = models.CharField(max_length=20, choices=DIET_TYPE_CHOICES, verbose_name='Тип питания')
    feeding_frequency = models.CharField(max_length=50, verbose_name='Частота кормлений')
    special_considerations = models.TextField(blank=True, verbose_name='Особые рекомендации')
    common_allergens = models.JSONField(default=list, blank=True, verbose_name='Аллергены')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Питание породы'
        verbose_name_plural = 'Рекомендации по питанию'
        db_table = 'breed_nutrition'
    
    def __str__(self):
        return f"Питание: {self.breed.name}"
    
    def to_dict(self):
        return {
            'breed_id': self.breed_id,
            'protein_need': self.protein_need,
            'calorie_density': self.calorie_density,
            'diet_type': self.diet_type,
            'feeding_frequency': self.feeding_frequency,
            'special_considerations': self.special_considerations,
            'common_allergens': self.common_allergens,
        }


class BreedCare(models.Model):
    """
    Рекомендации по уходу за породой.
    Соответствует схеме migration 0009.
    """
    
    CARE_CATEGORY_CHOICES = [
        ('coat', 'Шерсть'),
        ('skin', 'Кожа'),
        ('ears', 'Уши'),
        ('eyes', 'Глаза'),
        ('respiratory', 'Дыхание'),
        ('dental', 'Зубы'),
        ('nails', 'Когти'),
    ]
    
    IMPORTANCE_CHOICES = [
        ('low', 'Низкая'),
        ('medium', 'Средняя'),
        ('high', 'Высокая'),
        ('critical', 'Критическая'),
    ]
    
    SEASON_CHOICES = [
        ('all', 'Круглый год'),
        ('spring', 'Весна'),
        ('summer', 'Лето'),
        ('autumn', 'Осень'),
        ('winter', 'Зима'),
    ]
    
    breed = models.ForeignKey(Breed, on_delete=models.CASCADE, related_name='care_procedures', verbose_name='Порода')
    care_category = models.CharField(max_length=20, choices=CARE_CATEGORY_CHOICES, db_index=True, verbose_name='Категория')
    procedure = models.CharField(max_length=200, verbose_name='Процедура')
    frequency = models.CharField(max_length=50, verbose_name='Частота')
    importance = models.CharField(max_length=20, choices=IMPORTANCE_CHOICES, db_index=True, verbose_name='Важность')
    season = models.CharField(max_length=20, choices=SEASON_CHOICES, default='all', verbose_name='Сезон')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Процедура ухода за породой'
        verbose_name_plural = 'Процедуры ухода за породами'
        db_table = 'breed_care'
        ordering = ['breed', '-importance', 'care_category']
    
    def __str__(self):
        return f"{self.breed.name}: {self.procedure}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'care_category': self.care_category,
            'procedure': self.procedure,
            'frequency': self.frequency,
            'importance': self.importance,
            'season': self.season,
            'notes': self.notes,
        }


