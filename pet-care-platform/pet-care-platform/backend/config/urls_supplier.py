"""URL маршруты кабинета поставщика."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .supplier_api import (
    SupplierProductSubmissionViewSet,
    SupplierProfileViewSet,
)


router = DefaultRouter()
router.register(r'profile', SupplierProfileViewSet, basename='supplier-profile')
router.register(r'products', SupplierProductSubmissionViewSet, basename='supplier-products')

urlpatterns = [
    path('', include(router.urls)),
]
