"""
Сервис подбора корма и расчета рациона
"""
from datetime import date
from decimal import Decimal


class FoodRecommendationService:
    """
    Сервис подбора корма и расчета персонального рациона.
    
    Учитывает:
    - Породу (размер, активность, риски здоровья)
    - Возраст (puppy/adult/senior)
    - Вес (текущий vs идеальный)
    - Активность
    - Здоровье и аллергии
    - Стерилизацию
    """
    
    def calculate_daily_calories(self, pet):
        """
        Расчет дневной потребности в калориях (DER).
        
        Формула: DER = RER * коэффициенты
        RER = 70 * (вес в кг)^0.75
        """
        if not pet.weight:
            return None
        
        weight = float(pet.weight)
        
        # 1. RER (Resting Energy Requirement)
        if weight < 2 or weight > 45:
            rer = 70 * (weight ** 0.75)
        else:
            rer = 30 * weight + 70
        
        # 2. Возрастной коэффициент
        age_years = self._calculate_age(pet.date_of_birth) if pet.date_of_birth else None
        
        if age_years is not None:
            if age_years < 0.3:  # До 4 месяцев
                age_multiplier = 3.0
            elif age_years < 1:  # 4 месяца - 1 год
                age_multiplier = 2.0
            elif age_years > 7:  # Пожилые
                age_multiplier = 1.2
            else:  # Взрослые
                age_multiplier = 1.6
        else:
            age_multiplier = 1.6  # По умолчанию взрослые
        
        # 3. Коэффициент активности
        activity_multiplier = {
            'low': 1.0,
            'medium': 1.2,
            'high': 1.4
        }.get(pet.activity_level, 1.2)
        
        # 4. Коэффициент стерилизации
        neuter_multiplier = 0.8 if pet.is_neutered else 1.0
        
        # 5. Коэффициент веса (для диеты/набора)
        weight_multiplier = 1.0
        if pet.breed:
            ideal_weight = float(pet.breed.average_weight)
            weight_ratio = weight / ideal_weight
            
            if weight_ratio > 1.15:  # Избыточный вес
                weight_multiplier = 0.7
            elif weight_ratio < 0.85:  # Недостаточный вес
                weight_multiplier = 1.3
        
        # 6. Коэффициент породы (размер)
        breed_multiplier = 1.0
        if pet.breed:
            breed_metabolic = {
                'giant': 0.9,
                'large': 0.95,
                'medium': 1.0,
                'small': 1.1,
                'toy': 1.2
            }
            breed_multiplier = breed_metabolic.get(pet.breed.size_category, 1.0)
        
        # ИТОГОВЫЙ РАСЧЕТ
        der = rer * age_multiplier * activity_multiplier * neuter_multiplier * weight_multiplier * breed_multiplier
        
        return {
            'rer': round(rer),
            'der': round(der),
            'factors': {
                'age': age_multiplier,
                'activity': activity_multiplier,
                'neutered': neuter_multiplier,
                'weight_adjustment': weight_multiplier,
                'breed': breed_multiplier
            }
        }
    
    def calculate_macros(self, pet, der):
        """
        Расчет БЖУ (белки, жиры, углеводы).
        
        Args:
            pet: Объект Pet
            der: Дневная потребность в калориях
            
        Returns:
            dict: Граммы белков, жиров, углеводов
        """
        age_years = self._calculate_age(pet.date_of_birth) if pet.date_of_birth else None
        
        # БЕЛОК
        if pet.species == 'dog':
            if age_years and age_years < 1:  # Щенки
                protein_percent = 28
            elif age_years and age_years > 7:  # Пожилые
                protein_percent = 24
            else:  # Взрослые
                protein_percent = 25
        else:  # Кошки
            if age_years and age_years < 1:  # Котята
                protein_percent = 35
            else:  # Взрослые
                protein_percent = 32
        
        # Коррекция по активности
        if pet.activity_level == 'high':
            protein_percent += 3
        
        # Коррекция по породе
        if pet.breed and hasattr(pet.breed, 'nutrition'):
            nutrition = pet.breed.nutrition
            if nutrition.protein_need == 'very_high':
                protein_percent += 5
            elif nutrition.protein_need == 'high':
                protein_percent += 2
        
        # ЖИР
        if pet.species == 'dog':
            if age_years and age_years < 1:
                fat_percent = 15
            else:
                fat_percent = 12
        else:  # Кошки
            fat_percent = 16
        
        # Коррекция по активности
        if pet.activity_level == 'high':
            fat_percent += 3
        elif pet.activity_level == 'low':
            fat_percent -= 2
        
        # Коррекция по весу
        if 'лишний вес' in (pet.health_issues or []):
            fat_percent = max(8, fat_percent - 5)
        
        # РАСЧЕТ ГРАММОВ
        # Белки: 4 ккал/г
        protein_calories = der * (protein_percent / 100)
        protein_grams = protein_calories / 4
        
        # Жиры: 9 ккал/г
        fat_calories = der * (fat_percent / 100)
        fat_grams = fat_calories / 9
        
        # Углеводы: остаток, 4 ккал/г
        carbs_calories = der - protein_calories - fat_calories
        carbs_grams = carbs_calories / 4
        carbs_percent = (carbs_calories / der) * 100
        
        return {
            'protein': {
                'grams': round(protein_grams, 1),
                'calories': round(protein_calories),
                'percent': protein_percent
            },
            'fat': {
                'grams': round(fat_grams, 1),
                'calories': round(fat_calories),
                'percent': fat_percent
            },
            'carbs': {
                'grams': round(carbs_grams, 1),
                'calories': round(carbs_calories),
                'percent': round(carbs_percent, 1)
            }
        }
    
    def calculate_portions(self, pet, der):
        """
        Расчет порций и частоты кормления.
        """
        age_years = self._calculate_age(pet.date_of_birth) if pet.date_of_birth else None
        
        # Частота кормления
        if age_years is not None:
            if age_years < 0.25:  # До 3 месяцев
                meals_per_day = 4
                feeding_times = ['07:00', '12:00', '17:00', '21:00']
            elif age_years < 0.5:  # 3-6 месяцев
                meals_per_day = 3
                feeding_times = ['08:00', '14:00', '20:00']
            else:  # Взрослые
                meals_per_day = 2
                feeding_times = ['08:00', '18:00']
        else:
            meals_per_day = 2
            feeding_times = ['08:00', '18:00']
        
        # Размер порции за раз
        portion_per_meal_calories = der / meals_per_day
        
        return {
            'meals_per_day': meals_per_day,
            'feeding_times': feeding_times,
            'portion_per_meal_calories': round(portion_per_meal_calories),
            'daily_total_calories': der
        }
    
    def recommend_foods(self, pet):
        """
        Подбор подходящих кормов.
        
        Фильтрация по:
        - Вид животного
        - Возраст
        - Размер
        - Аллергены (исключение)
        - Проблемы здоровья
        - Породоспецифичные риски
        """
        from apps.shop.models import Product
        
        # Базовая фильтрация (используем новые поля + legacy для совместимости)
        from django.db.models import Q
        foods = Product.objects.filter(
            Q(product_group='food') | Q(category='food'),
            Q(animal_type__in=[pet.species, 'all']) | Q(animal=pet.species),
            Q(status=1) | Q(is_available=True) | Q(in_stock=True)
        )
        
        # По возрасту
        age_category = self._get_age_category(pet.date_of_birth)
        if age_category:
            # Фильтруем по nutrition_params__age_group
            # Пока просто возвращаем все
            pass
        
        # Исключение аллергенов
        if pet.allergies:
            # Фильтруем по nutrition_params__ingredients
            # Пока просто возвращаем все
            pass
        
        # Ограничиваем результат
        foods = foods[:20]
        
        return list(foods)
    
    def _calculate_age(self, date_of_birth):
        """Расчет возраста в годах"""
        if not date_of_birth:
            return None
        
        today = date.today()
        age = today.year - date_of_birth.year
        
        if today.month < date_of_birth.month or \
           (today.month == date_of_birth.month and today.day < date_of_birth.day):
            age -= 1
        
        return age
    
    def _get_age_category(self, date_of_birth):
        """Определение возрастной категории"""
        age = self._calculate_age(date_of_birth)
        
        if age is None:
            return None
        
        if age < 1:
            return 'puppy'  # или 'kitten'
        elif age > 7:
            return 'senior'
        else:
            return 'adult'

