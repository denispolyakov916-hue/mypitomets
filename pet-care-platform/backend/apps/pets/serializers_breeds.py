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

    weight_min = serializers.FloatField(read_only=True)
    weight_max = serializers.FloatField(read_only=True)
    min_weight = serializers.FloatField(read_only=True)
    max_weight = serializers.FloatField(read_only=True)
    average_weight = serializers.FloatField(read_only=True)
    average_lifespan = serializers.SerializerMethodField()
    energy_level = serializers.CharField(source='base_activity_level', read_only=True)

    def get_average_lifespan(self, obj):
        return obj.average_lifespan

    class Meta:
        model = Breed
        fields = [
            'id', 'species', 'name', 'name_en', 'slug',
            'short_description', 'size_category', 'weight_min', 'weight_max',
            'min_weight', 'max_weight', 'average_weight', 'average_lifespan', 
            'energy_level', 'trainability',
        ]


class BreedDetailSerializer(serializers.ModelSerializer):
    """Сериализатор для детальной информации о породе"""

    weight_min = serializers.FloatField(read_only=True)
    weight_max = serializers.FloatField(read_only=True)
    min_weight = serializers.FloatField(read_only=True)
    max_weight = serializers.FloatField(read_only=True)
    average_weight = serializers.FloatField(read_only=True)
    average_lifespan = serializers.SerializerMethodField()
    energy_level = serializers.CharField(source='base_activity_level', read_only=True)
    health_risks_data = serializers.JSONField(source='health_risks', read_only=True)

    def get_average_lifespan(self, obj):
        return obj.average_lifespan
    
    class Meta:
        model = Breed
        fields = [
            'id', 'species', 'name', 'name_en', 'slug',
            'short_description',
            
            # Размеры
            'size_category', 'weight_min', 'weight_max', 'min_weight', 'max_weight', 
            'average_weight', 'average_lifespan',
            
            # Поведение
            'energy_level', 'trainability', 'base_activity_level',
            
            # Уход
            'grooming_needs', 'coat_type',
            
            # Здоровье
            'health_risks_data',
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

