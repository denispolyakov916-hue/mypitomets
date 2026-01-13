"""
Management команда для вывода всех API эндпоинтов.

Использование:
    python manage.py list_endpoints              # Вывод всех эндпоинтов
    python manage.py list_endpoints --search cart # Поиск по запросу
    python manage.py list_endpoints --prefix /api/shop/ # Фильтр по префиксу
    python manage.py list_endpoints --count      # Только количество
"""

from django.core.management.base import BaseCommand
from config.api_routes import (
    ALL_ENDPOINTS, 
    get_endpoints_count, 
    search_endpoint
)


class Command(BaseCommand):
    help = 'Выводит список всех API эндпоинтов проекта'

    def add_arguments(self, parser):
        parser.add_argument(
            '--search', '-s',
            type=str,
            help='Поиск эндпоинта по запросу'
        )
        parser.add_argument(
            '--prefix', '-p',
            type=str,
            help='Фильтр по префиксу URL (например /api/shop/)'
        )
        parser.add_argument(
            '--count', '-c',
            action='store_true',
            help='Показать только количество эндпоинтов'
        )

    def handle(self, *args, **options):
        search_query = options.get('search')
        prefix_filter = options.get('prefix')
        count_only = options.get('count')

        if count_only:
            self._print_count()
            return

        if search_query:
            self._search_endpoints(search_query)
            return

        if prefix_filter:
            self._filter_by_prefix(prefix_filter)
            return

        self._print_all_endpoints()

    def _print_count(self):
        """Выводит только количество эндпоинтов."""
        total = get_endpoints_count()
        self.stdout.write(self.style.SUCCESS(f'\n🐾 Всего эндпоинтов: {total}'))
        
        self.stdout.write('\nПо разделам:')
        for prefix, endpoints in ALL_ENDPOINTS.items():
            self.stdout.write(f'  {prefix}: {len(endpoints)}')

    def _search_endpoints(self, query: str):
        """Поиск эндпоинтов."""
        results = search_endpoint(query)
        
        if not results:
            self.stdout.write(self.style.WARNING(f'\n❌ Эндпоинты по запросу "{query}" не найдены'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'\n🔍 Найдено {len(results)} эндпоинтов по запросу "{query}":\n'))
        
        for result in results:
            self.stdout.write(f"  {result['prefix']}")
            self.stdout.write(self.style.HTTP_INFO(f"    {result['endpoint']}"))
            self.stdout.write(f"      → {result['description']}\n")

    def _filter_by_prefix(self, prefix: str):
        """Фильтр по префиксу."""
        # Нормализуем префикс
        if not prefix.startswith('/'):
            prefix = '/' + prefix
        if not prefix.endswith('/'):
            prefix = prefix + '/'
        
        if prefix not in ALL_ENDPOINTS:
            self.stdout.write(self.style.ERROR(f'\n❌ Префикс "{prefix}" не найден'))
            self.stdout.write('\nДоступные префиксы:')
            for p in ALL_ENDPOINTS.keys():
                self.stdout.write(f'  {p}')
            return
        
        endpoints = ALL_ENDPOINTS[prefix]
        self.stdout.write(self.style.SUCCESS(f'\n📍 {prefix} ({len(endpoints)} endpoints)\n'))
        self.stdout.write('-' * 60)
        
        for endpoint, description in endpoints.items():
            method, path = endpoint.split(' ', 1)
            self.stdout.write(f'  {self.style.HTTP_INFO(method):10} {path:40} → {description}')

    def _print_all_endpoints(self):
        """Выводит все эндпоинты."""
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('🐾 ПИТОМЕЦ+ API ENDPOINTS'))
        self.stdout.write('=' * 70)
        self.stdout.write(f'Всего эндпоинтов: {get_endpoints_count()}')
        self.stdout.write('=' * 70)
        
        for prefix, endpoints in ALL_ENDPOINTS.items():
            self.stdout.write(f'\n{self.style.HTTP_INFO(f"📍 {prefix}")} ({len(endpoints)} endpoints)')
            self.stdout.write('-' * 60)
            
            for endpoint, description in endpoints.items():
                parts = endpoint.split(' ', 1)
                if len(parts) == 2:
                    method, path = parts
                    # Цветовое кодирование методов
                    if method == 'GET':
                        styled_method = self.style.HTTP_INFO(method)
                    elif method == 'POST':
                        styled_method = self.style.SUCCESS(method)
                    elif method in ['PUT', 'PATCH']:
                        styled_method = self.style.WARNING(method)
                    elif method == 'DELETE':
                        styled_method = self.style.ERROR(method)
                    elif method == 'CRUD':
                        styled_method = self.style.NOTICE(method)
                    else:
                        styled_method = method
                    
                    self.stdout.write(f'  {styled_method:15} {path:40} → {description}')
                else:
                    self.stdout.write(f'  {endpoint:45} → {description}')
        
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write('Использование:')
        self.stdout.write('  python manage.py list_endpoints --search cart')
        self.stdout.write('  python manage.py list_endpoints --prefix /api/shop/')
        self.stdout.write('  python manage.py list_endpoints --count')
        self.stdout.write('=' * 70 + '\n')



