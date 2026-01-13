"""
Django management command для создания backup базы данных.
"""

import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Создает backup базы данных PostgreSQL'

    def handle(self, *args, **options):
        # Получаем параметры базы данных из settings
        db_settings = settings.DATABASES['default']
        db_name = db_settings['NAME']
        db_user = db_settings['USER']
        db_host = db_settings['HOST']
        db_port = db_settings['PORT']

        # Создаем имя файла backup с timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_{timestamp}.sql'
        backup_path = os.path.join(settings.BASE_DIR, backup_filename)

        self.stdout.write(f'Создание backup базы данных в файл: {backup_filename}')

        try:
            # Выполняем pg_dump
            cmd = [
                'pg_dump',
                '-U', db_user,
                '-h', db_host,
                '-p', str(db_port),
                '-d', db_name,
                '-f', backup_path,
                '--no-password'
            ]

            # Устанавливаем переменную окружения для пароля
            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings['PASSWORD']

            result = subprocess.run(cmd, env=env, capture_output=True, text=True)

            if result.returncode == 0:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Backup успешно создан: {backup_filename}')
                )
                # Выводим размер файла
                file_size = os.path.getsize(backup_path)
                self.stdout.write(f'Размер файла: {file_size} байт')
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Ошибка при создании backup: {result.stderr}')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Исключение при создании backup: {str(e)}')
            )