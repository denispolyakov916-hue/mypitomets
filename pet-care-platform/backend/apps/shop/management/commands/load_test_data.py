"""
Команда для загрузки тестовых данных (товары и курсы)

Использование:
    python manage.py load_test_data
"""

from django.core.management.base import BaseCommand
from apps.shop.models import Product
from apps.training.models import Course


class Command(BaseCommand):
    help = 'Загрузка тестовых данных для товаров и курсов'

    def handle(self, *args, **options):
        self.stdout.write('Загрузка тестовых данных...')
        
        # Товары
        products_data = [
            # Сухой корм для собак
            {"name": "Royal Canin Adult Dog", "description": "Полнорационный сухой корм для взрослых собак", "price": 4500, "pet_type": "dog", "product_type": "dry_food"},
            {"name": "Purina Pro Plan Large", "description": "Сухой корм для крупных пород собак", "price": 3800, "pet_type": "dog", "product_type": "dry_food"},
            {"name": "Hill's Science Plan", "description": "Научно разработанный корм для собак", "price": 5200, "pet_type": "dog", "product_type": "dry_food"},
            {"name": "Acana Heritage", "description": "Беззерновой корм премиум-класса", "price": 6500, "pet_type": "dog", "product_type": "dry_food"},
            
            # Сухой корм для кошек
            {"name": "Royal Canin Indoor Cat", "description": "Корм для домашних кошек", "price": 3200, "pet_type": "cat", "product_type": "dry_food"},
            {"name": "Purina ONE для кошек", "description": "Сбалансированный корм для кошек", "price": 2100, "pet_type": "cat", "product_type": "dry_food"},
            {"name": "Brit Premium Cat", "description": "Премиум корм чешского производства", "price": 2800, "pet_type": "cat", "product_type": "dry_food"},
            
            # Влажный корм для собак
            {"name": "Cesar в соусе", "description": "Влажный корм для собак мелких пород", "price": 89, "pet_type": "dog", "product_type": "wet_food"},
            {"name": "Pedigree паштет", "description": "Паштет для взрослых собак", "price": 65, "pet_type": "dog", "product_type": "wet_food"},
            
            # Влажный корм для кошек
            {"name": "Whiskas в желе", "description": "Влажный корм для кошек в желе", "price": 45, "pet_type": "cat", "product_type": "wet_food"},
            {"name": "Felix Sensations", "description": "Корм с хрустящим топпингом", "price": 55, "pet_type": "cat", "product_type": "wet_food"},
            {"name": "Sheba Classic", "description": "Премиум влажный корм для кошек", "price": 75, "pet_type": "cat", "product_type": "wet_food"},
            
            # Лакомства
            {"name": "Лакомство Titbit", "description": "Сушёное лёгкое для собак", "price": 350, "pet_type": "dog", "product_type": "treats"},
            {"name": "Dreamies для кошек", "description": "Хрустящие подушечки с начинкой", "price": 120, "pet_type": "cat", "product_type": "treats"},
            {"name": "Мнямс лакомство", "description": "Палочки для собак и кошек", "price": 180, "pet_type": "all", "product_type": "treats"},
        ]
        
        # Товары уже загружены из реального XML каталога
        # Не создаем тестовые товары
        self.stdout.write('Товары уже загружены из реального каталога, пропускаем...')
        
        # Курсы (15-30 курсов)
        courses_data = [
            # Бесплатные курсы для собак
            {"title": "Основы дрессировки собак", "description": "Базовые команды и послушание для начинающих владельцев. Изучите основные команды: сидеть, лежать, стоять, ко мне.", "duration": 120, "price": 0, "pet_type": "dog"},
            {"title": "Приучение щенка к туалету", "description": "Пошаговое руководство по приучению щенка к выгулу. Эффективные методы и советы от профессионалов.", "duration": 45, "price": 0, "pet_type": "dog"},
            {"title": "Выбор корма для собаки", "description": "Как правильно выбрать корм в зависимости от породы, возраста и активности вашей собаки.", "duration": 60, "price": 0, "pet_type": "dog"},
            {"title": "Уход за шерстью собаки", "description": "Правильное вычёсывание, купание и уход за шерстью разных пород собак.", "duration": 75, "price": 0, "pet_type": "dog"},
            {"title": "Социализация щенка", "description": "Как правильно социализировать щенка с людьми, другими собаками и окружающим миром.", "duration": 90, "price": 0, "pet_type": "dog"},
            
            # Платные курсы для собак
            {"title": "Продвинутая дрессировка", "description": "Сложные трюки и команды для опытных владельцев. Апортировка, работа с запахами, аджилити.", "duration": 180, "price": 1990, "pet_type": "dog"},
            {"title": "Коррекция поведения собак", "description": "Решение проблем агрессии, страхов, лая и других поведенческих проблем.", "duration": 150, "price": 2490, "pet_type": "dog"},
            {"title": "Дрессировка охранных собак", "description": "Специализированный курс для владельцев служебных и охранных пород.", "duration": 240, "price": 3990, "pet_type": "dog"},
            {"title": "Спортивная дрессировка", "description": "Подготовка к соревнованиям по аджилити, обидиенс и другим видам кинологического спорта.", "duration": 200, "price": 2990, "pet_type": "dog"},
            {"title": "Воспитание щенка с нуля", "description": "Полный курс воспитания щенка от 2 месяцев до года. Все этапы развития.", "duration": 300, "price": 3490, "pet_type": "dog"},
            
            # Бесплатные курсы для кошек
            {"title": "Уход за шерстью кошки", "description": "Как правильно вычёсывать и мыть кошку. Особенности ухода за длинношерстными и короткошерстными породами.", "duration": 60, "price": 0, "pet_type": "cat"},
            {"title": "Приучение кошки к лотку", "description": "Эффективные методы приучения котёнка к лотку и решение проблем с туалетом.", "duration": 45, "price": 0, "pet_type": "cat"},
            {"title": "Питание кошек", "description": "Как правильно кормить кошку. Выбор корма, режим питания, натуральное питание.", "duration": 90, "price": 0, "pet_type": "cat"},
            {"title": "Игры и развлечения для кошек", "description": "Как развлечь кошку и обеспечить ей активный образ жизни в домашних условиях.", "duration": 75, "price": 0, "pet_type": "cat"},
            {"title": "Понимание поведения кошек", "description": "Изучите язык тела кошек, их потребности и как правильно с ними общаться.", "duration": 120, "price": 0, "pet_type": "cat"},
            
            # Платные курсы для кошек
            {"title": "Игры с кошкой", "description": "Интерактивные игры для активной и счастливой кошки. Тренировка охотничьих инстинктов.", "duration": 90, "price": 990, "pet_type": "cat"},
            {"title": "Дрессировка кошек", "description": "Обучение кошек базовым командам и трюкам. Да, кошек тоже можно дрессировать!", "duration": 150, "price": 1990, "pet_type": "cat"},
            {"title": "Решение проблем поведения кошек", "description": "Коррекция агрессии, меток, царапания мебели и других проблем поведения.", "duration": 120, "price": 1790, "pet_type": "cat"},
            {"title": "Уход за пожилой кошкой", "description": "Особенности ухода за кошками старше 7 лет. Здоровье, питание, активность.", "duration": 100, "price": 1490, "pet_type": "cat"},
            {"title": "Воспитание котёнка", "description": "Полный курс воспитания котёнка от 2 месяцев до года. Все этапы развития и социализации.", "duration": 180, "price": 2490, "pet_type": "cat"},
            
            # Универсальные курсы
            {"title": "Питание домашних животных", "description": "Как составить правильный рацион для питомца. Основы ветеринарной диетологии.", "duration": 150, "price": 1490, "pet_type": "all"},
            {"title": "Первая помощь питомцу", "description": "Что делать в экстренных ситуациях до приезда ветеринара. Базовые навыки первой помощи.", "duration": 75, "price": 2490, "pet_type": "all"},
            {"title": "Вакцинация и профилактика", "description": "График вакцинации, дегельминтизация и профилактика заболеваний у домашних животных.", "duration": 90, "price": 0, "pet_type": "all"},
            {"title": "Выбор ветеринара", "description": "Как выбрать хорошего ветеринара и когда обращаться за помощью. Признаки болезней.", "duration": 60, "price": 0, "pet_type": "all"},
            {"title": "Путешествия с питомцем", "description": "Как безопасно путешествовать с собакой или кошкой. Подготовка, документы, перевозка.", "duration": 120, "price": 1290, "pet_type": "all"},
            {"title": "Фотография домашних животных", "description": "Как делать красивые фотографии ваших питомцев. Советы по съёмке и обработке.", "duration": 180, "price": 1990, "pet_type": "all"},
            {"title": "Груминг в домашних условиях", "description": "Профессиональный уход за шерстью, когтями и зубами питомца своими руками.", "duration": 150, "price": 1790, "pet_type": "all"},
            {"title": "Психология домашних животных", "description": "Глубокое понимание поведения и потребностей собак и кошек. Этология домашних животных.", "duration": 200, "price": 2990, "pet_type": "all"},
        ]
        
        courses_created = 0
        for data in courses_data:
            course, created = Course.objects.get_or_create(
                title=data['title'],
                defaults={
                    'description': data['description'],
                    'duration': data['duration'],
                    'price': data['price'],
                    'pet_type': data['pet_type'],
                    'image_url': f"/images/courses/{data['title'].lower().replace(' ', '_')}.jpg",
                    'is_active': True,
                }
            )
            if created:
                courses_created += 1
        
        self.stdout.write(self.style.SUCCESS(f'Создано курсов: {courses_created}'))
        self.stdout.write(self.style.SUCCESS('Тестовые данные загружены!'))

