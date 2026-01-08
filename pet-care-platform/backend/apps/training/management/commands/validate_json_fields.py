"""
Management команда для валидации всех JSON полей в моделях.

Проверяет корректность структуры JSON полей и исправляет некорректные данные.
"""

from django.core.management.base import BaseCommand
from django.core.exceptions import ValidationError
from django.db import transaction
import json

from apps.shop.models import Product
from apps.pets.models import Pet
from apps.training.models import Course, Lesson, ContentBlock, BlockTemplate, Comment
from core.validators import (
    validate_json_list, validate_string_list, validate_url_list,
    validate_behavior_types, validate_activity_levels, validate_social_levels,
    validate_product_params, validate_lesson_content,
    validate_content_block_content, validate_content_block_settings
)


class Command(BaseCommand):
    help = 'Валидация всех JSON полей в моделях'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Исправить некорректные данные (заполнить значениями по умолчанию)',
        )
        parser.add_argument(
            '--model',
            type=str,
            help='Валидировать только указанную модель (Product, Pet, Course, Lesson, etc.)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Только проверить, не исправлять',
        )

    def handle(self, *args, **options):
        fix = options['fix'] and not options['dry_run']
        model_name = options.get('model')
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('Режим dry-run: изменения не будут сохранены'))

        errors = []
        fixed = []

        # Валидация Product
        if not model_name or model_name.lower() == 'product':
            self.stdout.write('Проверка Product...')
            product_errors, product_fixed = self.validate_products(fix, dry_run)
            errors.extend(product_errors)
            fixed.extend(product_fixed)

        # Валидация Pet
        if not model_name or model_name.lower() == 'pet':
            self.stdout.write('Проверка Pet...')
            pet_errors, pet_fixed = self.validate_pets(fix, dry_run)
            errors.extend(pet_errors)
            fixed.extend(pet_fixed)

        # Валидация Course
        if not model_name or model_name.lower() == 'course':
            self.stdout.write('Проверка Course...')
            course_errors, course_fixed = self.validate_courses(fix, dry_run)
            errors.extend(course_errors)
            fixed.extend(course_fixed)

        # Валидация Lesson
        if not model_name or model_name.lower() == 'lesson':
            self.stdout.write('Проверка Lesson...')
            lesson_errors, lesson_fixed = self.validate_lessons(fix, dry_run)
            errors.extend(lesson_errors)
            fixed.extend(lesson_fixed)

        # Валидация ContentBlock
        if not model_name or model_name.lower() == 'contentblock':
            self.stdout.write('Проверка ContentBlock...')
            block_errors, block_fixed = self.validate_content_blocks(fix, dry_run)
            errors.extend(block_errors)
            fixed.extend(block_fixed)

        # Вывод результатов
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Найдено ошибок: {len(errors)}'))
        if fix:
            self.stdout.write(self.style.SUCCESS(f'Исправлено: {len(fixed)}'))
        else:
            self.stdout.write(self.style.WARNING('Используйте --fix для исправления ошибок'))

        if errors:
            self.stdout.write('\nОшибки:')
            for error in errors[:20]:  # Показываем первые 20
                self.stdout.write(self.style.ERROR(f'  - {error}'))
            if len(errors) > 20:
                self.stdout.write(self.style.WARNING(f'  ... и еще {len(errors) - 20} ошибок'))

    def validate_products(self, fix, dry_run):
        """Валидация JSON полей Product."""
        errors = []
        fixed = []

        for product in Product.objects.all():
            # Валидация images
            try:
                validate_url_list(product.images)
            except ValidationError as e:
                errors.append(f'Product {product.id}: images - {e.message}')
                if fix:
                    product.images = []
                    fixed.append(f'Product {product.id}: images исправлено')

            # Валидация params
            try:
                validate_product_params(product.params)
            except ValidationError as e:
                errors.append(f'Product {product.id}: params - {e.message}')
                if fix:
                    product.params = {}
                    fixed.append(f'Product {product.id}: params исправлено')

            if fix and not dry_run:
                product.save(update_fields=['images', 'params'])

        return errors, fixed

    def validate_pets(self, fix, dry_run):
        """Валидация JSON полей Pet."""
        errors = []
        fixed = []

        for pet in Pet.objects.all():
            json_fields = [
                ('favorite_foods', validate_string_list),
                ('allergies', validate_string_list),
                ('health_issues', validate_string_list),
                ('special_needs', validate_string_list),
                ('preferred_activities', validate_string_list),
                ('behavioral_problems', validate_string_list),
                ('excluded_ingredients', validate_string_list),
                ('character_traits', validate_string_list),
            ]

            update_fields = []
            for field_name, validator in json_fields:
                try:
                    value = getattr(pet, field_name)
                    validator(value)
                except ValidationError as e:
                    errors.append(f'Pet {pet.id}: {field_name} - {e.message}')
                    if fix:
                        setattr(pet, field_name, [])
                        update_fields.append(field_name)
                        fixed.append(f'Pet {pet.id}: {field_name} исправлено')

            if fix and not dry_run and update_fields:
                pet.save(update_fields=update_fields)

        return errors, fixed

    def validate_courses(self, fix, dry_run):
        """Валидация JSON полей Course."""
        errors = []
        fixed = []

        for course in Course.objects.all():
            json_fields = [
                ('recommended_behavior_types', validate_behavior_types),
                ('recommended_activity_levels', validate_activity_levels),
                ('recommended_social_levels', validate_social_levels),
                ('compatible_health_issues', validate_string_list),
                ('addresses_special_needs', validate_string_list),
                ('suitable_activities', validate_string_list),
                ('addresses_behavioral_problems', validate_string_list),
                ('additional_images', validate_url_list),
            ]

            update_fields = []
            for field_name, validator in json_fields:
                try:
                    value = getattr(course, field_name)
                    validator(value)
                except ValidationError as e:
                    errors.append(f'Course {course.id}: {field_name} - {e.message}')
                    if fix:
                        setattr(course, field_name, [] if 'list' in str(validator) else {})
                        update_fields.append(field_name)
                        fixed.append(f'Course {course.id}: {field_name} исправлено')

            if fix and not dry_run and update_fields:
                course.save(update_fields=update_fields)

        return errors, fixed

    def validate_lessons(self, fix, dry_run):
        """Валидация JSON полей Lesson."""
        errors = []
        fixed = []

        for lesson in Lesson.objects.all():
            # Валидация content
            try:
                validate_lesson_content(lesson.content)
            except ValidationError as e:
                errors.append(f'Lesson {lesson.id}: content - {e.message}')
                if fix:
                    lesson.content = {'type': lesson.content_type}
                    fixed.append(f'Lesson {lesson.id}: content исправлено')

            # Валидация additional_materials
            try:
                validate_url_list(lesson.additional_materials)
            except ValidationError as e:
                errors.append(f'Lesson {lesson.id}: additional_materials - {e.message}')
                if fix:
                    lesson.additional_materials = []
                    fixed.append(f'Lesson {lesson.id}: additional_materials исправлено')

            if fix and not dry_run:
                lesson.save(update_fields=['content', 'additional_materials'])

        return errors, fixed

    def validate_content_blocks(self, fix, dry_run):
        """Валидация JSON полей ContentBlock."""
        errors = []
        fixed = []

        for block in ContentBlock.objects.all():
            # Валидация content
            try:
                validate_content_block_content(block.content)
            except ValidationError as e:
                errors.append(f'ContentBlock {block.id}: content - {e.message}')
                if fix:
                    block.content = {}
                    fixed.append(f'ContentBlock {block.id}: content исправлено')

            # Валидация settings
            try:
                validate_content_block_settings(block.settings)
            except ValidationError as e:
                errors.append(f'ContentBlock {block.id}: settings - {e.message}')
                if fix:
                    block.settings = {}
                    fixed.append(f'ContentBlock {block.id}: settings исправлено')

            if fix and not dry_run:
                block.save(update_fields=['content', 'settings'])

        return errors, fixed

