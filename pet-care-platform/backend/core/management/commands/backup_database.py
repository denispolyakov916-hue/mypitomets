"""
Management команда для создания резервных копий базы данных.

Поддерживает PostgreSQL и создание дампов через pg_dump.
"""

import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings


class Command(BaseCommand):
    help = 'Создание резервной копии базы данных'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='backups',
            help='Директория для сохранения резервных копий (по умолчанию: backups)',
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['sql', 'json'],
            default='sql',
            help='Формат резервной копии: sql (pg_dump) или json (dumpdata)',
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Сжать резервную копию (только для SQL)',
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        format_type = options['format']
        compress = options['compress']

        # Создаем директорию для бэкапов
        os.makedirs(output_dir, exist_ok=True)

        # Генерируем имя файла с timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format_type == 'sql':
            filename = f'backup_{timestamp}.sql'
            if compress:
                filename += '.gz'
            filepath = os.path.join(output_dir, filename)
            self.create_sql_backup(filepath, compress)
        else:
            filename = f'backup_{timestamp}.json'
            filepath = os.path.join(output_dir, filename)
            self.create_json_backup(filepath)

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Резервная копия создана: {filepath}'
            )
        )

    def create_sql_backup(self, filepath, compress=False):
        """Создание SQL резервной копии через pg_dump."""
        db_config = settings.DATABASES['default']
        
        # Проверяем что используется PostgreSQL
        if db_config['ENGINE'] != 'django.db.backends.postgresql':
            raise CommandError(
                'SQL резервные копии поддерживаются только для PostgreSQL. '
                'Используйте --format json для других БД.'
            )

        db_name = db_config['NAME']
        db_user = db_config.get('USER', 'postgres')
        db_host = db_config.get('HOST', 'localhost')
        db_port = db_config.get('PORT', '5432')
        db_password = db_config.get('PASSWORD', '')

        # Формируем команду pg_dump
        cmd = [
            'pg_dump',
            '-U', db_user,
            '-h', db_host,
            '-p', db_port,
            '-d', db_name,
            '--no-owner',
            '--no-acl',
        ]

        # Если нужна компрессия
        if compress:
            # Используем gzip для сжатия
            import gzip
            self.stdout.write('Создание сжатой SQL резервной копии...')
            try:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env={**os.environ, 'PGPASSWORD': db_password} if db_password else None
                )
                stdout, stderr = process.communicate()
                
                if process.returncode != 0:
                    raise CommandError(f'Ошибка pg_dump: {stderr.decode()}')
                
                # Сохраняем сжатый файл
                with gzip.open(filepath, 'wb') as f:
                    f.write(stdout)
            except FileNotFoundError:
                raise CommandError(
                    'pg_dump не найден. Установите PostgreSQL client tools.'
                )
        else:
            self.stdout.write('Создание SQL резервной копии...')
            try:
                with open(filepath, 'wb') as f:
                    process = subprocess.Popen(
                        cmd,
                        stdout=f,
                        stderr=subprocess.PIPE,
                        env={**os.environ, 'PGPASSWORD': db_password} if db_password else None
                    )
                    _, stderr = process.communicate()
                    
                    if process.returncode != 0:
                        raise CommandError(f'Ошибка pg_dump: {stderr.decode()}')
            except FileNotFoundError:
                raise CommandError(
                    'pg_dump не найден. Установите PostgreSQL client tools.'
                )

    def create_json_backup(self, filepath):
        """Создание JSON резервной копии через dumpdata."""
        self.stdout.write('Создание JSON резервной копии...')
        
        from django.core.management import call_command
        
        with open(filepath, 'w', encoding='utf-8') as f:
            call_command('dumpdata', stdout=f, verbosity=0)
        
        self.stdout.write(f'JSON резервная копия создана: {filepath}')

