"""
Management команда для анализа текущего состояния архитектуры курсов.

Проверяет сколько курсов используют Lesson и сколько используют CoursePage.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
import json

from apps.training.models import Course, Lesson, CoursePage


class Command(BaseCommand):
    help = 'Анализ текущего состояния архитектуры курсов'

    def add_arguments(self, parser):
        parser.add_argument(
            '--export',
            type=str,
            help='Экспортировать результаты в JSON файл',
        )

    def handle(self, *args, **options):
        export_file = options.get('export')

        results = {
            'summary': {},
            'details': {}
        }

        # Общая статистика
        total_courses = Course.objects.count()
        courses_with_lessons = Course.objects.filter(lessons__isnull=False).distinct().count()
        courses_with_pages = CoursePage.objects.values('course_id').distinct().count()
        courses_with_both = Course.objects.filter(
            lessons__isnull=False
        ).filter(
            id__in=CoursePage.objects.values_list('course_id', flat=True).distinct()
        ).distinct().count()
        courses_with_neither = Course.objects.filter(
            lessons__isnull=True
        ).exclude(
            id__in=CoursePage.objects.values_list('course_id', flat=True).distinct()
        ).count()

        results['summary'] = {
            'total_courses': total_courses,
            'courses_with_lessons': courses_with_lessons,
            'courses_with_pages': courses_with_pages,
            'courses_with_both': courses_with_both,
            'courses_with_neither': courses_with_neither,
            'lessons_total': Lesson.objects.count(),
            'pages_total': CoursePage.objects.count(),
        }

        # Детальная информация по курсам
        courses_details = []
        for course in Course.objects.all():
            lessons_count = course.lessons.count()
            pages_count = CoursePage.objects.filter(course_id=course.id).count()
            
            courses_details.append({
                'id': course.id,
                'title': course.title,
                'lessons_count': lessons_count,
                'pages_count': pages_count,
                'has_lessons': lessons_count > 0,
                'has_pages': pages_count > 0,
                'needs_migration': lessons_count > 0 and pages_count == 0,
                'already_migrated': pages_count > 0,
            })

        results['details']['courses'] = courses_details

        # Статистика по урокам
        lessons_by_type = Lesson.objects.values('content_type').annotate(
            count=Count('id')
        ).order_by('-count')

        results['details']['lessons_by_type'] = list(lessons_by_type)

        # Статистика по страницам
        pages_by_type = CoursePage.objects.values('page_type').annotate(
            count=Count('id')
        ).order_by('-count')

        results['details']['pages_by_type'] = list(pages_by_type)

        # Вывод результатов
        self.print_summary(results['summary'], results['details'])

        # Экспорт результатов
        if export_file:
            with open(export_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2, default=str)
            self.stdout.write(self.style.SUCCESS(f'\nРезультаты экспортированы в {export_file}'))

    def print_summary(self, summary, details):
        """Вывод сводки результатов."""
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('АНАЛИЗ АРХИТЕКТУРЫ КУРСОВ'))
        self.stdout.write('=' * 60)

        self.stdout.write(f'\n📊 Общая статистика:')
        self.stdout.write(f'  Всего курсов: {summary["total_courses"]}')
        self.stdout.write(f'  Курсов с уроками (Lesson): {summary["courses_with_lessons"]}')
        self.stdout.write(f'  Курсов со страницами (CoursePage): {summary["courses_with_pages"]}')
        self.stdout.write(f'  Курсов с обеими архитектурами: {summary["courses_with_both"]}')
        self.stdout.write(f'  Курсов без уроков и страниц: {summary["courses_with_neither"]}')
        self.stdout.write(f'  Всего уроков: {summary["lessons_total"]}')
        self.stdout.write(f'  Всего страниц: {summary["pages_total"]}')

        # Курсы, требующие миграции
        courses_needing_migration = [
            c for c in details['courses']
            if c['needs_migration']
        ]

        self.stdout.write(f'\n🔄 Курсы, требующие миграции: {len(courses_needing_migration)}')
        if courses_needing_migration:
            for course in courses_needing_migration[:10]:  # Показываем первые 10
                self.stdout.write(
                    f'  - Курс {course["id"]}: "{course["title"]}" '
                    f'({course["lessons_count"]} уроков)'
                )
            if len(courses_needing_migration) > 10:
                self.stdout.write(
                    f'  ... и еще {len(courses_needing_migration) - 10} курсов'
                )

        # Курсы, уже мигрированные
        courses_migrated = [
            c for c in details['courses']
            if c['already_migrated']
        ]

        self.stdout.write(f'\n✅ Курсы, уже мигрированные: {len(courses_migrated)}')
        if courses_migrated:
            for course in courses_migrated[:10]:  # Показываем первые 10
                self.stdout.write(
                    f'  - Курс {course["id"]}: "{course["title"]}" '
                    f'({course["pages_count"]} страниц)'
                )
            if len(courses_migrated) > 10:
                self.stdout.write(
                    f'  ... и еще {len(courses_migrated) - 10} курсов'
                )

        # Статистика по типам уроков
        if details['lessons_by_type']:
            self.stdout.write(f'\n📚 Уроки по типам:')
            for item in details['lessons_by_type']:
                self.stdout.write(
                    f'  - {item["content_type"]}: {item["count"]} уроков'
                )

        # Статистика по типам страниц
        if details['pages_by_type']:
            self.stdout.write(f'\n📄 Страницы по типам:')
            for item in details['pages_by_type']:
                self.stdout.write(
                    f'  - {item["page_type"] or "не указан"}: {item["count"]} страниц'
                )

        self.stdout.write('\n' + '=' * 60)

