from django.contrib import admin
from .models import Product, Cart, CartItem, Order, OrderItem, Address


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'vendor', 'animal', 'category', 'in_stock', 'stock_count')
    list_filter = ('animal', 'category', 'in_stock')
    search_fields = ('name', 'vendor', 'description')


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'updated_at')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity')
    list_filter = ('cart',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_amount', 'status', 'delivery_type', 'created_at')
    list_filter = ('status', 'delivery_type', 'created_at')
    search_fields = ('id', 'user__email')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product_name', 'quantity', 'price')
    list_filter = ('order',)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'city', 'street', 'house', 'is_default', 'created_at')
    list_filter = ('city', 'is_default')
    search_fields = ('user__email', 'city', 'street', 'house')
    readonly_fields = ('id', 'created_at', 'updated_at')
