"""
Management команда для импорта пород из breed_descriptions.md.

Парсит markdown файл с описаниями пород и создаёт записи в базе данных.

Usage:
    python manage.py import_breeds
    python manage.py import_breeds --dry-run  # Только показать, что будет импортировано
    python manage.py import_breeds --clear    # Очистить существующие породы перед импортом
"""

import os
import re
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.pets.breed_models import Breed


class Command(BaseCommand):
    help = 'Импорт пород из breed_descriptions.md'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет импортировано без сохранения в БД'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Очистить существующие породы перед импортом'
        )
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Путь к файлу с описаниями пород'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        clear = options['clear']
        
        # Определяем путь к файлу
        file_path = options['file']
        if not file_path:
            # Ищем файл в docs/TZ/breed_descriptions.md
            base_dir = settings.BASE_DIR
            file_path = os.path.join(base_dir.parent, 'docs', 'TZ', 'breed_descriptions.md')
        
        if not os.path.exists(file_path):
            self.stderr.write(self.style.ERROR(f'Файл не найден: {file_path}'))
            return
        
        self.stdout.write(f'Читаю файл: {file_path}')
        
        # Читаем файл
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Парсим породы
        breeds_data = self.parse_breeds(content)
        
        self.stdout.write(f'Найдено пород: {len(breeds_data)}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - данные не сохраняются'))
            for breed in breeds_data:
                self.stdout.write(f"  - {breed['name']} ({breed['species']})")
            return
        
        # Очистка если нужно
        if clear:
            deleted_count = Breed.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f'Удалено существующих пород: {deleted_count}'))
        
        # Сохраняем породы
        created_count = 0
        updated_count = 0
        errors_count = 0
        
        for breed_data in breeds_data:
            if breed_data is None:
                errors_count += 1
                continue
            
            try:
                breed_name = breed_data.pop('name')
                breed, created = Breed.objects.update_or_create(
                    name=breed_name,
                    defaults=breed_data
                )
                if created:
                    created_count += 1
                    self.stdout.write(f'  + {breed_name}')
                else:
                    updated_count += 1
            except Exception as e:
                errors_count += 1
                self.stderr.write(f'Ошибка при сохранении породы: {e}')
        
        self.stdout.write(self.style.SUCCESS(
            f'Импорт завершён: создано {created_count}, обновлено {updated_count}, ошибок {errors_count}'
        ))

    def parse_breeds(self, content):
        """Парсит markdown с описаниями пород."""
        breeds = []
        
        # Разбиваем контент на блоки по породам (по разделителю ---)
        blocks = re.split(r'\n---\n', content)
        
        # Отслеживаем текущий вид животного
        current_species = None
        
        for block in blocks:
            if not block.strip():
                continue
            
            # Определяем вид животного по заголовку секции в блоке
            if '## 🐕 **СОБАКИ**' in block:
                current_species = 'dog'
            elif '## 🐱 **КОШКИ**' in block:
                current_species = 'cat'
            
            # Если вид ещё не определён, пропускаем
            if not current_species:
                continue
            
            # Ищем породу в блоке
            name_match = re.search(r'### \*\*([^*]+)\*\*', block)
            if not name_match:
                continue
            
            breed_name = name_match.group(1).strip()
            
            # Парсим данные породы
            breed_data = self.parse_breed_block(block, breed_name, current_species)
            if breed_data:
                breeds.append(breed_data)
        
        return breeds

    # Метод parse_section больше не нужен - логика перенесена в parse_breeds

    def parse_breed_block(self, block, name, species):
        """Парсит блок одной породы."""
        try:
            # Описание - первый абзац после названия
            desc_match = re.search(r'### \*\*[^*]+\*\*\n\n([^\n]+(?:\n(?!####|##)[^\n]*)*)', block)
            description = desc_match.group(1).strip() if desc_match else ''
            
            # Здоровье
            health_risk = self.extract_health_risk(block)
            genetic_risks = self.extract_list('Генетические риски', block)
            lifespan = self.extract_lifespan(block)
            dental_notes = self.extract_value('Стоматологическое здоровье', block)
            
            # Вес
            weight_min, weight_max = self.extract_weight(block)
            
            # Питание
            diet_type = self.extract_value('Тип питания', block)
            digestion = self.extract_digestion_sensitivity(block)
            metabolism = self.extract_value('Особенности метаболизма', block)
            
            # Активность
            energy_level = self.extract_energy_level(block)
            exercise = self.extract_value('Рекомендуемые прогулки', block) or self.extract_value('Рекомендуемые игры', block)
            activities = self.extract_list_from_value('Любимые активности', block)
            activity_notes = self.extract_value('Особенности', block, section='Физическая активность')
            
            # Уход
            grooming = self.extract_grooming_level(block)
            bathing = self.extract_value('Купание', block)
            grooming_notes = self.extract_value('Особенности', block, section='Уход и гигиена')
            
            # Поведение
            temperament = self.extract_list_from_value('Темперамент', block)
            trainability = self.extract_trainability(block)
            children = self.extract_children_compatibility(block)
            socialization = self.extract_value('Социализация', block)
            
            # Определяем категорию размера
            avg_weight = (weight_min + weight_max) / 2
            if avg_weight < 5:
                size_category = 'toy'
            elif avg_weight < 10:
                size_category = 'small'
            elif avg_weight < 25:
                size_category = 'medium'
            elif avg_weight < 45:
                size_category = 'large'
            else:
                size_category = 'giant'
            
            return {
                'name': name,
                'species': species,
                'description': description,
                # Здоровье
                'health_risk_level': health_risk,
                'genetic_risks': genetic_risks,
                'lifespan_min': lifespan[0],
                'lifespan_max': lifespan[1],
                'dental_health_notes': dental_notes,
                # Вес
                'weight_min': Decimal(str(weight_min)),
                'weight_max': Decimal(str(weight_max)),
                'size_category': size_category,
                'diet_recommendations': diet_type,
                'digestion_sensitivity': digestion,
                'metabolism_notes': metabolism,
                # Активность
                'energy_level': energy_level,
                'exercise_needs': exercise,
                'favorite_activities': activities,
                'activity_notes': activity_notes or '',
                # Уход
                'grooming_level': grooming,
                'bathing_frequency': bathing,
                'grooming_notes': grooming_notes or '',
                # Поведение
                'temperament': temperament,
                'trainability': trainability,
                'children_compatibility': children,
                'socialization_notes': socialization,
            }
        except Exception as e:
            self.stderr.write(f'Ошибка парсинга породы {name}: {e}')
            return None

    def extract_value(self, key, block, section=None):
        """Извлекает значение по ключу."""
        pattern = rf'\*\*{re.escape(key)}:\*\*\s*([^\n]+)'
        match = re.search(pattern, block)
        return match.group(1).strip() if match else ''

    def extract_list(self, key, block):
        """Извлекает список значений (разделённых запятыми)."""
        value = self.extract_value(key, block)
        if not value:
            return []
        return [item.strip() for item in value.split(',')]

    def extract_list_from_value(self, key, block):
        """Извлекает список из значения."""
        value = self.extract_value(key, block)
        if not value:
            return []
        return [item.strip() for item in value.split(',')]

    def extract_health_risk(self, block):
        """Извлекает уровень риска здоровья."""
        value = self.extract_value('Общий статус здоровья', block).lower()
        if 'высокий' in value or 'high' in value:
            return 'high'
        elif 'низкий' in value or 'low' in value:
            return 'low'
        return 'medium'

    def extract_lifespan(self, block):
        """Извлекает продолжительность жизни."""
        value = self.extract_value('Продолжительность жизни', block)
        match = re.search(r'(\d+)-(\d+)', value)
        if match:
            return int(match.group(1)), int(match.group(2))
        return 10, 15

    def extract_weight(self, block):
        """Извлекает минимальный и максимальный вес."""
        value = self.extract_value('Идеальный вес', block)
        
        # Паттерн: 25-36 кг или 4-8 кг
        match = re.search(r'(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\s*кг', value)
        if match:
            return float(match.group(1)), float(match.group(2))
        
        # Паттерн: просто число
        match = re.search(r'(\d+(?:\.\d+)?)\s*кг', value)
        if match:
            weight = float(match.group(1))
            return weight * 0.8, weight * 1.2
        
        return 5.0, 30.0  # Дефолтные значения

    def extract_digestion_sensitivity(self, block):
        """Извлекает чувствительность пищеварения."""
        value = self.extract_value('Чувствительность пищеварения', block).lower()
        if 'высокая' in value or 'high' in value:
            return 'high'
        elif 'низкая' in value or 'low' in value:
            return 'low'
        return 'medium'

    def extract_energy_level(self, block):
        """Извлекает уровень энергии."""
        value = self.extract_value('Уровень энергии', block).lower()
        if 'очень высокий' in value or 'very high' in value:
            return 'very_high'
        elif 'высокий' in value or 'high' in value:
            return 'high'
        elif 'низкий' in value or 'low' in value:
            return 'low'
        return 'medium'

    def extract_grooming_level(self, block):
        """Извлекает уровень ухода за шерстью."""
        value = self.extract_value('Уход за шерстью', block).lower()
        if 'минимальный' in value or 'minimal' in value:
            return 'minimal'
        elif 'высокий' in value or 'high' in value:
            return 'high'
        elif 'низкий' in value or 'low' in value:
            return 'low'
        return 'medium'

    def extract_trainability(self, block):
        """Извлекает уровень обучаемости."""
        value = self.extract_value('Обучаемость', block).lower()
        if 'очень высокая' in value or 'исключительно' in value or 'very high' in value:
            return 'very_high'
        elif 'высокая' in value or 'high' in value:
            return 'high'
        elif 'низкая' in value or 'low' in value:
            return 'low'
        return 'medium'

    def extract_children_compatibility(self, block):
        """Извлекает совместимость с детьми."""
        value = self.extract_value('Отношение к детям', block).lower()
        if 'отличн' in value or 'превосход' in value or 'excellent' in value:
            return 'excellent'
        elif 'хорош' in value or 'good' in value:
            return 'good'
        elif 'средн' in value or 'может быть' in value:
            return 'moderate'
        return 'good'

