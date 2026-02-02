"""
Сервис автозаполнения профиля питомца (PetID).

Реализует логику из документации Integration_PetID_Breeds_Calculator.md:
1. При создании/обновлении питомца автоматически заполняет поля из породы
2. Для дворняг (breed=NULL) рассчитывает параметры по весу и возрасту
3. Корректирует активность с учётом возраста

Триггеры вызова:
- При создании питомца (perform_create в views)
- При изменении breed, weight, date_of_birth (perform_update в views)

Принцип работы:
- Пользователь всегда может переопределить автозаполненные значения
- Автозаполнение НЕ перезаписывает уже заполненные пользователем поля
"""

import logging
from typing import Optional, Dict, Any
from datetime import date
from decimal import Decimal

logger = logging.getLogger('apps.pets.autofill')


class PetAutofillService:
    """
    Сервис автозаполнения профиля питомца.
    
    Использование:
        from apps.pets.autofill_service import pet_autofill
        
        # При создании питомца
        pet = Pet.objects.create(**data)
        pet_autofill.autofill_from_breed(pet)
        
        # При изменении породы/веса
        pet_autofill.autofill_from_breed(pet, force_update=['size_category'])
    """
    
    # === КОНСТАНТЫ ДЛЯ РАСЧЁТОВ ===
    
    # Границы веса для категорий размера (собаки)
    DOG_SIZE_THRESHOLDS = {
        'toy': (0, 5),       # до 5 кг
        'small': (5, 10),    # 5-10 кг
        'medium': (10, 25),  # 10-25 кг
        'large': (25, 45),   # 25-45 кг
        'giant': (45, 200),  # более 45 кг
    }
    
    # Границы веса для категорий размера (кошки)
    CAT_SIZE_THRESHOLDS = {
        'small': (0, 4),     # до 4 кг
        'medium': (4, 6),    # 4-6 кг
        'large': (6, 20),    # более 6 кг
    }
    
    # Коэффициенты роста щенков (примерный % взрослого веса по месяцам)
    PUPPY_GROWTH_COEFFICIENTS = {
        1: 0.10,   # 10% в 1 месяц
        2: 0.20,   # 20% в 2 месяца
        3: 0.30,   # 30% в 3 месяца
        4: 0.40,   # 40% в 4 месяца
        5: 0.50,   # 50% в 5 месяцев
        6: 0.60,   # 60% в 6 месяцев
        7: 0.70,   # 70% в 7 месяцев
        8: 0.80,   # 80% в 8 месяцев
        9: 0.85,   # 85% в 9 месяцев
        10: 0.90,  # 90% в 10 месяцев
        11: 0.95,  # 95% в 11 месяцев
        12: 1.00,  # 100% в 12 месяцев
    }
    
    # Корректировка активности по возрасту
    ACTIVITY_AGE_ADJUSTMENTS = {
        # puppy/kitten: обычно более активны
        'puppy': {'very_low': 'low', 'low': 'moderate'},
        'kitten': {'very_low': 'low', 'low': 'moderate'},
        # senior: активность снижается
        'senior': {'very_high': 'high', 'high': 'moderate'},
    }
    
    # Маппинг energy_level породы → activity_level питомца
    BREED_ENERGY_TO_ACTIVITY = {
        'very_low': 'very_low',
        'low': 'low',
        'moderate': 'moderate',
        'medium': 'moderate',
        'high': 'high',
        'very_high': 'very_high',
    }
    
    def autofill_from_breed(self, pet, force_update: list = None) -> Dict[str, Any]:
        """
        Автозаполнение полей питомца из данных породы.
        
        Args:
            pet: Объект Pet
            force_update: Список полей для принудительного обновления
                          (даже если уже заполнены)
        
        Returns:
            Dict с заполненными/обновлёнными полями
        """
        force_update = force_update or []
        updated_fields = {}
        
        # Получаем данные породы если есть
        breed_data = self._get_breed_data(pet)
        
        # 1. Автозаполнение size_category
        if not pet.size_category or 'size_category' in force_update:
            size_category = self._determine_size_category(pet, breed_data)
            if size_category:
                pet.size_category = size_category
                updated_fields['size_category'] = size_category
        
        # 2. Автозаполнение coat_type
        if not pet.coat_type or 'coat_type' in force_update:
            coat_type = breed_data.get('coat_type') if breed_data else None
            if coat_type:
                pet.coat_type = coat_type
                updated_fields['coat_type'] = coat_type
        
        # 3. Автозаполнение ideal_weight_kg
        if not pet.ideal_weight_kg or 'ideal_weight_kg' in force_update:
            ideal_weight = self._determine_ideal_weight(pet, breed_data)
            if ideal_weight:
                pet.ideal_weight_kg = Decimal(str(ideal_weight))
                updated_fields['ideal_weight_kg'] = ideal_weight
        
        # 4. Автозаполнение activity_level
        if not pet.activity_level or 'activity_level' in force_update:
            activity_level = self._determine_activity_level(pet, breed_data)
            if activity_level:
                pet.activity_level = activity_level
                updated_fields['activity_level'] = activity_level

        # 5. Автозаполнение BCS (если есть идеальный вес и не задано вручную)
        if (pet.ideal_weight_kg and not pet.body_condition_score) or 'body_condition_score' in force_update:
            bcs = self._calculate_bcs(
                weight=float(pet.weight) if pet.weight else None,
                ideal_weight=float(pet.ideal_weight_kg) if pet.ideal_weight_kg else None
            )
            if bcs:
                pet.body_condition_score = bcs
                updated_fields['body_condition_score'] = bcs
        
        # Сохраняем изменения
        if updated_fields:
            update_keys = list(updated_fields.keys())
            pet.save(update_fields=update_keys)
            logger.info(f"Autofill for pet {pet.id}: {updated_fields}")
        
        return updated_fields
    
    def _get_breed_data(self, pet) -> Optional[Dict[str, Any]]:
        """
        Получить данные породы для автозаполнения.
        
        Returns:
            Dict с данными породы или None для дворняг
        """
        if not pet.breed_id:
            return None
        
        breed = pet.breed
        if not breed:
            return None
        
        return {
            'size_category': breed.size_category,
            'weight_min': float(breed.weight_min) if breed.weight_min else None,
            'weight_max': float(breed.weight_max) if breed.weight_max else None,
            'weight_male_min': float(breed.weight_male_min) if breed.weight_male_min else None,
            'weight_male_max': float(breed.weight_male_max) if breed.weight_male_max else None,
            'weight_female_min': float(breed.weight_female_min) if breed.weight_female_min else None,
            'weight_female_max': float(breed.weight_female_max) if breed.weight_female_max else None,
            'energy_level': breed.base_activity_level,  # используем base_activity_level
            'coat_type': breed.coat_type,
            'trainability': breed.trainability,
        }
    
    def _determine_size_category(self, pet, breed_data: Optional[Dict]) -> Optional[str]:
        """
        Определить категорию размера питомца.
        
        Логика:
        1. Если есть порода — берём из породы
        2. Если дворняга — рассчитываем по весу/возрасту
        """
        # Приоритет 1: данные породы
        if breed_data and breed_data.get('size_category'):
            return breed_data['size_category']
        
        # Приоритет 2: расчёт по весу
        return self.calculate_size_by_weight_age(
            species=pet.species,
            weight=float(pet.weight) if pet.weight else None,
            age_months=pet.age_months
        )
    
    def calculate_size_by_weight_age(
        self, 
        species: str, 
        weight: Optional[float], 
        age_months: Optional[int]
    ) -> Optional[str]:
        """
        Рассчитать категорию размера по весу и возрасту.
        
        Для щенков делается экстраполяция на взрослый вес.
        
        Args:
            species: 'dog' или 'cat'
            weight: Текущий вес в кг
            age_months: Возраст в месяцах
            
        Returns:
            Код категории размера или None
        """
        if weight is None:
            return None
        
        estimated_adult_weight = weight
        
        # Для щенков экстраполируем взрослый вес
        if species == 'dog' and age_months and age_months < 12:
            growth_coef = self.PUPPY_GROWTH_COEFFICIENTS.get(age_months, 0.5)
            if growth_coef > 0:
                estimated_adult_weight = weight / growth_coef
                logger.debug(
                    f"Puppy weight extrapolation: {weight}kg at {age_months}mo "
                    f"→ estimated adult {estimated_adult_weight:.1f}kg"
                )
        
        # Определяем категорию
        thresholds = (
            self.DOG_SIZE_THRESHOLDS if species == 'dog' 
            else self.CAT_SIZE_THRESHOLDS
        )
        
        for category, (min_weight, max_weight) in thresholds.items():
            if min_weight <= estimated_adult_weight < max_weight:
                return category
        
        # Fallback для очень крупных
        if species == 'dog' and estimated_adult_weight >= 45:
            return 'giant'
        if species == 'cat' and estimated_adult_weight >= 6:
            return 'large'
        
        return None
    
    def _determine_ideal_weight(self, pet, breed_data: Optional[Dict]) -> Optional[float]:
        """
        Определить идеальный вес питомца.
        
        Логика:
        1. Если есть порода — рассчитываем из диапазона породы
           - для щенков/котят (<12 мес): ожидаемый вес по возрасту
           - для взрослых: среднее по диапазону
        2. Если дворняга — текущий вес (если BCS = 5) или расчёт
        """
        if breed_data:
            if pet.sex == 'female':
                weight_min = breed_data.get('weight_female_min') or breed_data.get('weight_min')
                weight_max = breed_data.get('weight_female_max') or breed_data.get('weight_max')
            elif pet.sex == 'male':
                weight_min = breed_data.get('weight_male_min') or breed_data.get('weight_min')
                weight_max = breed_data.get('weight_male_max') or breed_data.get('weight_max')
            else:
                weight_min = breed_data.get('weight_min')
                weight_max = breed_data.get('weight_max')

            if weight_min and weight_max:
                age_months = pet.age_months
                if age_months is not None and age_months < 12:
                    # Ожидаемый вес по возрасту (формула роста из views_breeds.calculate_weight_for_age)
                    growth_factor = (age_months / 12) ** 0.75
                    expected_min = weight_min * growth_factor
                    expected_max = weight_max * growth_factor
                    return round((expected_min + expected_max) / 2, 1)
                return round((weight_min + weight_max) / 2, 1)
        
        # Для дворняг: если BCS идеальный (5) — текущий вес = идеальный
        if pet.weight and pet.body_condition_score == 5:
            return float(pet.weight)
        
        return None
    
    def _determine_activity_level(self, pet, breed_data: Optional[Dict]) -> Optional[str]:
        """
        Определить уровень активности питомца.
        
        Логика:
        1. Базовый уровень из породы
        2. Корректировка по возрасту (щенки/пожилые)
        """
        base_activity = 'moderate'  # По умолчанию
        
        # Из породы
        if breed_data and breed_data.get('energy_level'):
            breed_energy = breed_data['energy_level']
            base_activity = self.BREED_ENERGY_TO_ACTIVITY.get(
                breed_energy, 'moderate'
            )
        
        # Корректировка по возрасту
        return self.adjust_activity_by_age(
            base_activity=base_activity,
            age_category=pet.age_category
        )
    
    def adjust_activity_by_age(
        self, 
        base_activity: str, 
        age_category: Optional[str]
    ) -> str:
        """
        Корректировка уровня активности по возрастной категории.
        
        - Щенки/котята: активность чуть выше (энергичность молодости)
        - Пожилые: активность ниже
        
        Args:
            base_activity: Базовый уровень активности
            age_category: 'puppy', 'kitten', 'adult', 'senior'
            
        Returns:
            Скорректированный уровень активности
        """
        if not age_category:
            return base_activity
        
        adjustments = self.ACTIVITY_AGE_ADJUSTMENTS.get(age_category, {})
        return adjustments.get(base_activity, base_activity)
    
    def recalculate_on_weight_change(self, pet, old_weight: Optional[float]) -> Dict[str, Any]:
        """
        Пересчёт параметров при изменении веса.
        
        Вызывается когда пользователь обновляет вес питомца.
        Пересчитывает size_category для дворняг.
        
        Args:
            pet: Объект Pet
            old_weight: Предыдущий вес
            
        Returns:
            Dict с обновлёнными полями
        """
        updated_fields = {}

        # Пересчитываем размер только для дворняг
        if not pet.breed_id:
            new_size = self.calculate_size_by_weight_age(
                species=pet.species,
                weight=float(pet.weight) if pet.weight else None,
                age_months=pet.age_months
            )

            if new_size and new_size != pet.size_category:
                pet.size_category = new_size
                updated_fields['size_category'] = new_size

        # Обновляем BCS при изменении веса, если есть идеальный вес
        if pet.ideal_weight_kg:
            bcs = self._calculate_bcs(
                weight=float(pet.weight) if pet.weight else None,
                ideal_weight=float(pet.ideal_weight_kg) if pet.ideal_weight_kg else None
            )
            if bcs and bcs != pet.body_condition_score:
                pet.body_condition_score = bcs
                updated_fields['body_condition_score'] = bcs

        if updated_fields:
            pet.save(update_fields=list(updated_fields.keys()))
            logger.info(f"Autofill recalculated for pet {pet.id}: {updated_fields}")
            return updated_fields

        return {}
    
    def get_autofill_suggestions(self, pet) -> Dict[str, Any]:
        """
        Получить предложения автозаполнения без сохранения.
        
        Используется для предварительного просмотра в UI.
        
        Args:
            pet: Объект Pet
            
        Returns:
            Dict с предложенными значениями
        """
        breed_data = self._get_breed_data(pet)
        
        return {
            'size_category': self._determine_size_category(pet, breed_data),
            'coat_type': breed_data.get('coat_type') if breed_data else None,
            'ideal_weight_kg': self._determine_ideal_weight(pet, breed_data),
            'activity_level': self._determine_activity_level(pet, breed_data),
            'body_condition_score': self._calculate_bcs(
                weight=float(pet.weight) if pet.weight else None,
                ideal_weight=self._determine_ideal_weight(pet, breed_data)
            ),
            'is_from_breed': breed_data is not None,
            'breed_name': pet.breed.name if pet.breed else None,
        }

    def _calculate_bcs(self, weight: Optional[float], ideal_weight: Optional[float]) -> Optional[int]:
        """
        Рассчитать BCS (Body Condition Score) по весу и идеальному весу.
        """
        if not weight or not ideal_weight:
            return None

        ratio = weight / ideal_weight

        if ratio < 0.85:
            return max(1, int(round(5 * ratio)))
        if ratio < 1.10:
            return 5
        if ratio < 1.20:
            return 6
        if ratio < 1.30:
            return 7
        return 8 if ratio < 1.40 else 9


# Глобальный экземпляр сервиса
pet_autofill = PetAutofillService()
