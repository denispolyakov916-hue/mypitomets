"""
Сериализаторы для работы с породами
"""
from rest_framework import serializers
from .models import Breed, BreedHealth, BreedNutrition, BreedCare


class BreedHealthSerializer(serializers.ModelSerializer):
    """Сериализатор для рисков здоровья породы"""
    
    class Meta:
        model = BreedHealth
        fields = [
            'id', 'condition_name', 'condition_type', 'affected_system',
            'severity', 'prevalence_percent', 'age_of_onset',
            'prevention', 'screening'
        ]


class BreedNutritionSerializer(serializers.ModelSerializer):
    """Сериализатор для рекомендаций по питанию"""
    
    class Meta:
        model = BreedNutrition
        fields = [
            'protein_need', 'calorie_density', 'diet_type',
            'feeding_frequency', 'special_considerations', 'common_allergens'
        ]


class BreedCareSerializer(serializers.ModelSerializer):
    """Сериализатор для процедур ухода"""
    
    class Meta:
        model = BreedCare
        fields = [
            'id', 'care_category', 'procedure', 'frequency',
            'importance', 'season', 'notes'
        ]


class BreedListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка пород (краткий)"""

    average_weight = serializers.FloatField(read_only=True)
    average_lifespan = serializers.SerializerMethodField()

    def get_average_lifespan(self, obj):
        return obj.average_lifespan

    class Meta:
        model = Breed
        fields = [
            'id', 'species', 'name', 'name_en', 'slug',
            'short_description', 'size_category', 'weight_min', 'weight_max',
            'average_weight', 'average_lifespan', 'energy_level', 'trainability',
            'health_risk_level', 'brachycephalic', 'apartment_friendly'
        ]


class BreedDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детальной информации о породе"""

    average_weight = serializers.FloatField(read_only=True)
    average_lifespan = serializers.SerializerMethodField()
    health_risks = BreedHealthSerializer(many=True, read_only=True)
    nutrition = BreedNutritionSerializer(read_only=True)
    care_procedures = BreedCareSerializer(many=True, read_only=True)

    def get_average_lifespan(self, obj):
        return obj.average_lifespan
    
    class Meta:
        model = Breed
        fields = [
            'id', 'species', 'name', 'name_en', 'slug',
            'description', 'short_description',
            
            # Размеры
            'size_category', 'weight_min', 'weight_max', 'average_weight',
            'height_min', 'height_max', 'lifespan_min', 'lifespan_max', 'average_lifespan',
            
            # Поведение
            'energy_level', 'trainability', 'intelligence',
            'friendliness_to_children', 'friendliness_to_pets', 'friendliness_to_strangers',
            'independence',
            
            # Уход
            'grooming_frequency', 'shedding_level', 'coat_type',
            
            # Здоровье
            'health_risk_level', 'hypoallergenic', 'brachycephalic',
            
            # Другое
            'apartment_friendly', 'good_for_novice',
            
            # Связанные данные
            'health_risks', 'nutrition', 'care_procedures'
        ]


class PetBreedComparisonSerializer(serializers.Serializer):
    """Сериализатор для сравнения питомца с эталоном породы"""
    
    pet_id = serializers.CharField(read_only=True)
    pet_name = serializers.CharField(read_only=True)
    breed_name = serializers.CharField(read_only=True)
    
    # Сравнение веса
    weight_analysis = serializers.DictField(read_only=True)
    
    # Сравнение активности
    activity_analysis = serializers.DictField(read_only=True)
    
    # Риски здоровья
    health_risks = serializers.ListField(read_only=True)
    
    # Рекомендации
    recommendations = serializers.DictField(read_only=True)
    
    # Общая оценка
    overall_score = serializers.IntegerField(read_only=True)
    profile_completeness = serializers.IntegerField(read_only=True)

