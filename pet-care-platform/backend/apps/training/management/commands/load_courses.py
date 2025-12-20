"""
Команда для загрузки 30 разнообразных курсов для тестирования фильтрации

Использование:
    python manage.py load_courses
"""

from django.core.management.base import BaseCommand
from apps.training.models import Course


class Command(BaseCommand):
    help = 'Загрузка 30 разнообразных курсов для тестирования фильтрации'

    def assign_course_categories(self, course):
        """Автоматически присваивает категории, уровни и форматы курсам на основе их содержания."""
        title_lower = course.title.lower()
        desc_lower = course.description.lower() if course.description else ''

        # Категории
        if any(word in title_lower or word in desc_lower for word in ['дрессировк', 'трюк', 'команд', 'послушани']):
            course.category = 'training'
        elif any(word in title_lower or word in desc_lower for word in ['уход', 'груминг', 'шерст', 'мыть', 'когт']):
            course.category = 'care'
        elif any(word in title_lower or word in desc_lower for word in ['питани', 'корм', 'диет', 'еда']):
            course.category = 'nutrition'
        elif any(word in title_lower or word in desc_lower for word in ['здоров', 'болезн', 'ветеринар', 'вакцин', 'профилактик']):
            course.category = 'health'
        elif any(word in title_lower or word in desc_lower for word in ['поведени', 'агресси', 'страх', 'лай', 'метк']):
            course.category = 'behavior'
        elif any(word in title_lower or word in desc_lower for word in ['щенок', 'котенок', 'воспитани', 'социализац', 'туалет']):
            course.category = 'basics'
        elif any(word in title_lower or word in desc_lower for word in ['игр', 'развлечени', 'активност']):
            course.category = 'entertainment'
        else:
            course.category = 'specialized'

        # Подкатегории
        if course.category == 'training':
            if any(word in title_lower for word in ['послушани', 'основ']):
                course.subcategory = 'obedience'
            elif any(word in title_lower for word in ['трюк', 'сложн']):
                course.subcategory = 'tricks'
            elif any(word in title_lower for word in ['спорт', 'аджилити']):
                course.subcategory = 'sports'
            elif any(word in title_lower for word in ['охран', 'служебн']):
                course.subcategory = 'service'
        elif course.category == 'basics':
            if 'туалет' in title_lower:
                course.subcategory = 'toilet_training'
            elif 'щенок' in title_lower or 'социализац' in title_lower:
                course.subcategory = 'socialization'
        elif course.category == 'care':
            if 'шерст' in title_lower:
                course.subcategory = 'coat_care'
        elif course.category == 'health':
            if 'вакцин' in title_lower:
                course.subcategory = 'vaccination'
            elif 'перв' in title_lower:
                course.subcategory = None  # first_aid не определен в choices
        elif course.category == 'nutrition':
            if 'выбор' in title_lower:
                course.subcategory = 'diet_selection'

        # Уровни сложности
        if any(word in title_lower for word in ['продвинут', 'сложн', 'эксперт', 'профессионал']):
            course.level = 'advanced'
        elif any(word in title_lower for word in ['средн', 'промежуточн']):
            course.level = 'intermediate'
        elif any(word in title_lower for word in ['начинающ', 'основ', 'базов', 'перв']):
            course.level = 'beginner'
        else:
            # Для платных курсов уровень выше
            course.level = 'intermediate' if course.price > 0 else 'beginner'

        # Формат обучения
        if course.duration > 240:  # Длительные курсы
            course.format_type = 'mixed'
        elif any(word in desc_lower for word in ['интерактив', 'практик', 'упражнени']):
            course.format_type = 'interactive'
        elif course.price > 3000:  # Дорогие курсы часто имеют мастер-классы
            course.format_type = 'workshop'
        else:
            course.format_type = 'video'

        return course

    def handle(self, *args, **options):
        self.stdout.write('Загрузка курсов для тестирования фильтрации...')

        courses_data = [
            # Бесплатные курсы для собак (5 курсов)
            {
                "title": "Основы дрессировки собак",
                "description": "Базовые команды и послушание для начинающих владельцев. Изучите основные команды: сидеть, лежать, стоять, ко мне.",
                "duration": 120,
                "price": 0,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "obedience",
                "level": "beginner",
                "format_type": "video",
                "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
            },
            {
                "title": "Приучение щенка к туалету",
                "description": "Пошаговое руководство по приучению щенка к выгулу. Эффективные методы и советы от профессионалов.",
                "duration": 45,
                "price": 0,
                "pet_type": "dog",
                "category": "basics",
                "subcategory": "toilet_training",
                "level": "beginner",
                "format_type": "video",
                "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"
            },
            {
                "title": "Выбор корма для собаки",
                "description": "Как правильно выбрать корм в зависимости от породы, возраста и активности вашей собаки.",
                "duration": 60,
                "price": 0,
                "pet_type": "dog",
                "category": "nutrition",
                "subcategory": "diet_selection",
                "level": "beginner",
                "format_type": "video",
                "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"
            },
            {
                "title": "Уход за шерстью собаки",
                "description": "Правильное вычёсывание, купание и уход за шерстью разных пород собак.",
                "duration": 75,
                "price": 0,
                "pet_type": "dog",
                "category": "care",
                "subcategory": "coat_care",
                "level": "beginner",
                "format_type": "video",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },
            {
                "title": "Социализация щенка",
                "description": "Как правильно социализировать щенка с людьми, другими собаками и окружающим миром.",
                "duration": 90,
                "price": 0,
                "pet_type": "dog",
                "category": "basics",
                "subcategory": "socialization",
                "level": "beginner",
                "format_type": "video",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },

            # Платные курсы для собак (7 курсов)
            {
                "title": "Продвинутая дрессировка собак",
                "description": "Сложные трюки и команды для опытных владельцев. Апортировка, работа с запахами, аджилити.",
                "duration": 180,
                "price": 1990,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "tricks",
                "level": "advanced",
                "format_type": "video",
                "image_url": "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400"
            },
            {
                "title": "Коррекция поведения собак",
                "description": "Решение проблем агрессии, страхов, лая и других поведенческих проблем.",
                "duration": 150,
                "price": 2490,
                "pet_type": "dog",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },
            {
                "title": "Дрессировка охранных собак",
                "description": "Специализированный курс для владельцев служебных и охранных пород.",
                "duration": 240,
                "price": 3990,
                "pet_type": "dog",
                "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"
            },
            {
                "title": "Спортивная дрессировка собак",
                "description": "Подготовка к соревнованиям по аджилити, обидиенс и другим видам кинологического спорта.",
                "duration": 200,
                "price": 2990,
                "pet_type": "dog",
                "image_url": "https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=400"
            },
            {
                "title": "Воспитание щенка с нуля",
                "description": "Полный курс воспитания щенка от 2 месяцев до года. Все этапы развития.",
                "duration": 300,
                "price": 3490,
                "pet_type": "dog",
                "image_url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400"
            },
            {
                "title": "Дрессировка собак-спасателей",
                "description": "Подготовка собак для поисково-спасательных работ и служб спасения.",
                "duration": 220,
                "price": 4990,
                "pet_type": "dog",
                "image_url": "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400"
            },
            {
                "title": "Канистерапия с собаками",
                "description": "Обучение работе с собаками в терапевтических целях для помощи людям.",
                "duration": 160,
                "price": 2790,
                "pet_type": "dog",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },

            # Бесплатные курсы для кошек (4 курса)
            {
                "title": "Уход за шерстью кошки",
                "description": "Как правильно вычёсывать и мыть кошку. Особенности ухода за длинношерстными и короткошерстными породами.",
                "duration": 60,
                "price": 0,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"
            },
            {
                "title": "Приучение кошки к лотку",
                "description": "Эффективные методы приучения котёнка к лотку и решение проблем с туалетом.",
                "duration": 45,
                "price": 0,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400"
            },
            {
                "title": "Питание кошек",
                "description": "Как правильно кормить кошку. Выбор корма, режим питания, натуральное питание.",
                "duration": 90,
                "price": 0,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400"
            },
            {
                "title": "Понимание поведения кошек",
                "description": "Изучите язык тела кошек, их потребности и как правильно с ними общаться.",
                "duration": 120,
                "price": 0,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400"
            },

            # Платные курсы для кошек (6 курсов)
            {
                "title": "Игры и развлечения для кошек",
                "description": "Как развлечь кошку и обеспечить ей активный образ жизни в домашних условиях.",
                "duration": 75,
                "price": 990,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400"
            },
            {
                "title": "Дрессировка кошек",
                "description": "Обучение кошек базовым командам и трюкам. Да, кошек тоже можно дрессировать!",
                "duration": 150,
                "price": 1990,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400"
            },
            {
                "title": "Решение проблем поведения кошек",
                "description": "Коррекция агрессии, меток, царапания мебели и других проблем поведения.",
                "duration": 120,
                "price": 1790,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400"
            },
            {
                "title": "Уход за пожилой кошкой",
                "description": "Особенности ухода за кошками старше 7 лет. Здоровье, питание, активность.",
                "duration": 100,
                "price": 1490,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=400"
            },
            {
                "title": "Воспитание котёнка",
                "description": "Полный курс воспитания котёнка от 2 месяцев до года. Все этапы развития и социализации.",
                "duration": 180,
                "price": 2490,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400"
            },
            {
                "title": "Фелинология для начинающих",
                "description": "Изучение пород кошек, их особенностей и правильного ухода за разными породами.",
                "duration": 140,
                "price": 1890,
                "pet_type": "cat",
                "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"
            },

            # Универсальные курсы для всех животных (8 курсов)
            {
                "title": "Питание домашних животных",
                "description": "Как составить правильный рацион для питомца. Основы ветеринарной диетологии.",
                "duration": 150,
                "price": 1490,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"
            },
            {
                "title": "Первая помощь питомцу",
                "description": "Что делать в экстренных ситуациях до приезда ветеринара. Базовые навыки первой помощи.",
                "duration": 75,
                "price": 2490,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Вакцинация и профилактика",
                "description": "График вакцинации, дегельминтизация и профилактика заболеваний у домашних животных.",
                "duration": 90,
                "price": 0,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Выбор ветеринара",
                "description": "Как выбрать хорошего ветеринара и когда обращаться за помощью. Признаки болезней.",
                "duration": 60,
                "price": 0,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400"
            },
            {
                "title": "Путешествия с питомцем",
                "description": "Как безопасно путешествовать с собакой или кошкой. Подготовка, документы, перевозка.",
                "duration": 120,
                "price": 1290,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400"
            },
            {
                "title": "Фотография домашних животных",
                "description": "Как делать красивые фотографии ваших питомцев. Советы по съёмке и обработке.",
                "duration": 180,
                "price": 1990,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },
            {
                "title": "Груминг в домашних условиях",
                "description": "Профессиональный уход за шерстью, когтями и зубами питомца своими руками.",
                "duration": 150,
                "price": 1790,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },
            {
                "title": "Психология домашних животных",
                "description": "Глубокое понимание поведения и потребностей собак и кошек. Этология домашних животных.",
                "duration": 200,
                "price": 2990,
                "pet_type": "all",
                "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"
            },
        ]

        courses_created = 0
        courses_updated = 0
        for data in courses_data:
            course, created = Course.objects.get_or_create(
                title=data['title'],
                defaults={
                    'description': data['description'],
                    'duration': data['duration'],
                    'price': data['price'],
                    'pet_type': data['pet_type'],
                    'category': data.get('category', 'basics'),
                    'subcategory': data.get('subcategory'),
                    'level': data.get('level', 'beginner'),
                    'format_type': data.get('format_type', 'video'),
                    'image_url': data['image_url'],
                    'is_active': True,
                }
            )
            if created:
                courses_created += 1
                self.stdout.write(f'Создан курс: {data["title"]}')
            else:
                # Обновляем существующие курсы новыми полями
                updated = False
                if not hasattr(course, 'category') or course.category != data.get('category', 'basics'):
                    course.category = data.get('category', 'basics')
                    updated = True
                if not hasattr(course, 'subcategory') or course.subcategory != data.get('subcategory'):
                    course.subcategory = data.get('subcategory')
                    updated = True
                if not hasattr(course, 'level') or course.level != data.get('level', 'beginner'):
                    course.level = data.get('level', 'beginner')
                    updated = True
                if not hasattr(course, 'format_type') or course.format_type != data.get('format_type', 'video'):
                    course.format_type = data.get('format_type', 'video')
                    updated = True

                if updated:
                    course.save()
                    courses_updated += 1
                    self.stdout.write(f'Обновлён курс: {data["title"]}')

        # Обновляем существующие курсы, у которых нет новых полей
        existing_courses = Course.objects.all()
        existing_updated = 0
        for course in existing_courses:
            if not hasattr(course, 'category') or course.category is None:
                course = self.assign_course_categories(course)
                course.save()
                existing_updated += 1
                self.stdout.write(f'Категоризирован существующий курс: {course.title}')

        # Статистика по созданным курсам
        total_courses = Course.objects.count()
        dog_courses = Course.objects.filter(pet_type='dog').count()
        cat_courses = Course.objects.filter(pet_type='cat').count()
        all_courses = Course.objects.filter(pet_type='all').count()
        free_courses = Course.objects.filter(price=0).count()
        paid_courses = Course.objects.filter(price__gt=0).count()

        self.stdout.write(self.style.SUCCESS(f'\nСоздано новых курсов: {courses_created}'))
        self.stdout.write(self.style.SUCCESS(f'Обновлено курсов с новыми данными: {courses_updated}'))
        self.stdout.write(self.style.SUCCESS(f'Категоризировано существующих курсов: {existing_updated}'))
        self.stdout.write(self.style.SUCCESS(f'Всего курсов в базе: {total_courses}'))
        self.stdout.write(self.style.SUCCESS(f'Курсы для собак: {dog_courses}'))
        self.stdout.write(self.style.SUCCESS(f'Курсы для кошек: {cat_courses}'))
        self.stdout.write(self.style.SUCCESS(f'Универсальные курсы: {all_courses}'))
        self.stdout.write(self.style.SUCCESS(f'Бесплатные курсы: {free_courses}'))
        self.stdout.write(self.style.SUCCESS(f'Платные курсы: {paid_courses}'))
        self.stdout.write(self.style.SUCCESS('\nКурсы успешно загружены и обновлены для персональной фильтрации!'))
