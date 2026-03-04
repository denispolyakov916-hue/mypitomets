"""
Команда для обновления формата контента уроков курса "Чек-лист: готов ли ты завести первую собаку"

Использование:
    python manage.py update_checklist_course_content
"""

from django.core.management.base import BaseCommand
from apps.training.models import Course, Lesson
import re


class Command(BaseCommand):
    help = 'Обновление формата контента уроков курса "Чек-лист: готов ли ты завести первую собаку"'

    def markdown_to_html(self, markdown_text):
        """Преобразует markdown в HTML"""
        html = markdown_text
        
        # Заголовки
        html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        
        # Жирный текст
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
        
        # Списки
        html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
        html = re.sub(r'(\n<li>.*</li>\n)+', lambda m: '<ul>' + m.group(0) + '</ul>', html)
        
        # Чек-листы
        html = re.sub(r'- \[ \] (.+)$', r'<li class="checklist-item"><input type="checkbox" disabled> \1</li>', html, flags=re.MULTILINE)
        html = re.sub(r'- \[x\] (.+)$', r'<li class="checklist-item"><input type="checkbox" checked disabled> \1</li>', html, flags=re.MULTILINE)
        
        # Параграфы
        lines = html.split('\n')
        result = []
        current_para = []
        
        for line in lines:
            line = line.strip()
            if not line:
                if current_para:
                    result.append('<p>' + ' '.join(current_para) + '</p>')
                    current_para = []
                result.append('')
            elif line.startswith('<'):
                if current_para:
                    result.append('<p>' + ' '.join(current_para) + '</p>')
                    current_para = []
                result.append(line)
            else:
                current_para.append(line)
        
        if current_para:
            result.append('<p>' + ' '.join(current_para) + '</p>')
        
        html = '\n'.join(result)
        
        # Очистка пустых параграфов
        html = re.sub(r'<p>\s*</p>', '', html)
        
        return html

    def add_images_to_html(self, html_content, images):
        """Добавляет изображения в HTML контент"""
        if not images:
            return html_content
        
        images_html = '<div class="lesson-images" style="margin: 20px 0;">'
        for img_url in images:
            images_html += f'<img src="{img_url}" alt="Изображение" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px;" />'
        images_html += '</div>'
        
        # Вставляем изображения после первого параграфа или заголовка
        if '<h1>' in html_content:
            html_content = html_content.replace('</h1>', '</h1>' + images_html, 1)
        elif '<h2>' in html_content:
            html_content = html_content.replace('</h2>', '</h2>' + images_html, 1)
        else:
            html_content = images_html + html_content
        
        return html_content

    def handle(self, *args, **options):
        self.stdout.write('Обновление формата контента уроков...')

        # Находим курс
        course = Course.objects.filter(title__icontains='Чек-лист: готов ли ты завести первую собаку').first()
        if not course:
            self.stdout.write(self.style.ERROR('Курс не найден!'))
            return

        self.stdout.write(f'Найден курс: {course.title} (ID: {course.id})')

        # Обновляем уроки
        lessons = course.lessons.all().order_by('order')
        updated_count = 0

        for lesson in lessons:
            content = lesson.content or {}
            
            # Проверяем, нужно ли обновление
            if 'text_content' in content and ('text' not in content or 'html_content' not in content):
                self.stdout.write(f'Обновление урока: {lesson.title}')
                
                # Получаем текстовый контент
                text_content = content.get('text_content', '')
                images = content.get('images', [])
                
                # Преобразуем markdown в HTML
                html_content = self.markdown_to_html(text_content)
                
                # Добавляем изображения
                if images:
                    html_content = self.add_images_to_html(html_content, images)
                
                # Обновляем контент
                content['text'] = text_content
                content['html_content'] = html_content
                
                # Сохраняем
                lesson.content = content
                lesson.save()
                updated_count += 1
                self.stdout.write(f'  ✓ Обновлен урок: {lesson.title}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('ОБНОВЛЕНИЕ ЗАВЕРШЕНО!'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS(f'Обновлено уроков: {updated_count}'))
        self.stdout.write('')
