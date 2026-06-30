"""URL маршруты заявок на партнёрский доступ (/api/partner-access/)."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .partner_access_api import PartnerAccessRequestViewSet

router = DefaultRouter()
router.register(
    r'requests', PartnerAccessRequestViewSet, basename='partner-access-requests',
)

urlpatterns = [
    path('', include(router.urls)),
]
