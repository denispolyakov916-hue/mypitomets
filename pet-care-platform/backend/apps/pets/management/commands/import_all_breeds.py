"""
Management команда для импорта ВСЕХ пород из справочника.

Содержит полный список пород собак и кошек с характеристиками.
Данные взяты из docs/TZ/petID.md (строки 3262-3420)

Usage:
    python manage.py import_all_breeds
    python manage.py import_all_breeds --clear
"""

import os
import re
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.pets.breed_models import Breed


# Полный справочник пород с характеристиками
# Формат: (name, species, size, energy, grooming, lifespan_min, lifespan_max, weight_min, weight_max)

DOG_BREEDS = [
    # === МЕЛКИЕ ПОРОДЫ (toy/small) ===
    ("Чихуахуа", "dog", "toy", "low", "low", 12, 18, 1.5, 3.0),
    ("Йоркширский Терьер", "dog", "toy", "medium", "high", 12, 15, 2.0, 3.5),
    ("Такса", "dog", "small", "medium", "low", 12, 16, 4.0, 12.0),
    ("Французский Бульдог", "dog", "small", "low", "low", 10, 12, 8.0, 14.0),
    ("Пекинес", "dog", "toy", "low", "high", 12, 14, 3.0, 6.0),
    ("Мопс", "dog", "small", "low", "low", 12, 15, 6.0, 8.0),
    ("Карликовый Пинчер", "dog", "small", "high", "low", 12, 14, 3.0, 5.0),
    ("Шпиц", "dog", "small", "medium", "high", 13, 15, 2.0, 4.5),
    ("Померанский Шпиц", "dog", "toy", "high", "high", 12, 16, 1.8, 3.5),
    ("Бостон-терьер", "dog", "small", "medium", "low", 11, 13, 5.0, 11.0),
    ("Лхаса Апсо", "dog", "small", "medium", "high", 12, 15, 5.0, 8.0),
    ("Ши-тцу", "dog", "small", "low", "high", 12, 15, 4.0, 7.0),
    ("Мальтийская Болонка", "dog", "toy", "low", "high", 12, 15, 3.0, 4.0),
    ("Папильон", "dog", "small", "high", "medium", 14, 16, 2.0, 5.0),
    ("Кавалер Кинг Чарльз Спаниель", "dog", "small", "medium", "high", 9, 14, 5.5, 8.0),
    ("Кинг Чарльз Спаниель", "dog", "small", "low", "medium", 9, 14, 3.6, 6.4),
    ("Джек Рассел Терьер", "dog", "small", "very_high", "low", 13, 16, 5.0, 8.0),
    ("Вест Хайленд Уайт Терьер", "dog", "small", "high", "medium", 12, 16, 6.0, 10.0),
    ("Скотч Терьер", "dog", "small", "medium", "medium", 11, 13, 8.0, 10.0),
    ("Бельгийский Гриффон", "dog", "toy", "medium", "high", 12, 15, 3.5, 6.0),
    ("Брюссельский Гриффон", "dog", "toy", "medium", "high", 12, 15, 3.5, 6.0),
    ("Той-терьер", "dog", "toy", "high", "low", 10, 15, 1.5, 3.0),
    ("Русский Той", "dog", "toy", "high", "low", 10, 15, 1.5, 3.0),
    ("Бишон Фризе", "dog", "small", "high", "high", 12, 15, 3.0, 5.5),
    ("Котон-де-Тулеар", "dog", "small", "medium", "high", 14, 17, 4.0, 6.0),
    ("Гаванский Бишон", "dog", "small", "medium", "high", 13, 15, 3.5, 6.5),
    ("Левретка", "dog", "small", "high", "low", 12, 15, 3.5, 5.0),
    ("Китайская Хохлатая", "dog", "small", "medium", "medium", 12, 14, 2.0, 5.5),
    
    # === СРЕДНИЕ ПОРОДЫ (medium) ===
    ("Бигль", "dog", "medium", "high", "low", 12, 15, 9.0, 14.0),
    ("Бульдог", "dog", "medium", "low", "low", 8, 10, 18.0, 25.0),
    ("Английский Бульдог", "dog", "medium", "low", "low", 8, 10, 18.0, 25.0),
    ("Боксер", "dog", "medium", "high", "low", 10, 12, 25.0, 32.0),
    ("Питбуль", "dog", "medium", "high", "low", 12, 16, 16.0, 30.0),
    ("Американский Питбультерьер", "dog", "medium", "high", "low", 12, 16, 16.0, 30.0),
    ("Шарпей", "dog", "medium", "low", "low", 9, 11, 18.0, 25.0),
    ("Вельш Корги Пемброк", "dog", "medium", "high", "medium", 12, 14, 10.0, 14.0),
    ("Вельш Корги Кардиган", "dog", "medium", "high", "medium", 12, 14, 11.0, 17.0),
    ("Стаффордширский Бультерьер", "dog", "medium", "high", "low", 12, 14, 11.0, 17.0),
    ("Американский Стаффордширский Терьер", "dog", "medium", "high", "low", 12, 14, 18.0, 30.0),
    ("Кокер Спаниель", "dog", "medium", "high", "high", 12, 15, 12.0, 16.0),
    ("Английский Кокер Спаниель", "dog", "medium", "high", "high", 12, 15, 12.0, 15.0),
    ("Американский Кокер Спаниель", "dog", "medium", "high", "high", 12, 15, 11.0, 14.0),
    ("Спрингер Спаниель", "dog", "medium", "very_high", "high", 12, 14, 18.0, 25.0),
    ("Бордер Колли", "dog", "medium", "very_high", "medium", 12, 15, 14.0, 20.0),
    ("Австралийская Овчарка", "dog", "medium", "very_high", "high", 13, 15, 18.0, 30.0),
    ("Миттельшнауцер", "dog", "medium", "high", "high", 13, 16, 14.0, 20.0),
    ("Цвергшнауцер", "dog", "small", "high", "high", 12, 15, 5.0, 9.0),
    ("Пудель Средний", "dog", "medium", "high", "high", 12, 15, 15.0, 19.0),
    ("Пудель Карликовый", "dog", "small", "high", "high", 14, 18, 6.0, 8.0),
    ("Пудель Той", "dog", "toy", "high", "high", 14, 18, 2.0, 4.0),
    ("Далматин", "dog", "large", "high", "low", 11, 13, 23.0, 32.0),
    ("Бретонский Эпаньоль", "dog", "medium", "very_high", "medium", 12, 14, 14.0, 18.0),
    ("Шелти", "dog", "small", "high", "high", 12, 14, 6.0, 12.0),
    ("Басенджи", "dog", "medium", "high", "low", 13, 14, 9.0, 12.0),
    ("Уиппет", "dog", "medium", "high", "low", 12, 15, 9.0, 19.0),
    
    # === КРУПНЫЕ ПОРОДЫ (large) ===
    ("Лабрадор Ретривер", "dog", "large", "high", "medium", 10, 12, 25.0, 36.0),
    ("Золотистый Ретривер", "dog", "large", "high", "high", 10, 12, 25.0, 36.0),
    ("Немецкая Овчарка", "dog", "large", "very_high", "medium", 9, 13, 22.0, 40.0),
    ("Ротвейлер", "dog", "large", "medium", "low", 8, 10, 35.0, 60.0),
    ("Акита Ину", "dog", "large", "medium", "high", 10, 12, 32.0, 59.0),
    ("Акита", "dog", "large", "medium", "high", 10, 12, 32.0, 59.0),
    ("Самоед", "dog", "large", "high", "high", 12, 14, 17.0, 30.0),
    ("Хаски", "dog", "large", "very_high", "medium", 12, 15, 16.0, 27.0),
    ("Сибирский Хаски", "dog", "large", "very_high", "medium", 12, 15, 16.0, 27.0),
    ("Колли", "dog", "large", "medium", "high", 12, 14, 22.0, 34.0),
    ("Бернский Зенненхунд", "dog", "large", "medium", "high", 7, 10, 36.0, 50.0),
    ("Пудель Большой", "dog", "large", "high", "high", 12, 15, 20.0, 32.0),
    ("Доберман", "dog", "large", "very_high", "low", 10, 12, 32.0, 45.0),
    ("Ризеншнауцер", "dog", "large", "high", "high", 12, 15, 25.0, 48.0),
    ("Веймаранер", "dog", "large", "very_high", "low", 10, 13, 25.0, 40.0),
    ("Кане Корсо", "dog", "large", "medium", "low", 9, 11, 40.0, 50.0),
    ("Ирландский Сеттер", "dog", "large", "very_high", "medium", 12, 14, 27.0, 32.0),
    ("Английский Сеттер", "dog", "large", "high", "medium", 12, 14, 25.0, 36.0),
    ("Родезийский Риджбек", "dog", "large", "high", "low", 10, 12, 29.0, 41.0),
    ("Курцхаар", "dog", "large", "very_high", "low", 12, 14, 20.0, 32.0),
    ("Дратхаар", "dog", "large", "very_high", "medium", 12, 14, 20.0, 32.0),
    ("Чау-чау", "dog", "large", "low", "high", 9, 15, 20.0, 32.0),
    ("Алабай", "dog", "giant", "medium", "high", 10, 12, 40.0, 80.0),
    ("Среднеазиатская Овчарка", "dog", "giant", "medium", "medium", 12, 14, 40.0, 80.0),
    ("Португальская Водяная Собака", "dog", "large", "very_high", "high", 12, 15, 16.0, 27.0),
    ("Лаготто Романьоло", "dog", "medium", "high", "high", 14, 16, 11.0, 16.0),
    ("Эрдельтерьер", "dog", "large", "high", "high", 10, 13, 18.0, 29.0),
    ("Фокстерьер", "dog", "small", "very_high", "medium", 12, 15, 6.0, 9.0),
    
    # === ГИГАНТСКИЕ ПОРОДЫ (giant) ===
    ("Немецкий Дог", "dog", "giant", "medium", "low", 7, 10, 45.0, 90.0),
    ("Дог", "dog", "giant", "medium", "low", 7, 10, 45.0, 90.0),
    ("Ирландский Волкодав", "dog", "giant", "medium", "medium", 6, 10, 48.0, 70.0),
    ("Ньюфаундленд", "dog", "giant", "medium", "high", 8, 10, 45.0, 70.0),
    ("Сенбернар", "dog", "giant", "low", "high", 8, 10, 50.0, 91.0),
    ("Леонбергер", "dog", "giant", "medium", "high", 7, 9, 41.0, 77.0),
    ("Кавказская Овчарка", "dog", "giant", "medium", "high", 10, 12, 45.0, 100.0),
    ("Бордоский Дог", "dog", "giant", "low", "low", 5, 8, 45.0, 68.0),
    ("Бульмастиф", "dog", "giant", "low", "low", 8, 10, 41.0, 59.0),
    ("Мастиф", "dog", "giant", "low", "low", 6, 10, 54.0, 100.0),
    ("Английский Мастиф", "dog", "giant", "low", "low", 6, 10, 54.0, 100.0),
    ("Неаполитанский Мастиф", "dog", "giant", "low", "low", 8, 10, 50.0, 70.0),
    ("Мастино Наполетано", "dog", "giant", "low", "low", 8, 10, 50.0, 70.0),
    ("Тибетский Мастиф", "dog", "giant", "low", "high", 12, 15, 34.0, 73.0),
    ("Аляскинский Маламут", "dog", "giant", "high", "medium", 12, 15, 34.0, 45.0),
    ("Комондор", "dog", "large", "medium", "high", 10, 12, 40.0, 60.0),
    ("Пули", "dog", "medium", "high", "high", 12, 16, 10.0, 15.0),
    ("Кангал", "dog", "giant", "medium", "high", 9, 11, 40.0, 66.0),
]

CAT_BREEDS = [
    # === КОРОТКОШЕРСТНЫЕ ===
    ("Британская Короткошерстная", "cat", "medium", "low", "low", 12, 17, 4.0, 8.0),
    ("Шотландская Вислоухая", "cat", "medium", "medium", "medium", 12, 15, 4.0, 6.0),
    ("Шотландская Прямоухая", "cat", "medium", "medium", "medium", 12, 15, 4.0, 6.0),
    ("Сиамская", "cat", "medium", "high", "low", 12, 15, 3.0, 5.0),
    ("Бенгальская", "cat", "medium", "very_high", "low", 12, 16, 4.0, 7.0),
    ("Саванна", "cat", "large", "high", "low", 12, 17, 6.0, 11.0),
    ("Абиссинская", "cat", "medium", "very_high", "low", 9, 13, 3.0, 5.0),
    ("Ориентальная", "cat", "medium", "high", "low", 12, 15, 2.5, 5.0),
    ("Ориентальная Короткошерстная", "cat", "medium", "high", "low", 12, 15, 2.5, 5.0),
    ("Девон-Рекс", "cat", "medium", "high", "low", 9, 13, 2.5, 4.0),
    ("Корниш-Рекс", "cat", "medium", "very_high", "low", 11, 14, 2.5, 4.5),
    ("Сингапурская", "cat", "small", "high", "low", 11, 15, 2.0, 3.0),
    ("Тонкинская", "cat", "medium", "high", "low", 14, 16, 2.5, 5.5),
    ("Бурманская", "cat", "medium", "medium", "low", 12, 16, 3.0, 5.5),
    ("Американская Короткошерстная", "cat", "medium", "medium", "low", 15, 20, 3.5, 6.5),
    ("Европейская Короткошерстная", "cat", "medium", "medium", "low", 12, 16, 3.5, 7.0),
    ("Японский Бобтейл", "cat", "medium", "high", "low", 9, 15, 2.5, 4.0),
    ("Египетская Мау", "cat", "medium", "high", "low", 9, 13, 3.0, 5.0),
    ("Оцикет", "cat", "medium", "high", "low", 12, 14, 3.0, 6.0),
    ("Канадский Сфинкс", "cat", "medium", "high", "high", 8, 14, 3.5, 6.0),
    ("Сфинкс", "cat", "medium", "high", "high", 8, 14, 3.5, 6.0),
    ("Петерболд", "cat", "medium", "high", "high", 12, 15, 3.0, 5.0),
    ("Донской Сфинкс", "cat", "medium", "high", "high", 12, 15, 3.5, 7.0),
    ("Бомбейская", "cat", "medium", "medium", "low", 12, 16, 2.5, 5.0),
    ("Русская Голубая", "cat", "medium", "medium", "low", 15, 20, 3.0, 5.5),
    ("Русская Синяя", "cat", "medium", "medium", "low", 15, 20, 3.0, 5.5),
    ("Корат", "cat", "medium", "high", "low", 10, 15, 2.5, 4.5),
    ("Гавана Браун", "cat", "medium", "medium", "low", 15, 21, 2.5, 4.5),
    ("Тойгер", "cat", "medium", "very_high", "low", 12, 15, 4.0, 7.0),
    ("Чаузи", "cat", "large", "medium", "low", 12, 15, 4.5, 11.0),
    ("Мэнкс", "cat", "medium", "high", "low", 9, 14, 3.5, 5.5),
    ("Курильский Бобтейл", "cat", "medium", "high", "medium", 12, 15, 3.0, 7.0),
    ("Американский Бобтейл", "cat", "large", "medium", "medium", 11, 15, 3.0, 7.0),
    ("Пикси-боб", "cat", "large", "medium", "medium", 12, 15, 4.0, 8.0),
    
    # === ДЛИННОШЕРСТНЫЕ ===
    ("Персидская", "cat", "medium", "low", "high", 12, 17, 3.0, 5.5),
    ("Мейн-кун", "cat", "large", "medium", "high", 12, 15, 5.5, 11.0),
    ("Мейн-Кун", "cat", "large", "medium", "high", 12, 15, 5.5, 11.0),
    ("Рэгдолл", "cat", "large", "low", "high", 12, 17, 4.5, 9.0),
    ("Британская Длинношерстная", "cat", "medium", "low", "medium", 12, 17, 4.0, 8.0),
    ("Шотландская Длинношерстная", "cat", "medium", "medium", "medium", 12, 15, 4.0, 6.0),
    ("Норвежская Лесная", "cat", "large", "medium", "high", 12, 16, 4.0, 9.0),
    ("Сибирская", "cat", "large", "medium", "high", 12, 15, 4.0, 9.0),
    ("Невская Маскарадная", "cat", "large", "medium", "high", 12, 15, 4.0, 10.0),
    ("Рагамаффин", "cat", "large", "low", "high", 12, 18, 4.5, 9.0),
    ("Балинезийская", "cat", "medium", "high", "medium", 12, 15, 2.5, 5.0),
    ("Сомали", "cat", "medium", "high", "medium", 12, 16, 2.5, 5.0),
    ("Турецкая Ангора", "cat", "medium", "high", "high", 12, 18, 2.5, 5.0),
    ("Ангорская", "cat", "medium", "medium", "high", 12, 18, 2.5, 5.0),
    ("Бирманская", "cat", "medium", "low", "medium", 12, 16, 4.0, 6.0),
    ("Священная Бирма", "cat", "medium", "low", "medium", 12, 16, 4.0, 6.0),
    ("Гималайская", "cat", "medium", "low", "medium", 9, 15, 3.5, 5.5),
    ("Колор-Пойнт", "cat", "medium", "medium", "medium", 12, 15, 3.0, 5.0),
    ("Ла-Перм", "cat", "medium", "high", "medium", 10, 15, 2.5, 5.5),
    ("Селкирк-Рекс", "cat", "medium", "medium", "medium", 10, 15, 3.0, 7.0),
    ("Американская Длинношерстная", "cat", "medium", "medium", "high", 12, 15, 3.5, 6.0),
    ("Украинский Левкой", "cat", "medium", "high", "low", 12, 15, 4.0, 7.0),
    ("Сноу-шу", "cat", "medium", "medium", "high", 14, 19, 3.0, 5.5),
    ("Бурмилла", "cat", "medium", "medium", "medium", 10, 15, 3.0, 5.5),
    ("Шиншилла", "cat", "medium", "low", "high", 12, 15, 4.0, 6.0),
    ("Экзотическая Короткошерстная", "cat", "medium", "low", "medium", 12, 15, 3.0, 6.0),
    ("Экзот", "cat", "medium", "low", "medium", 12, 15, 3.0, 6.0),
    
    # === ДОПОЛНИТЕЛЬНЫЕ ===
    ("Азиатская Табби", "cat", "medium", "medium", "low", 12, 16, 3.0, 5.0),
    ("Калифорнийская Сияющая", "cat", "medium", "medium", "low", 12, 16, 4.0, 7.0),
    ("Ашера", "cat", "large", "medium", "high", 12, 15, 6.0, 14.0),
    ("Сафари", "cat", "large", "high", "low", 12, 16, 5.0, 11.0),
]


class Command(BaseCommand):
    help = 'Импорт полного справочника пород (100+ собак, 50+ кошек)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить существующие породы перед импортом'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет импортировано без сохранения'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        clear = options['clear']
        
        all_breeds = DOG_BREEDS + CAT_BREEDS
        
        self.stdout.write(f'Всего пород для импорта: {len(all_breeds)}')
        self.stdout.write(f'  - Собак: {len(DOG_BREEDS)}')
        self.stdout.write(f'  - Кошек: {len(CAT_BREEDS)}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - данные не сохраняются'))
            for name, species, *_ in all_breeds:
                self.stdout.write(f"  - {name} ({species})")
            return
        
        if clear:
            deleted_count = Breed.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f'Удалено существующих пород: {deleted_count}'))
        
        created_count = 0
        updated_count = 0
        errors_count = 0
        
        # Загружаем описания из файла breed_descriptions.md если есть
        descriptions = self._load_descriptions()
        
        for breed_data in all_breeds:
            name, species, size, energy, grooming, lifespan_min, lifespan_max, weight_min, weight_max = breed_data
            
            try:
                # Получаем описание породы
                description = descriptions.get(name, self._generate_description(name, species))
                
                # Определяем уровень риска здоровья по продолжительности жизни
                avg_lifespan = (lifespan_min + lifespan_max) / 2
                if avg_lifespan < 10:
                    health_risk = 'high'
                elif avg_lifespan < 13:
                    health_risk = 'medium'
                else:
                    health_risk = 'low'
                
                # Маппинг груминга
                grooming_map = {
                    'low': 'minimal',
                    'medium': 'medium',
                    'high': 'high',
                    'very_high': 'high',
                }
                
                breed, created = Breed.objects.update_or_create(
                    name=name,
                    defaults={
                        'species': species,
                        'description': description,
                        'health_risk_level': health_risk,
                        'genetic_risks': [],
                        'lifespan_min': lifespan_min,
                        'lifespan_max': lifespan_max,
                        'weight_min': Decimal(str(weight_min)),
                        'weight_max': Decimal(str(weight_max)),
                        'size_category': size,
                        'diet_recommendations': '',
                        'digestion_sensitivity': 'medium',
                        'metabolism_notes': '',
                        'energy_level': energy,
                        'exercise_needs': '',
                        'favorite_activities': [],
                        'activity_notes': '',
                        'grooming_level': grooming_map.get(grooming, 'medium'),
                        'bathing_frequency': '',
                        'grooming_notes': '',
                        'temperament': [],
                        'trainability': 'medium',
                        'children_compatibility': 'good',
                        'socialization_notes': '',
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(f'  + {name} ({species})')
                else:
                    updated_count += 1
                    
            except Exception as e:
                errors_count += 1
                self.stderr.write(f'Ошибка при сохранении {name}: {e}')
        
        self.stdout.write(self.style.SUCCESS(
            f'Импорт завершён: создано {created_count}, обновлено {updated_count}, ошибок {errors_count}'
        ))
    
    def _load_descriptions(self):
        """Загрузка описаний из breed_descriptions.md"""
        descriptions = {}
        
        try:
            base_dir = settings.BASE_DIR
            file_path = os.path.join(base_dir.parent, 'docs', 'TZ', 'breed_descriptions.md')
            
            if not os.path.exists(file_path):
                return descriptions
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Ищем блоки пород и их описания
            pattern = r'### \*\*([^*]+)\*\*\n\n([^\n]+(?:\n(?!###|##|\*\*)[^\n]*)*)'
            matches = re.findall(pattern, content)
            
            for name, desc in matches:
                name = name.strip()
                desc = desc.strip()
                # Берём только первый абзац
                first_para = desc.split('\n\n')[0] if '\n\n' in desc else desc
                # Убираем markdown разметку
                first_para = re.sub(r'\*\*[^*]+\*\*', '', first_para)
                first_para = first_para.strip()
                if first_para and len(first_para) > 50:
                    descriptions[name] = first_para
                    
        except Exception as e:
            self.stderr.write(f'Не удалось загрузить описания: {e}')
        
        return descriptions
    
    def _generate_description(self, name, species):
        """Генерация базового описания если не найдено в файле"""
        if species == 'dog':
            return f"{name} - популярная порода собак. Отличается преданностью и дружелюбием."
        else:
            return f"{name} - популярная порода кошек. Известна своим характером и внешним видом."

