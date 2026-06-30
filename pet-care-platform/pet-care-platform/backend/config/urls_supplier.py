"""URL маршруты кабинета поставщика."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .supplier_api import (
    SupplierDashboardViewSet,
    SupplierImportViewSet,
    SupplierOrderViewSet,
    SupplierProductSubmissionViewSet,
    SupplierProfileViewSet,
    SupplierReturnViewSet,
)


router = DefaultRouter()
router.register(r'profile', SupplierProfileViewSet, basename='supplier-profile')
router.register(r'products', SupplierProductSubmissionViewSet, basename='supplier-products')
router.register(r'dashboard', SupplierDashboardViewSet, basename='supplier-dashboard')
router.register(r'orders', SupplierOrderViewSet, basename='supplier-orders')
router.register(r'returns', SupplierReturnViewSet, basename='supplier-returns')
router.register(r'imports', SupplierImportViewSet, basename='supplier-imports')

urlpatterns = [
    path('', include(router.urls)),
]
