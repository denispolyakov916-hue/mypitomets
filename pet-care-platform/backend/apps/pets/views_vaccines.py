"""
API Views для справочника вакцин.
"""

from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Vaccine
from .serializers import VaccineListSerializer, VaccineDetailSerializer


class VaccineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/pets/vaccines/ - список вакцин
    GET /api/pets/vaccines/{code}/ - детали вакцины
    """
    queryset = Vaccine.objects.all()
    permission_classes = [AllowAny]
    lookup_field = 'code'

    def get_serializer_class(self):
        if self.action == 'list':
            return VaccineListSerializer
        return VaccineDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        species = self.request.query_params.get('species')
        if species:
            queryset = queryset.filter(species__in=[species, 'both'])
        return queryset
