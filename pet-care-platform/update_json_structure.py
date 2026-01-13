import json
import os
from datetime import datetime

# Структура полей для каждой таблицы согласно breeds_db.md
TABLE_SCHEMAS = {
    'animal_types': {
        'required': ['id', 'type'],
        'optional': []
    },
    'cats_breeds': {
        'required': ['id', 'animal_type_id', 'name', 'name_en', 'size_category', 'full_description', 'short_description',
                    'weight_min', 'weight_max', 'lifespan_min', 'lifespan_max', 'energy_level', 'affection_level',
                    'friendliness_to_strangers', 'friendliness_to_children', 'friendliness_to_other_pets', 'playfulness',
                    'intelligence_level', 'independence_level', 'vocalization_level', 'shedding_level', 'grooming_frequency',
                    'health_risk_level', 'hypoallergenic', 'short_legs', 'experimental_breed', 'natural_breed', 'brachycephalic',
                    'description', 'temperament_description', 'living_conditions', 'created_at'],
        'optional': ['origin_country', 'recognition_year', 'recognized_by', 'head_type', 'coat_type', 'coat_pattern',
                    'cfa_group', 'tica_group', 'history']
    },
    'dogs_breeds': {
        'required': ['id', 'animal_type_id', 'name', 'name_en', 'size_category', 'full_description', 'short_description',
                    'weight_min', 'weight_max', 'height_min', 'height_max', 'lifespan_min', 'lifespan_max', 'energy_level',
                    'exercise_needs', 'affection_level', 'friendliness_to_strangers', 'friendliness_to_children',
                    'friendliness_to_other_dogs', 'playfulness', 'watchdog_ability', 'adaptability_level', 'trainability_level',
                    'barking_level', 'shedding_level', 'grooming_frequency', 'drooling_level', 'health_risk_level',
                    'hypoallergenic', 'apartment_friendly', 'good_for_novice_owners', 'brachycephalic', 'experimental_breed',
                    'natural_breed', 'description', 'temperament_description', 'living_conditions', 'exercise_description', 'created_at'],
        'optional': ['origin_country', 'recognition_year', 'recognized_by', 'head_type', 'coat_type', 'coat_pattern',
                    'akc_group', 'fci_group', 'history']
    },
    'breed_health_issues': {
        'required': ['id', 'breed_id', 'breed_type', 'health_issue_name', 'severity_level', 'description', 'genetic_factor', 'created_at'],
        'optional': ['prevalence_rate', 'symptoms', 'prevention_measures', 'treatment_options']
    },
    'breed_genetic_risks': {
        'required': ['id', 'breed_id', 'breed_type', 'genetic_risk_name', 'risk_level', 'affected_system', 'description', 'screening_available', 'created_at'],
        'optional': ['preventive_measures']
    },
    'breed_allergies': {
        'required': ['id', 'breed_id', 'breed_type', 'allergen_type', 'allergen_name', 'prevalence', 'severity', 'description', 'created_at'],
        'optional': ['symptoms', 'management_strategies']
    },
    'breed_character_traits': {
        'required': ['id', 'breed_id', 'breed_type', 'trait_category', 'trait_name', 'trait_level', 'description', 'positive_aspect', 'hereditary_factor', 'environmental_influence', 'created_at'],
        'optional': []
    },
    'breed_vaccinations': {
        'required': ['id', 'breed_id', 'breed_type', 'vaccination_name', 'disease_protected', 'mandatory_level', 'age_first_dose', 'description', 'created_at'],
        'optional': ['booster_schedule', 'risk_factors']
    },
    'breed_medications': {
        'required': ['id', 'breed_id', 'breed_type', 'medication_name', 'medication_type', 'administration_route', 'frequency', 'indication', 'monitoring_required', 'created_at'],
        'optional': ['side_effects', 'contraindications']
    },
    'breed_activities': {
        'required': ['id', 'breed_id', 'breed_type', 'activity_name', 'activity_type', 'recommended_frequency', 'duration_per_session', 'skill_level_required', 'benefits', 'created_at'],
        'optional': ['equipment_needed', 'safety_considerations']
    },
    'breed_coat_types': {
        'required': ['id', 'breed_id', 'breed_type', 'coat_type', 'coat_length', 'coat_texture', 'shedding_amount', 'grooming_difficulty', 'bathing_frequency', 'brushing_frequency', 'created_at'],
        'optional': ['special_grooming_needs']
    },
    'breed_diet_recommendations': {
        'required': ['id', 'breed_id', 'breed_type', 'diet_type', 'protein_requirement', 'calorie_density', 'portion_control', 'feeding_frequency', 'created_at'],
        'optional': ['special_ingredients', 'restricted_ingredients', 'supplements_needed', 'metabolic_considerations']
    },
    'breed_care_requirements': {
        'required': ['id', 'breed_id', 'breed_type', 'care_category', 'care_item', 'frequency', 'difficulty_level', 'professional_help_required', 'instructions', 'importance_level', 'created_at'],
        'optional': ['tools_equipment']
    },
    'breed_behavior_problems': {
        'required': ['id', 'breed_id', 'breed_type', 'problem_category', 'problem_name', 'prevalence', 'severity', 'causes', 'management_techniques', 'professional_intervention', 'created_at'],
        'optional': ['prevention_strategies']
    },
    'breed_social_characteristics': {
        'required': ['id', 'breed_id', 'breed_type', 'social_context', 'compatibility_level', 'behavior_description', 'socialization_needs', 'created_at'],
        'optional': ['training_recommendations', 'bonding_characteristics']
    },
    'breed_training_characteristics': {
        'required': ['id', 'breed_id', 'breed_type', 'training_aspect', 'trainability_level', 'motivation_type', 'recommended_methods', 'learning_style', 'attention_span', 'consistency_requirements', 'created_at'],
        'optional': []
    },
    'breed_size_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'size_category', 'weight_range_min', 'weight_range_max', 'standard_organization', 'is_primary_standard', 'created_at'],
        'optional': ['height_range_min', 'height_range_max']
    },
    'breed_coat_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'coat_type', 'coat_length', 'coat_texture', 'shedding_level', 'grooming_difficulty', 'standard_organization', 'created_at'],
        'optional': ['coat_description']
    },
    'breed_conformation_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'conformation_type', 'conformation_value', 'is_ideal_standard', 'standard_organization', 'created_at'],
        'optional': ['health_considerations', 'description']
    },
    'breed_energy_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'energy_level', 'exercise_requirement', 'standard_organization', 'created_at'],
        'optional': ['daily_walk_duration', 'weekly_exercise_hours', 'activity_types', 'behavioral_notes']
    },
    'breed_temperament_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'temperament_trait', 'trait_level', 'standard_organization', 'created_at'],
        'optional': ['social_context', 'behavioral_description', 'training_recommendations']
    },
    'breed_veterinary_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'medical_category', 'procedure_name', 'recommended_age', 'frequency', 'standard_organization', 'created_at'],
        'optional': ['cost_range', 'health_benefits', 'risk_factors']
    },
    'breed_seasonal_care': {
        'required': ['id', 'breed_id', 'breed_type', 'season', 'care_category', 'seasonal_changes', 'standard_organization', 'created_at'],
        'optional': ['frequency_adjustment', 'special_precautions', 'climate_considerations']
    },
    'breed_cost_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'cost_category', 'monthly_cost_min', 'monthly_cost_max', 'currency', 'standard_organization', 'last_updated', 'created_at'],
        'optional': ['annual_cost_min', 'annual_cost_max', 'region', 'cost_factors']
    },
    'breed_genetic_dna': {
        'required': ['id', 'breed_id', 'breed_type', 'dna_marker_type', 'marker_name', 'genetic_trait', 'inheritance_pattern', 'validation_status', 'created_at'],
        'optional': ['chromosome_location', 'research_study', 'scientific_evidence']
    },
    'breed_historical_evolution': {
        'required': ['id', 'breed_id', 'breed_type', 'historical_period', 'geographical_region', 'created_at'],
        'optional': ['year_from', 'year_to', 'ancestral_breeds', 'selective_breeding', 'morphological_changes', 'functional_adaptations', 'historical_events', 'population_changes', 'historical_significance', 'archaeological_evidence']
    },
    'breed_media_content': {
        'required': ['id', 'breed_id', 'breed_type', 'media_type', 'media_category', 'file_url', 'file_name', 'mime_type', 'quality_rating', 'view_count', 'created_at'],
        'optional': ['file_size_bytes', 'resolution', 'duration_seconds', 'description', 'source_organization', 'copyright_info']
    },
    'breed_international_standards': {
        'required': ['id', 'breed_id', 'breed_type', 'standard_organization', 'standard_category', 'standard_version', 'effective_date', 'standard_text', 'status', 'created_at'],
        'optional': ['key_requirements', 'differences_from_other', 'implementation_notes']
    },
    'breed_regional_variations': {
        'required': ['id', 'breed_id', 'breed_type', 'region_name', 'country_code', 'created_at'],
        'optional': ['climate_adaptation', 'morphological_variations', 'behavioral_differences', 'health_variations', 'cultural_significance', 'population_size', 'conservation_status', 'regional_name']
    },
    'breed_behavioral_studies': {
        'required': ['id', 'breed_id', 'breed_type', 'study_title', 'research_institution', 'publication_year', 'methodology', 'key_findings', 'behavioral_traits_studied', 'created_at'],
        'optional': ['journal_name', 'sample_size', 'statistical_significance', 'replication_status', 'practical_implications']
    },
    'breed_health_detailed': {
        'required': ['id', 'breed_id', 'breed_type', 'condition_name', 'condition_category', 'affected_system', 'severity_scale', 'research_status', 'created_at'],
        'optional': ['genetic_basis', 'age_of_onset', 'prevalence_rate', 'diagnostic_methods', 'treatment_options', 'prognosis', 'preventive_measures', 'economic_impact']
    },
    'breed_economic_global': {
        'required': ['id', 'breed_id', 'breed_type', 'country_name', 'country_code', 'currency_code', 'data_year', 'data_source', 'created_at'],
        'optional': ['acquisition_cost_min', 'acquisition_cost_max', 'annual_cost_min', 'annual_cost_max', 'veterinary_cost_factor', 'insurance_cost_min', 'insurance_cost_max', 'breeding_cost_min', 'breeding_cost_max', 'economic_importance', 'market_trends']
    },
    'breed_cross_references': {
        'required': ['id', 'primary_breed_id', 'primary_breed_type', 'related_breed_id', 'related_breed_type', 'relationship_type', 'relationship_strength', 'created_at'],
        'optional': ['genetic_similarity', 'historical_connection', 'morphological_similarity', 'behavioral_similarity', 'cross_breeding_potential', 'research_evidence']
    },
    'breed_search_indexes': {
        'required': ['id', 'breed_id', 'breed_type', 'search_term', 'search_category', 'language_code', 'term_weight', 'search_frequency', 'created_at'],
        'optional': ['context_info', 'synonyms', 'related_terms', 'last_searched']
    }
}

def update_json_file(file_path, table_name):
    """Обновляет JSON файл согласно схеме"""
    print(f"Updating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated_data = []
    for item in data:
        new_item = {}

        # Добавляем все обязательные поля
        for field in TABLE_SCHEMAS[table_name]['required']:
            if field in item:
                new_item[field] = item[field]
            else:
                # Добавляем значения по умолчанию для отсутствующих обязательных полей
                if field == 'created_at':
                    new_item[field] = datetime.now().isoformat() + 'Z'
                elif field.endswith('_at'):
                    new_item[field] = datetime.now().isoformat() + 'Z'
                elif field == 'last_updated':
                    new_item[field] = datetime.now().date().isoformat()
                elif field in ['view_count', 'search_frequency']:
                    new_item[field] = 0
                elif field in ['is_primary_standard', 'screening_available', 'genetic_factor', 'positive_aspect',
                              'hereditary_factor', 'environmental_influence', 'professional_help_required', 'monitoring_required']:
                    new_item[field] = False
                elif field == 'term_weight':
                    new_item[field] = 0.5
                elif field == 'language_code':
                    new_item[field] = 'en'
                else:
                    # Для других полей добавляем пустые значения соответствующего типа
                    new_item[field] = ""

        # Добавляем опциональные поля, если они есть в исходных данных
        for field in TABLE_SCHEMAS[table_name]['optional']:
            if field in item:
                new_item[field] = item[field]

        updated_data.append(new_item)

    # Записываем обновленные данные
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2)

def main():
    data_dir = 'data_breeds'

    # Обновляем только основные файлы пород
    for filename in ['cats_breeds.json', 'dogs_breeds.json']:
        table_name = filename.replace('.json', '')
        if table_name in TABLE_SCHEMAS:
            file_path = os.path.join(data_dir, filename)
            update_json_file(file_path, table_name)
            print(f"Updated {filename}")

if __name__ == '__main__':
    main()