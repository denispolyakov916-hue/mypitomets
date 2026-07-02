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
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator
from core.utils import generate_uuid7


def _str_array(**kwargs):
    return ArrayField(models.CharField(max_length=120), default=list, blank=True, **kwargs)


class FoodRecipe(models.Model):
    """Нормализованный рецепт корма — источник правды для подбора."""

    # cat_dog — универсальный рецепт (годится и кошке, и собаке): в подборе учитывается
    # в обоих видовых фильтрах. bird/rodent и прочие нестандартные виды нормализуются в other.
    SPECIES = [('cat', 'Кошка'), ('dog', 'Собака'), ('cat_dog', 'Кошка и собака'), ('other', 'Другое')]
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

    # === Бизнес-приоритеты (управляются в админке; ВЛИЯЮТ ТОЛЬКО среди подходящих кормов) ===
    business_priority = models.IntegerField(
        'Бизнес-приоритет', default=0, db_index=True,
        validators=[MinValueValidator(-100), MaxValueValidator(100)],
        help_text='-100..100. Поднимает рецепт среди ПОДХОДЯЩИХ. Не перебивает медицину/аллергии.',
    )
    is_promoted = models.BooleanField('Продвигаемый', default=False, db_index=True)
    transition_message = models.CharField(
        'Сообщение пересадки', max_length=300, blank=True,
        help_text='Ручной безопасный текст. Без медицинских обещаний.',
    )
    transition_target_reason = models.CharField('Причина пересадки', max_length=120, blank=True)
    customer_rating = models.DecimalField(
        'Рейтинг покупателей', max_digits=3, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    reviews_count = models.IntegerField('Кол-во отзывов', default=0)
    expert_score = models.IntegerField(
        'Экспертная оценка', null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

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


class Supplier(models.Model):
    """Поставщик товаров/кормов (Динозаврик и будущие). Заменяет строковый source оффера."""

    SUPPLIER_TYPE = [('feed', 'Фид'), ('api', 'API'), ('manual', 'Вручную')]
    PAYMENT_MODEL = [
        ('partner_checkout', 'Оплата у партнёра'),
        ('platform_checkout', 'Оплата на платформе'),
        ('cash_on_pickup', 'Оплата при получении'),
    ]
    SETTLEMENT_MODEL = [
        ('agent_commission', 'Агентская комиссия'),
        ('resale_margin', 'Перепродажная маржа'),
        ('manual_reconciliation', 'Ручная сверка'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    code = models.CharField('Код', max_length=50, unique=True, db_index=True)
    name = models.CharField('Название', max_length=200)
    supplier_type = models.CharField('Тип', max_length=20, choices=SUPPLIER_TYPE, default='feed')
    is_active = models.BooleanField('Активен', default=True, db_index=True)
    website_url = models.URLField('Сайт', blank=True)
    contact_name = models.CharField('Контактное лицо', max_length=200, blank=True)
    contact_email = models.EmailField('Email', blank=True)
    payment_model = models.CharField('Модель оплаты', max_length=30, choices=PAYMENT_MODEL, default='partner_checkout')
    settlement_model = models.CharField('Модель расчётов', max_length=30, choices=SETTLEMENT_MODEL, default='agent_commission')
    comment = models.CharField('Комментарий', max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'suppliers'
        verbose_name = 'Поставщик'
        verbose_name_plural = 'Поставщики'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class SupplierOffer(models.Model):
    """Фасовка/SKU поставщика: цена, остаток, агентский %%, артикул для sync."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    food_recipe = models.ForeignKey(
        FoodRecipe, null=True, blank=True, on_delete=models.CASCADE, related_name='offers',
    )
    source = models.CharField('Источник (legacy/backup)', max_length=30, db_index=True)
    supplier = models.ForeignKey(
        Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name='offers',
        verbose_name='Поставщик',
    )
    article_number = models.CharField('Артикул (CODE_1C, ключ sync)', max_length=120, db_index=True)
    package_name = models.CharField('Фасовка', max_length=120, blank=True)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2, null=True, blank=True)
    package_weight_kg = models.DecimalField('Вес фасовки, кг', max_digits=7, decimal_places=3, null=True, blank=True)
    agency_percent = models.DecimalField('Агентский %%', max_digits=5, decimal_places=2, null=True, blank=True)
    barcode = models.CharField('Штрихкод', max_length=60, blank=True)
    in_stock = models.BooleanField('В наличии', default=False)
    raw = models.JSONField('Сырьё оффера', default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_sellable(self):
        """Единый критерий «продаваемости» фасовки (ТЗ, раздел 4).

        Продаётся, если: в наличии, цена>0, вес фасовки>0, привязан к рецепту и
        поставщик активен. Только такие офферы дают available=True у ProductSKU и
        учитываются в подборе. Примечание: обращается к self.supplier — в циклах
        используйте select_related('supplier'), чтобы не плодить запросы.
        """
        if not self.in_stock or self.food_recipe_id is None:
            return False
        if self.price is None or self.price <= 0:
            return False
        if self.package_weight_kg is None or self.package_weight_kg <= 0:
            return False
        if self.supplier_id is None or not self.supplier.is_active:
            return False
        return True

    class Meta:
        db_table = 'supplier_offers'
        verbose_name = 'Оффер поставщика (фасовка)'
        verbose_name_plural = 'Офферы поставщиков'
        constraints = [
            models.UniqueConstraint(fields=['supplier', 'article_number'], name='uniq_offer_supplier_article'),
        ]
        ordering = ['package_name']

    def __str__(self):
        return f'{self.source}:{self.article_number} ({self.package_name})'


class SupplierRawItem(models.Model):
    """Сырьё от поставщика как есть (raw_payload) + связь с созданным рецептом."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    source = models.CharField('Источник (legacy/backup)', max_length=30, db_index=True)
    supplier = models.ForeignKey(
        Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name='raw_items',
        verbose_name='Поставщик',
    )
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
        constraints = [
            models.UniqueConstraint(fields=['supplier', 'external_id'], name='uniq_raw_supplier_external'),
        ]
        ordering = ['-imported_at']

    def __str__(self):
        return f'{self.source}:{self.external_id}'


class FoodBrandRule(models.Model):
    """Бизнес-приоритет бренда (управляется в админке). Бренд — строка FoodRecipe.brand."""

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    brand = models.CharField('Бренд', max_length=255, unique=True, db_index=True)
    priority = models.IntegerField(
        'Приоритет', default=0,
        validators=[MinValueValidator(-100), MaxValueValidator(100)],
    )
    enabled = models.BooleanField('Включено', default=True)
    comment = models.CharField('Комментарий', max_length=300, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'food_brand_rules'
        verbose_name = 'Правило приоритета бренда'
        verbose_name_plural = 'Бизнес-правила брендов'
        ordering = ['-priority', 'brand']

    def __str__(self):
        return f'{self.brand}: {self.priority}'


class SupplierUserAccess(models.Model):
    """Доступ пользователя к кабинету конкретного поставщика."""

    ROLE_MANAGER = 'manager'
    ROLE_EDITOR = 'editor'
    ROLE_ANALYST = 'analyst'
    ROLES = [
        (ROLE_MANAGER, 'Менеджер'),
        (ROLE_EDITOR, 'Редактор'),
        (ROLE_ANALYST, 'Аналитик'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='supplier_accesses',
        verbose_name='Пользователь',
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='user_accesses',
        verbose_name='Поставщик',
    )
    role = models.CharField('Роль в кабинете', max_length=20, choices=ROLES, default=ROLE_MANAGER)
    can_edit_catalog = models.BooleanField('Может редактировать ассортимент', default=True)
    can_view_finance = models.BooleanField('Может видеть финансы', default=True)
    can_export_reports = models.BooleanField('Может экспортировать отчёты', default=True)
    is_active = models.BooleanField('Активен', default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'supplier_user_accesses'
        verbose_name = 'Доступ пользователя поставщика'
        verbose_name_plural = 'Доступы пользователей поставщиков'
        constraints = [
            models.UniqueConstraint(fields=['user', 'supplier'], name='uniq_supplier_user_access'),
        ]
        indexes = [
            models.Index(fields=['supplier', 'is_active'], name='idx_supplier_access_supplier'),
            models.Index(fields=['user', 'is_active'], name='idx_supplier_access_user'),
        ]

    def __str__(self):
        return f'{self.user_id} -> {self.supplier_id} ({self.role})'


class SupplierProductSubmission(models.Model):
    """Черновик/заявка поставщика на создание или изменение корма."""

    STATUS_DRAFT = 'draft'
    STATUS_NEEDS_FIX = 'needs_fix'
    STATUS_SUBMITTED = 'submitted'
    STATUS_APPROVED_FOR_SHOP = 'approved_for_shop'
    STATUS_APPROVED_FOR_RECOMMENDATION = 'approved_for_recommendation'
    STATUS_REJECTED = 'rejected'
    STATUS_ARCHIVED = 'archived'
    STATUSES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_NEEDS_FIX, 'Нужны исправления'),
        (STATUS_SUBMITTED, 'Отправлено на проверку'),
        (STATUS_APPROVED_FOR_SHOP, 'Разрешено для магазина'),
        (STATUS_APPROVED_FOR_RECOMMENDATION, 'Разрешено для подбора'),
        (STATUS_REJECTED, 'Отклонено'),
        (STATUS_ARCHIVED, 'Архив'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='product_submissions',
        verbose_name='Поставщик',
    )
    source_raw_item = models.ForeignKey(
        SupplierRawItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='product_submissions',
        verbose_name='Исходная запись фида',
    )
    food_recipe = models.ForeignKey(
        FoodRecipe,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='supplier_submissions',
        verbose_name='Утверждённый рецепт',
    )
    product = models.ForeignKey(
        'shop.Product',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='supplier_submissions',
        verbose_name='Товар витрины',
    )
    status = models.CharField('Статус', max_length=40, choices=STATUSES, default=STATUS_DRAFT, db_index=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='submitted_supplier_products',
        verbose_name='Отправил',
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_supplier_products',
        verbose_name='Проверил',
    )
    review_comment = models.TextField('Комментарий модератора', blank=True)
    supplier_comment = models.TextField('Комментарий поставщика', blank=True)
    data = models.JSONField('Данные черновика', default=dict, blank=True)
    validation_errors = models.JSONField('Ошибки валидации', default=dict, blank=True)
    changed_fields = models.JSONField('Изменённые поля', default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'supplier_product_submissions'
        verbose_name = 'Заявка поставщика на корм'
        verbose_name_plural = 'Заявки поставщиков на корма'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['supplier', 'status'], name='idx_supplier_submission_status'),
            models.Index(fields=['status', '-updated_at'], name='idx_submission_review_queue'),
        ]

    def __str__(self):
        title = self.data.get('name') or self.data.get('recipe', {}).get('name') or self.id
        return f'{title} [{self.status}]'


class SupplierCatalogSyncLog(models.Model):
    """Журнал импорта и сверки фида поставщика."""

    STATUS_RUNNING = 'running'
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    STATUSES = [
        (STATUS_RUNNING, 'Выполняется'),
        (STATUS_SUCCESS, 'Успешно'),
        (STATUS_FAILED, 'Ошибка'),
    ]

    id = models.UUIDField(primary_key=True, default=generate_uuid7, editable=False)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='sync_logs',
        verbose_name='Поставщик',
    )
    source = models.CharField('Источник', max_length=80, default='dinozavrik_json', db_index=True)
    file_name = models.CharField('Имя файла', max_length=255, blank=True)
    started_at = models.DateTimeField('Начало импорта')
    finished_at = models.DateTimeField('Окончание импорта', null=True, blank=True)
    status = models.CharField('Статус', max_length=20, choices=STATUSES, default=STATUS_RUNNING, db_index=True)
    total_items = models.IntegerField('Всего позиций', default=0)
    created_items = models.IntegerField('Создано', default=0)
    updated_items = models.IntegerField('Обновлено', default=0)
    unchanged_items = models.IntegerField('Без изменений', default=0)
    failed_items = models.IntegerField('Ошибки', default=0)
    summary = models.JSONField('Сводка', default=dict, blank=True)

    class Meta:
        db_table = 'supplier_catalog_sync_logs'
        verbose_name = 'Журнал синхронизации поставщика'
        verbose_name_plural = 'Журналы синхронизации поставщиков'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['supplier', '-started_at'], name='idx_supplier_sync_started'),
            models.Index(fields=['source', 'status'], name='idx_sync_source_status'),
        ]

    def __str__(self):
        return f'{self.supplier_id}:{self.source} [{self.status}]'
