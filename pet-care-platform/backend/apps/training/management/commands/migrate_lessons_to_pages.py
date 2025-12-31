"""
Миграция существующих уроков в новую структуру страниц и блоков.

Этот скрипт переносит данные из модели Lesson (с JSON content)
в новую архитектуру CoursePage + ContentBlock.
"""

import json
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.training.models import Course, Lesson, CoursePage, ContentBlock


class Command(BaseCommand):
    help = 'Миграция уроков в новую структуру страниц и блоков'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать, что будет сделано, без выполнения миграции',
        )
        parser.add_argument(
            '--course-id',
            type=int,
            help='Мигрировать только указанный курс',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Принудительно перезаписать существующие страницы',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        course_id = options.get('course_id')
        force = options['force']

        self.stdout.write(
            self.style.WARNING('Начинаем миграцию уроков в страницы...')
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING('Режим предварительного просмотра (dry-run)')
            )

        # Получаем курсы для миграции
        if course_id:
            try:
                courses = [Course.objects.get(id=course_id)]
            except Course.DoesNotExist:
                raise CommandError(f'Курс с ID {course_id} не найден')
        else:
            courses = Course.objects.all()

        total_courses = len(courses)
        migrated_courses = 0
        total_pages_created = 0
        total_blocks_created = 0

        for course in courses:
            try:
                with transaction.atomic():
                    pages_created, blocks_created = self.migrate_course(
                        course, dry_run, force
                    )

                    if not dry_run:
                        migrated_courses += 1
                        total_pages_created += pages_created
                        total_blocks_created += blocks_created

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Курс "{course.title}" успешно мигрирован: '
                                f'{pages_created} страниц, {blocks_created} блоков'
                            )
                        )
                    else:
                        self.stdout.write(
                            f'Предварительный просмотр: Курс "{course.title}" -> '
                            f'{pages_created} страниц, {blocks_created} блоков'
                        )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Ошибка миграции курса "{course.title}": {str(e)}'
                    )
                )
                if not dry_run:
                    raise CommandError(f'Миграция курса {course.id} завершилась с ошибкой')

        # Итоговый отчет
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nПредварительный просмотр завершен для {total_courses} курсов'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nМиграция завершена успешно!\n'
                    f'Мигрировано курсов: {migrated_courses}\n'
                    f'Создано страниц: {total_pages_created}\n'
                    f'Создано блоков: {total_blocks_created}'
                )
            )

    def migrate_course(self, course, dry_run=False, force=False):
        """
        Миграция одного курса
        """
        lessons = course.lessons.all().order_by('order')
        pages_created = 0
        blocks_created = 0

        # Проверяем, есть ли уже страницы для этого курса
        existing_pages = CoursePage.objects.filter(course=course)
        if existing_pages.exists() and not force:
            raise CommandError(
                f'Курс "{course.title}" уже имеет страницы. '
                'Используйте --force для перезаписи.'
            )

        # Удаляем существующие страницы при force=True
        if existing_pages.exists() and force and not dry_run:
            existing_pages.delete()

        for lesson in lessons:
            # Создаем страницу для урока
            page_data = self.convert_lesson_to_page(lesson)

            if not dry_run:
                page = CoursePage.objects.create(**page_data)
                pages_created += 1

                # Создаем блоки контента
                blocks_data = self.convert_lesson_content_to_blocks(lesson, page)
                for block_data in blocks_data:
                    ContentBlock.objects.create(**block_data)
                    blocks_created += 1
            else:
                pages_created += 1
                blocks_created += len(self.convert_lesson_content_to_blocks(lesson, None))

        return pages_created, blocks_created

    def convert_lesson_to_page(self, lesson):
        """
        Преобразование урока в страницу курса
        """
        # Определяем тип страницы на основе типа контента урока
        page_type_map = {
            'text': 'text',
            'video': 'video',
            'interactive': 'interactive',
            'quiz': 'quiz',
            'webinar': 'webinar',
            'assignment': 'assignment',
        }

        page_type = page_type_map.get(lesson.content_type, 'text')

        # Настройки страницы
        settings = {
            'required_completion': lesson.is_required,
            'allow_skipping': False,
            'timer_enabled': False,
        }

        # Пытаемся извлечь дополнительные настройки из JSON контента
        if lesson.content and isinstance(lesson.content, dict):
            if 'duration' in lesson.content:
                settings['duration'] = lesson.content['duration']
            if 'timer' in lesson.content:
                settings['timer_enabled'] = lesson.content['timer']
            if 'allow_skip' in lesson.content:
                settings['allow_skipping'] = lesson.content['allow_skip']

        return {
            'course': lesson.course,
            'title': lesson.title,
            'order_number': lesson.order,
            'page_type': page_type,
            'settings': settings,
        }

    def convert_lesson_content_to_blocks(self, lesson, page):
        """
        Преобразование контента урока в блоки контента
        """
        blocks = []

        if not lesson.content:
            # Пустой урок - создаем пустой текстовый блок
            blocks.append({
                'page': page,
                'block_type': 'rich_text',
                'content': {'html': '<p>Контент урока находится в разработке.</p>'},
                'settings': {},
                'order': 1,
            })
            return blocks

        # Разбираем JSON контент урока
        content = lesson.content if isinstance(lesson.content, dict) else {}

        # Основной контент - текстовый блок
        if 'text' in content or 'description' in content:
            text_content = content.get('text') or content.get('description', '')
            if text_content:
                blocks.append({
                    'page': page,
                    'block_type': 'rich_text',
                    'content': {'html': f'<p>{text_content}</p>'},
                    'settings': {},
                    'order': len(blocks) + 1,
                })

        # Видео контент
        if 'video_url' in content or lesson.content_type == 'video':
            video_url = content.get('video_url')
            if video_url:
                blocks.append({
                    'page': page,
                    'block_type': 'video_player',
                    'content': {
                        'video_url': video_url,
                        'title': content.get('video_title', ''),
                        'duration': content.get('duration', 0),
                        'thumbnail': content.get('thumbnail', ''),
                    },
                    'settings': {
                        'autoplay': content.get('autoplay', False),
                        'controls': True,
                        'show_subtitles': content.get('subtitles', False),
                    },
                    'order': len(blocks) + 1,
                })

        # Изображения
        if 'images' in content:
            images = content['images']
            if isinstance(images, list) and images:
                if len(images) == 1:
                    # Одно изображение
                    blocks.append({
                        'page': page,
                        'block_type': 'image',
                        'content': {
                            'url': images[0].get('url', ''),
                            'alt': images[0].get('alt', ''),
                            'caption': images[0].get('caption', ''),
                        },
                        'settings': {},
                        'order': len(blocks) + 1,
                    })
                else:
                    # Галерея изображений
                    blocks.append({
                        'page': page,
                        'block_type': 'gallery',
                        'content': {
                            'images': images,
                        },
                        'settings': {
                            'layout': 'grid',
                            'columns': min(len(images), 3),
                        },
                        'order': len(blocks) + 1,
                    })

        # Тесты
        if 'quiz' in content or lesson.content_type == 'quiz':
            quiz_data = content.get('quiz', content)
            if quiz_data and 'questions' in quiz_data:
                blocks.append({
                    'page': page,
                    'block_type': 'quiz',
                    'content': quiz_data,
                    'settings': {
                        'show_results': True,
                        'allow_retry': True,
                        'time_limit': quiz_data.get('time_limit'),
                    },
                    'order': len(blocks) + 1,
                })

        # Файлы для скачивания
        if 'files' in content:
            files = content['files']
            if isinstance(files, list):
                for file_info in files:
                    blocks.append({
                        'page': page,
                        'block_type': 'file_download',
                        'content': {
                            'url': file_info.get('url', ''),
                            'filename': file_info.get('name', ''),
                            'description': file_info.get('description', ''),
                        },
                        'settings': {},
                        'order': len(blocks) + 1,
                    })

        # Действия с питомцем
        if 'pet_action' in content or lesson.content_type == 'interactive':
            action_data = content.get('pet_action', content)
            if action_data:
                blocks.append({
                    'page': page,
                    'block_type': 'pet_action',
                    'content': action_data,
                    'settings': {
                        'show_timer': action_data.get('timer', False),
                        'required_completion': True,
                    },
                    'order': len(blocks) + 1,
                })

        # Если не распознали контент, создаем простой текстовый блок
        if not blocks:
            blocks.append({
                'page': page,
                'block_type': 'rich_text',
                'content': {'html': f'<pre>{json.dumps(content, indent=2, ensure_ascii=False)}</pre>'},
                'settings': {},
                'order': 1,
            })

        return blocks

