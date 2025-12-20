"""
Полноценная админка для управления магазином.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Product, Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    """Inline для элементов корзины."""
    model = CartItem
    extra = 0
    fields = ('product', 'quantity', 'get_total')
    readonly_fields = ('get_total',)
    
    def get_total(self, obj):
        """Общая стоимость позиции."""
        if obj.pk:
            return f"{obj.get_total():.2f} ₽"
        return "-"
    get_total.short_description = 'Сумма'


class OrderItemInline(admin.TabularInline):
    """Inline для элементов заказа."""
    model = OrderItem
    extra = 0
    fields = ('product', 'product_name', 'price', 'quantity', 'get_total')
    readonly_fields = ('get_total',)
    
    def get_total(self, obj):
        """Общая стоимость позиции."""
        if obj.pk:
            return f"{obj.get_total():.2f} ₽"
        return "-"
    get_total.short_description = 'Сумма'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Полноценная админка для управления товарами."""
    
    list_display = (
        'name', 'price_display', 'animal_display', 'category_display', 
        'vendor', 'stock_status', 'image_preview', 'created_at'
    )
    list_filter = (
        'animal', 'category', 'subcategory', 'vendor', 
        'in_stock', 'created_at'
    )
    search_fields = (
        'name', 'description', 'vendor', 'vendor_code', 
        'barcode', 'external_id'
    )
    ordering = ('name',)
    readonly_fields = (
        'external_id', 'created_at', 'updated_at', 
        'image_preview', 'images_display'
    )
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description', 'price', 'currency')
        }),
        ('Классификация', {
            'fields': ('animal', 'category', 'subcategory', 'category_name')
        }),
        ('Производитель', {
            'fields': ('vendor', 'vendor_code', 'barcode')
        }),
        ('Изображения', {
            'fields': ('images_display', 'url')
        }),
        ('Наличие', {
            'fields': ('in_stock', 'stock_count', 'weight')
        }),
        ('Системная информация', {
            'fields': ('external_id', 'group_id', 'params', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_in_stock', 'mark_out_of_stock']
    
    def price_display(self, obj):
        """Отображение цены."""
        return f"{obj.price:.2f} ₽"
    price_display.short_description = 'Цена'
    price_display.admin_order_field = 'price'
    
    def animal_display(self, obj):
        """Отображение типа животного."""
        icons = {'dog': '🐕', 'cat': '🐈'}
        icon = icons.get(obj.animal, '')
        return format_html('{} {}', icon, obj.get_animal_display())
    animal_display.short_description = 'Животное'
    
    def category_display(self, obj):
        """Отображение категории."""
        return obj.get_category_display()
    category_display.short_description = 'Категория'
    
    def stock_status(self, obj):
        """Статус наличия."""
        if obj.in_stock:
            if obj.stock_count > 0:
                return format_html(
                    '<span style="color: green;">✓ В наличии ({})</span>',
                    obj.stock_count
                )
            return format_html('<span style="color: orange;">⚠ В наличии (0)</span>')
        return format_html('<span style="color: red;">✗ Нет в наличии</span>')
    stock_status.short_description = 'Наличие'
    stock_status.admin_order_field = 'in_stock'
    
    def image_preview(self, obj):
        """Превью главного изображения."""
        if obj.main_image:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 100px;" />',
                obj.main_image
            )
        return 'Нет изображения'
    image_preview.short_description = 'Изображение'
    
    def images_display(self, obj):
        """Отображение всех изображений."""
        if obj.images:
            html = '<div style="display: flex; flex-wrap: wrap; gap: 10px;">'
            for img_url in obj.images[:5]:  # Показываем первые 5
                html += f'<img src="{img_url}" style="max-width: 150px; max-height: 150px;" />'
            html += '</div>'
            return format_html(html)
        return 'Нет изображений'
    images_display.short_description = 'Изображения'
    
    def mark_in_stock(self, request, queryset):
        """Пометить как в наличии."""
        updated = queryset.update(in_stock=True)
        self.message_user(request, f'Помечено как в наличии: {updated}')
    mark_in_stock.short_description = 'Пометить как в наличии'
    
    def mark_out_of_stock(self, request, queryset):
        """Пометить как отсутствующие."""
        updated = queryset.update(in_stock=False)
        self.message_user(request, f'Помечено как отсутствующие: {updated}')
    mark_out_of_stock.short_description = 'Пометить как отсутствующие'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """Админка для управления корзинами."""
    
    list_display = ('user_link', 'items_count', 'total_amount', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'items_count', 'total_amount')
    ordering = ('-updated_at',)
    inlines = [CartItemInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'user')
        }),
        ('Статистика', {
            'fields': ('items_count', 'total_amount')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_link(self, obj):
        """Ссылка на пользователя."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'Пользователь'
    
    def items_count(self, obj):
        """Количество товаров в корзине."""
        return obj.get_items_count()
    items_count.short_description = 'Товаров'
    
    def total_amount(self, obj):
        """Общая сумма корзины."""
        return f"{obj.get_total():.2f} ₽"
    total_amount.short_description = 'Сумма'


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    """Админка для управления элементами корзины."""
    
    list_display = ('cart', 'product', 'quantity', 'price_per_item', 'total_price')
    list_filter = ('created_at',)
    search_fields = ('cart__user__email', 'product__name')
    readonly_fields = ('created_at', 'updated_at', 'price_per_item', 'total_price')
    
    def price_per_item(self, obj):
        """Цена за единицу."""
        if obj.product:
            return f"{obj.product.price:.2f} ₽"
        return "-"
    price_per_item.short_description = 'Цена за единицу'
    
    def total_price(self, obj):
        """Общая стоимость."""
        return f"{obj.get_total():.2f} ₽"
    total_price.short_description = 'Сумма'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Полноценная админка для управления заказами."""
    
    list_display = (
        'id', 'user_link', 'total_amount', 'status_display', 
        'items_count', 'created_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'id', 'user__email', 'user__first_name', 
        'user__last_name', 'shipping_address'
    )
    readonly_fields = ('id', 'created_at', 'updated_at', 'items_count')
    ordering = ('-created_at',)
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'user', 'status')
        }),
        ('Финансовая информация', {
            'fields': ('total_amount', 'items_count')
        }),
        ('Доставка', {
            'fields': ('shipping_address',)
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_processing', 'mark_as_shipped', 'mark_as_delivered', 'mark_as_cancelled']
    
    def user_link(self, obj):
        """Ссылка на пользователя."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'Пользователь'
    
    def status_display(self, obj):
        """Отображение статуса с цветом."""
        colors = {
            'pending': 'orange',
            'processing': 'blue',
            'shipped': 'purple',
            'delivered': 'green',
            'cancelled': 'red'
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Статус'
    status_display.admin_order_field = 'status'
    
    def items_count(self, obj):
        """Количество товаров в заказе."""
        return obj.items.count()
    items_count.short_description = 'Товаров'
    
    def mark_as_processing(self, request, queryset):
        """Пометить как в обработке."""
        updated = queryset.filter(status='pending').update(status='processing')
        self.message_user(request, f'Помечено как в обработке: {updated}')
    mark_as_processing.short_description = 'Пометить как в обработке'
    
    def mark_as_shipped(self, request, queryset):
        """Пометить как отправленные."""
        updated = queryset.filter(status='processing').update(status='shipped')
        self.message_user(request, f'Помечено как отправленные: {updated}')
    mark_as_shipped.short_description = 'Пометить как отправленные'
    
    def mark_as_delivered(self, request, queryset):
        """Пометить как доставленные."""
        updated = queryset.filter(status='shipped').update(status='delivered')
        self.message_user(request, f'Помечено как доставленные: {updated}')
    mark_as_delivered.short_description = 'Пометить как доставленные'
    
    def mark_as_cancelled(self, request, queryset):
        """Отменить заказы."""
        updated = queryset.exclude(status__in=['delivered', 'cancelled']).update(status='cancelled')
        self.message_user(request, f'Отменено заказов: {updated}')
    mark_as_cancelled.short_description = 'Отменить заказы'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    """Админка для управления элементами заказа."""
    
    list_display = ('order', 'product_name', 'quantity', 'price', 'total')
    list_filter = ('order__status', 'order__created_at')
    search_fields = ('order__id', 'product_name', 'order__user__email')
    readonly_fields = ('total',)
    
    def total(self, obj):
        """Общая стоимость."""
        return f"{obj.get_total():.2f} ₽"
    total.short_description = 'Сумма'
