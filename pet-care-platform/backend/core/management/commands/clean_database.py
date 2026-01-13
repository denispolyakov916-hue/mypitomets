"""
Django management command для полной очистки базы данных от всех пользователей и связанных данных.

Удаляет в правильном порядке:
1. Комментарии и лайки
2. Отзывы
3. Платежи
4. Элементы заказов и корзины
5. Заказы
6. Записи на курсы и прогресс
7. События календаря и напоминания
8. Питомцы
9. Токены пользователей
10. Пользователи

Команда безопасна благодаря транзакциям - при ошибке все изменения откатываются.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.apps import apps


class Command(BaseCommand):
    help = 'Полная очистка базы данных от всех пользователей и связанных данных'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать, что будет удалено, без фактического удаления',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Подтвердить удаление без дополнительных вопросов',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        # Порядок удаления (от зависимых к независимым)
        models_to_clean = [
            ('apps.reviews.models', 'CommentLike'),
            ('apps.training.models', 'Comment'),
            ('apps.reviews.models', 'Review'),
            ('apps.payments.models', 'Payment'),
            ('apps.shop.models', 'OrderItem'),
            ('apps.shop.models', 'CartItem'),
            ('apps.shop.models', 'Cart'),
            ('apps.shop.models', 'Order'),
            ('apps.training.models', 'UserLessonProgress'),
            ('apps.training.models', 'UserCourseProgress'),
            ('apps.training.models', 'UserCourse'),
            ('apps.pets.models', 'EventReminder'),
            ('apps.pets.models', 'CalendarEvent'),
            ('apps.pets.models', 'Pet'),
            ('apps.users.models', 'Token'),
            ('apps.users.models', 'User'),
        ]

        self.stdout.write(self.style.WARNING('🔍 Анализ данных для удаления...'))

        total_to_delete = 0
        models_info = []

        for app_label, model_name in models_to_clean:
            try:
                model = apps.get_model(app_label, model_name)
                count = model.objects.count()
                if count > 0:
                    models_info.append((model_name, count))
                    total_to_delete += count
            except LookupError:
                self.stdout.write(
                    self.style.WARNING(f'Модель {app_label}.{model_name} не найдена, пропускаем')
                )

        if not models_info:
            self.stdout.write(self.style.SUCCESS('✅ База данных уже пуста!'))
            return

        self.stdout.write(f'\n📊 Будет удалено записей: {total_to_delete}')
        self.stdout.write('По моделям:')
        for model_name, count in models_info:
            self.stdout.write(f'  - {model_name}: {count} записей')

        if dry_run:
            self.stdout.write(self.style.SUCCESS('\n🏃 Dry run завершен. Ничего не удалено.'))
            return

        if not force:
            self.stdout.write(self.style.WARNING('\n⚠️  ВНИМАНИЕ: Это действие нельзя отменить!'))
            response = input('Введите "YES" для подтверждения удаления: ')
            if response != 'YES':
                self.stdout.write(self.style.ERROR('❌ Удаление отменено.'))
                return

        self.stdout.write(self.style.WARNING('\n🗑️  Начинаем удаление данных...'))

        try:
            with transaction.atomic():
                deleted_counts = {}

                for app_label, model_name in models_to_clean:
                    try:
                        model = apps.get_model(app_label, model_name)
                        count = model.objects.count()
                        if count > 0:
                            deleted_count = model.objects.all().delete()[0]
                            deleted_counts[model_name] = deleted_count
                            self.stdout.write(f'  ✓ {model_name}: удалено {deleted_count} записей')
                    except LookupError:
                        pass  # Модель уже обработана выше

                total_deleted = sum(deleted_counts.values())
                self.stdout.write(
                    self.style.SUCCESS(f'\n✅ Удаление завершено успешно!')
                )
                self.stdout.write(f'Всего удалено: {total_deleted} записей')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\n❌ Ошибка при удалении: {str(e)}')
            )
            self.stdout.write('Все изменения были отменены (rollback).')
            raise

        # Финальная проверка
        self.stdout.write('\n🔍 Проверка результатов...')
        remaining_users = apps.get_model('apps.users.models', 'User').objects.count()
        remaining_pets = apps.get_model('apps.pets.models', 'Pet').objects.count()
        remaining_orders = apps.get_model('apps.shop.models', 'Order').objects.count()

        if remaining_users == 0 and remaining_pets == 0 and remaining_orders == 0:
            self.stdout.write(self.style.SUCCESS('✅ База данных успешно очищена!'))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  Предупреждение: остались записи - '
                    f'Пользователи: {remaining_users}, '
                    f'Питомцы: {remaining_pets}, '
                    f'Заказы: {remaining_orders}'
                )
            )