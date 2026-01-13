"""
Сервисы для работы с породами и сравнения с PetID
"""
from datetime import date
from decimal import Decimal


class PetBreedComparisonService:
    """
    Сервис сравнения параметров питомца с эталонами породы.
    
    Анализирует:
    - Вес (текущий vs идеальный)
    - Активность (фактическая vs требуемая)
    - Здоровье (текущее vs риски породы)
    - Поведение
    """
    
    def compare_pet_with_breed(self, pet):
        """
        Комплексное сравнение питомца с эталоном породы.
        
        Args:
            pet: Объект Pet
            
        Returns:
            dict: Результаты сравнения и рекомендации
        """
        if not pet.breed:
            return {
                'error': 'Порода не указана',
                'recommendations': {
                    'message': 'Добавьте породу в профиль для персонализированных рекомендаций'
                }
            }
        
        breed = pet.breed
        
        return {
            'pet_id': pet.id,
            'pet_name': pet.name,
            'breed_name': breed.name,
            
            'weight_analysis': self._analyze_weight(pet, breed),
            'activity_analysis': self._analyze_activity(pet, breed),
            'health_risks': self._analyze_health_risks(pet, breed),
            'care_recommendations': self._get_care_recommendations(pet, breed),
            'recommendations': self._generate_recommendations(pet, breed),
            
            'overall_score': self._calculate_overall_score(pet, breed),
            'profile_completeness': self._calculate_completeness(pet)
        }
    
    def _analyze_weight(self, pet, breed):
        """Анализ веса относительно породы"""
        if not pet.weight:
            return {
                'status': 'no_data',
                'message': 'Вес не указан'
            }
        
        ideal_min = breed.weight_min
        ideal_max = breed.weight_max
        ideal_avg = float(breed.average_weight)
        current = float(pet.weight)
        
        # Допустимый диапазон: ±15% от границ
        acceptable_min = float(ideal_min) * 0.85
        acceptable_max = float(ideal_max) * 1.15
        
        if current < acceptable_min:
            status = 'underweight'
            severity = 'high' if current < float(ideal_min) * 0.7 else 'medium'
            message = f"Вес ниже нормы для породы. Идеально: {ideal_min}-{ideal_max} кг"
            recommendation = "Увеличить калорийность рациона, консультация ветеринара"
        elif current > acceptable_max:
            status = 'overweight'
            severity = 'high' if current > float(ideal_max) * 1.3 else 'medium'
            message = f"Вес выше нормы для породы. Идеально: {ideal_min}-{ideal_max} кг"
            recommendation = "Диетический корм, увеличение активности"
        else:
            status = 'normal'
            severity = 'low'
            message = f"Вес в норме для породы ({ideal_min}-{ideal_max} кг)"
            recommendation = "Поддерживать текущий режим питания и активности"
        
        return {
            'status': status,
            'severity': severity,
            'current_weight': current,
            'ideal_min': float(ideal_min),
            'ideal_max': float(ideal_max),
            'ideal_avg': ideal_avg,
            'diff_from_avg': current - ideal_avg,
            'message': message,
            'recommendation': recommendation
        }
    
    def _analyze_activity(self, pet, breed):
        """Анализ активности"""
        if not pet.activity_level:
            return {
                'status': 'no_data',
                'message': 'Уровень активности не указан'
            }
        
        breed_energy = breed.energy_level
        pet_activity = pet.activity_level
        
        # Маппинг уровней
        level_map = {'low': 1, 'medium': 2, 'high': 3, 'very_high': 4}
        breed_level = level_map.get(breed_energy, 2)
        pet_level = level_map.get(pet_activity, 2)
        
        diff = pet_level - breed_level
        
        if diff < -1:
            status = 'insufficient'
            severity = 'high'
            message = f"Активность ниже требуемой для породы (требуется: {breed_energy})"
            recommendation = "Увеличить продолжительность прогулок, добавить игры"
            risks = ['ожирение', 'деструктивное поведение', 'проблемы с суставами']
        elif diff > 1:
            status = 'excessive'
            severity = 'medium'
            message = f"Активность выше типичной для породы (типично: {breed_energy})"
            recommendation = "Контролировать нагрузки, избегать переутомления"
            risks = ['травмы', 'переутомление']
        else:
            status = 'normal'
            severity = 'low'
            message = f"Активность соответствует породе ({breed_energy})"
            recommendation = "Поддерживать текущий уровень активности"
            risks = []
        
        return {
            'status': status,
            'severity': severity,
            'pet_activity': pet_activity,
            'breed_energy': breed_energy,
            'message': message,
            'recommendation': recommendation,
            'risks': risks
        }
    
    def _analyze_health_risks(self, pet, breed):
        """Анализ рисков здоровья"""
        breed_risks = list(breed.health_risks.filter(severity__in=['high', 'critical']))
        
        age_years = self._calculate_age(pet.date_of_birth) if pet.date_of_birth else None
        
        alerts = []
        for risk in breed_risks:
            alert = {
                'condition': risk.condition_name,
                'severity': risk.severity,
                'prevalence': float(risk.prevalence_percent),
                'affected_system': risk.affected_system,
                'prevention': risk.prevention,
                'screening': risk.screening,
                'priority': 'high' if risk.severity == 'high' and risk.prevalence_percent > 10 else 'medium'
            }
            
            # Если возраст известен, проверяем возраст проявления
            if age_years and risk.age_of_onset:
                age_of_onset = risk.age_of_onset.lower()
                if 'год' in age_of_onset or 'лет' in age_of_onset:
                    # Парсим возраст
                    import re
                    age_match = re.search(r'(\d+)', age_of_onset)
                    if age_match:
                        onset_age = int(age_match.group(1))
                        if age_years >= onset_age:
                            alert['priority'] = 'urgent'
                            alert['message'] = f"Возраст риска! Рекомендуем обследование"
            
            alerts.append(alert)
        
        return alerts
    
    def _get_care_recommendations(self, pet, breed):
        """Получить рекомендации по уходу"""
        care_procedures = list(breed.care_procedures.filter(importance__in=['high', 'critical']))
        
        recommendations = []
        for proc in care_procedures:
            recommendations.append({
                'category': proc.care_category,
                'procedure': proc.procedure,
                'frequency': proc.frequency,
                'importance': proc.importance,
                'notes': proc.notes
            })
        
        return recommendations
    
    def _generate_recommendations(self, pet, breed):
        """Генерация персонализированных рекомендаций"""
        recommendations = {
            'priority': [],
            'products': [],
            'courses': [],
            'vet_visits': []
        }
        
        # Анализ веса
        weight_analysis = self._analyze_weight(pet, breed)
        if weight_analysis['status'] == 'overweight':
            recommendations['priority'].append({
                'type': 'weight',
                'message': 'Необходимо снижение веса',
                'actions': ['Диетический корм', 'Увеличение активности', 'Контроль порций']
            })
            recommendations['products'].extend([
                'Диетический корм для контроля веса',
                'Игрушки для активности',
                'Добавки L-карнитин'
            ])
        
        elif weight_analysis['status'] == 'underweight':
            recommendations['priority'].append({
                'type': 'weight',
                'message': 'Необходим набор веса',
                'actions': ['Высококалорийный корм', 'Увеличение порций', 'Проверка здоровья']
            })
            recommendations['products'].extend([
                'Высококалорийный корм',
                'Витамины для набора веса'
            ])
        
        # Риски здоровья
        high_risks = breed.health_risks.filter(severity='high', prevalence_percent__gte=15)
        for risk in high_risks:
            if 'дисплазия' in risk.condition_name.lower() or 'сустав' in risk.condition_name.lower():
                recommendations['products'].append('Корм с глюкозамином и хондроитином')
                recommendations['vet_visits'].append(f'Рентген: {risk.screening}')
            
            elif 'сердц' in risk.condition_name.lower() or 'кардио' in risk.condition_name.lower():
                recommendations['products'].append('Корм для здоровья сердца')
                recommendations['vet_visits'].append(f'ЭХО сердца: {risk.screening}')
        
        # Обучаемость
        if breed.trainability in ['high', 'very_high'] and pet.training_experience == 'none':
            recommendations['courses'].extend([
                'Базовое послушание',
                'Социализация'
            ])
        
        return recommendations
    
    def _calculate_overall_score(self, pet, breed):
        """Расчет общего скора соответствия породе"""
        score = 100
        
        # Вес
        weight_analysis = self._analyze_weight(pet, breed)
        if weight_analysis['status'] == 'overweight':
            score -= 20 if weight_analysis['severity'] == 'high' else 10
        elif weight_analysis['status'] == 'underweight':
            score -= 15 if weight_analysis['severity'] == 'high' else 8
        
        # Активность
        activity_analysis = self._analyze_activity(pet, breed)
        if activity_analysis['status'] != 'normal':
            score -= 15 if activity_analysis['severity'] == 'high' else 8
        
        # Проблемы здоровья
        if pet.health_issues:
            score -= len(pet.health_issues) * 5
        
        # Поведенческие проблемы
        if pet.behavioral_problems:
            score -= len(pet.behavioral_problems) * 3
        
        return max(0, min(100, score))
    
    def _calculate_completeness(self, pet):
        """Расчет заполненности профиля"""
        required_fields = [
            pet.name, pet.species, pet.breed, pet.date_of_birth,
            pet.weight, pet.gender
        ]
        
        filled = sum(1 for field in required_fields if field)
        return int((filled / len(required_fields)) * 100)
    
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

