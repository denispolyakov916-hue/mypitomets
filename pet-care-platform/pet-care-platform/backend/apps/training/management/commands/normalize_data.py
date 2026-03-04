"""
Management команда для нормализации данных.

Приводит все данные к единому формату, заполняет пустые поля значениями по умолчанию.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.shop.models import Product
from apps.pets.models import Pet
from apps.training.models import Course, Lesson


class Command(BaseCommand):
    help = 'Нормализация данных'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            help='Нормализовать только указанную модель (Product, Pet, Course, Lesson)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только проверить, не исправлять',
        )

    def handle(self, *args, **options):
        model_name = options.get('model')
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('Режим dry-run: изменения не будут сохранены'))

        normalized = []

        # Нормализация Product
        if not model_name or model_name.lower() == 'product':
            self.stdout.write('Нормализация Product...')
            product_normalized = self.normalize_products(dry_run)
            normalized.extend(product_normalized)

        # Нормализация Pet
        if not model_name or model_name.lower() == 'pet':
            self.stdout.write('Нормализация Pet...')
            pet_normalized = self.normalize_pets(dry_run)
            normalized.extend(pet_normalized)

        # Нормализация Course
        if not model_name or model_name.lower() == 'course':
            self.stdout.write('Нормализация Course...')
            course_normalized = self.normalize_courses(dry_run)
            normalized.extend(course_normalized)

        # Нормализация Lesson
        if not model_name or model_name.lower() == 'lesson':
            self.stdout.write('Нормализация Lesson...')
            lesson_normalized = self.normalize_lessons(dry_run)
            normalized.extend(lesson_normalized)

        # Вывод результатов
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Нормализовано записей: {len(normalized)}'))
        if normalized:
            self.stdout.write('\nНормализованные записи:')
            for item in normalized[:20]:  # Показываем первые 20
                self.stdout.write(self.style.SUCCESS(f'  - {item}'))
            if len(normalized) > 20:
                self.stdout.write(self.style.WARNING(f'  ... и еще {len(normalized) - 20} записей'))

    def normalize_products(self, dry_run):
        """Нормализация Product."""
        normalized = []

        for product in Product.objects.all():
            updated = False
            update_fields = []

            # Нормализация images
            if product.images is None:
                product.images = []
                update_fields.append('images')
                updated = True
            elif not isinstance(product.images, list):
                product.images = []
                update_fields.append('images')
                updated = True
            else:
                # Фильтрация некорректных URL
                valid_images = []
                for url in product.images:
                    if isinstance(url, str) and (url.startswith('http://') or url.startswith('https://')):
                        valid_images.append(url)
                if len(valid_images) != len(product.images):
                    product.images = valid_images
                    update_fields.append('images')
                    updated = True

            # Нормализация params
            if product.params is None:
                product.params = {}
                update_fields.append('params')
                updated = True
            elif not isinstance(product.params, dict):
                product.params = {}
                update_fields.append('params')
                updated = True
            else:
                # Очистка некорректных значений
                valid_params = {}
                for key, value in product.params.items():
                    if isinstance(key, str) and isinstance(value, (str, int, float, bool, list, dict)):
                        valid_params[key] = value
                if len(valid_params) != len(product.params):
                    product.params = valid_params
                    update_fields.append('params')
                    updated = True

            if updated and not dry_run:
                product.save(update_fields=update_fields)
                normalized.append(f'Product {product.id}')

        return normalized

    def normalize_pets(self, dry_run):
        """Нормализация Pet."""
        normalized = []

        for pet in Pet.objects.all():
            updated = False
            update_fields = []

            json_fields = [
                'favorite_foods', 'allergies', 'health_issues', 'special_needs',
                'preferred_activities', 'behavioral_problems', 'excluded_ingredients',
                'character_traits'
            ]

            for field_name in json_fields:
                value = getattr(pet, field_name)
                if value is None:
                    setattr(pet, field_name, [])
                    update_fields.append(field_name)
                    updated = True
                elif not isinstance(value, list):
                    setattr(pet, field_name, [])
                    update_fields.append(field_name)
                    updated = True
                else:
                    # Фильтрация некорректных элементов (только строки, непустые)
                    valid_items = [item for item in value if isinstance(item, str) and item.strip()]
                    if len(valid_items) != len(value):
                        setattr(pet, field_name, valid_items)
                        update_fields.append(field_name)
                        updated = True

            if updated and not dry_run:
                pet.save(update_fields=update_fields)
                normalized.append(f'Pet {pet.id}')

        return normalized

    def normalize_courses(self, dry_run):
        """Нормализация Course."""
        normalized = []

        for course in Course.objects.all():
            updated = False
            update_fields = []

            list_fields = [
                'recommended_behavior_types', 'recommended_activity_levels',
                'recommended_social_levels', 'compatible_health_issues',
                'addresses_special_needs', 'suitable_activities',
                'addresses_behavioral_problems', 'additional_images'
            ]

            for field_name in list_fields:
                value = getattr(course, field_name)
                if value is None:
                    setattr(course, field_name, [])
                    update_fields.append(field_name)
                    updated = True
                elif not isinstance(value, list):
                    setattr(course, field_name, [])
                    update_fields.append(field_name)
                    updated = True
                else:
                    # Для URL полей - фильтрация некорректных URL
                    if field_name == 'additional_images':
                        valid_items = [
                            item for item in value
                            if isinstance(item, str) and (item.startswith('http://') or item.startswith('https://'))
                        ]
                    else:
                        # Для строковых полей - фильтрация непустых строк
                        valid_items = [item for item in value if isinstance(item, str) and item.strip()]
                    
                    if len(valid_items) != len(value):
                        setattr(course, field_name, valid_items)
                        update_fields.append(field_name)
                        updated = True

            if updated and not dry_run:
                course.save(update_fields=update_fields)
                normalized.append(f'Course {course.id}')

        return normalized

    def normalize_lessons(self, dry_run):
        """Нормализация Lesson."""
        normalized = []

        for lesson in Lesson.objects.all():
            updated = False
            update_fields = []

            # Нормализация content
            if lesson.content is None:
                lesson.content = {'type': lesson.content_type}
                update_fields.append('content')
                updated = True
            elif not isinstance(lesson.content, dict):
                lesson.content = {'type': lesson.content_type}
                update_fields.append('content')
                updated = True
            else:
                # Убеждаемся что есть ключ 'type'
                if 'type' not in lesson.content:
                    lesson.content['type'] = lesson.content_type
                    update_fields.append('content')
                    updated = True

            # Нормализация additional_materials
            if lesson.additional_materials is None:
                lesson.additional_materials = []
                update_fields.append('additional_materials')
                updated = True
            elif not isinstance(lesson.additional_materials, list):
                lesson.additional_materials = []
                update_fields.append('additional_materials')
                updated = True
            else:
                # Фильтрация некорректных URL
                valid_materials = [
                    item for item in lesson.additional_materials
                    if isinstance(item, str) and (item.startswith('http://') or item.startswith('https://'))
                ]
                if len(valid_materials) != len(lesson.additional_materials):
                    lesson.additional_materials = valid_materials
                    update_fields.append('additional_materials')
                    updated = True

            if updated and not dry_run:
                lesson.save(update_fields=update_fields)
                normalized.append(f'Lesson {lesson.id}')

        return normalized

