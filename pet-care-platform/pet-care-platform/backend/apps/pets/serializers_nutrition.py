"""
Сериализаторы для калькулятора питания и подбора корма.
"""

from rest_framework import serializers
from .nutrition_models import (
    HealthCondition, Allergy, 
    PetHealthCondition, PetAllergy, PetFoodExclusion
)


class HealthConditionSerializer(serializers.ModelSerializer):
    """Сериализатор справочника заболеваний."""
    
    coefficient = serializers.ReadOnlyField()
    
    class Meta:
        model = HealthCondition
        fields = [
            'code', 'name_ru', 'name_en', 'species', 'category',
            'coefficient_min', 'coefficient_max', 'coefficient',
            'priority', 'direction',
            'symptoms', 'dietary_recommendations', 'contraindicated_ingredients',
            'bcs_range_min', 'bcs_range_max',
            'source', 'clinical_notes'
        ]


class HealthConditionListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка заболеваний."""
    
    class Meta:
        model = HealthCondition
        fields = ['code', 'name_ru', 'category', 'priority', 'direction']


class AllergySerializer(serializers.ModelSerializer):
    """Сериализатор справочника аллергий."""
    
    class Meta:
        model = Allergy
        fields = [
            'code', 'animal_type', 'allergen_type', 'specific_allergen',
            'display_name', 'prevalence_rate',
            'typical_symptoms', 'diagnostic_approach', 
            'management_strategies', 'seasonal_pattern'
        ]


class AllergyListSerializer(serializers.ModelSerializer):
    """Краткий сериализатор для списка аллергий."""
    
    class Meta:
        model = Allergy
        fields = ['code', 'display_name', 'allergen_type', 'prevalence_rate']


class PetHealthConditionSerializer(serializers.ModelSerializer):
    """Сериализатор заболеваний питомца."""
    
    condition_detail = HealthConditionListSerializer(source='condition', read_only=True)
    
    class Meta:
        model = PetHealthCondition
        fields = [
            'id', 'pet', 'condition', 'condition_detail',
            'is_breed_risk', 'breed_risk_level',
            'diagnosis_date', 'severity', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PetHealthConditionCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания записи заболевания питомца."""
    
    # condition принимается как код (primary key)
    condition = serializers.PrimaryKeyRelatedField(
        queryset=HealthCondition.objects.all()
    )
    
    class Meta:
        model = PetHealthCondition
        fields = [
            'condition',
            'diagnosis_date', 'severity', 'is_active', 'notes'
        ]
        # pet добавляется через perform_create, не требуется в запросе


class PetAllergySerializer(serializers.ModelSerializer):
    """Сериализатор аллергий питомца."""
    
    allergy_detail = AllergyListSerializer(source='allergy', read_only=True)
    
    class Meta:
        model = PetAllergy
        fields = [
            'id', 'pet', 'allergy', 'allergy_detail',
            'is_breed_risk',
            'diagnosis_date', 'severity', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PetAllergyCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания записи аллергии питомца."""
    
    # allergy принимается как код (primary key)
    allergy = serializers.PrimaryKeyRelatedField(
        queryset=Allergy.objects.all()
    )
    
    class Meta:
        model = PetAllergy
        fields = [
            'allergy',
            'diagnosis_date', 'severity', 'is_active', 'notes'
        ]
        # pet добавляется через perform_create, не требуется в запросе


class PetFoodExclusionSerializer(serializers.ModelSerializer):
    """Сериализатор исключений продуктов."""
    
    class Meta:
        model = PetFoodExclusion
        fields = [
            'id', 'pet', 'ingredient_code', 'ingredient_name',
            'reason', 'related_allergy', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ===== КАЛЬКУЛЯТОР ПИТАНИЯ =====

class NutritionCalculatorInputSerializer(serializers.Serializer):
    """Входные данные для калькулятора калорийности."""
    
    pet_id = serializers.CharField(required=False, help_text='ID питомца (если есть)')
    
    # Базовые данные (если нет pet_id)
    species = serializers.ChoiceField(
        choices=['dog', 'cat'], 
        required=False,
        help_text='Вид: dog или cat'
    )
    weight_kg = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        required=False,
        help_text='Текущий вес в кг'
    )
    age_months = serializers.IntegerField(
        required=False, 
        min_value=1,
        help_text='Возраст в месяцах'
    )
    
    # Параметры для расчёта
    is_neutered = serializers.BooleanField(required=False, default=True)
    activity_level = serializers.ChoiceField(
        choices=['very_low', 'low', 'moderate', 'high', 'very_high'],
        required=False,
        default='moderate'
    )
    size_category = serializers.ChoiceField(
        choices=['toy', 'small', 'medium', 'large', 'giant'],
        required=False
    )
    coat_type = serializers.ChoiceField(
        choices=['hairless', 'short', 'medium', 'long', 'double', 'wire', 'curly'],
        required=False,
        default='short'
    )
    housing_type = serializers.ChoiceField(
        choices=['apartment', 'house', 'farm', 'outdoor'],
        required=False,
        default='apartment'
    )
    living_climate = serializers.ChoiceField(
        choices=['hot', 'warm', 'cool', 'cold', 'very_cold'],
        required=False,
        default='warm'
    )
    reproductive_state = serializers.ChoiceField(
        choices=['none', 'heat', 'pregnant', 'lactating'],
        required=False,
        default='none'
    )
    litter_size = serializers.IntegerField(
        required=False, 
        min_value=1, 
        max_value=15
    )
    
    # Заболевания
    health_conditions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text='Коды заболеваний из справочника'
    )
    
    def validate(self, data):
        # Если нет pet_id, требуем базовые данные
        if not data.get('pet_id'):
            required_fields = ['species', 'weight_kg', 'age_months']
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                raise serializers.ValidationError({
                    'detail': f'Без pet_id требуются поля: {", ".join(missing)}'
                })
        
        return data


class NutritionCalculatorOutputSerializer(serializers.Serializer):
    """Результат расчёта калорийности."""
    
    # Базовые значения
    rer_kcal = serializers.DecimalField(
        max_digits=8, 
        decimal_places=2,
        help_text='Resting Energy Requirement (базовый метаболизм)'
    )
    mer_kcal = serializers.DecimalField(
        max_digits=8, 
        decimal_places=2,
        help_text='Maintenance Energy Requirement (суточная потребность)'
    )
    
    # Использованные коэффициенты
    coefficients = serializers.DictField(
        help_text='Применённые коэффициенты'
    )
    
    # Диапазон калорий
    kcal_min = serializers.IntegerField(help_text='Минимум ккал/день')
    kcal_max = serializers.IntegerField(help_text='Максимум ккал/день')
    kcal_recommended = serializers.IntegerField(help_text='Рекомендуемое ккал/день')
    
    # Нутриенты
    nutrients = serializers.DictField(
        help_text='Рекомендуемые нутриенты в граммах'
    )
    
    # Предупреждения
    warnings = serializers.ListField(
        child=serializers.CharField(),
        help_text='Предупреждения и рекомендации'
    )
    
    # Порция корма (если указан)
    food_portion = serializers.DictField(
        required=False,
        help_text='Рекомендуемая порция корма'
    )


# ===== ПОДБОР КОРМА =====

class FoodSearchInputSerializer(serializers.Serializer):
    """Входные данные для подбора корма."""
    
    pet_id = serializers.CharField(required=False)
    
    # Фильтры
    species = serializers.ChoiceField(
        choices=['dog', 'cat'],
        required=True
    )
    life_stage = serializers.ChoiceField(
        choices=['puppy', 'kitten', 'junior', 'adult', 'senior', 'geriatric'],
        required=False
    )
    size_category = serializers.ChoiceField(
        choices=['toy', 'small', 'medium', 'large', 'giant'],
        required=False
    )
    
    # Исключения
    exclude_allergens = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text='Коды аллергенов для исключения'
    )
    
    # Предпочтения
    suitable_for = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text='Коды заболеваний, для которых подходит корм'
    )
    quality_class = serializers.ListField(
        child=serializers.ChoiceField(
            choices=['economy', 'premium', 'super_premium', 'holistic', 'veterinary']
        ),
        required=False
    )
    food_category = serializers.ChoiceField(
        choices=['dry_food', 'wet_food', 'treats', 'supplements'],
        required=False,
        default='dry_food'
    )
    
    # Сортировка
    sort_by = serializers.ChoiceField(
        choices=['relevance', 'price_asc', 'price_desc', 'rating'],
        required=False,
        default='relevance'
    )
    
    # Пагинация
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)


class FoodProductNutritionSerializer(serializers.Serializer):
    """Данные о питательности продукта."""
    
    food_category = serializers.CharField()
    quality_class = serializers.CharField()
    
    guaranteed_analysis = serializers.DictField()
    calorie_content = serializers.DictField()
    
    protein_sources = serializers.ListField(child=serializers.CharField())
    contains_allergens = serializers.ListField(child=serializers.CharField())
    
    suitable_for_conditions = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )


class FoodSearchResultSerializer(serializers.Serializer):
    """Результат подбора корма."""
    
    id = serializers.CharField()
    name = serializers.CharField()
    brand = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    image_url = serializers.URLField(allow_null=True)
    
    # Данные о питательности
    nutrition = FoodProductNutritionSerializer()
    
    # Релевантность
    relevance_score = serializers.IntegerField(help_text='Баллы релевантности')
    match_reasons = serializers.ListField(
        child=serializers.CharField(),
        help_text='Почему подходит'
    )
    warnings = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text='Предупреждения'
    )
    
    # Рекомендуемая порция
    recommended_portion_g = serializers.IntegerField(
        required=False,
        help_text='Рекомендуемая порция в граммах'
    )
