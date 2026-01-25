"""
Views для медицинских записей питомца (вакцинации, препараты).
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Pet, PetVaccination, PetMedication
from .serializers import PetVaccinationSerializer, PetMedicationSerializer


class BasePetRecordViewSet(viewsets.ModelViewSet):
    """Базовый viewset для записей, привязанных к питомцу."""

    permission_classes = [IsAuthenticated]

    def get_pet(self):
        pet_id = self.kwargs.get('pet_id')
        return get_object_or_404(Pet, id=pet_id, owner=self.request.user)


class PetVaccinationViewSet(BasePetRecordViewSet):
    """CRUD для вакцинаций питомца."""

    serializer_class = PetVaccinationSerializer

    def get_queryset(self):
        pet = self.get_pet()
        return PetVaccination.objects.filter(pet=pet).order_by('-date_administered')

    def perform_create(self, serializer):
        pet = self.get_pet()
        serializer.save(pet=pet)


class PetMedicationViewSet(BasePetRecordViewSet):
    """CRUD для препаратов питомца."""

    serializer_class = PetMedicationSerializer

    def get_queryset(self):
        pet = self.get_pet()
        return PetMedication.objects.filter(pet=pet).order_by('-start_date')

    def perform_create(self, serializer):
        pet = self.get_pet()
        serializer.save(pet=pet)
