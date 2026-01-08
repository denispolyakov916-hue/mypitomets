"""
Management команда для валидации всех тестовых данных в системе.

Проверяет:
- Корректность JSON полей
- Целостность связей между моделями
- Соответствие данных форматам
- Наличие обязательных полей
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.apps import apps

from apps.users.models import User
from apps.pets.models import Pet
from apps.shop.models import Product, Order, OrderItem, CartItem
from apps.training.models import Course, Lesson, CoursePage, ContentBlock, UserCourse
from apps.reviews.models import Review
from core.validators import (
    validate_url_list, validate_string_list, validate_product_params,
    validate_behavior_types, validate_activity_levels, validate_social_levels,
    validate_lesson_content, validate_content_block_content,
    validate_content_block_settings
)


class Command(BaseCommand):
    help = 'Валидация всех тестовых данных в системе'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Исправить найденные ошибки (где возможно)',
        )
        parser.add_argument(
            '--model',
            type=str,
            help='Валидировать только указанную модель (User, Pet, Product, Course, Order)',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Экспортировать результаты валидации в JSON файл',
        )
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Показать детальную информацию о каждой ошибке',
        )

    def handle(self, *args, **options):
        fix_data = options['fix']
        model_name = options.get('model')
        export_file = options.get('export')
        detailed = options['detailed']

        self.stdout.write(self.style.WARNING('Начинаем валидацию тестовых данных...'))

        validation_results = {
            'summary': {
                'total_models_checked': 0,
                'total_instances_checked': 0,
                'total_errors_found': 0,
                'total_warnings_found': 0,
                'total_fixed': 0,
            },
            'details': {}
        }

        # Список моделей для валидации
        models_to_check = {
            'User': self.validate_users,
            'Pet': self.validate_pets,
            'Product': self.validate_products,
            'Course': self.validate_courses,
            'Lesson': self.validate_lessons,
            'CoursePage': self.validate_course_pages,
            'ContentBlock': self.validate_content_blocks,
            'Order': self.validate_orders,
            'OrderItem': self.validate_order_items,
            'CartItem': self.validate_cart_items,
            'UserCourse': self.validate_user_courses,
            'Review': self.validate_reviews,
        }

        for model_key, validator_func in models_to_check.items():
            if model_name and model_name.lower() != model_key.lower():
                continue

            self.stdout.write(f'\nВалидация модели {model_key}...')
            try:
                result = validator_func(fix_data, detailed)
                validation_results['details'][model_key] = result
                validation_results['summary']['total_models_checked'] += 1
                validation_results['summary']['total_instances_checked'] += result['instances_checked']
                validation_results['summary']['total_errors_found'] += result['errors_found']
                validation_results['summary']['total_warnings_found'] += result['warnings_found']
                validation_results['summary']['total_fixed'] += result['fixed']

                self.stdout.write(
                    f'  Проверено: {result["instances_checked"]}, '
                    f'Ошибок: {result["errors_found"]}, '
                    f'Предупреждений: {result["warnings_found"]}, '
                    f'Исправлено: {result["fixed"]}'
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Ошибка при валидации {model_key}: {str(e)}')
                )
                validation_results['details'][model_key] = {
                    'error': str(e),
                    'instances_checked': 0,
                    'errors_found': 0,
                    'warnings_found': 0,
                    'fixed': 0,
                }

        # Итоговый отчет
        summary = validation_results['summary']
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Валидация завершена!\n'
                f'Проверено моделей: {summary["total_models_checked"]}\n'
                f'Проверено записей: {summary["total_instances_checked"]}\n'
                f'Найдено ошибок: {summary["total_errors_found"]}\n'
                f'Найдено предупреждений: {summary["total_warnings_found"]}\n'
                f'Исправлено: {summary["total_fixed"]}'
            )
        )

        if export_file:
            import json
            with open(export_file, 'w', encoding='utf-8') as f:
                json.dump(validation_results, f, indent=4, ensure_ascii=False, default=str)
            self.stdout.write(
                self.style.SUCCESS(f'Результаты экспортированы в {export_file}')
            )

    def validate_users(self, fix_data, detailed):
        """Валидация пользователей."""
        users = User.objects.all()
        errors = []
        warnings = []
        fixed = 0

        for user in users:
            # Проверка обязательных полей
            if not user.email:
                errors.append({
                    'id': str(user.id),
                    'field': 'email',
                    'error': 'Email обязателен',
                })

            # Проверка формата email
            if user.email and '@' not in user.email:
                errors.append({
                    'id': str(user.id),
                    'field': 'email',
                    'error': f'Некорректный формат email: {user.email}',
                })

            # Проверка активности
            if not user.is_active and user.is_staff:
                warnings.append({
                    'id': str(user.id),
                    'field': 'is_active',
                    'warning': 'Staff пользователь неактивен',
                })

        return {
            'instances_checked': users.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_pets(self, fix_data, detailed):
        """Валидация питомцев."""
        pets = Pet.objects.select_related('owner').all()
        errors = []
        warnings = []
        fixed = 0

        for pet in pets:
            # Проверка владельца
            if not pet.owner:
                errors.append({
                    'id': str(pet.id),
                    'field': 'owner',
                    'error': 'Питомец без владельца',
                })

            # Проверка JSON полей
            json_fields = {
                'favorite_foods': validate_string_list,
                'allergies': validate_string_list,
                'health_issues': validate_string_list,
                'special_needs': validate_string_list,
                'preferred_activities': validate_string_list,
                'behavioral_problems': validate_string_list,
                'excluded_ingredients': validate_string_list,
                'character_traits': validate_string_list,
            }

            for field_name, validator in json_fields.items():
                try:
                    value = getattr(pet, field_name)
                    validator(value)
                except DjangoValidationError as e:
                    errors.append({
                        'id': str(pet.id),
                        'field': field_name,
                        'error': str(e),
                    })
                    if fix_data:
                        setattr(pet, field_name, [])
                        fixed += 1

            # Проверка даты рождения
            if pet.date_of_birth and pet.date_of_birth > pet.created_at.date():
                warnings.append({
                    'id': str(pet.id),
                    'field': 'date_of_birth',
                    'warning': 'Дата рождения позже даты создания',
                })

        if fix_data and fixed > 0:
            with transaction.atomic():
                for pet in pets:
                    pet.save()

        return {
            'instances_checked': pets.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_products(self, fix_data, detailed):
        """Валидация товаров."""
        products = Product.objects.all()
        errors = []
        warnings = []
        fixed = 0

        for product in products:
            # Проверка обязательных полей
            if not product.name:
                errors.append({
                    'id': str(product.id),
                    'field': 'name',
                    'error': 'Название товара обязательно',
                })

            if product.price < 0:
                errors.append({
                    'id': str(product.id),
                    'field': 'price',
                    'error': f'Цена не может быть отрицательной: {product.price}',
                })

            # Проверка JSON полей
            try:
                validate_url_list(product.images)
            except DjangoValidationError as e:
                errors.append({
                    'id': str(product.id),
                    'field': 'images',
                    'error': str(e),
                })
                if fix_data:
                    product.images = []
                    fixed += 1

            try:
                validate_product_params(product.params)
            except DjangoValidationError as e:
                errors.append({
                    'id': str(product.id),
                    'field': 'params',
                    'error': str(e),
                })
                if fix_data:
                    product.params = {}
                    fixed += 1

        if fix_data and fixed > 0:
            with transaction.atomic():
                for product in products:
                    product.save()

        return {
            'instances_checked': products.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_courses(self, fix_data, detailed):
        """Валидация курсов."""
        courses = Course.objects.all()
        errors = []
        warnings = []
        fixed = 0

        for course in courses:
            # Проверка обязательных полей
            if not course.title:
                errors.append({
                    'id': str(course.id),
                    'field': 'title',
                    'error': 'Название курса обязательно',
                })

            if course.price < 0:
                errors.append({
                    'id': str(course.id),
                    'field': 'price',
                    'error': f'Цена не может быть отрицательной: {course.price}',
                })

            # Проверка JSON полей
            json_validators = {
                'recommended_behavior_types': validate_behavior_types,
                'recommended_activity_levels': validate_activity_levels,
                'recommended_social_levels': validate_social_levels,
                'compatible_health_issues': validate_string_list,
                'addresses_special_needs': validate_string_list,
                'suitable_activities': validate_string_list,
                'addresses_behavioral_problems': validate_string_list,
                'additional_images': validate_url_list,
            }

            for field_name, validator in json_validators.items():
                try:
                    value = getattr(course, field_name)
                    validator(value)
                except DjangoValidationError as e:
                    errors.append({
                        'id': str(course.id),
                        'field': field_name,
                        'error': str(e),
                    })
                    if fix_data:
                        setattr(course, field_name, [] if 'images' in field_name else [])
                        fixed += 1

        if fix_data and fixed > 0:
            with transaction.atomic():
                for course in courses:
                    course.save()

        return {
            'instances_checked': courses.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_lessons(self, fix_data, detailed):
        """Валидация уроков."""
        lessons = Lesson.objects.select_related('course').all()
        errors = []
        warnings = []
        fixed = 0

        for lesson in lessons:
            if not lesson.course:
                errors.append({
                    'id': str(lesson.id),
                    'field': 'course',
                    'error': 'Урок без курса',
                })

            try:
                validate_lesson_content(lesson.content)
            except DjangoValidationError as e:
                errors.append({
                    'id': str(lesson.id),
                    'field': 'content',
                    'error': str(e),
                })
                if fix_data:
                    lesson.content = {}
                    fixed += 1

        if fix_data and fixed > 0:
            with transaction.atomic():
                for lesson in lessons:
                    lesson.save()

        return {
            'instances_checked': lessons.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_course_pages(self, fix_data, detailed):
        """Валидация страниц курсов."""
        pages = CoursePage.objects.all()
        errors = []
        warnings = []
        fixed = 0

        for page in pages:
            if not page.course_id:
                errors.append({
                    'id': str(page.id),
                    'field': 'course_id',
                    'error': 'Страница без курса',
                })

        return {
            'instances_checked': pages.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_content_blocks(self, fix_data, detailed):
        """Валидация блоков контента."""
        blocks = ContentBlock.objects.select_related('page').all()
        errors = []
        warnings = []
        fixed = 0

        for block in blocks:
            if not block.page:
                errors.append({
                    'id': str(block.id),
                    'field': 'page',
                    'error': 'Блок без страницы',
                })

            try:
                validate_content_block_content(block.content)
            except DjangoValidationError as e:
                errors.append({
                    'id': str(block.id),
                    'field': 'content',
                    'error': str(e),
                })

            try:
                validate_content_block_settings(block.settings)
            except DjangoValidationError as e:
                errors.append({
                    'id': str(block.id),
                    'field': 'settings',
                    'error': str(e),
                })

        return {
            'instances_checked': blocks.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_orders(self, fix_data, detailed):
        """Валидация заказов."""
        orders = Order.objects.select_related('user').all()
        errors = []
        warnings = []
        fixed = 0

        for order in orders:
            if not order.user:
                errors.append({
                    'id': str(order.id),
                    'field': 'user',
                    'error': 'Заказ без пользователя',
                })

            if order.total_amount < 0:
                errors.append({
                    'id': str(order.id),
                    'field': 'total_amount',
                    'error': f'Сумма заказа не может быть отрицательной: {order.total_amount}',
                })

            # Проверка соответствия сумм
            calculated_total = order.subtotal_amount + order.delivery_cost
            if abs(order.total_amount - calculated_total) > 0.01:
                warnings.append({
                    'id': str(order.id),
                    'field': 'total_amount',
                    'warning': f'Несоответствие суммы: ожидается {calculated_total}, фактически {order.total_amount}',
                })

        return {
            'instances_checked': orders.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_order_items(self, fix_data, detailed):
        """Валидация элементов заказа."""
        items = OrderItem.objects.select_related('order', 'product', 'course').all()
        errors = []
        warnings = []
        fixed = 0

        for item in items:
            if not item.order:
                errors.append({
                    'id': str(item.id),
                    'field': 'order',
                    'error': 'Элемент заказа без заказа',
                })

            if not item.product and not item.course:
                errors.append({
                    'id': str(item.id),
                    'field': 'product/course',
                    'error': 'Элемент заказа без товара и без курса',
                })

            if item.quantity <= 0:
                errors.append({
                    'id': str(item.id),
                    'field': 'quantity',
                    'error': f'Количество должно быть положительным: {item.quantity}',
                })

        return {
            'instances_checked': items.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_cart_items(self, fix_data, detailed):
        """Валидация элементов корзины."""
        items = CartItem.objects.select_related('cart', 'product', 'course').all()
        errors = []
        warnings = []
        fixed = 0

        for item in items:
            if not item.cart:
                errors.append({
                    'id': str(item.id),
                    'field': 'cart',
                    'error': 'Элемент корзины без корзины',
                })

            if not item.product and not item.course:
                errors.append({
                    'id': str(item.id),
                    'field': 'product/course',
                    'error': 'Элемент корзины без товара и без курса',
                })

        return {
            'instances_checked': items.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_user_courses(self, fix_data, detailed):
        """Валидация записей пользователей на курсы."""
        user_courses = UserCourse.objects.select_related('user', 'course', 'pet').all()
        errors = []
        warnings = []
        fixed = 0

        for uc in user_courses:
            if not uc.user:
                errors.append({
                    'id': str(uc.id),
                    'field': 'user',
                    'error': 'Запись на курс без пользователя',
                })

            if not uc.course:
                errors.append({
                    'id': str(uc.id),
                    'field': 'course',
                    'error': 'Запись на курс без курса',
                })

            if uc.progress < 0 or uc.progress > 100:
                errors.append({
                    'id': str(uc.id),
                    'field': 'progress',
                    'error': f'Прогресс должен быть от 0 до 100: {uc.progress}',
                })

        return {
            'instances_checked': user_courses.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

    def validate_reviews(self, fix_data, detailed):
        """Валидация отзывов."""
        reviews = Review.objects.select_related('user', 'product', 'course').all()
        errors = []
        warnings = []
        fixed = 0

        for review in reviews:
            if not review.user:
                errors.append({
                    'id': str(review.id),
                    'field': 'user',
                    'error': 'Отзыв без пользователя',
                })

            if not review.product and not review.course:
                errors.append({
                    'id': str(review.id),
                    'field': 'product/course',
                    'error': 'Отзыв без товара и без курса',
                })

            if review.rating < 1 or review.rating > 5:
                errors.append({
                    'id': str(review.id),
                    'field': 'rating',
                    'error': f'Рейтинг должен быть от 1 до 5: {review.rating}',
                })

        return {
            'instances_checked': reviews.count(),
            'errors_found': len(errors),
            'warnings_found': len(warnings),
            'fixed': fixed,
            'errors': errors[:10] if not detailed else errors,
            'warnings': warnings[:10] if not detailed else warnings,
        }

