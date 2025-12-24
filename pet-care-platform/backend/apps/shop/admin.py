"""Регистрация моделей магазина в админке."""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Product, Cart, CartItem, Order, OrderItem, Reservation, Address, Return


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
    list_display = (
        'name', 'price_display', 'animal', 'category_display', 'vendor',
        'stock_info', 'rating_display', 'order_count', 'in_stock'
    )
    list_filter = (
        'animal', 'category', 'subcategory', 'vendor', 'in_stock',
        'created_at', 'updated_at'
    )
    search_fields = ('name', 'vendor', 'external_id', 'vendor_code', 'barcode')
    ordering = ('-order_count', 'name')
    readonly_fields = (
        'external_id', 'created_at', 'updated_at', 'rating_display',
        'reviews_count', 'main_image'
    )
    list_editable = ('in_stock', 'stock_count')
    actions = ['mark_as_in_stock', 'mark_as_out_of_stock']

    fieldsets = (
        ('Основная информация', {
            'fields': ('external_id', 'name', 'description', 'price', 'discount_percent')
        }),
        ('Изображения и характеристики', {
            'fields': ('images', 'main_image', 'weight', 'vendor', 'vendor_code', 'barcode'),
            'classes': ('collapse',)
        }),
        ('Классификация', {
            'fields': ('animal', 'category', 'subcategory', 'category_name')
        }),
        ('Наличие и популярность', {
            'fields': ('in_stock', 'stock_count', 'order_count')
        }),
        ('Рейтинги', {
            'fields': ('rating_display', 'reviews_count'),
            'classes': ('collapse',)
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def price_display(self, obj):
        """Отображение цены с учётом скидки."""
        if obj.discount_percent > 0:
            discounted = obj.discounted_price
            return format_html(
                '<span style="text-decoration: line-through; color: #999;">{:.0f}₽</span> '
                '<span style="color: #e53e3e; font-weight: bold;">{:.0f}₽</span> '
                '<span style="background: #e53e3e; color: white; padding: 2px 4px; border-radius: 3px; font-size: 10px;">-{}%</span>',
                obj.price, discounted, obj.discount_percent
            )
        return f"{obj.price:.0f}₽"
    price_display.short_description = 'Цена'
    price_display.admin_order_field = 'price'

    def category_display(self, obj):
        """Отображение категории с подкатегорией."""
        if obj.subcategory:
            return f"{obj.category} → {obj.subcategory}"
        return obj.category
    category_display.short_description = 'Категория'

    def stock_info(self, obj):
        """Информация о наличии."""
        if obj.in_stock:
            if obj.stock_count <= 5:
                return format_html('<span style="color: #dd6b20;">{} шт.</span>', obj.stock_count)
            else:
                return format_html('<span style="color: #38a169;">{} шт.</span>', obj.stock_count)
        return format_html('<span style="color: #e53e3e;">Нет в наличии</span>')
    stock_info.short_description = 'Наличие'

    def rating_display(self, obj):
        """Отображение рейтинга с звездами."""
        rating = obj.get_average_rating()
        if rating == 0:
            return "Нет отзывов"

        stars = "★" * int(rating) + "☆" * (5 - int(rating))
        return format_html(
            '<span style="color: #fbbf24;">{}</span> {:.1f} ({})',
            stars, rating, obj.get_reviews_count()
        )
    rating_display.short_description = 'Рейтинг'

    def mark_as_in_stock(self, request, queryset):
        """Отметить товары как в наличии."""
        updated = queryset.update(in_stock=True)
        self.message_user(request, f'Отмечено как в наличии: {updated} товаров')
    mark_as_in_stock.short_description = 'Отметить как в наличии'

    def mark_as_out_of_stock(self, request, queryset):
        """Отметить товары как нет в наличии."""
        updated = queryset.update(in_stock=False)
        self.message_user(request, f'Отмечено как нет в наличии: {updated} товаров')
    mark_as_out_of_stock.short_description = 'Отметить как нет в наличии'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id_display', 'user_display', 'total_display', 'status_display',
        'delivery_info', 'created_at', 'expires_at'
    )
    list_filter = ('status', 'delivery_type', 'created_at', 'expires_at')
    search_fields = ('id', 'user__email', 'user__first_name', 'user__last_name', 'recipient_name')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'expires_at')
    inlines = [OrderItemInline]
    actions = ['mark_as_processing', 'mark_as_shipped', 'mark_as_delivered', 'cancel_orders']

    fieldsets = (
        ('Заказ', {
            'fields': ('id', 'user', 'status', 'created_at', 'expires_at')
        }),
        ('Финансовая информация', {
            'fields': ('subtotal_amount', 'delivery_cost', 'total_amount')
        }),
        ('Доставка', {
            'fields': ('delivery_type', 'shipping_address', 'address', 'delivery_date')
        }),
        ('Получатель', {
            'fields': ('recipient_name', 'recipient_phone'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """Оптимизация запросов."""
        return super().get_queryset(request).select_related('user', 'address')

    def id_display(self, obj):
        """Отображение ID заказа с ссылкой."""
        url = reverse('admin:shop_order_change', args=[obj.id])
        return format_html('<a href="{}" style="font-family: monospace;">{}</a>', url, obj.id[:8])
    id_display.short_description = 'ID заказа'

    def user_display(self, obj):
        """Отображение пользователя с ссылкой."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "Удалённый пользователь"
    user_display.short_description = 'Пользователь'

    def total_display(self, obj):
        """Отображение суммы с валютой."""
        return f"{obj.total_amount:.0f} ₽"
    total_display.short_description = 'Сумма'
    total_display.admin_order_field = 'total_amount'

    def status_display(self, obj):
        """Отображение статуса с цветом."""
        colors = {
            'pending': '#f59e0b',
            'processing': '#3b82f6',
            'shipped': '#8b5cf6',
            'delivered': '#10b981',
            'cancelled': '#6b7280',
            'expired': '#ef4444'
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Статус'

    def delivery_info(self, obj):
        """Информация о доставке."""
        if obj.delivery_type == 'pickup':
            return "Самовывоз"
        return f"{obj.get_delivery_type_display()}"
    delivery_info.short_description = 'Доставка'

    def mark_as_processing(self, request, queryset):
        """Отметить заказы как в обработке."""
        updated = queryset.filter(status='pending').update(status='processing')
        self.message_user(request, f'Отмечено в обработке: {updated} заказов')
    mark_as_processing.short_description = 'Отметить в обработке'

    def mark_as_shipped(self, request, queryset):
        """Отметить заказы как отправленные."""
        updated = queryset.filter(status='processing').update(status='shipped')
        self.message_user(request, f'Отмечено как отправленные: {updated} заказов')
    mark_as_shipped.short_description = 'Отметить как отправленные'

    def mark_as_delivered(self, request, queryset):
        """Отметить заказы как доставленные."""
        updated = queryset.filter(status='shipped').update(status='delivered')
        self.message_user(request, f'Отмечено как доставленные: {updated} заказов')
    mark_as_delivered.short_description = 'Отметить как доставленные'

    def cancel_orders(self, request, queryset):
        """Отменить заказы."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='cancelled')
        self.message_user(request, f'Отменено заказов: {updated}')
    cancel_orders.short_description = 'Отменить заказы'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order_display', 'product_name', 'quantity', 'price_display', 'total_display')
    list_filter = ('order__status', 'created_at')
    search_fields = ('product_name', 'order__id')
    readonly_fields = ('order', 'product', 'product_name', 'price', 'quantity', 'disclaimer_accepted')

    def order_display(self, obj):
        """Ссылка на заказ."""
        url = reverse('admin:shop_order_change', args=[obj.order.id])
        return format_html('<a href="{}">{}</a>', url, obj.order.id[:8])
    order_display.short_description = 'Заказ'

    def price_display(self, obj):
        """Цена с валютой."""
        return f"{obj.price:.0f} ₽"
    price_display.short_description = 'Цена'

    def total_display(self, obj):
        """Общая сумма."""
        return f"{obj.get_total():.0f} ₽"
    total_display.short_description = 'Сумма'


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        'id_display', 'user_display', 'reservation_type_display',
        'object_id', 'quantity', 'is_expired', 'expires_at', 'created_at'
    )
    list_filter = ('reservation_type', 'created_at', 'expires_at')
    search_fields = ('id', 'user__email', 'object_id')
    readonly_fields = ('id', 'created_at')
    actions = ['extend_reservations', 'cancel_expired']

    def id_display(self, obj):
        """ID резервирования."""
        return obj.id[:8]
    id_display.short_description = 'ID'

    def user_display(self, obj):
        """Пользователь с ссылкой."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "Удалённый пользователь"
    user_display.short_description = 'Пользователь'

    def reservation_type_display(self, obj):
        """Тип резервирования с иконкой."""
        icons = {'product': '📦', 'course': '📚'}
        icon = icons.get(obj.reservation_type, '🔒')
        return format_html('{} {}', icon, obj.get_reservation_type_display())
    reservation_type_display.short_description = 'Тип'

    def extend_reservations(self, request, queryset):
        """Продлить резервирования на 10 минут."""
        extended = 0
        for reservation in queryset.filter(is_expired=False):
            reservation.extend_reservation(10)
            extended += 1
        self.message_user(request, f'Продлено резервирований: {extended}')
    extend_reservations.short_description = 'Продлить на 10 мин'

    def cancel_expired(self, request, queryset):
        """Удалить истёкшие резервирования."""
        deleted, _ = queryset.filter(is_expired=True).delete()
        self.message_user(request, f'Удалено истёкших резервирований: {deleted}')
    cancel_expired.short_description = 'Удалить истёкшие'


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user_display', 'city', 'street', 'house', 'is_default', 'created_at')
    list_filter = ('country', 'city', 'is_default', 'created_at')
    search_fields = ('user__email', 'city', 'street', 'house')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-is_default', '-created_at')

    fieldsets = (
        ('Пользователь', {
            'fields': ('user', 'is_default')
        }),
        ('Адрес', {
            'fields': ('country', 'city', 'street', 'house', 'building', 'apartment', 'postal_code')
        }),
        ('Дополнительно', {
            'fields': ('comment', 'latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('Системная информация', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_display(self, obj):
        """Пользователь с ссылкой."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "Удалённый пользователь"
    user_display.short_description = 'Пользователь'


@admin.register(Return)
class ReturnAdmin(admin.ModelAdmin):
    list_display = (
        'id_display', 'user_display', 'order_display', 'status_display',
        'reason_display', 'quantity', 'refund_amount_display', 'requested_at'
    )
    list_filter = ('status', 'reason', 'requested_at', 'approved_at', 'refunded_at')
    search_fields = ('id', 'user__email', 'order__id', 'order_item__product_name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-requested_at',)
    actions = ['approve_returns', 'reject_returns', 'mark_as_received', 'process_refunds']

    fieldsets = (
        ('Основная информация', {
            'fields': ('id', 'user', 'order', 'order_item', 'quantity', 'reason', 'description')
        }),
        ('Обработка', {
            'fields': ('status', 'admin_comment', 'refund_amount')
        }),
        ('Даты', {
            'fields': ('requested_at', 'approved_at', 'received_at', 'refunded_at'),
            'classes': ('collapse',)
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def id_display(self, obj):
        """ID возврата."""
        return obj.id[:8]
    id_display.short_description = 'ID'

    def user_display(self, obj):
        """Пользователь с ссылкой."""
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return "Удалённый пользователь"
    user_display.short_description = 'Пользователь'

    def order_display(self, obj):
        """Заказ с ссылкой."""
        url = reverse('admin:shop_order_change', args=[obj.order.id])
        return format_html('<a href="{}">{}</a>', url, obj.order.id[:8])
    order_display.short_description = 'Заказ'

    def status_display(self, obj):
        """Статус с цветом."""
        colors = {
            'requested': '#f59e0b',
            'approved': '#3b82f6',
            'rejected': '#ef4444',
            'received': '#8b5cf6',
            'refunded': '#10b981'
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Статус'

    def refund_amount_display(self, obj):
        """Сумма возврата."""
        return f"{obj.refund_amount:.0f} ₽" if obj.refund_amount else "—"
    refund_amount_display.short_description = 'Возврат'

    def approve_returns(self, request, queryset):
        """Одобрить возвраты."""
        approved = 0
        for return_obj in queryset.filter(status='requested'):
            try:
                return_obj.approve_return()
                approved += 1
            except Exception as e:
                self.message_user(request, f'Ошибка при одобрении возврата {return_obj.id}: {e}', level='error')
        self.message_user(request, f'Одобрено возвратов: {approved}')
    approve_returns.short_description = 'Одобрить возвраты'

    def reject_returns(self, request, queryset):
        """Отклонить возвраты."""
        rejected = 0
        for return_obj in queryset.filter(status__in=['requested', 'approved']):
            return_obj.reject_return("Отклонено администратором")
            rejected += 1
        self.message_user(request, f'Отклонено возвратов: {rejected}')
    reject_returns.short_description = 'Отклонить возвраты'

    def mark_as_received(self, request, queryset):
        """Отметить как полученные."""
        received = 0
        for return_obj in queryset.filter(status='approved'):
            return_obj.mark_received()
            received += 1
        self.message_user(request, f'Отмечено как полученные: {received}')
    mark_as_received.short_description = 'Отметить как полученные'

    def process_refunds(self, request, queryset):
        """Обработать возвраты средств."""
        refunded = 0
        for return_obj in queryset.filter(status='received'):
            try:
                return_obj.refund_payment()
                refunded += 1
            except Exception as e:
                self.message_user(request, f'Ошибка при возврате средств {return_obj.id}: {e}', level='error')
        self.message_user(request, f'Обработано возвратов средств: {refunded}')
    process_refunds.short_description = 'Вернуть средства'
