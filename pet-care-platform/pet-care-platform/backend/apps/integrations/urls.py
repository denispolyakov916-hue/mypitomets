from django.urls import path

from .views import CatalogSyncView, DistributorPingView, FulfillmentWebhookView


urlpatterns = [
    path('distributor/v1/ping', DistributorPingView.as_view(), name='distributor-ping'),
    path('distributor/v1/ping/', DistributorPingView.as_view(), name='distributor-ping-slash'),
    path('distributor/v1/catalog/sync', CatalogSyncView.as_view(), name='distributor-catalog-sync'),
    path('distributor/v1/catalog/sync/', CatalogSyncView.as_view(), name='distributor-catalog-sync-slash'),
    path('distributor/v1/webhooks/fulfillment', FulfillmentWebhookView.as_view(), name='distributor-fulfillment-webhook'),
    path('distributor/v1/webhooks/fulfillment/', FulfillmentWebhookView.as_view(), name='distributor-fulfillment-webhook-slash'),
]
