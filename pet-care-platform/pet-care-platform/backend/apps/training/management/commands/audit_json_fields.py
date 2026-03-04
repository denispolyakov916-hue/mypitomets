"""
Management команда для аудита всех JSON полей.

Проверяет текущий формат данных и выявляет несоответствия.
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
import json

from apps.shop.models import Product
from apps.pets.models import Pet
from apps.training.models import Course, Lesson, ContentBlock


class Command(BaseCommand):
    help = 'Аудит всех JSON полей в моделях'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            help='Аудит только указанной модели (Product, Pet, Course, Lesson, ContentBlock)',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Экспортировать результаты в JSON файл',
        )

    def handle(self, *args, **options):
        model_name = options.get('model')
        export_file = options.get('export')

        results = {
            'summary': {},
            'details': {}
        }

        # Аудит Product
        if not model_name or model_name.lower() == 'product':
            self.stdout.write('Аудит Product...')
            product_results = self.audit_products()
            results['details']['Product'] = product_results
            results['summary']['Product'] = {
                'total': product_results['total'],
                'issues': len(product_results['issues']),
                'null_values': product_results['null_values'],
                'wrong_type': product_results['wrong_type'],
                'invalid_format': product_results['invalid_format']
            }

        # Аудит Pet
        if not model_name or model_name.lower() == 'pet':
            self.stdout.write('Аудит Pet...')
            pet_results = self.audit_pets()
            results['details']['Pet'] = pet_results
            results['summary']['Pet'] = {
                'total': pet_results['total'],
                'issues': len(pet_results['issues']),
                'null_values': pet_results['null_values'],
                'wrong_type': pet_results['wrong_type'],
                'invalid_format': pet_results['invalid_format']
            }

        # Аудит Course
        if not model_name or model_name.lower() == 'course':
            self.stdout.write('Аудит Course...')
            course_results = self.audit_courses()
            results['details']['Course'] = course_results
            results['summary']['Course'] = {
                'total': course_results['total'],
                'issues': len(course_results['issues']),
                'null_values': course_results['null_values'],
                'wrong_type': course_results['wrong_type'],
                'invalid_format': course_results['invalid_format']
            }

        # Аудит Lesson
        if not model_name or model_name.lower() == 'lesson':
            self.stdout.write('Аудит Lesson...')
            lesson_results = self.audit_lessons()
            results['details']['Lesson'] = lesson_results
            results['summary']['Lesson'] = {
                'total': lesson_results['total'],
                'issues': len(lesson_results['issues']),
                'null_values': lesson_results['null_values'],
                'wrong_type': lesson_results['wrong_type'],
                'invalid_format': lesson_results['invalid_format']
            }

        # Аудит ContentBlock
        if not model_name or model_name.lower() == 'contentblock':
            self.stdout.write('Аудит ContentBlock...')
            block_results = self.audit_content_blocks()
            results['details']['ContentBlock'] = block_results
            results['summary']['ContentBlock'] = {
                'total': block_results['total'],
                'issues': len(block_results['issues']),
                'null_values': block_results['null_values'],
                'wrong_type': block_results['wrong_type'],
                'invalid_format': block_results['invalid_format']
            }

        # Вывод результатов
        self.print_summary(results['summary'])

        # Экспорт результатов
        if export_file:
            with open(export_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f'\nРезультаты экспортированы в {export_file}'))

    def print_summary(self, summary):
        """Вывод сводки результатов."""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('СВОДКА АУДИТА JSON ПОЛЕЙ'))
        self.stdout.write('=' * 50)

        total_issues = 0
        for model_name, stats in summary.items():
            self.stdout.write(f'\n{model_name}:')
            self.stdout.write(f'  Всего записей: {stats["total"]}')
            self.stdout.write(f'  Проблем: {stats["issues"]}')
            self.stdout.write(f'  null значений: {stats["null_values"]}')
            self.stdout.write(f'  Неправильный тип: {stats["wrong_type"]}')
            self.stdout.write(f'  Неверный формат: {stats["invalid_format"]}')
            total_issues += stats['issues']

        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Всего проблем: {total_issues}'))
        self.stdout.write('=' * 50)

    def audit_products(self):
        """Аудит JSON полей Product."""
        results = {
            'total': 0,
            'issues': [],
            'null_values': 0,
            'wrong_type': 0,
            'invalid_format': 0
        }

        for product in Product.objects.all():
            results['total'] += 1

            # Проверка images
            if product.images is None:
                results['null_values'] += 1
                results['issues'].append({
                    'id': product.id,
                    'field': 'images',
                    'issue': 'null value',
                    'current': None,
                    'expected': 'list'
                })
            elif not isinstance(product.images, list):
                results['wrong_type'] += 1
                results['issues'].append({
                    'id': product.id,
                    'field': 'images',
                    'issue': 'wrong type',
                    'current': type(product.images).__name__,
                    'expected': 'list'
                })
            else:
                # Проверка формата URL
                for i, url in enumerate(product.images):
                    if not isinstance(url, str) or not (url.startswith('http://') or url.startswith('https://')):
                        results['invalid_format'] += 1
                        results['issues'].append({
                            'id': product.id,
                            'field': 'images',
                            'issue': 'invalid url',
                            'index': i,
                            'value': url
                        })

            # Проверка params
            if product.params is None:
                results['null_values'] += 1
                results['issues'].append({
                    'id': product.id,
                    'field': 'params',
                    'issue': 'null value',
                    'current': None,
                    'expected': 'dict'
                })
            elif not isinstance(product.params, dict):
                results['wrong_type'] += 1
                results['issues'].append({
                    'id': product.id,
                    'field': 'params',
                    'issue': 'wrong type',
                    'current': type(product.params).__name__,
                    'expected': 'dict'
                })

        return results

    def audit_pets(self):
        """Аудит JSON полей Pet."""
        results = {
            'total': 0,
            'issues': [],
            'null_values': 0,
            'wrong_type': 0,
            'invalid_format': 0
        }

        json_fields = [
            'favorite_foods', 'allergies', 'health_issues', 'special_needs',
            'preferred_activities', 'behavioral_problems', 'excluded_ingredients',
            'character_traits'
        ]

        for pet in Pet.objects.all():
            results['total'] += 1

            for field_name in json_fields:
                value = getattr(pet, field_name)
                if value is None:
                    results['null_values'] += 1
                    results['issues'].append({
                        'id': pet.id,
                        'field': field_name,
                        'issue': 'null value',
                        'current': None,
                        'expected': 'list'
                    })
                elif not isinstance(value, list):
                    results['wrong_type'] += 1
                    results['issues'].append({
                        'id': pet.id,
                        'field': field_name,
                        'issue': 'wrong type',
                        'current': type(value).__name__,
                        'expected': 'list'
                    })
                else:
                    # Проверка элементов списка
                    for i, item in enumerate(value):
                        if not isinstance(item, str):
                            results['invalid_format'] += 1
                            results['issues'].append({
                                'id': pet.id,
                                'field': field_name,
                                'issue': 'invalid item type',
                                'index': i,
                                'value': item
                            })

        return results

    def audit_courses(self):
        """Аудит JSON полей Course."""
        results = {
            'total': 0,
            'issues': [],
            'null_values': 0,
            'wrong_type': 0,
            'invalid_format': 0
        }

        list_fields = [
            'recommended_behavior_types', 'recommended_activity_levels',
            'recommended_social_levels', 'compatible_health_issues',
            'addresses_special_needs', 'suitable_activities',
            'addresses_behavioral_problems', 'additional_images'
        ]

        for course in Course.objects.all():
            results['total'] += 1

            for field_name in list_fields:
                value = getattr(course, field_name)
                if value is None:
                    results['null_values'] += 1
                    results['issues'].append({
                        'id': course.id,
                        'field': field_name,
                        'issue': 'null value',
                        'current': None,
                        'expected': 'list'
                    })
                elif not isinstance(value, list):
                    results['wrong_type'] += 1
                    results['issues'].append({
                        'id': course.id,
                        'field': field_name,
                        'issue': 'wrong type',
                        'current': type(value).__name__,
                        'expected': 'list'
                    })

        return results

    def audit_lessons(self):
        """Аудит JSON полей Lesson."""
        results = {
            'total': 0,
            'issues': [],
            'null_values': 0,
            'wrong_type': 0,
            'invalid_format': 0
        }

        for lesson in Lesson.objects.all():
            results['total'] += 1

            # Проверка content
            if lesson.content is None:
                results['null_values'] += 1
                results['issues'].append({
                    'id': lesson.id,
                    'field': 'content',
                    'issue': 'null value',
                    'current': None,
                    'expected': 'dict'
                })
            elif not isinstance(lesson.content, dict):
                results['wrong_type'] += 1
                results['issues'].append({
                    'id': lesson.id,
                    'field': 'content',
                    'issue': 'wrong type',
                    'current': type(lesson.content).__name__,
                    'expected': 'dict'
                })

            # Проверка additional_materials
            if lesson.additional_materials is None:
                results['null_values'] += 1
                results['issues'].append({
                    'id': lesson.id,
                    'field': 'additional_materials',
                    'issue': 'null value',
                    'current': None,
                    'expected': 'list'
                })
            elif not isinstance(lesson.additional_materials, list):
                results['wrong_type'] += 1
                results['issues'].append({
                    'id': lesson.id,
                    'field': 'additional_materials',
                    'issue': 'wrong type',
                    'current': type(lesson.additional_materials).__name__,
                    'expected': 'list'
                })

        return results

    def audit_content_blocks(self):
        """Аудит JSON полей ContentBlock."""
        results = {
            'total': 0,
            'issues': [],
            'null_values': 0,
            'wrong_type': 0,
            'invalid_format': 0
        }

        for block in ContentBlock.objects.all():
            results['total'] += 1

            # Проверка content
            if block.content is None:
                results['null_values'] += 1
                results['issues'].append({
                    'id': block.id,
                    'field': 'content',
                    'issue': 'null value',
                    'current': None,
                    'expected': 'dict'
                })
            elif not isinstance(block.content, dict):
                results['wrong_type'] += 1
                results['issues'].append({
                    'id': block.id,
                    'field': 'content',
                    'issue': 'wrong type',
                    'current': type(block.content).__name__,
                    'expected': 'dict'
                })

            # Проверка settings
            if block.settings is None:
                results['null_values'] += 1
                results['issues'].append({
                    'id': block.id,
                    'field': 'settings',
                    'issue': 'null value',
                    'current': None,
                    'expected': 'dict'
                })
            elif not isinstance(block.settings, dict):
                results['wrong_type'] += 1
                results['issues'].append({
                    'id': block.id,
                    'field': 'settings',
                    'issue': 'wrong type',
                    'current': type(block.settings).__name__,
                    'expected': 'dict'
                })

        return results

