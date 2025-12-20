"""
Полноценная админка для управления пользователями и их данными.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import User, Token


class PetInline(admin.TabularInline):
    """Inline для питомцев пользователя."""
    from apps.pets.models import Pet
    model = Pet
    extra = 0
    fields = ('name', 'species', 'breed', 'date_of_birth', 'gender')
    readonly_fields = ('name', 'species', 'breed', 'date_of_birth', 'gender')
    can_delete = False
    show_change_link = True


class PaymentInline(admin.TabularInline):
    """Inline для платежей пользователя."""
    from apps.payments.models import Payment
    model = Payment
    extra = 0
    fields = ('id', 'payment_type', 'amount', 'status', 'created_at')
    readonly_fields = ('id', 'payment_type', 'amount', 'status', 'created_at')
    can_delete = False
    show_change_link = True
    max_num = 10


class OrderInline(admin.TabularInline):
    """Inline для заказов пользователя."""
    from apps.shop.models import Order
    model = Order
    extra = 0
    fields = ('id', 'total_amount', 'status', 'created_at')
    readonly_fields = ('id', 'total_amount', 'status', 'created_at')
    can_delete = False
    show_change_link = True
    max_num = 10


class UserCourseInline(admin.TabularInline):
    """Inline для курсов пользователя."""
    from apps.training.models import UserCourse
    model = UserCourse
    extra = 0
    fields = ('course', 'purchased_at', 'progress')
    readonly_fields = ('course', 'purchased_at', 'progress')
    can_delete = False
    show_change_link = True
    max_num = 10


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Полноценная админка для управления пользователями."""
    
    list_display = (
        'email', 'full_name', 'is_active', 'is_activated', 
        'is_staff', 'pets_count', 'orders_count', 'payments_count', 
        'created_at', 'last_login'
    )
    list_filter = (
        'is_active', 'is_activated', 'is_staff', 'is_superuser', 
        'created_at', 'last_login'
    )
    search_fields = (
        'email', 'first_name', 'last_name', 'phone'
    )
    ordering = ('-created_at',)
    readonly_fields = (
        'id', 'created_at', 'updated_at', 'activation_link', 
        'activation_code', 'last_login'
    )
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('email', 'password')
        }),
        ('Профиль', {
            'fields': ('first_name', 'last_name', 'phone', 'default_address')
        }),
        ('Активация', {
            'fields': ('is_activated', 'activation_link', 'activation_code')
        }),
        ('Права доступа', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Системная информация', {
            'fields': ('id', 'created_at', 'updated_at', 'last_login'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'is_staff', 'is_superuser'),
        }),
    )
    
    filter_horizontal = ('groups', 'user_permissions')
    
    inlines = [PetInline, PaymentInline, OrderInline, UserCourseInline]
    
    actions = ['activate_users', 'deactivate_users', 'make_staff', 'remove_staff']
    
    def full_name(self, obj):
        """Полное имя пользователя."""
        if obj.first_name or obj.last_name:
            return f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return '-'
    full_name.short_description = 'Имя'
    
    def pets_count(self, obj):
        """Количество питомцев."""
        count = obj.pets.count()
        if count > 0:
            url = reverse('admin:pets_pet_changelist') + f'?owner__id__exact={obj.id}'
            return format_html('<a href="{}">{} питомцев</a>', url, count)
        return '0'
    pets_count.short_description = 'Питомцы'
    
    def orders_count(self, obj):
        """Количество заказов."""
        count = obj.orders.count()
        if count > 0:
            url = reverse('admin:shop_order_changelist') + f'?user__id__exact={obj.id}'
            return format_html('<a href="{}">{} заказов</a>', url, count)
        return '0'
    orders_count.short_description = 'Заказы'
    
    def payments_count(self, obj):
        """Количество платежей."""
        count = obj.payments.count()
        if count > 0:
            url = reverse('admin:payments_payment_changelist') + f'?user__id__exact={obj.id}'
            return format_html('<a href="{}">{} платежей</a>', url, count)
        return '0'
    payments_count.short_description = 'Платежи'
    
    def activate_users(self, request, queryset):
        """Активировать выбранных пользователей."""
        updated = queryset.update(is_active=True, is_activated=True)
        self.message_user(request, f'Активировано пользователей: {updated}')
    activate_users.short_description = 'Активировать выбранных пользователей'
    
    def deactivate_users(self, request, queryset):
        """Деактивировать выбранных пользователей."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'Деактивировано пользователей: {updated}')
    deactivate_users.short_description = 'Деактивировать выбранных пользователей'
    
    def make_staff(self, request, queryset):
        """Назначить выбранных пользователей администраторами."""
        updated = queryset.update(is_staff=True)
        self.message_user(request, f'Назначено администраторами: {updated}')
    make_staff.short_description = 'Назначить администраторами'
    
    def remove_staff(self, request, queryset):
        """Убрать права администратора у выбранных пользователей."""
        updated = queryset.exclude(is_superuser=True).update(is_staff=False)
        self.message_user(request, f'Убрано прав администратора: {updated}')
    remove_staff.short_description = 'Убрать права администратора'


@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):
    """Админка для управления токенами."""
    
    list_display = ('user', 'created_at', 'refresh_token_preview', 'is_active')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'refresh_token')
    readonly_fields = ('id', 'created_at', 'refresh_token_preview', 'refresh_token')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'user', 'refresh_token_preview')
        }),
        ('Системная информация', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def refresh_token_preview(self, obj):
        """Превью refresh токена."""
        if obj.refresh_token:
            return format_html(
                '<code style="word-break: break-all;">{}</code>',
                obj.refresh_token[:100] + '...' if len(obj.refresh_token) > 100 else obj.refresh_token
            )
        return '-'
    refresh_token_preview.short_description = 'Refresh Token'
    
    def is_active(self, obj):
        """Проверка активности токена."""
        from django.utils import timezone
        from datetime import timedelta
        # Токен считается активным, если создан менее 7 дней назад
        if obj.created_at:
            return (timezone.now() - obj.created_at) < timedelta(days=7)
        return False
    is_active.boolean = True
    is_active.short_description = 'Активен'
