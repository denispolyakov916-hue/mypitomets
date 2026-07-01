"""
seed_sample_events — примеры для витрины «Новости и Мероприятия».

Создаёт 3 опубликованных мероприятия (выставка/сходка/вебинар) + 1 новость,
чтобы блок на главной и страница /news-events не были пустыми. Идемпотентна
(get_or_create по заголовку), даты — в будущем, чтобы события были «ближайшими».

    python manage.py seed_sample_events            # создать примеры
    python manage.py seed_sample_events --clear    # удалить примеры и выйти
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.events.models import Event, NewsPost

NEWS_TITLE = 'Запустили собственную базу кормов от «Динозаврик»'


def _sample_events(now):
    return [
        {
            'title': 'Выставка «Кошки Москвы 2026»',
            'event_type': 'exhibition',
            'is_featured': True,
            'summary': 'Крупнейшая выставка кошек: породы, конкурсы, ветеринарные консультации.',
            'description': (
                'Целый день о кошках: ринги по породам, советы фелинологов, зона груминга '
                'и стенды заводчиков. Вход по билетам, дети до 7 лет бесплатно.'
            ),
            'is_online': False,
            'location': 'Крокус Экспо, Москва',
            'start_at': (now + timedelta(days=30)).replace(hour=11, minute=0, second=0, microsecond=0),
            'duration_h': 8,
        },
        {
            'title': 'Утренняя сходка догоунеров в Сокольниках',
            'event_type': 'meetup',
            'summary': 'Гуляем стаей, знакомим собак и хозяев, делимся маршрутами.',
            'description': (
                'Собираемся у главного входа и гуляем час-полтора по большому кругу. '
                'Приходите с питомцем на поводке — будет кофе и знакомство для новичков.'
            ),
            'is_online': False,
            'location': 'Парк «Сокольники», главный вход',
            'start_at': (now + timedelta(days=10)).replace(hour=10, minute=0, second=0, microsecond=0),
            'duration_h': 2,
        },
        {
            'title': 'Вебинар: первая помощь питомцу',
            'event_type': 'webinar',
            'summary': 'Ветеринар разберёт частые ситуации и состав аптечки.',
            'description': (
                'Что делать при отравлении, порезе или тепловом ударе, как собрать аптечку '
                'и когда срочно к врачу. В конце — ответы на вопросы. Запись будет у участников.'
            ),
            'is_online': True,
            'online_url': 'https://betapitometsplus.ru/news-events',
            'start_at': (now + timedelta(days=14)).replace(hour=19, minute=0, second=0, microsecond=0),
            'duration_h': 1,
        },
    ]


class Command(BaseCommand):
    help = 'Создать примеры мероприятий и новость для витрины «Новости и Мероприятия»'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Удалить ранее созданные примеры (по заголовкам) и выйти',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        events = _sample_events(now)

        if options['clear']:
            titles = [e['title'] for e in events]
            removed = Event.objects.filter(title__in=titles).delete()[0]
            removed += NewsPost.objects.filter(title=NEWS_TITLE).delete()[0]
            self.stdout.write(self.style.WARNING(f'Удалено объектов: {removed}'))
            return

        created = 0
        for data in events:
            duration_h = data.pop('duration_h')
            end_at = data['start_at'] + timedelta(hours=duration_h)
            _, was_created = Event.objects.get_or_create(
                title=data['title'],
                defaults={**data, 'end_at': end_at, 'status': 'published'},
            )
            created += int(was_created)
            self.stdout.write(('+ создано: ' if was_created else '· уже есть: ') + data['title'])

        _, news_created = NewsPost.objects.get_or_create(
            title=NEWS_TITLE,
            defaults={
                'category': 'Питание',
                'is_featured': True,
                'status': 'published',
                'excerpt': 'Свой каталог рационов и предложений поставщиков — рекомендации точнее.',
                'body': (
                    'Мы подключили собственную базу питания на основе каталога «Динозаврик»: '
                    'рецепты, составы и предложения поставщиков. Теперь Пуфыч подбирает рацион '
                    'точнее и показывает, где выгоднее купить. Дальше — больше поставщиков и товаров.'
                ),
            },
        )
        created += int(news_created)
        self.stdout.write(('+ создано: ' if news_created else '· уже есть: ') + NEWS_TITLE)

        self.stdout.write(self.style.SUCCESS(f'Готово. Новых объектов: {created}.'))
