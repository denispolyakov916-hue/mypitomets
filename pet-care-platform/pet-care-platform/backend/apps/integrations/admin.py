from django.contrib import admin

from .models import DistributorInboundEvent, DistributorOrder


@admin.register(DistributorOrder)
class DistributorOrderAdmin(admin.ModelAdmin):
    list_display = ('order', 'supplier', 'status', 'distributor_order_ref', 'updated_at')
    list_filter = ('supplier', 'status')
    search_fields = ('order__id', 'distributor_order_ref', 'last_event_id')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DistributorInboundEvent)
class DistributorInboundEventAdmin(admin.ModelAdmin):
    list_display = ('event_id', 'event_type', 'platform_order_id', 'supplier', 'status', 'received_at')
    list_filter = ('supplier', 'event_type', 'status')
    search_fields = ('event_id', 'platform_order_id', 'request_id')
    readonly_fields = ('received_at', 'processed_at')
