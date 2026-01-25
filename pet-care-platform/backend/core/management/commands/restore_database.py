"""
Management команда для восстановления базы данных из резервной копии.

Поддерживает восстановление из SQL и JSON файлов.
"""

import os
import subprocess
import gzip
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import connection


class Command(BaseCommand):
    help = 'Восстановление базы данных из резервной копии'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_file',
            type=str,
            help='Путь к файлу резервной копии',
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['auto', 'sql', 'json'],
            default='auto',
            help='Формат резервной копии (auto - определяется автоматически)',
        )
        parser.add_argument(
            '--drop-existing',
            action='store_true',
            help='Удалить существующие данные перед восстановлением (только для SQL)',
        )

    def handle(self, *args, **options):
        backup_file = options['backup_file']
        format_type = options['format']
        drop_existing = options['drop_existing']

        # Проверяем существование файла
        if not os.path.exists(backup_file):
            raise CommandError(f'Файл резервной копии не найден: {backup_file}')

        # Определяем формат автоматически
        if format_type == 'auto':
            if backup_file.endswith('.json'):
                format_type = 'json'
            elif backup_file.endswith('.sql') or backup_file.endswith('.sql.gz'):
                format_type = 'sql'
            else:
                raise CommandError(
                    'Не удалось определить формат файла. '
                    'Укажите --format sql или --format json'
                )

        # Подтверждение
        if not options.get('verbosity', 1) == 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠️  ВНИМАНИЕ: Восстановление из резервной копии перезапишет текущие данные!'
                )
            )
            confirm = input('Продолжить? (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Восстановление отменено.'))
                return

        if format_type == 'sql':
            self.restore_sql_backup(backup_file, drop_existing)
        else:
            self.restore_json_backup(backup_file)

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ База данных восстановлена из: {backup_file}'
            )
        )

    def restore_sql_backup(self, filepath, drop_existing=False):
        """Восстановление из SQL резервной копии."""
        db_config = settings.DATABASES['default']
        
        if db_config['ENGINE'] != 'django.db.backends.postgresql':
            raise CommandError(
                'SQL восстановление поддерживается только для PostgreSQL.'
            )

        db_name = db_config['NAME']
        db_user = db_config.get('USER', 'postgres')
        db_host = db_config.get('HOST', 'localhost')
        db_port = db_config.get('PORT', '5432')
        db_password = db_config.get('PASSWORD', '')

        self.stdout.write('Восстановление из SQL резервной копии...')

        # Если нужно удалить существующие данные
        if drop_existing:
            self.stdout.write('Удаление существующих данных...')
            # Закрываем все соединения
            connection.close()
            
            # Удаляем и пересоздаем БД
            drop_cmd = [
                'psql',
                '-U', db_user,
                '-h', db_host,
                '-p', db_port,
                '-c', f'DROP DATABASE IF EXISTS {db_name};'
            ]
            
            create_cmd = [
                'psql',
                '-U', db_user,
                '-h', db_host,
                '-p', db_port,
                '-c', f'CREATE DATABASE {db_name};'
            ]
            
            env = {**os.environ, 'PGPASSWORD': db_password} if db_password else None
            
            try:
                subprocess.run(drop_cmd, env=env, check=True, capture_output=True)
                subprocess.run(create_cmd, env=env, check=True, capture_output=True)
            except subprocess.CalledProcessError as e:
                raise CommandError(f'Ошибка при пересоздании БД: {e.stderr.decode()}')

        # Восстановление из файла
        if filepath.endswith('.gz'):
            # Распаковываем и восстанавливаем
            self.stdout.write('Распаковка сжатого файла...')
            with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                restore_cmd = [
                    'psql',
                    '-U', db_user,
                    '-h', db_host,
                    '-p', db_port,
                    '-d', db_name,
                ]
                
                env = {**os.environ, 'PGPASSWORD': db_password} if db_password else None
                
                try:
                    process = subprocess.Popen(
                        restore_cmd,
                        stdin=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        env=env
                    )
                    stdout, stderr = process.communicate(input=f.read().encode('utf-8'))
                    
                    if process.returncode != 0:
                        raise CommandError(f'Ошибка восстановления: {stderr.decode()}')
                except FileNotFoundError:
                    raise CommandError(
                        'psql не найден. Установите PostgreSQL client tools.'
                    )
        else:
            # Обычный SQL файл
            restore_cmd = [
                'psql',
                '-U', db_user,
                '-h', db_host,
                '-p', db_port,
                '-d', db_name,
                '-f', filepath,
            ]
            
            env = {**os.environ, 'PGPASSWORD': db_password} if db_password else None
            
            try:
                result = subprocess.run(
                    restore_cmd,
                    env=env,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    raise CommandError(f'Ошибка восстановления: {result.stderr}')
            except FileNotFoundError:
                raise CommandError(
                    'psql не найден. Установите PostgreSQL client tools.'
                )

    def restore_json_backup(self, filepath):
        """Восстановление из JSON резервной копии."""
        self.stdout.write('Восстановление из JSON резервной копии...')
        
        from django.core.management import call_command
        
        # Очищаем существующие данные (опционально)
        # call_command('flush', '--noinput', verbosity=0)
        
        # Загружаем данные
        call_command('loaddata', filepath, verbosity=1)

