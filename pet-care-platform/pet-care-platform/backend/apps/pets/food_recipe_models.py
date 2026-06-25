"""
Собственная база питания (рецепты кормов) — НЕЗАВИСИМАЯ от поставщика.

Ключевая идея: рецепт корма (FoodRecipe) ≠ товар/SKU/оффер поставщика.
Один рецепт (Royal Canin Sterilised 37 Chicken) имеет много фасовок/офферов
(400 г / 2 кг / 10 кг). Подбор работает по FoodRecipe, а не по сырым данным
поставщика. Если интеграция с поставщиком закончится — рецепты остаются у нас;
другой поставщик потом привяжет свои SKU к тому же рецепту.

См. этапы плана: A (эти модели) → B (парсер) → C (импорт/обогащение) →
D (админка модерации) → E (подключение к подбору).
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField
from core.utils import generate_uuid7


def _str_array(**kwargs):
    return ArrayField(models.CharField(max_length=120), default=list, blank=True, **kwargs)


class FoodRecipe(models.Model):
    """Нормализованный рецепт корма — источник правды для подбора."""

    SPECIES = [('cat', 'Кошка'), ('dog', 'Собака'), ('other', 'Другое')]
    FORM = [('dry', 'Сухой'), ('wet', 'Влажный'), ('treat', 'Лакомство'), ('other', 'Другое')]
    PARSE = [
        ('pending', 'Не обрабатывался'),
        ('auto_parsed', 'Распознано автоматически'),
        ('partial', 'Распознано частично'),
        ('failed', 'Не распознано'),
    ]
    REVIEW = [
        ('unverified', 'Не проверено'),
        ('auto_parsed', 'Авто-распознано'),
        ('manual_verified', 'Проверено вручную'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)

    # Идентичность рецепта
    name = models.CharField('Название рецепта', max_length=500)
    brand = models.CharField('Бренд', max_length=255, blank=True)
    line = models.CharField('Линейка', max_length=255, blank=True)
    recipe_key = models.CharField(
        'Ключ дедупликации', max_length=255, blank=True, db_index=True,
        help_text='Нормализованный бренд+линейка+вкус+форма для слияния дублей вручную',
    )

    # Классификация (для фильтров подбора)
    species = models.CharField('Вид животного', max_length=10, choices=SPECIES, blank=True)
    food_form = models.CharField('Форма корма', max_length=10, choices=FORM, blank=True)
    life_stage = models.CharField('Возрастная группа', max_length=20, blank=True, help_text='puppy/kitten/adult/senior/all')
    size_group = models.CharField('Размер породы', max_length=20, blank=True)
    diet_purpose = _str_array(verbose_name='Назначение (ЖКТ/почки/мочевая/кожа/вес...)')

    # Признаки питания (tri-state: null = неизвестно)
    is_sterilized = models.BooleanField('Для стерилизованных', null=True, blank=True)
    is_sensitive_digestion = models.BooleanField('Чувствительное пищеварение', null=True, blank=True)
    is_urinary = models.BooleanField('Мочевыводящая/МКБ', null=True, blank=True)
    is_weight_control = models.BooleanField('Контроль веса', null=True, blank=True)
    is_grain_free = models.BooleanField('Беззерновой', null=True, blank=True)
    is_hypoallergenic = models.BooleanField('Гипоаллергенный', null=True, blank=True)

    # Нутриенты (на 100 г). null = нет данных.
    kcal_per_100g = models.DecimalField('Ккал/100 г', max_digits=7, decimal_places=2, null=True, blank=True)
    protein_percent = models.DecimalField('Белок, %', max_digits=5, decimal_places=2, null=True, blank=True)
    fat_percent = models.DecimalField('Жир, %', max_digits=5, decimal_places=2, null=True, blank=True)
    fiber_percent = models.DecimalField('Клетчатка, %', max_digits=5, decimal_places=2, null=True, blank=True)
    ash_percent = models.DecimalField('Зола, %', max_digits=5, decimal_places=2, null=True, blank=True)
    moisture_percent = models.DecimalField('Влажность, %', max_digits=5, decimal_places=2, null=True, blank=True)
    calcium_percent = models.DecimalField('Кальций, %', max_digits=5, decimal_places=2, null=True, blank=True)
    phosphorus_percent = models.DecimalField('Фосфор, %', max_digits=5, decimal_places=2, null=True, blank=True)

    # Состав
    ingredients = _str_array(verbose_name='Состав (ингредиенты по порядку)')
    main_protein = models.CharField('Основной белок', max_length=80, blank=True)
    allergens = _str_array(verbose_name='Аллергены')

    # Происхождение и статусы
    source = models.CharField('Источник данных', max_length=30, blank=True, db_index=True, help_text='dinozavrik / manual / ...')
    parse_status = models.CharField('Статус парсинга', max_length=20, choices=PARSE, default='pending', db_index=True)
    review_status = models.CharField('Статус проверки', max_length=20, choices=REVIEW, default='unverified', db_index=True)
    field_confidence = models.JSONField('Уверенность по полям', default=dict, blank=True,
                                        help_text='{поле: supplier|parsed|estimated|manual|unknown}')

    # Гейт подбора (двухуровневый)
    is_recommendable = models.BooleanField('Разрешён в подбор', default=False, db_index=True)
    nutrition_complete = models.BooleanField('Полные ккал+БЖУ (точная норма)', default=False, db_index=True)
    recommend_block_reasons = _str_array(verbose_name='Почему не в подборе')

    # Представительный агентский %% (макс по фасовкам) — для отчётов; источник правды — SupplierOffer.
    agency_percent = models.DecimalField('Агентский %% (предст.)', max_digits=5, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'food_recipes'
        verbose_name = 'Рецепт корма'
        verbose_name_plural = 'База питания (рецепты)'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['species', 'food_form'], name='idx_recipe_species_form'),
            models.Index(fields=['is_recommendable', 'review_status'], name='idx_recipe_gate'),
        ]

    def __str__(self):
        return f'{self.name} [{self.species}/{self.food_form}]'


class SupplierOffer(models.Model):
    """Фасовка/SKU поставщика: цена, остаток, агентский %%, артикул для sync."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    food_recipe = models.ForeignKey(
        FoodRecipe, null=True, blank=True, on_delete=models.CASCADE, related_name='offers',
    )
    source = models.CharField('Источник', max_length=30, db_index=True)
    article_number = models.CharField('Артикул (CODE_1C, ключ sync)', max_length=120, db_index=True)
    package_name = models.CharField('Фасовка', max_length=120, blank=True)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2, null=True, blank=True)
    agency_percent = models.DecimalField('Агентский %%', max_digits=5, decimal_places=2, null=True, blank=True)
    barcode = models.CharField('Штрихкод', max_length=60, blank=True)
    in_stock = models.BooleanField('В наличии', default=False)
    raw = models.JSONField('Сырьё оффера', default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'supplier_offers'
        verbose_name = 'Оффер поставщика (фасовка)'
        verbose_name_plural = 'Офферы поставщиков'
        unique_together = [('source', 'article_number')]
        ordering = ['package_name']

    def __str__(self):
        return f'{self.source}:{self.article_number} ({self.package_name})'


class SupplierRawItem(models.Model):
    """Сырьё от поставщика как есть (raw_payload) + связь с созданным рецептом."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    source = models.CharField('Источник', max_length=30, db_index=True)
    external_id = models.CharField('Внешний ID (xmlId)', max_length=120, db_index=True)
    article_number = models.CharField('Артикул (CODE_1C/CML2_ARTICLE)', max_length=120, blank=True, db_index=True)
    raw_json = models.JSONField('Сырые данные', default=dict)
    food_recipe = models.ForeignKey(
        FoodRecipe, null=True, blank=True, on_delete=models.SET_NULL, related_name='raw_items',
    )
    imported_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'supplier_raw_items'
        verbose_name = 'Сырьё поставщика'
        verbose_name_plural = 'Сырьё поставщиков'
        unique_together = [('source', 'external_id')]
        ordering = ['-imported_at']

    def __str__(self):
        return f'{self.source}:{self.external_id}'
