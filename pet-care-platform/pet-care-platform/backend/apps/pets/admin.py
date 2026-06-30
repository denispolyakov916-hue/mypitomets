"""
Полноценная админка для управления питомцами.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import (
    Pet,
    FoodRecipe,
    Supplier,
    SupplierOffer,
    FoodBrandRule,
    SupplierUserAccess,
    SupplierProductSubmission,
    SupplierCatalogSyncLog,
)


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    """Полноценная админка для управления питомцами."""
    
    list_display = (
        'name', 'species_display', 'breed', 'owner_link', 
        'age_display', 'sex_display', 'activity_display',
        'is_neutered', 'created_at'
    )
    list_filter = (
        'species', 'sex', 'is_neutered', 'activity_level',
        'created_at', 'owner__is_active'
    )
    search_fields = (
        'name', 'breed__name', 'owner__email', 'owner__first_name', 
        'owner__last_name'
    )
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'photo_preview')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'owner', 'name', 'species', 'breed')
        }),
        ('Характеристики', {
            'fields': ('date_of_birth', 'weight', 'sex', 'is_neutered')
        }),
        ('Фото', {
            'fields': ('photo', 'photo_preview')
        }),
        ('Активность', {
            'fields': ('activity_level',),
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_neutered', 'mark_as_not_neutered']
    
    def species_display(self, obj):
        """Отображение вида с иконкой."""
        icons = {
            'dog': '🐕',
            'cat': '🐈',
        }
        icon = icons.get(obj.species, '🐾')
        return format_html('{} {}', icon, obj.get_species_display())
    species_display.short_description = 'Вид'
    
    def owner_link(self, obj):
        """Ссылка на владельца."""
        if obj.owner:
            url = reverse('admin:users_user_change', args=[obj.owner.id])
            return format_html('<a href="{}">{}</a>', url, obj.owner.email)
        return '-'
    owner_link.short_description = 'Владелец'
    
    def age_display(self, obj):
        """Отображение возраста."""
        if obj.date_of_birth:
            from datetime import date
            today = date.today()
            age = today.year - obj.date_of_birth.year
            if today.month < obj.date_of_birth.month or (today.month == obj.date_of_birth.month and today.day < obj.date_of_birth.day):
                age -= 1
            return f"{age} лет"
        return '-'
    age_display.short_description = 'Возраст'
    
    def sex_display(self, obj):
        """Отображение пола."""
        return obj.get_sex_display()
    sex_display.short_description = 'Пол'
    
    def photo_preview(self, obj):
        """Превью фото питомца."""
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.photo.url
            )
        return 'Нет фото'
    photo_preview.short_description = 'Фото'
    
    def mark_as_neutered(self, request, queryset):
        """Пометить как кастрированных/стерилизованных."""
        updated = queryset.update(is_neutered=True)
        self.message_user(request, f'Помечено как кастрированных/стерилизованных: {updated}')
    mark_as_neutered.short_description = 'Пометить %(verbose_name_plural)s как кастрированных/стерилизованных'
    
    def mark_as_not_neutered(self, request, queryset):
        """Убрать пометку о кастрации/стерилизации."""
        updated = queryset.update(is_neutered=False)
        self.message_user(request, f'Убрана пометка о кастрации/стерилизации: {updated}')
    mark_as_not_neutered.short_description = 'Убрать пометку о кастрации/стерилизации для %(verbose_name_plural)s'
    
    def activity_display(self, obj):
        """Отображение уровня активности."""
        colors = {
            'very_low': '#6b7280',
            'low': '#f59e0b',
            'moderate': '#3b82f6',
            'high': '#10b981',
            'very_high': '#ef4444'
        }
        icons = {
            'very_low': '💤',
            'low': '🐢',
            'moderate': '🐕',
            'high': '🏃',
            'very_high': '🚀'
        }
        color = colors.get(obj.activity_level, '#6b7280')
        icon = icons.get(obj.activity_level, '')
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_activity_level_display()
        )
    activity_display.short_description = 'Активность'


# ===== Админка для напоминаний =====
from .reminder_models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """Админка для управления напоминаниями."""
    
    list_display = (
        'title', 'pet_link', 'user_link', 'category_display',
        'reminder_date', 'reminder_time', 'frequency_display',
        'status_display', 'created_at'
    )
    list_filter = (
        'category', 'frequency', 'is_active', 'is_completed',
        'reminder_date', 'created_at'
    )
    search_fields = ('title', 'description', 'pet__name', 'user__email')
    ordering = ('reminder_date', 'reminder_time')
    readonly_fields = ('id', 'created_at', 'updated_at', 'completed_at')
    date_hierarchy = 'reminder_date'
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description', 'category', 'pet', 'user')
        }),
        ('Расписание', {
            'fields': ('reminder_date', 'reminder_time', 'frequency')
        }),
        ('Статус', {
            'fields': ('is_active', 'is_completed', 'completed_at')
        }),
        ('Уведомления', {
            'fields': ('notify_email', 'notify_push', 'notify_before'),
            'classes': ('collapse',)
        }),
        ('Системная информация', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_completed', 'mark_active', 'deactivate']
    
    def pet_link(self, obj):
        """Ссылка на питомца."""
        url = reverse('admin:pets_pet_change', args=[obj.pet.id])
        return format_html(
            '<a href="{}">{} {}</a>',
            url,
            '🐕' if obj.pet.species == 'dog' else '🐈' if obj.pet.species == 'cat' else '🐾',
            obj.pet.name
        )
    pet_link.short_description = 'Питомец'
    
    def user_link(self, obj):
        """Ссылка на пользователя."""
        url = reverse('admin:users_user_change', args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'Владелец'
    
    def category_display(self, obj):
        """Категория с иконкой."""
        icons = {
            'feeding': '🍖',
            'medication': '💊',
            'vaccination': '💉',
            'vet_visit': '🏥',
            'grooming': '✂️',
            'walk': '🚶',
            'training': '🎓',
            'hygiene': '🛁',
            'other': '📋',
        }
        icon = icons.get(obj.category, '📋')
        return format_html('{} {}', icon, obj.get_category_display())
    category_display.short_description = 'Категория'
    
    def frequency_display(self, obj):
        """Отображение частоты."""
        return obj.get_frequency_display()
    frequency_display.short_description = 'Частота'
    
    def status_display(self, obj):
        """Статус напоминания."""
        if obj.is_completed:
            return format_html(
                '<span style="color: #10b981; font-weight: bold;">✓ Выполнено</span>'
            )
        elif not obj.is_active:
            return format_html(
                '<span style="color: #6b7280;">Неактивно</span>'
            )
        elif obj.is_overdue:
            return format_html(
                '<span style="color: #ef4444; font-weight: bold;">⚠ Просрочено</span>'
            )
        elif obj.is_upcoming:
            return format_html(
                '<span style="color: #f59e0b; font-weight: bold;">🔔 Скоро</span>'
            )
        else:
            return format_html(
                '<span style="color: #3b82f6;">Запланировано</span>'
            )
    status_display.short_description = 'Статус'
    
    def mark_completed(self, request, queryset):
        """Отметить как выполненные."""
        for reminder in queryset:
            reminder.mark_completed()
        self.message_user(request, f'Отмечено как выполненных: {queryset.count()}')
    mark_completed.short_description = 'Отметить %(verbose_name_plural)s как выполненные'
    
    def mark_active(self, request, queryset):
        """Активировать напоминания."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'Активировано: {updated}')
    mark_active.short_description = 'Активировать %(verbose_name_plural)s'
    
    def deactivate(self, request, queryset):
        """Деактивировать напоминания."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Деактивировано: {updated}')
    deactivate.short_description = 'Деактивировать %(verbose_name_plural)s'


# ============================================================
# База питания (рецепты кормов) — модерация
# ============================================================

class _MissingArrayFilter(admin.SimpleListFilter):
    field = None
    def lookups(self, request, model_admin):
        return [('empty', 'Нет данных'), ('present', 'Есть')]
    def queryset(self, request, qs):
        if self.value() == 'empty':
            return qs.filter(**{self.field: []})
        if self.value() == 'present':
            return qs.exclude(**{self.field: []})
        return qs


class MissingKcalFilter(admin.SimpleListFilter):
    title = 'Ккал'
    parameter_name = 'has_kcal'
    def lookups(self, request, model_admin):
        return [('no', 'Нет ккал'), ('yes', 'Есть ккал')]
    def queryset(self, request, qs):
        if self.value() == 'no':
            return qs.filter(kcal_per_100g__isnull=True)
        if self.value() == 'yes':
            return qs.filter(kcal_per_100g__isnull=False)
        return qs


class MissingMacrosFilter(admin.SimpleListFilter):
    title = 'БЖУ (белок/жир)'
    parameter_name = 'has_macros'
    def lookups(self, request, model_admin):
        return [('no', 'Нет БЖУ'), ('yes', 'Есть БЖУ')]
    def queryset(self, request, qs):
        from django.db.models import Q
        if self.value() == 'no':
            return qs.filter(protein_percent__isnull=True, fat_percent__isnull=True)
        if self.value() == 'yes':
            return qs.filter(Q(protein_percent__isnull=False) | Q(fat_percent__isnull=False))
        return qs


class MissingCompositionFilter(_MissingArrayFilter):
    title = 'Состав'
    parameter_name = 'has_composition'
    field = 'ingredients'


class HasBusinessPriorityFilter(admin.SimpleListFilter):
    title = 'Бизнес-приоритет'
    parameter_name = 'has_biz'

    def lookups(self, request, model_admin):
        return [('pos', 'Положительный'), ('neg', 'Отрицательный'), ('zero', 'Нулевой')]

    def queryset(self, request, qs):
        if self.value() == 'pos':
            return qs.filter(business_priority__gt=0)
        if self.value() == 'neg':
            return qs.filter(business_priority__lt=0)
        if self.value() == 'zero':
            return qs.filter(business_priority=0)
        return qs


class SupplierOfferInline(admin.TabularInline):
    model = SupplierOffer
    extra = 0
    fields = ('package_name', 'supplier', 'price', 'agency_percent', 'in_stock', 'article_number', 'barcode')
    readonly_fields = ('article_number', 'barcode')
    can_delete = False


@admin.register(SupplierOffer)
class SupplierOfferAdmin(admin.ModelAdmin):
    """Standalone-реестр офферов: нужен, чтобы raw_id_fields на ProductSKU.supplier_offer давал рабочую лупу."""
    list_display = ('article_number', 'package_name', 'supplier', 'food_recipe', 'price', 'agency_percent', 'in_stock')
    list_filter = ('in_stock', 'supplier')
    search_fields = ('article_number', 'package_name', 'barcode', 'food_recipe__name')
    raw_id_fields = ('food_recipe', 'supplier')
    ordering = ('article_number',)
    list_per_page = 50


@admin.register(FoodRecipe)
class FoodRecipeAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'species', 'food_form', 'is_recommendable', 'nutrition_complete',
        'review_status', 'kcal_per_100g', 'protein_percent', 'fat_percent',
        'agency_percent', 'business_priority', 'is_promoted', 'source',
    )
    list_editable = ('is_recommendable', 'business_priority', 'is_promoted')
    list_filter = (
        'is_recommendable', 'nutrition_complete', 'is_promoted', 'review_status', 'parse_status',
        'species', 'food_form', HasBusinessPriorityFilter,
        MissingKcalFilter, MissingMacrosFilter, MissingCompositionFilter,
    )
    search_fields = ('name', 'brand', 'line', 'main_protein')
    ordering = ('-updated_at',)
    list_per_page = 50
    inlines = [SupplierOfferInline]
    readonly_fields = ('recipe_key', 'source', 'parse_status', 'field_confidence',
                       'recommend_block_reasons', 'agency_percent', 'created_at', 'updated_at')
    fieldsets = (
        ('Идентичность', {'fields': ('name', 'brand', 'line', 'recipe_key', 'source')}),
        ('Классификация', {'fields': ('species', 'food_form', 'life_stage', 'size_group',
                                      'diet_purpose', 'main_protein')}),
        ('Признаки', {'fields': ('is_sterilized', 'is_sensitive_digestion', 'is_urinary',
                                 'is_weight_control', 'is_grain_free', 'is_hypoallergenic')}),
        ('Нутриенты (на 100 г) — можно дозаполнять вручную', {
            'fields': ('kcal_per_100g', 'protein_percent', 'fat_percent', 'fiber_percent',
                       'ash_percent', 'moisture_percent', 'calcium_percent', 'phosphorus_percent')}),
        ('Состав', {'fields': ('ingredients', 'allergens')}),
        ('Гейт подбора и статусы', {
            'fields': ('is_recommendable', 'nutrition_complete', 'review_status',
                       'parse_status', 'recommend_block_reasons', 'agency_percent', 'field_confidence')}),
        ('Бизнес-приоритеты (влияют ТОЛЬКО среди подходящих кормов)', {
            'fields': ('business_priority', 'is_promoted', 'transition_message',
                       'transition_target_reason', 'customer_rating', 'reviews_count', 'expert_score')}),
        ('Служебное', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    actions = ('mark_verified', 'allow_recommend', 'block_recommend')

    @admin.action(description='Отметить «проверено вручную»')
    def mark_verified(self, request, queryset):
        n = queryset.update(review_status='manual_verified')
        self.message_user(request, f'Проверено вручную: {n}')

    @admin.action(description='Разрешить в подбор')
    def allow_recommend(self, request, queryset):
        n = queryset.update(is_recommendable=True)
        self.message_user(request, f'Разрешено в подбор: {n}')

    @admin.action(description='Убрать из подбора')
    def block_recommend(self, request, queryset):
        n = queryset.update(is_recommendable=False)
        self.message_user(request, f'Убрано из подбора: {n}')


@admin.register(FoodBrandRule)
class FoodBrandRuleAdmin(admin.ModelAdmin):
    list_display = ('brand', 'priority', 'enabled', 'comment', 'updated_at')
    list_editable = ('priority', 'enabled')
    list_filter = ('enabled',)
    search_fields = ('brand', 'comment')
    ordering = ('-priority', 'brand')


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'supplier_type', 'is_active', 'payment_model', 'settlement_model', 'updated_at')
    list_editable = ('is_active',)
    list_filter = ('is_active', 'supplier_type', 'payment_model', 'settlement_model')
    search_fields = ('code', 'name', 'contact_name', 'contact_email')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SupplierUserAccess)
class SupplierUserAccessAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'supplier', 'role', 'can_edit_catalog',
        'can_view_finance', 'can_export_reports', 'is_active',
    )
    list_editable = ('role', 'can_edit_catalog', 'can_view_finance', 'can_export_reports', 'is_active')
    list_filter = ('role', 'is_active', 'supplier')
    search_fields = ('user__email', 'supplier__name', 'supplier__code')
    raw_id_fields = ('user', 'supplier')
    ordering = ('supplier__name', 'user__email')


@admin.register(SupplierProductSubmission)
class SupplierProductSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        'submission_title', 'supplier', 'status', 'submitted_by',
        'reviewed_by', 'submitted_at', 'reviewed_at', 'updated_at',
    )
    list_filter = ('status', 'supplier', 'submitted_at', 'reviewed_at')
    search_fields = ('supplier__name', 'supplier__code', 'food_recipe__name', 'product__name')
    raw_id_fields = ('supplier', 'source_raw_item', 'food_recipe', 'product', 'submitted_by', 'reviewed_by')
    readonly_fields = ('created_at', 'updated_at', 'submitted_at', 'reviewed_at')
    ordering = ('-updated_at',)
    list_per_page = 50

    def submission_title(self, obj):
        return obj.data.get('name') or obj.data.get('recipe', {}).get('name') or str(obj.id)
    submission_title.short_description = 'Корм'


@admin.register(SupplierCatalogSyncLog)
class SupplierCatalogSyncLogAdmin(admin.ModelAdmin):
    list_display = (
        'supplier', 'source', 'file_name', 'status', 'total_items',
        'created_items', 'updated_items', 'failed_items', 'started_at', 'finished_at',
    )
    list_filter = ('status', 'source', 'supplier')
    search_fields = ('supplier__name', 'supplier__code', 'file_name')
    raw_id_fields = ('supplier',)
    readonly_fields = ('started_at', 'finished_at')
    ordering = ('-started_at',)
