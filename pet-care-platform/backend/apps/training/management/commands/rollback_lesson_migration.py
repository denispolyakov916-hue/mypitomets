"""
Management команда для отката миграции Lesson → CoursePage.

Удаляет созданные CoursePage и ContentBlock для указанных курсов.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.training.models import Course, CoursePage, ContentBlock


class Command(BaseCommand):
    help = 'Откат миграции Lesson → CoursePage (удаление созданных страниц)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--course-id',
            type=int,
            help='Откатить миграцию только для указанного курса',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Откатить миграцию для всех курсов',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать, что будет удалено, без выполнения',
        )

    def handle(self, *args, **options):
        course_id = options.get('course_id')
        rollback_all = options.get('all', False)
        dry_run = options['dry_run']

        if not course_id and not rollback_all:
            raise CommandError(
                'Укажите --course-id ID или --all для отката всех курсов'
            )

        if dry_run:
            self.stdout.write(
                self.style.WARNING('Режим предварительного просмотра (dry-run)')
            )

        # Получаем курсы для отката
        if course_id:
            try:
                courses = [Course.objects.get(id=course_id)]
            except Course.DoesNotExist:
                raise CommandError(f'Курс с ID {course_id} не найден')
        else:
            courses = Course.objects.all()

        total_pages_deleted = 0
        total_blocks_deleted = 0

        for course in courses:
            try:
                with transaction.atomic():
                    # Получаем все страницы курса
                    pages = CoursePage.objects.filter(course_id=course.id)
                    pages_count = pages.count()
                    
                    if pages_count == 0:
                        self.stdout.write(
                            f'Курс "{course.title}" не имеет страниц для отката'
                        )
                        continue

                    # Подсчитываем блоки
                    blocks_count = ContentBlock.objects.filter(
                        page__course_id=course.id
                    ).count()

                    if dry_run:
                        self.stdout.write(
                            f'Курс "{course.title}": '
                            f'будет удалено {pages_count} страниц и {blocks_count} блоков'
                        )
                    else:
                        # Удаляем блоки
                        ContentBlock.objects.filter(
                            page__course_id=course.id
                        ).delete()
                        total_blocks_deleted += blocks_count

                        # Удаляем страницы
                        pages.delete()
                        total_pages_deleted += pages_count

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Курс "{course.title}": '
                                f'удалено {pages_count} страниц и {blocks_count} блоков'
                            )
                        )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Ошибка при откате курса "{course.title}": {str(e)}'
                    )
                )
                if not dry_run:
                    raise CommandError(f'Откат курса {course.id} завершился с ошибкой')

        # Итоговый отчет
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nПредварительный просмотр завершен'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Откат миграции завершен!\n'
                    f'Удалено страниц: {total_pages_deleted}\n'
                    f'Удалено блоков: {total_blocks_deleted}'
                )
            )

