"""Регистрация моделей магазина в админке."""

from django.contrib import admin
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
    list_display = ('name', 'price', 'animal', 'category', 'subcategory', 'vendor', 'in_stock')
    list_filter = ('animal', 'category', 'subcategory', 'vendor', 'in_stock')
    search_fields = ('name', 'vendor', 'external_id')
    ordering = ('name',)
    readonly_fields = ('external_id', 'created_at', 'updated_at')


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email',)
    ordering = ('-created_at',)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product_name', 'quantity', 'price')
