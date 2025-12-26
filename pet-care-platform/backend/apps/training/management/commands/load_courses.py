"""
Команда для загрузки 30 разнообразных курсов для тестирования фильтрации
18 бесплатных курсов + 12 платных курсов

Бесплатные курсы включают:
- 6 курсов для собак (разные категории: основы, питание, дрессировка, поведение, уход)
- 6 курсов для кошек (аналогичные категории)
- 6 универсальных курсов (здоровье, социализация, первая помощь, паразиты, обогащение)
- Разные форматы: видео, текстовые, интерактивные, смешанные

Использование:
    python manage.py load_courses
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.training.models import Course, Lesson, Comment, Rating
from apps.pets.models import Pet
import random


class Command(BaseCommand):
    help = 'Загрузка 30 разнообразных курсов для тестирования фильтрации'

    def create_lessons_for_course(self, course, course_data):
        """
        Создает уроки для курса на основе его типа и характеристик.

        Args:
            course: объект Course
            course_data: словарь с данными курса

        Returns:
            int: количество созданных уроков
        """
        lessons_data = self.generate_lessons_data(course, course_data)
        lessons_created = 0

        for lesson_data in lessons_data:
            Lesson.objects.create(
                course=course,
                **lesson_data
            )
            lessons_created += 1

        return lessons_created

    def generate_lessons_data(self, course, course_data):
        """
        Генерирует данные уроков на основе типа курса и его характеристик.
        """
        lessons = []

        # Получаем базовую информацию о курсе
        course_type = course_data.get('pet_type', 'all')
        category = course_data.get('category', 'basics')
        level = course_data.get('level', 'beginner')
        format_type = course_data.get('format_type', 'video')

        # Определяем количество уроков
        lessons_count = course_data.get('lessons_count', 5)

        # Генерируем уроки в зависимости от категории курса
        if category == 'basics':
            lessons = self.generate_basics_lessons(course_type, level, lessons_count, format_type)
        elif category == 'training':
            lessons = self.generate_training_lessons(course_type, level, lessons_count, format_type)
        elif category == 'care':
            lessons = self.generate_care_lessons(course_type, level, lessons_count, format_type)
        elif category == 'health':
            lessons = self.generate_health_lessons(course_type, level, lessons_count, format_type)
        elif category == 'behavior':
            lessons = self.generate_behavior_lessons(course_type, level, lessons_count, format_type)
        else:
            lessons = self.generate_generic_lessons(course_type, category, level, lessons_count, format_type)

        return lessons

    def generate_basics_lessons(self, pet_type, level, count, format_type):
        """Генерирует уроки для базовых курсов."""
        lessons = []

        basic_topics = [
            ("Знакомство с питомцем", "Основные характеристики и особенности породы"),
            ("Безопасность и уход", "Правила безопасного обращения и базовый уход"),
            ("Питание и рацион", "Основы правильного питания"),
            ("Здоровье и профилактика", "Базовые знания о здоровье питомца"),
            ("Социализация и поведение", "Основы социализации и поведения"),
        ]

        for i, (title, description) in enumerate(basic_topics[:count], 1):
            content_type = format_type if format_type != 'mixed' else ('video' if i % 2 == 1 else 'text')
            content = self.generate_lesson_content(content_type, title, description, pet_type)

            lessons.append({
                'title': title,
                'content_type': content_type,
                'content': content,
                'duration': 15 + (i * 5),  # 15-65 минут
                'order': i,
                'is_required': True if i <= 2 else False
            })

        return lessons

    def generate_training_lessons(self, pet_type, level, count, format_type):
        """Генерирует уроки для курсов дрессировки."""
        lessons = []

        training_topics = [
            ("Основы дрессировки", "Принципы и методы обучения питомца"),
            ("Команды послушания", "Изучение основных команд"),
            ("Коррекция поведения", "Методы коррекции нежелательного поведения"),
            ("Продвинутые команды", "Сложные команды и трюки"),
            ("Поддержание навыков", "Как закрепить и поддерживать изученные навыки"),
        ]

        for i, (title, description) in enumerate(training_topics[:count], 1):
            content_type = 'interactive' if level != 'beginner' and i > 2 else format_type
            content = self.generate_lesson_content(content_type, title, description, pet_type)

            lessons.append({
                'title': title,
                'content_type': content_type,
                'content': content,
                'duration': 20 + (i * 10),  # 20-70 минут
                'order': i,
                'is_required': True
            })

        return lessons

    def generate_care_lessons(self, pet_type, level, count, format_type):
        """Генерирует уроки для курсов ухода."""
        lessons = []

        care_topics = [
            ("Гигиена и груминг", "Правила ухода за шерстью, когтями, зубами"),
            ("Уход за шерстью", "Расчесывание, купание, стрижка"),
            ("Уход за когтями и зубами", "Подстригание когтей, чистка зубов"),
            ("Уход за ушами и глазами", "Профилактика и уход"),
            ("Общий уход и профилактика", "Комплексный уход за питомцем"),
        ]

        for i, (title, description) in enumerate(care_topics[:count], 1):
            content_type = format_type
            content = self.generate_lesson_content(content_type, title, description, pet_type)

            lessons.append({
                'title': title,
                'content_type': content_type,
                'content': content,
                'duration': 12 + (i * 8),  # 12-52 минуты
                'order': i,
                'is_required': True if i <= 3 else False
            })

        return lessons

    def generate_health_lessons(self, pet_type, level, count, format_type):
        """Генерирует уроки для курсов здоровья."""
        lessons = []

        health_topics = [
            ("Анатомия и физиология", "Основы строения организма питомца"),
            ("Профилактика заболеваний", "Вакцинация, паразиты, профилактические осмотры"),
            ("Распознавание симптомов", "Когда обратиться к ветеринару"),
            ("Первая помощь", "Базовые навыки оказания помощи"),
            ("Здоровое питание", "Питание для поддержания здоровья"),
        ]

        for i, (title, description) in enumerate(health_topics[:count], 1):
            content_type = 'text' if i == 1 else format_type
            content = self.generate_lesson_content(content_type, title, description, pet_type)

            lessons.append({
                'title': title,
                'content_type': content_type,
                'content': content,
                'duration': 18 + (i * 7),  # 18-53 минуты
                'order': i,
                'is_required': True
            })

        return lessons

    def generate_behavior_lessons(self, pet_type, level, count, format_type):
        """Генерирует уроки для курсов поведения."""
        lessons = []

        behavior_topics = [
            ("Понимание поведения", "Почему питомец ведет себя так, а не иначе"),
            ("Коррекция нежелательного поведения", "Методы коррекции проблемного поведения"),
            ("Развитие желаемого поведения", "Как научить питомца хорошим привычкам"),
            ("Работа со страхами и фобиями", "Помощь при различных страхах"),
            ("Долгосрочное поведение", "Поддержание хорошего поведения на протяжении жизни"),
        ]

        for i, (title, description) in enumerate(behavior_topics[:count], 1):
            content_type = 'interactive' if level != 'beginner' else format_type
            content = self.generate_lesson_content(content_type, title, description, pet_type)

            lessons.append({
                'title': title,
                'content_type': content_type,
                'content': content,
                'duration': 25 + (i * 8),  # 25-65 минут
                'order': i,
                'is_required': True
            })

        return lessons

    def generate_generic_lessons(self, pet_type, category, level, count, format_type):
        """Генерирует общие уроки для остальных категорий."""
        lessons = []

        for i in range(1, count + 1):
            title = f"Урок {i}: Основы темы"
            description = f"Изучение основных понятий и практических навыков урока {i}"

            content = self.generate_lesson_content(format_type, title, description, pet_type)

            lessons.append({
                'title': title,
                'content_type': format_type,
                'content': content,
                'duration': 15 + (i * 5),
                'order': i,
                'is_required': i <= 2
            })

        return lessons

    def generate_lesson_content(self, content_type, title, description, pet_type):
        """
        Генерирует контент урока в зависимости от типа контента.
        """
        base_content = {
            'title': title,
            'description': description,
            'pet_type': pet_type
        }

        if content_type == 'video':
            return {
                **base_content,
                'video_url': f"https://example.com/videos/{title.lower().replace(' ', '_')}.mp4",
                'transcript': f"Здесь будет транскрипт видео урока '{title}'",
                'key_points': [
                    "Основной момент 1",
                    "Основной момент 2",
                    "Основной момент 3"
                ]
            }

        elif content_type == 'text':
            return {
                **base_content,
                'text_content': f"""
# {title}

{description}

## Основные понятия

Здесь будет подробный текстовый материал урока.

## Практические рекомендации

- Рекомендация 1
- Рекомендация 2
- Рекомендация 3

## Заключение

Подведение итогов урока.
                """.strip(),
                'images': [
                    f"https://example.com/images/{title.lower().replace(' ', '_')}_1.jpg"
                ]
            }

        elif content_type == 'interactive':
            return {
                **base_content,
                'interactive_type': 'quiz',
                'questions': [
                    {
                        'question': 'Вопрос 1?',
                        'options': ['Вариант 1', 'Вариант 2', 'Вариант 3'],
                        'correct_answer': 0,
                        'explanation': 'Пояснение к правильному ответу'
                    },
                    {
                        'question': 'Вопрос 2?',
                        'options': ['Вариант A', 'Вариант B', 'Вариант C'],
                        'correct_answer': 1,
                        'explanation': 'Пояснение к правильному ответу'
                    }
                ],
                'completion_criteria': {
                    'min_score': 70,
                    'max_attempts': 3
                }
            }

        elif content_type == 'mixed':
            return {
                **base_content,
                'sections': [
                    {
                        'type': 'video',
                        'content': {
                            'video_url': f"https://example.com/videos/{title.lower().replace(' ', '_')}_intro.mp4",
                            'duration': 5
                        }
                    },
                    {
                        'type': 'text',
                        'content': {
                            'text': f"Теоретический материал для урока '{title}'"
                        }
                    },
                    {
                        'type': 'interactive',
                        'content': {
                            'type': 'exercise',
                            'description': 'Практическое задание'
                        }
                    }
                ]
            }

        elif content_type == 'webinar':
            return {
                **base_content,
                'webinar_url': f"https://example.com/webinars/{title.lower().replace(' ', '_')}",
                'scheduled_date': None,  # Для записанных вебинаров
                'duration': 60,
                'recording_available': True,
                'qa_session': True
            }

        elif content_type == 'masterclass':
            return {
                **base_content,
                'masterclass_type': 'live_demo',
                'expert_name': 'Эксперт в данной области',
                'duration': 90,
                'materials': [
                    'Презентация',
                    'Видео демонстрация',
                    'Дополнительные материалы'
                ]
            }

        # По умолчанию возвращаем текстовый контент
        return base_content

    def create_test_comments_and_ratings(self):
        """
        Создает тестовые комментарии и оценки для демонстрации системы.

        Returns:
            tuple: (comments_created, ratings_created)
        """
        User = get_user_model()

        # Получаем всех пользователей (или создаем тестового)
        users = User.objects.all()
        if not users.exists():
            # Создаем тестового пользователя если нет
            test_user = User.objects.create_user(
                email='test@example.com',
                password='testpass123',
                first_name='Тестовый',
                last_name='Пользователь'
            )
            users = [test_user]

        # Получаем всех питомцев
        pets = list(Pet.objects.all())

        # Получаем все курсы
        courses = list(Course.objects.all())

        comments_created = 0
        ratings_created = 0

        # Создаем оценки для курсов
        for course in courses:
            # Выбираем случайных пользователей для оценки
            rating_users = random.sample(list(users), min(len(users), random.randint(1, 5)))

            for user in rating_users:
                # Выбираем питомца пользователя (если есть)
                user_pets = [pet for pet in pets if pet.owner == user]
                selected_pet = random.choice(user_pets) if user_pets else None

                # Создаем оценку (если не существует)
                rating_obj, created = Rating.objects.get_or_create(
                    user=user,
                    course=course,
                    pet=selected_pet,
                    defaults={
                        'rating': random.randint(3, 5),  # Только положительные оценки для теста
                        'review': self.generate_random_review(),
                        'is_approved': True
                    }
                )

                if created:
                    ratings_created += 1

                # Создаем комментарии к курсу
                if random.choice([True, False]):  # 50% шанс создать комментарий
                    comment_content = self.generate_random_comment()

                    comment = Comment.objects.create(
                        user=user,
                        course=course,
                        content=comment_content,
                        is_moderated=True
                    )
                    comments_created += 1

                    # Создаем ответы на комментарий (редко)
                    if random.choice([True, False, False, False]):  # 25% шанс
                        reply_user = random.choice(users)
                        if reply_user != user:
                            Comment.objects.create(
                                user=reply_user,
                                course=course,
                                content=f"Спасибо за полезный комментарий! Полностью согласен с вами.",
                                parent=comment,
                                is_moderated=True
                            )
                            comments_created += 1

                # Создаем комментарии к урокам курса
                course_lessons = list(course.lessons.all())
                if course_lessons:
                    lesson_comments = random.randint(0, 3)  # 0-3 комментария к урокам

                    for _ in range(lesson_comments):
                        lesson = random.choice(course_lessons)
                        comment_user = random.choice(users)

                        Comment.objects.create(
                            user=comment_user,
                            lesson=lesson,
                            content=self.generate_random_lesson_comment(),
                            is_moderated=True
                        )
                        comments_created += 1

        return comments_created, ratings_created

    def generate_random_review(self):
        """Генерирует случайный отзыв о курсе."""
        reviews = [
            "Отличный курс! Много полезной информации, все доступно объяснено.",
            "Очень понравился материал. Теперь лучше понимаю своего питомца.",
            "Рекомендую всем владельцам! Полезные советы и практические упражнения.",
            "Хороший курс для начинающих. Все по полочкам разложено.",
            "Спасибо за курс! Узнала много нового о уходе за питомцем.",
            "Отличная подборка материалов. Буду применять на практике.",
            "Курс превзошел ожидания. Профессиональный подход к обучению.",
            "Полезная информация, структурированная подача материала.",
            "Теперь знаю, как правильно ухаживать за своим питомцем.",
            "Рекомендую! Качественный контент и хорошая подача."
        ]
        return random.choice(reviews)

    def generate_random_comment(self):
        """Генерирует случайный комментарий к курсу."""
        comments = [
            "Спасибо за подробный разбор темы!",
            "Очень полезная информация, буду применять.",
            "Хотелось бы больше практических примеров.",
            "Отличный курс, все понятно объяснено.",
            "Вопрос: а как быть в ситуации, когда...",
            "Полностью согласен с автором курса.",
            "Добавлю от себя: важно также учитывать...",
            "Спасибо! Теперь знаю, что делать.",
            "Рекомендую этот курс всем знакомым.",
            "Ожидал большего, но в целом неплохо."
        ]
        return random.choice(comments)

    def generate_random_lesson_comment(self):
        """Генерирует случайный комментарий к уроку."""
        comments = [
            "Отличное объяснение! Теперь все стало понятно.",
            "Спасибо за подробные инструкции.",
            "Вопрос: а что делать, если питомец не реагирует?",
            "Очень полезный урок, буду пробовать.",
            "Добавлю: в моем случае помогло...",
            "Хороший практический материал.",
            "Теперь знаю, как правильно выполнять упражнение.",
            "Спасибо за наглядные примеры!",
            "Полезная информация для повседневной практики.",
            "Вопрос по теме: можно ли применять этот метод для..."
        ]
        return random.choice(comments)

    def handle(self, *args, **options):
        self.stdout.write('Загрузка курсов для тестирования фильтрации...')

        courses_data = [
            # ========== БЕСПЛАТНЫЕ КУРСЫ ДЛЯ НАЧИНАЮЩИХ (18 курсов) ==========

            # Собаки - бесплатные
            {
                "title": "Первые дни щенка дома",
                "description": "Как подготовить дом к появлению щенка, что купить и как организовать пространство. Базовые правила адаптации.",
                "duration": 45,
                "price": 0,
                "pet_type": "dog",
                "category": "basics",
                "subcategory": "first_steps",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 5,
                "videos_count": 5,
                "materials_count": 3,
                "instructor_name": "Мария Соколова",
                "instructor_bio": "Кинолог с 10-летним опытом работы со щенками всех пород",
                "what_you_will_learn": "Организация места для щенка\nВыбор первых аксессуаров\nРежим кормления\nПервые дни адаптации",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
                # Персонализация для щенков
                "recommended_behavior_types": ["calm", "active", "playful"],
                "recommended_activity_levels": ["low", "medium"],
                "recommended_social_levels": ["home_only"],
                "min_training_experience": "none",
                "compatible_health_issues": [],
                "addresses_special_needs": [],
                "suitable_activities": ["home_training", "socialization"],
                "addresses_behavioral_problems": []
            },
            {
                "title": "Приучение щенка к туалету",
                "description": "Пошаговое руководство по приучению щенка к выгулу. Эффективные методы и советы от профессионалов.",
                "duration": 40,
                "price": 0,
                "pet_type": "dog",
                "category": "basics",
                "subcategory": "toilet_training",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 4,
                "videos_count": 4,
                "materials_count": 2,
                "instructor_name": "Алексей Волков",
                "instructor_bio": "Профессиональный дрессировщик, автор методики быстрого приучения к туалету",
                "what_you_will_learn": "Понимание сигналов щенка\nГрафик выгула\nРешение проблем\nПриучение к пелёнке",
                "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"
            },
            {
                "title": "Основы питания собак",
                "description": "Как правильно выбрать корм для собаки. Режим кормления, нормы порций и запрещённые продукты.",
                "duration": 60,
                "price": 0,
                "pet_type": "dog",
                "category": "nutrition",
                "subcategory": "feeding_basics",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Ветеринар Елена Кузнецова",
                "instructor_bio": "Ветеринарный диетолог, специалист по питанию собак",
                "what_you_will_learn": "Виды кормов\nРежим кормления по возрасту\nЗапрещённые продукты\nНормы порций",
                "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"
            },
            
            # Кошки - бесплатные
            {
                "title": "Котёнок в доме: первые шаги",
                "description": "Подготовка дома к появлению котёнка. Что нужно купить, как обустроить место и избежать травм.",
                "duration": 50,
                "price": 0,
                "pet_type": "cat",
                "category": "basics",
                "subcategory": "first_steps",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 5,
                "videos_count": 5,
                "materials_count": 3,
                "instructor_name": "Ольга Миронова",
                "instructor_bio": "Фелинолог, заводчик кошек с 15-летним стажем",
                "what_you_will_learn": "Безопасность в доме\nВыбор лотка и наполнителя\nПервые игрушки\nАдаптация котёнка",
                "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400"
            },
            {
                "title": "Приучение котёнка к лотку",
                "description": "Эффективные методы приучения котёнка к лотку. Выбор наполнителя и решение проблем с туалетом.",
                "duration": 35,
                "price": 0,
                "pet_type": "cat",
                "category": "basics",
                "subcategory": "toilet_training",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 4,
                "videos_count": 4,
                "materials_count": 2,
                "instructor_name": "Анна Белова",
                "instructor_bio": "Специалист по поведению кошек",
                "what_you_will_learn": "Выбор лотка и наполнителя\nРазмещение лотка\nРешение проблем\nУход за лотком",
                "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"
            },
            {
                "title": "Питание кошек: основы",
                "description": "Правильный выбор корма для кошки. Режим кормления, нормы и опасные продукты.",
                "duration": 55,
                "price": 0,
                "pet_type": "cat",
                "category": "nutrition",
                "subcategory": "feeding_basics",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 5,
                "videos_count": 5,
                "materials_count": 3,
                "instructor_name": "Ветеринар Наталья Смирнова",
                "instructor_bio": "Ветеринарный диетолог, специалист по питанию кошек",
                "what_you_will_learn": "Сухой vs влажный корм\nРежим кормления\nОпасные продукты\nКонтроль веса",
                "image_url": "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400"
            },
            
            # Универсальные - бесплатные
            {
                "title": "Вакцинация питомцев: что нужно знать",
                "description": "График вакцинации для собак и кошек. Обязательные прививки и подготовка к вакцинации.",
                "duration": 45,
                "price": 0,
                "pet_type": "all",
                "category": "health",
                "subcategory": "vaccination",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 4,
                "videos_count": 4,
                "materials_count": 3,
                "instructor_name": "Ветеринар Дмитрий Козлов",
                "instructor_bio": "Практикующий ветеринарный врач с 12-летним стажем",
                "what_you_will_learn": "Обязательные прививки\nГрафик вакцинации\nПодготовка к прививке\nПоствакцинальный период",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Как выбрать ветеринара",
                "description": "Критерии выбора хорошей ветклиники. Когда срочно везти питомца к врачу и признаки болезней.",
                "duration": 40,
                "price": 0,
                "pet_type": "all",
                "category": "health",
                "subcategory": "prevention",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 4,
                "videos_count": 4,
                "materials_count": 2,
                "instructor_name": "Ветеринар Ирина Павлова",
                "instructor_bio": "Главный врач ветеринарной клиники, опыт 20 лет",
                "what_you_will_learn": "Критерии выбора клиники\nПризнаки болезней\nКогда нужна срочная помощь\nПодготовка к визиту",
                "image_url": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400"
            },
            {
                "title": "Социализация питомца",
                "description": "Как правильно социализировать щенка или котёнка с людьми, другими животными и окружающим миром.",
                "duration": 65,
                "price": 0,
                "pet_type": "all",
                "category": "basics",
                "subcategory": "socialization",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Зоопсихолог Виктория Орлова",
                "instructor_bio": "Специалист по поведению животных, зоопсихолог",
                "what_you_will_learn": "Знакомство с новыми людьми\nКонтакт с другими животными\nАдаптация к улице\nПреодоление страхов",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },
            {
                "title": "Базовая гигиена питомца",
                "description": "Уход за шерстью, когтями, ушами и зубами. Основы груминга для собак и кошек в домашних условиях.",
                "duration": 50,
                "price": 0,
                "pet_type": "all",
                "category": "care",
                "subcategory": "hygiene",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 5,
                "videos_count": 5,
                "materials_count": 3,
                "instructor_name": "Грумер Екатерина Новикова",
                "instructor_bio": "Профессиональный грумер с 8-летним опытом",
                "what_you_will_learn": "Стрижка когтей\nЧистка ушей\nУход за зубами\nРасчёсывание шерсти",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },

            # Дополнительные бесплатные курсы - разные форматы и категории

            # Собаки - дополнительные бесплатные
            {
                "title": "Базовые команды для собак",
                "description": "Интерактивный курс обучения собаки основным командам. Практические упражнения с обратной связью.",
                "duration": 75,
                "price": 0,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "obedience",
                "level": "beginner",
                "format_type": "interactive",
                "lessons_count": 8,
                "videos_count": 6,
                "materials_count": 5,
                "instructor_name": "Сергей Петренко",
                "instructor_bio": "Кинолог, чемпион России по аджилити",
                "what_you_will_learn": "Команда 'Ко мне'\nКоманда 'Сидеть'\nКоманда 'Лежать'\nХодьба на поводке",
                "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
            },
            {
                "title": "Проблемы поведения щенков",
                "description": "Курс поможет разобраться в причинах проблемного поведения щенков и научит эффективным методам коррекции.",
                "duration": 55,
                "price": 0,
                "pet_type": "dog",
                "category": "behavior",
                "subcategory": "behavior_problems",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 3,
                "instructor_name": "Зоопсихолог Анна Ковалева",
                "instructor_bio": "Специалист по поведению собак, 15 лет опыта",
                "what_you_will_learn": "Причины проблем поведения\nКоррекция кусания\nПреодоление страхов\nУстановление иерархии",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },
            {
                "title": "Домашний груминг собак",
                "description": "Профессиональные техники домашнего груминга для собак. Уход за шерстью, когтями и кожей.",
                "duration": 65,
                "price": 0,
                "pet_type": "dog",
                "category": "care",
                "subcategory": "hygiene",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 7,
                "videos_count": 7,
                "materials_count": 4,
                "instructor_name": "Грумер Ольга Сидорова",
                "instructor_bio": "Мастер-грумер, победитель международных конкурсов",
                "what_you_will_learn": "Расчёсывание разных типов шерсти\nСтрижка когтей\nУход за ушами\nКупание и сушка",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },

            # Кошки - дополнительные бесплатные
            {
                "title": "Дрессировка кошек для начинающих",
                "description": "Интерактивный курс обучения кошки базовым командам и трюкам методом кликер-дрессировки.",
                "duration": 70,
                "price": 0,
                "pet_type": "cat",
                "category": "training",
                "subcategory": "tricks",
                "level": "beginner",
                "format_type": "interactive",
                "lessons_count": 7,
                "videos_count": 5,
                "materials_count": 4,
                "instructor_name": "Мария Иванова",
                "instructor_bio": "Фелинолог, специалист по дрессировке кошек",
                "what_you_will_learn": "Основы кликер-дрессировки\nКоманда 'Ко мне'\nБазовые трюки\nРазвитие интеллекта кошки",
                "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400"
            },
            {
                "title": "Проблемы поведения кошек",
                "description": "Курс поможет разобраться в причинах проблемного поведения кошек и найти эффективные решения.",
                "duration": 60,
                "price": 0,
                "pet_type": "cat",
                "category": "behavior",
                "subcategory": "behavior_problems",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Зоопсихолог Елена Романова",
                "instructor_bio": "Специалист по поведению кошек, ветеринар",
                "what_you_will_learn": "Причины агрессии кошек\nРешение проблем с метками\nПреодоление страхов\nКоррекция нежелательного поведения",
                "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400"
            },
            {
                "title": "Домашний груминг кошек",
                "description": "Комплексный курс по уходу за шерстью и гигиеной кошек в домашних условиях.",
                "duration": 50,
                "price": 0,
                "pet_type": "cat",
                "category": "care",
                "subcategory": "hygiene",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 3,
                "instructor_name": "Грумер Светлана Петрова",
                "instructor_bio": "Специалист по грумингу кошек, 12 лет опыта",
                "what_you_will_learn": "Расчёсывание шерсти\nСтрижка когтей\nУход за ушами\nКупание кошек",
                "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"
            },

            # Универсальные - дополнительные бесплатные (разные форматы)
            {
                "title": "Первая помощь питомцам",
                "description": "Курс первой помощи для экстренных ситуаций. Спасение жизни питомца до приезда специалиста.",
                "duration": 80,
                "price": 0,
                "pet_type": "all",
                "category": "health",
                "subcategory": "first_aid",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 8,
                "videos_count": 8,
                "materials_count": 6,
                "instructor_name": "Ветеринар скорой помощи Алексей Смирнов",
                "instructor_bio": "Врач ветеринарной скорой помощи, 15 лет опыта",
                "what_you_will_learn": "Действия при отравлении\nОстановка кровотечения\nПомощь при травмах\nСердечно-легочная реанимация",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Защита от паразитов",
                "description": "Полное руководство по защите питомцев от паразитов. Виды паразитов и методы профилактики.",
                "duration": 35,
                "price": 0,
                "pet_type": "all",
                "category": "health",
                "subcategory": "prevention",
                "level": "beginner",
                "format_type": "text",
                "lessons_count": 3,
                "videos_count": 0,
                "materials_count": 2,
                "instructor_name": "Ветеринарный паразитолог Ольга Козлова",
                "instructor_bio": "Специалист по паразитарным заболеваниям",
                "what_you_will_learn": "Виды паразитов собак и кошек\nВыбор средств защиты\nГрафик обработок\nПризнаки заражения",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Обогащение среды для питомцев",
                "description": "Интерактивный курс по созданию интересной среды для собак и кошек. Предотвращение скуки и развитие.",
                "duration": 90,
                "price": 0,
                "pet_type": "all",
                "category": "care",
                "subcategory": "enrichment",
                "level": "beginner",
                "format_type": "interactive",
                "lessons_count": 6,
                "videos_count": 4,
                "materials_count": 8,
                "instructor_name": "Зоопсихолог Марина Сергеева",
                "instructor_bio": "Специалист по поведению животных, эксперт по обогащению",
                "what_you_will_learn": "Игрушки и развлечения\nИнтеллектуальные игры\nСамодельные обогащения\nРешение проблем поведения",
                "image_url": "https://images.unsplash.com/photo-1601758003122-53c40e69881006?w=400"
            },

            # ========== ПЛАТНЫЕ КУРСЫ СРЕДНЕГО УРОВНЯ (10 курсов) ==========
            
            # Собаки - платные средний уровень
            {
                "title": "Послушание: базовые команды",
                "description": "Обучение собаки основным командам: сидеть, лежать, стоять, ко мне, рядом. Практические упражнения.",
                "duration": 120,
                "price": 1490,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "obedience",
                "level": "intermediate",
                "format_type": "interactive",
                "lessons_count": 12,
                "videos_count": 12,
                "materials_count": 8,
                "instructor_name": "Кинолог Сергей Иванов",
                "instructor_bio": "Сертифицированный кинолог, призёр соревнований по обидиенс",
                "what_you_will_learn": "Команда 'сидеть'\nКоманда 'лежать'\nКоманда 'ко мне'\nВыдержка и контроль",
                "completion_time": "3-4 недели",
                "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
            },
            {
                "title": "Коррекция лая и воя",
                "description": "Понимание причин избыточного лая и методы коррекции. Работа с лаем на звонок, прохожих, одиночеством.",
                "duration": 90,
                "price": 1790,
                "pet_type": "dog",
                "category": "behavior",
                "subcategory": "behavior_problems",
                "level": "intermediate",
                "format_type": "video",
                "lessons_count": 8,
                "videos_count": 8,
                "materials_count": 5,
                "instructor_name": "Зоопсихолог Андрей Петров",
                "instructor_bio": "Специалист по коррекции поведения собак",
                "what_you_will_learn": "Причины лая\nЛай на звонок\nЛай на прогулке\nВой в одиночестве",
                "completion_time": "2-3 недели",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },
            {
                "title": "Уход за шерстью собаки",
                "description": "Профессиональные техники груминга для разных типов шерсти. Расчёсывание, мытьё, сушка.",
                "duration": 100,
                "price": 1290,
                "pet_type": "dog",
                "category": "care",
                "subcategory": "coat_care",
                "level": "intermediate",
                "format_type": "video",
                "lessons_count": 10,
                "videos_count": 10,
                "materials_count": 6,
                "instructor_name": "Грумер Татьяна Морозова",
                "instructor_bio": "Мастер-грумер, победитель конкурсов груминга",
                "what_you_will_learn": "Типы шерсти\nТехники расчёсывания\nПравильное мытьё\nСушка и укладка",
                "completion_time": "2 недели",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },
            
            # Кошки - платные средний уровень
            {
                "title": "Дрессировка кошек",
                "description": "Обучение кошки базовым командам и трюкам методом положительного подкрепления. Да, кошек тоже можно дрессировать!",
                "duration": 110,
                "price": 1590,
                "pet_type": "cat",
                "category": "training",
                "subcategory": "tricks",
                "level": "intermediate",
                "format_type": "interactive",
                "lessons_count": 10,
                "videos_count": 10,
                "materials_count": 6,
                "instructor_name": "Фелинолог Марина Волкова",
                "instructor_bio": "Специалист по дрессировке кошек, автор методики",
                "what_you_will_learn": "Основы кликер-дрессировки\nКоманда 'сидеть'\nПрыжки через препятствия\nИнтерактивные игры",
                "completion_time": "3-4 недели",
                "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400"
            },
            {
                "title": "Решение проблем с метками",
                "description": "Почему кошки метят территорию и как это исправить. Работа с стрессом и территориальным поведением.",
                "duration": 80,
                "price": 1890,
                "pet_type": "cat",
                "category": "behavior",
                "subcategory": "behavior_problems",
                "level": "intermediate",
                "format_type": "video",
                "lessons_count": 7,
                "videos_count": 7,
                "materials_count": 4,
                "instructor_name": "Зоопсихолог Лариса Ковалёва",
                "instructor_bio": "Специалист по поведению кошек с 10-летним опытом",
                "what_you_will_learn": "Причины меток\nСтресс-факторы\nОрганизация территории\nМедикаментозная поддержка",
                "completion_time": "2-3 недели",
                "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400"
            },
            {
                "title": "Игры и обогащение среды для кошки",
                "description": "Как создать интересную среду для кошки. Виды игр, игрушки своими руками, интерактивные кормушки.",
                "duration": 70,
                "price": 990,
                "pet_type": "cat",
                "category": "entertainment",
                "subcategory": "games",
                "level": "intermediate",
                "format_type": "video",
                "lessons_count": 7,
                "videos_count": 7,
                "materials_count": 5,
                "instructor_name": "Фелинолог Юлия Захарова",
                "instructor_bio": "Консультант по обогащению среды для кошек",
                "what_you_will_learn": "Виды игр\nИгрушки своими руками\nИнтерактивные кормушки\nОрганизация пространства",
                "completion_time": "1-2 недели",
                "image_url": "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400"
            },
            
            # Универсальные - платные средний уровень
            {
                "title": "Натуральное питание питомцев",
                "description": "Составление рациона из натуральных продуктов для собак и кошек. Рецепты и расчёт порций.",
                "duration": 130,
                "price": 1990,
                "pet_type": "all",
                "category": "nutrition",
                "subcategory": "natural_feeding",
                "level": "intermediate",
                "format_type": "mixed",
                "lessons_count": 12,
                "videos_count": 10,
                "materials_count": 15,
                "instructor_name": "Ветеринарный диетолог Анна Кузьмина",
                "instructor_bio": "Специалист по натуральному питанию животных",
                "what_you_will_learn": "Основы BARF и RAW\nРасчёт рациона\nРецепты блюд\nДобавки и витамины",
                "completion_time": "4 недели",
                "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"
            },
            {
                "title": "Первая помощь питомцу",
                "description": "Экстренная помощь при травмах, отравлениях, перегреве. Аптечка первой помощи и алгоритмы действий.",
                "duration": 100,
                "price": 2490,
                "pet_type": "all",
                "category": "health",
                "subcategory": "first_aid",
                "level": "intermediate",
                "format_type": "interactive",
                "lessons_count": 10,
                "videos_count": 10,
                "materials_count": 8,
                "instructor_name": "Ветеринар Михаил Соловьёв",
                "instructor_bio": "Врач скорой ветеринарной помощи",
                "what_you_will_learn": "Состав аптечки\nПомощь при травмах\nДействия при отравлении\nТранспортировка",
                "completion_time": "2 недели",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Путешествия с питомцем",
                "description": "Подготовка к поездке на машине, поезде и самолёте. Документы, переноски, адаптация.",
                "duration": 90,
                "price": 1290,
                "pet_type": "all",
                "category": "specialized",
                "subcategory": None,
                "level": "intermediate",
                "format_type": "video",
                "lessons_count": 8,
                "videos_count": 8,
                "materials_count": 6,
                "instructor_name": "Путешественник Игорь Николаев",
                "instructor_bio": "Автор блога о путешествиях с собакой, посетил 30 стран",
                "what_you_will_learn": "Документы для поездки\nВыбор переноски\nПоездка на машине\nПерелёт с питомцем",
                "completion_time": "1-2 недели",
                "image_url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400"
            },
            {
                "title": "Профилактика паразитов",
                "description": "Защита от блох, клещей, глистов. Сезонная обработка и выбор препаратов.",
                "duration": 60,
                "price": 990,
                "pet_type": "all",
                "category": "health",
                "subcategory": "prevention",
                "level": "intermediate",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Ветеринар Ольга Фёдорова",
                "instructor_bio": "Ветеринарный паразитолог",
                "what_you_will_learn": "Виды паразитов\nВыбор препаратов\nГрафик обработки\nПризнаки заражения",
                "completion_time": "1 неделя",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },

            # ========== ПЛАТНЫЕ КУРСЫ ПРОДВИНУТОГО УРОВНЯ (10 курсов) ==========
            
            # Собаки - платные продвинутый/эксперт
            {
                "title": "Аджилити: полный курс",
                "description": "Подготовка к соревнованиям по аджилити. Преодоление препятствий, работа в связке, скорость и точность.",
                "duration": 240,
                "price": 3990,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "sports",
                "level": "advanced",
                "format_type": "workshop",
                "lessons_count": 20,
                "videos_count": 20,
                "materials_count": 12,
                "instructor_name": "Тренер Владимир Громов",
                "instructor_bio": "Чемпион России по аджилити, судья международного класса",
                "what_you_will_learn": "Базовые препятствия\nРабота без поводка\nТрассы разной сложности\nПодготовка к соревнованиям",
                "completion_time": "2-3 месяца",
                "requirements": "Собака должна знать базовые команды и быть в хорошей физической форме",
                "image_url": "https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=400"
            },
            {
                "title": "Коррекция агрессии собак",
                "description": "Глубокий курс по работе с агрессивным поведением. Диагностика, план коррекции, безопасность.",
                "duration": 180,
                "price": 4490,
                "pet_type": "dog",
                "category": "behavior",
                "subcategory": "aggression",
                "level": "advanced",
                "format_type": "mixed",
                "lessons_count": 15,
                "videos_count": 15,
                "materials_count": 10,
                "instructor_name": "Зоопсихолог Николай Власов",
                "instructor_bio": "Ведущий специалист по агрессии собак в России",
                "what_you_will_learn": "Виды агрессии\nДиагностика причин\nМетоды коррекции\nБезопасность семьи",
                "completion_time": "2 месяца",
                "requirements": "Только для взрослых. Работа с агрессивной собакой требует осторожности.",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },
            {
                "title": "Подготовка к выставкам",
                "description": "Хендлинг, ринговая подготовка, груминг для выставок. Секреты успешного показа собаки.",
                "duration": 200,
                "price": 3490,
                "pet_type": "dog",
                "category": "specialized",
                "subcategory": "shows",
                "level": "advanced",
                "format_type": "workshop",
                "lessons_count": 16,
                "videos_count": 16,
                "materials_count": 10,
                "instructor_name": "Хендлер Светлана Романова",
                "instructor_bio": "Профессиональный хендлер, победитель Crufts",
                "what_you_will_learn": "Ринговая подготовка\nГруминг для выставок\nПсихология судей\nСтратегия показа",
                "completion_time": "2-3 месяца",
                "requirements": "Собака должна соответствовать стандарту породы",
                "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
            },
            {
                "title": "Дрессировка служебных собак",
                "description": "Основы подготовки собаки для охранной и защитной службы. IPO, следовая работа, защита.",
                "duration": 280,
                "price": 5990,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "service",
                "level": "expert",
                "format_type": "workshop",
                "lessons_count": 25,
                "videos_count": 25,
                "materials_count": 15,
                "instructor_name": "Инструктор Борис Сидоров",
                "instructor_bio": "Бывший кинолог МВД, 25 лет опыта служебного собаководства",
                "what_you_will_learn": "Следовая работа\nПослушание IPO\nЗащитный раздел\nПодготовка к экзаменам",
                "completion_time": "4-6 месяцев",
                "requirements": "Собака служебной породы, возраст от 1 года, базовое послушание",
                "image_url": "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400"
            },
            
            # Кошки - платные продвинутый
            {
                "title": "Фелинотерапия: работа с людьми",
                "description": "Подготовка кошки для терапевтической работы в больницах, домах престарелых, реабилитационных центрах.",
                "duration": 150,
                "price": 2990,
                "pet_type": "cat",
                "category": "specialized",
                "subcategory": "therapy",
                "level": "advanced",
                "format_type": "mixed",
                "lessons_count": 12,
                "videos_count": 10,
                "materials_count": 8,
                "instructor_name": "Фелинотерапевт Ирина Громова",
                "instructor_bio": "Основатель центра фелинотерапии, клинический психолог",
                "what_you_will_learn": "Отбор кошек для терапии\nПодготовка к визитам\nРабота с пациентами\nЭтика и безопасность",
                "completion_time": "2 месяца",
                "requirements": "Спокойная, социализированная кошка без агрессии",
                "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"
            },
            {
                "title": "Коррекция агрессии у кошек",
                "description": "Работа с агрессивным поведением кошек. Диагностика, план терапии, медикаментозная поддержка.",
                "duration": 120,
                "price": 2490,
                "pet_type": "cat",
                "category": "behavior",
                "subcategory": "aggression",
                "level": "advanced",
                "format_type": "video",
                "lessons_count": 10,
                "videos_count": 10,
                "materials_count": 7,
                "instructor_name": "Зоопсихолог Елена Карпова",
                "instructor_bio": "Специалист по агрессии кошек, автор научных публикаций",
                "what_you_will_learn": "Виды агрессии у кошек\nТриггеры и причины\nМетоды коррекции\nКогда нужен ветеринар",
                "completion_time": "1.5 месяца",
                "requirements": "Рекомендуется консультация ветеринара перед началом",
                "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400"
            },
            
            # Универсальные - платные продвинутый/эксперт
            {
                "title": "Ветеринарная диетология",
                "description": "Профессиональный курс по составлению лечебных диет для собак и кошек с различными заболеваниями.",
                "duration": 200,
                "price": 4990,
                "pet_type": "all",
                "category": "nutrition",
                "subcategory": "diet_selection",
                "level": "expert",
                "format_type": "webinar",
                "lessons_count": 16,
                "videos_count": 14,
                "materials_count": 20,
                "instructor_name": "Профессор Александр Медведев",
                "instructor_bio": "Доктор ветеринарных наук, автор учебников по диетологии",
                "what_you_will_learn": "Диеты при болезнях ЖКТ\nДиеты при МКБ\nДиеты при аллергии\nДиеты при ожирении",
                "completion_time": "3 месяца",
                "requirements": "Базовые знания анатомии и физиологии животных",
                "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"
            },
            {
                "title": "Зоопсихология: глубокий курс",
                "description": "Понимание психологии собак и кошек на научном уровне. Теории поведения, эмоции, обучение.",
                "duration": 220,
                "price": 3990,
                "pet_type": "all",
                "category": "behavior",
                "subcategory": None,
                "level": "advanced",
                "format_type": "webinar",
                "lessons_count": 18,
                "videos_count": 16,
                "materials_count": 15,
                "instructor_name": "Профессор Галина Соколова",
                "instructor_bio": "Доктор биологических наук, зоопсихолог",
                "what_you_will_learn": "Теории обучения\nЭмоции животных\nКогнитивные способности\nДиагностика проблем",
                "completion_time": "3-4 месяца",
                "requirements": "Интерес к научному подходу в работе с животными",
                "image_url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"
            },
            {
                "title": "Основы разведения",
                "description": "Планирование вязки, беременность, роды, выращивание потомства. Генетика и отбор производителей.",
                "duration": 180,
                "price": 3490,
                "pet_type": "all",
                "category": "specialized",
                "subcategory": "breeding",
                "level": "advanced",
                "format_type": "mixed",
                "lessons_count": 15,
                "videos_count": 12,
                "materials_count": 12,
                "instructor_name": "Заводчик Наталья Егорова",
                "instructor_bio": "Владелец питомника с 20-летним стажем, эксперт РКФ",
                "what_you_will_learn": "Генетика окрасов\nПодбор пары\nВедение беременности\nУход за потомством",
                "completion_time": "2-3 месяца",
                "requirements": "Племенное животное с родословной",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },
            {
                "title": "Канистерапия: сертификация",
                "description": "Профессиональная подготовка к работе собаки-терапевта. Тестирование, сертификация, работа с клиентами.",
                "duration": 200,
                "price": 4490,
                "pet_type": "dog",
                "category": "specialized",
                "subcategory": "therapy",
                "level": "expert",
                "format_type": "workshop",
                "lessons_count": 16,
                "videos_count": 14,
                "materials_count": 12,
                "instructor_name": "Канистерапевт Мария Лебедева",
                "instructor_bio": "Сертифицированный канистерапевт, президент ассоциации",
                "what_you_will_learn": "Отбор и тестирование собак\nТехники терапии\nРабота с разными группами\nПолучение сертификата",
                "completion_time": "3-4 месяца",
                "requirements": "Спокойная социализированная собака, пройденный курс послушания",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },
        ]

        # Очищаем существующие данные
        from apps.training.models import Lesson, Comment, Rating, CommentLike
        Lesson.objects.all().delete()
        Comment.objects.all().delete()
        Rating.objects.all().delete()
        CommentLike.objects.all().delete()
        Course.objects.all().delete()
        self.stdout.write(self.style.WARNING('Очищены существующие курсы и связанные данные'))

        courses_created = 0
        lessons_created = 0

        for data in courses_data:
            course = Course.objects.create(
                title=data['title'],
                description=data['description'],
                duration=data['duration'],
                price=data['price'],
                pet_type=data['pet_type'],
                category=data['category'],
                subcategory=data.get('subcategory'),
                level=data['level'],
                format_type=data['format_type'],
                image_url=data.get('image_url'),
                lessons_count=data.get('lessons_count', 0),
                videos_count=data.get('videos_count', 0),
                materials_count=data.get('materials_count', 0),
                instructor_name=data.get('instructor_name'),
                instructor_bio=data.get('instructor_bio'),
                what_you_will_learn=data.get('what_you_will_learn'),
                completion_time=data.get('completion_time'),
                requirements=data.get('requirements'),
                # Поля персонализации
                recommended_behavior_types=data.get('recommended_behavior_types', []),
                recommended_activity_levels=data.get('recommended_activity_levels', []),
                recommended_social_levels=data.get('recommended_social_levels', []),
                min_training_experience=data.get('min_training_experience'),
                compatible_health_issues=data.get('compatible_health_issues', []),
                addresses_special_needs=data.get('addresses_special_needs', []),
                suitable_activities=data.get('suitable_activities', []),
                addresses_behavioral_problems=data.get('addresses_behavioral_problems', []),
                is_active=True,
            )
            courses_created += 1

            # Создаем уроки для курса
            lessons_count = self.create_lessons_for_course(course, data)
            lessons_created += lessons_count

            price_text = "Бесплатно" if data["price"] == 0 else f"{data['price']} руб."
            self.stdout.write(f'Создан курс: {data["title"]} [{data["level"]}] - {price_text} ({lessons_count} уроков)')

        # Создаем тестовые комментарии и оценки
        comments_created, ratings_created = self.create_test_comments_and_ratings()

        # Статистика
        total_courses = Course.objects.count()
        dog_courses = Course.objects.filter(pet_type='dog').count()
        cat_courses = Course.objects.filter(pet_type='cat').count()
        all_courses = Course.objects.filter(pet_type='all').count()
        free_courses = Course.objects.filter(price=0).count()
        paid_courses = Course.objects.filter(price__gt=0).count()

        beginner_courses = Course.objects.filter(level='beginner').count()
        intermediate_courses = Course.objects.filter(level='intermediate').count()
        advanced_courses = Course.objects.filter(level='advanced').count()
        expert_courses = Course.objects.filter(level='expert').count()

        # Статистика форматов
        video_courses = Course.objects.filter(format_type='video').count()
        text_courses = Course.objects.filter(format_type='text').count()
        interactive_courses = Course.objects.filter(format_type='interactive').count()
        mixed_courses = Course.objects.filter(format_type='mixed').count()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS(f'Создано курсов: {courses_created}'))
        self.stdout.write(self.style.SUCCESS(f'Создано уроков: {lessons_created}'))
        self.stdout.write(self.style.SUCCESS(f'Создано комментариев: {comments_created}'))
        self.stdout.write(self.style.SUCCESS(f'Создано оценок: {ratings_created}'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS(f'По типу животного:'))
        self.stdout.write(f'  [DOG] Курсы для собак: {dog_courses}')
        self.stdout.write(f'  [CAT] Курсы для кошек: {cat_courses}')
        self.stdout.write(f'  [ALL] Универсальные курсы: {all_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'По цене:'))
        self.stdout.write(f'  [FREE] Бесплатные курсы: {free_courses}')
        self.stdout.write(f'  [PAID] Платные курсы: {paid_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'По уровню:'))
        self.stdout.write(f'  [BEGINNER] Начинающий: {beginner_courses}')
        self.stdout.write(f'  [INTERMEDIATE] Средний: {intermediate_courses}')
        self.stdout.write(f'  [ADVANCED] Продвинутый: {advanced_courses}')
        self.stdout.write(f'  [EXPERT] Эксперт: {expert_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'По формату обучения:'))
        self.stdout.write(f'  [VIDEO] Видео: {video_courses}')
        self.stdout.write(f'  [TEXT] Текстовые: {text_courses}')
        self.stdout.write(f'  [INTERACTIVE] Интерактивные: {interactive_courses}')
        self.stdout.write(f'  [MIXED] Смешанные: {mixed_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Курсы успешно загружены!'))
