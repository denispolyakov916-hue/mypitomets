"""
API Views для справочника медикаментов.
"""

from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from .models import Medication
from .serializers import MedicationListSerializer, MedicationDetailSerializer


class MedicationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/pets/medications/ - список препаратов
    GET /api/pets/medications/{code}/ - детали препарата
    """
    queryset = Medication.objects.all()
    permission_classes = [AllowAny]
    lookup_field = 'code'

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicationListSerializer
        return MedicationDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        species = self.request.query_params.get('species')
        if species:
            queryset = queryset.filter(species__in=[species, 'both'])
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name_trade__icontains=search) | Q(name_active__icontains=search)
            )
        return queryset


class MedicationCategoryView(APIView):
    """Список категорий медикаментов."""

    permission_classes = [AllowAny]

    def get(self, request):
        categories = [
            {'value': value, 'label': label}
            for value, label in Medication.CATEGORY_CHOICES
        ]
        return Response({'categories': categories})
