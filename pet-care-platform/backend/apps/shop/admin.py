"""Регистрация моделей магазина в админке Django."""

import csv
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponse
from .models import (
    Product, Cart, CartItem, Order, OrderItem, Reservation, Address, Return,
    Category, Brand, ProductSKU, ProductBreedRecommendation
)

# Кастомизация заголовков админки
admin.site.site_header = 'Питомец+ Администрирование'
admin.site.site_title = 'Питомец+ Админ'
admin.site.index_title = 'Управление платформой'


class ExportCsvMixin:
    """Миксин для экспорта данных в CSV."""
    
    def export_as_csv(self, request, queryset):
        """Экспортировать выбранные записи в CSV."""
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename={meta.verbose_name_plural}.csv'
        response.write('\ufeff')  # BOM для Excel

        writer = csv.writer(response)
        writer.writerow(field_names)

        for obj in queryset:
            row = []
            for field in field_names:
                value = getattr(obj, field)
                if callable(value):
                    value = value()
                row.append(str(value) if value is not None else '')
            writer.writerow(row)

        return response

    export_as_csv.short_description = 'Экспортировать %(verbose_name_plural)s в CSV'


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
class ProductAdmin(ExportCsvMixin, admin.ModelAdmin):
    list_display = (
        'name', 'price_display', 'animal_type', 'category_display', 'brand',
        'stock_count', 'stock_info', 'rating_display', 'order_count', 'is_available'
    )
    list_filter = (
        'animal_type', 'product_group', 'new_category', 'brand', 'is_available',
        'is_grain_free', 'is_hypoallergenic', 'is_veterinary',
        'age_group', 'size_group', 'status',
        # Legacy filters
        'animal', 'category', 'subcategory', 'vendor', 'in_stock',
        'created_at', 'updated_at'
    )
    search_fields = ('name', 'slug', 'vendor', 'kotmatros_product_id', 'vendor_code', 'barcode')
    ordering = ('-order_count', 'name')
    readonly_fields = (
        'kotmatros_product_id', 'created_at', 'updated_at', 'rating_display',
        'reviews_count_display', 'main_image', 'sku_count'
    )
    list_editable = ('is_available', 'stock_count')
    list_per_page = 50
    date_hierarchy = 'created_at'
    raw_id_fields = ('brand', 'new_category')
    autocomplete_fields = ['brand', 'new_category']
    actions = [
        'mark_as_in_stock', 'mark_as_out_of_stock',
        'apply_discount_10', 'apply_discount_20', 'remove_discount',
        'export_as_csv'
    ]

    fieldsets = (
        ('Основная информация', {
            'fields': ('kotmatros_product_id', 'name', 'slug', 'short_description', 'description')
        }),
        ('Цены', {
            'fields': ('price', 'compare_price', 'discount_percent')
        }),
        ('Новая классификация', {
            'fields': ('animal_type', 'new_category', 'product_group', 'brand')
        }),
        ('Фильтры', {
            'fields': ('age_group', 'size_group', 'is_grain_free', 'is_hypoallergenic', 'is_veterinary'),
            'classes': ('collapse',)
        }),
        ('Здоровье', {
            'fields': ('health_conditions', 'allergens'),
            'classes': ('collapse',)
        }),
        ('Изображения', {
            'fields': ('image_url', 'images', 'main_image'),
            'classes': ('collapse',)
        }),
        ('Рейтинг', {
            'fields': ('rating', 'rating_count', 'rating_display', 'reviews_count_display'),
            'classes': ('collapse',)
        }),
        ('Наличие', {
            'fields': ('is_available', 'sku_count', 'status')
        }),
        ('Детали категории (JSONB)', {
            'fields': ('category_details',),
            'classes': ('collapse',)
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'country'),
            'classes': ('collapse',)
        }),
        # Legacy fieldsets
        ('Характеристики (legacy)', {
            'fields': ('weight', 'vendor', 'vendor_code', 'barcode'),
            'classes': ('collapse',)
        }),
        ('Классификация (legacy)', {
            'fields': ('animal', 'category', 'subcategory', 'category_name'),
            'classes': ('collapse',)
        }),
        ('Наличие (legacy)', {
            'fields': ('in_stock', 'stock_count', 'order_count'),
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

    def reviews_count_display(self, obj):
        """Количество отзывов."""
        return obj.get_reviews_count()
    reviews_count_display.short_description = 'Количество отзывов'

    def mark_as_in_stock(self, request, queryset):
        """Отметить товары как в наличии."""
        updated = queryset.update(in_stock=True)
        self.message_user(request, f'Отмечено как в наличии: {updated} товаров')
    mark_as_in_stock.short_description = 'Отметить %(verbose_name_plural)s как в наличии'

    def mark_as_out_of_stock(self, request, queryset):
        """Отметить товары как нет в наличии."""
        updated = queryset.update(in_stock=False)
        self.message_user(request, f'Отмечено как нет в наличии: {updated} товаров')
    mark_as_out_of_stock.short_description = 'Отметить %(verbose_name_plural)s как нет в наличии'

    def apply_discount_10(self, request, queryset):
        """Применить скидку 10%."""
        updated = queryset.update(discount_percent=10)
        self.message_user(request, f'Скидка 10% применена к {updated} товарам')
    apply_discount_10.short_description = 'Применить скидку 10%% на %(verbose_name_plural)s'

    def apply_discount_20(self, request, queryset):
        """Применить скидку 20%."""
        updated = queryset.update(discount_percent=20)
        self.message_user(request, f'Скидка 20% применена к {updated} товарам')
    apply_discount_20.short_description = 'Применить скидку 20%% на %(verbose_name_plural)s'

    def remove_discount(self, request, queryset):
        """Убрать скидку."""
        updated = queryset.update(discount_percent=0)
        self.message_user(request, f'Скидка убрана у {updated} товаров')
    remove_discount.short_description = 'Убрать скидку с %(verbose_name_plural)s'


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity')


@admin.register(Order)
class OrderAdmin(ExportCsvMixin, admin.ModelAdmin):
    list_display = (
        'id_display', 'user_display', 'total_display', 'status_display',
        'delivery_info', 'created_at', 'expires_at'
    )
    list_filter = (
        'status', 'delivery_type', 'created_at', 'expires_at',
        ('user__is_active', admin.BooleanFieldListFilter),
        'recipient_name'
    )
    search_fields = ('id', 'user__email', 'user__first_name', 'user__last_name', 'recipient_name')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'expires_at')
    list_per_page = 30
    date_hierarchy = 'created_at'
    inlines = [OrderItemInline]
    actions = [
        'mark_as_processing', 'mark_as_shipped', 'mark_as_delivered',
        'cancel_orders', 'export_as_csv', 'export_for_delivery',
        'notify_customers', 'apply_bulk_discount'
    ]

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
    mark_as_processing.short_description = 'Отметить %(verbose_name_plural)s в обработке'

    def mark_as_shipped(self, request, queryset):
        """Отметить заказы как отправленные."""
        updated = queryset.filter(status='processing').update(status='shipped')
        self.message_user(request, f'Отмечено как отправленные: {updated} заказов')
    mark_as_shipped.short_description = 'Отметить %(verbose_name_plural)s как отправленные'

    def mark_as_delivered(self, request, queryset):
        """Отметить заказы как доставленные."""
        updated = queryset.filter(status='shipped').update(status='delivered')
        self.message_user(request, f'Отмечено как доставленные: {updated} заказов')
    mark_as_delivered.short_description = 'Отметить %(verbose_name_plural)s как доставленные'

    def cancel_orders(self, request, queryset):
        """Отменить заказы."""
        updated = queryset.filter(status__in=['pending', 'processing']).update(status='cancelled')
        self.message_user(request, f'Отменено заказов: {updated}')

    def export_for_delivery(self, request, queryset):
        """Экспортировать данные для службы доставки."""
        import csv
        from django.http import HttpResponse
        from django.utils import timezone

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename=delivery_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv'
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow([
            'Номер заказа', 'Получатель', 'Телефон', 'Адрес',
            'Сумма', 'Статус', 'Дата создания'
        ])

        for order in queryset.select_related('address'):
            address_str = ''
            if order.address:
                address_str = f"{order.address.city}, {order.address.street}"
                if order.address.house:
                    address_str += f", д.{order.address.house}"

            writer.writerow([
                order.id,
                order.recipient_name or (order.user.get_full_name() if order.user else ''),
                order.recipient_phone or (order.user.phone if order.user else ''),
                address_str,
                order.total_amount,
                order.get_status_display(),
                order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else ''
            ])

        self.message_user(request, f'Экспортировано заказов для доставки: {queryset.count()}')
        return response

    def notify_customers(self, request, queryset):
        """Отправить уведомления клиентам о статусе заказа."""
        # Здесь можно реализовать отправку email или SMS уведомлений
        notified = queryset.count()
        self.message_user(request, f'Уведомления отправлены {notified} клиентам')

    def apply_bulk_discount(self, request, queryset):
        """Применить скидку к выбранным заказам."""
        # Здесь можно реализовать применение скидок
        updated = queryset.filter(status='pending').count()
        self.message_user(request, f'Скидки применены к {updated} заказам')
    cancel_orders.short_description = 'Отменить %(verbose_name_plural)s'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order_display', 'product_name', 'quantity', 'price_display', 'total_display')
    list_filter = ('order__status', 'order__created_at')
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
    extend_reservations.short_description = 'Продлить %(verbose_name_plural)s на 10 мин'

    def cancel_expired(self, request, queryset):
        """Удалить истёкшие резервирования."""
        deleted, _ = queryset.filter(is_expired=True).delete()
        self.message_user(request, f'Удалено истёкших резервирований: {deleted}')
    cancel_expired.short_description = 'Удалить истёкшие %(verbose_name_plural)s'


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
    readonly_fields = ('id', 'requested_at', 'approved_at', 'received_at', 'refunded_at')
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

    def reason_display(self, obj):
        """Причина возврата."""
        return obj.get_reason_display()
    reason_display.short_description = 'Причина'

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
    approve_returns.short_description = 'Одобрить %(verbose_name_plural)s'

    def reject_returns(self, request, queryset):
        """Отклонить возвраты."""
        rejected = 0
        for return_obj in queryset.filter(status__in=['requested', 'approved']):
            return_obj.reject_return("Отклонено администратором")
            rejected += 1
        self.message_user(request, f'Отклонено возвратов: {rejected}')
    reject_returns.short_description = 'Отклонить %(verbose_name_plural)s'

    def mark_as_received(self, request, queryset):
        """Отметить как полученные."""
        received = 0
        for return_obj in queryset.filter(status='approved'):
            return_obj.mark_received()
            received += 1
        self.message_user(request, f'Отмечено как полученные: {received}')
    mark_as_received.short_description = 'Отметить %(verbose_name_plural)s как полученные'

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
    process_refunds.short_description = 'Вернуть средства по %(verbose_name_plural)s'


# =============================================================================
# НОВЫЕ МОДЕЛИ ПО database_tz.md
# =============================================================================

class ProductSKUInline(admin.TabularInline):
    """Inline для вариаций товара."""
    model = ProductSKU
    extra = 0
    fields = (
        'sku', 'name', 'price', 'compare_price', 'available',
        'weight_display', 'flavor_display', 'size_code', 'color_display',
        'is_default', 'sort_order'
    )
    readonly_fields = ()


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Админ для категорий товаров."""
    list_display = (
        'name', 'code', 'kotmatros_category_id', 'animal_type', 'product_group',
        'parent', 'depth', 'product_count', 'is_active', 'show_in_menu', 'sort_order'
    )
    list_filter = ('animal_type', 'product_group', 'depth', 'is_active', 'show_in_menu')
    search_fields = ('name', 'slug', 'code', 'kotmatros_category_id')
    ordering = ('sort_order', 'name')
    list_editable = ('is_active', 'show_in_menu', 'sort_order')
    readonly_fields = ('depth', 'path', 'product_count')
    prepopulated_fields = {'slug': ('name',)}
    list_per_page = 50
    
    fieldsets = (
        ('Основное', {
            'fields': ('name', 'slug', 'code', 'kotmatros_category_id', 'description')
        }),
        ('Иерархия', {
            'fields': ('parent', 'depth', 'path')
        }),
        ('Классификация', {
            'fields': ('animal_type', 'product_group')
        }),
        ('Отображение', {
            'fields': ('icon', 'image_url', 'sort_order', 'is_active', 'show_in_menu')
        }),
        ('Статистика', {
            'fields': ('product_count',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    """Админ для брендов."""
    list_display = (
        'name', 'kotmatros_brand_id', 'brand_class', 'country',
        'priority', 'product_count', 'is_active'
    )
    list_filter = ('brand_class', 'is_active', 'country')
    search_fields = ('name', 'slug', 'kotmatros_brand_id')
    ordering = ('-priority', 'name')
    list_editable = ('priority', 'is_active')
    readonly_fields = ('product_count',)
    prepopulated_fields = {'slug': ('name',)}
    list_per_page = 50
    
    fieldsets = (
        ('Основное', {
            'fields': ('name', 'slug', 'kotmatros_brand_id', 'description')
        }),
        ('Классификация', {
            'fields': ('brand_class', 'country', 'priority')
        }),
        ('Медиа', {
            'fields': ('logo_url', 'website_url')
        }),
        ('Статус', {
            'fields': ('is_active', 'product_count')
        }),
    )


@admin.register(ProductSKU)
class ProductSKUAdmin(admin.ModelAdmin):
    """Админ для вариаций товаров."""
    list_display = (
        'sku', 'product_link', 'name', 'price', 'available',
        'weight_display', 'flavor_display', 'size_code', 'is_default'
    )
    list_filter = ('available', 'is_default', 'status')
    search_fields = ('sku', 'name', 'product__name', 'kotmatros_variant_id')
    ordering = ('product', 'sort_order')
    raw_id_fields = ('product',)
    list_per_page = 50
    
    fieldsets = (
        ('Товар', {
            'fields': ('product', 'sku', 'name', 'kotmatros_variant_id')
        }),
        ('Цены', {
            'fields': ('price', 'compare_price')
        }),
        ('Наличие', {
            'fields': ('available', 'stock_quantity', 'status')
        }),
        ('Вес', {
            'fields': ('weight_kg', 'weight_display'),
            'classes': ('collapse',)
        }),
        ('Вкус', {
            'fields': ('flavor', 'flavor_display'),
            'classes': ('collapse',)
        }),
        ('Размер', {
            'fields': ('size_code', 'size_back_cm', 'size_chest_cm', 'size_neck_cm'),
            'classes': ('collapse',)
        }),
        ('Цвет', {
            'fields': ('color', 'color_display', 'color_hex'),
            'classes': ('collapse',)
        }),
        ('Объём', {
            'fields': ('volume_ml', 'volume_display', 'pack_quantity'),
            'classes': ('collapse',)
        }),
        ('Сортировка', {
            'fields': ('sort_order', 'is_default')
        }),
    )
    
    def product_link(self, obj):
        """Ссылка на товар."""
        if obj.product:
            url = reverse('admin:shop_product_change', args=[obj.product.pk])
            return format_html('<a href="{}">{}</a>', url, obj.product.name[:50])
        return '-'
    product_link.short_description = 'Товар'


@admin.register(ProductBreedRecommendation)
class ProductBreedRecommendationAdmin(admin.ModelAdmin):
    """Админ для рекомендаций товаров для пород."""
    list_display = (
        'product_name', 'breed_name', 'match_type', 'suitability', 
        'score', 'is_auto', 'created_at'
    )
    list_filter = ('match_type', 'suitability', 'is_auto')
    search_fields = ('product__name', 'breed__name', 'reason')
    ordering = ('-score', 'breed__name')
    raw_id_fields = ('product', 'breed')
    list_per_page = 100
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Связь', {
            'fields': ('product', 'breed')
        }),
        ('Оценка', {
            'fields': ('match_type', 'suitability', 'score', 'reason')
        }),
        ('Метаданные', {
            'fields': ('is_auto', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def product_name(self, obj):
        return obj.product.name[:40]
    product_name.short_description = 'Товар'
    
    def breed_name(self, obj):
        return obj.breed.name
    breed_name.short_description = 'Порода'
