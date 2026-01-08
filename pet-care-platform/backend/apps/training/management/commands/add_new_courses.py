"""
Команда для добавления 20 новых курсов для собак и кошек
10 бесплатных + 10 платных курсов

Использование:
    python manage.py add_new_courses
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.training.models import Course, Lesson, Comment, Rating
from apps.pets.models import Pet
import random


class Command(BaseCommand):
    help = 'Добавление 20 новых курсов для собак и кошек'

    def create_lessons_for_course(self, course, course_data):
        """
        Создает уроки для курса на основе его типа и характеристик.
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

    def create_test_comments_and_ratings(self, new_courses):
        """
        Создает тестовые комментарии и оценки для новых курсов.

        Args:
            new_courses: список новых созданных курсов

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

        comments_created = 0
        ratings_created = 0

        # Создаем оценки для новых курсов
        for course in new_courses:
            # Выбираем случайных пользователей для оценки
            rating_users = random.sample(list(users), min(len(users), random.randint(1, 3)))

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
                    lesson_comments = random.randint(0, 2)  # 0-2 комментария к урокам

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
        self.stdout.write('Добавление 20 новых курсов для собак и кошек...')

        new_courses_data = [
            # ========== 10 БЕСПЛАТНЫХ КУРСОВ ==========

            # Новые бесплатные курсы для собак
            {
                "title": "Игры и развитие интеллекта собак",
                "description": "Как развивать умственные способности собаки через игры. Головоломки, поисковые игры, развитие когнитивных навыков.",
                "duration": 85,
                "price": 0,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "games",
                "level": "beginner",
                "format_type": "interactive",
                "lessons_count": 8,
                "videos_count": 6,
                "materials_count": 8,
                "instructor_name": "Игротерапевт Анна Светлова",
                "instructor_bio": "Специалист по игровому развитию собак, автор методики умственных игр",
                "what_you_will_learn": "Головоломки для собак\nПоисковые игры\nРазвитие памяти\nИгры на сообразительность",
                "image_url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
                "recommended_behavior_types": ["active", "playful", "curious"],
                "recommended_activity_levels": ["high", "medium"],
                "recommended_social_levels": ["social", "home_only"],
                "min_training_experience": "none",
                "addresses_behavioral_problems": ["boredom", "hyperactivity"],
                "suitable_activities": ["games", "puzzles", "training"]
            },
            {
                "title": "Сезонный уход за собакой",
                "description": "Уход за шерстью собаки в зависимости от сезона. Линька, защита от холода и жары, сезонные проблемы кожи.",
                "duration": 70,
                "price": 0,
                "pet_type": "dog",
                "category": "care",
                "subcategory": "seasonal_care",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Грумер Марина Зимняя",
                "instructor_bio": "Специалист по сезонному грумингу собак",
                "what_you_will_learn": "Уход за шерстью зимой\nЛетний уход за шерстью\nБорьба с линькой\nЗащита от солнца и холода",
                "image_url": "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400"
            },
            {
                "title": "Понимание языка тела собак",
                "description": "Как читать язык тела собаки. Понимание сигналов, жестов, поз. Что означает виляние хвостом, поднятые уши, прижатые уши.",
                "duration": 60,
                "price": 0,
                "pet_type": "dog",
                "category": "behavior",
                "subcategory": "body_language",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 7,
                "videos_count": 7,
                "materials_count": 5,
                "instructor_name": "Зоопсихолог Дмитрий Волков",
                "instructor_bio": "Специалист по поведению собак, эксперт по невербальной коммуникации",
                "what_you_will_learn": "Сигналы дружелюбия\nПризнаки агрессии\nСигналы страха\nЯзык хвоста и ушей",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },

            # Новые бесплатные курсы для кошек
            {
                "title": "Создание кошачьего счастья дома",
                "description": "Как сделать дом максимально комфортным для кошки. Устройство лежанок, когтеточек, игровых зон. Создание вертикального пространства.",
                "duration": 75,
                "price": 0,
                "pet_type": "cat",
                "category": "care",
                "subcategory": "home_setup",
                "level": "beginner",
                "format_type": "mixed",
                "lessons_count": 8,
                "videos_count": 6,
                "materials_count": 6,
                "instructor_name": "Дизайнер кошачьих пространств Елена Котова",
                "instructor_bio": "Специалист по созданию комфортной среды для кошек",
                "what_you_will_learn": "Организация вертикального пространства\nВыбор когтеточек\nУстройство игровых зон\nСоздание уединенных мест",
                "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"
            },
            {
                "title": "Когтеточки и точилки для когтей",
                "description": "Как правильно подобрать и разместить когтеточки. Почему кошки точат когти и как направить это поведение в нужное русло.",
                "duration": 45,
                "price": 0,
                "pet_type": "cat",
                "category": "care",
                "subcategory": "scratching_posts",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 5,
                "videos_count": 5,
                "materials_count": 3,
                "instructor_name": "Фелинолог Светлана Коготькова",
                "instructor_bio": "Эксперт по поведению кошек, специалист по когтеточкам",
                "what_you_will_learn": "Виды когтеточек\nРазмещение когтеточек\nПочему кошки точат когти\nАльтернативы мебели",
                "image_url": "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400"
            },
            {
                "title": "Игры с кошкой: интерактивные развлечения",
                "description": "Как правильно играть с кошкой. Интерактивные игрушки, лазерные указки, игры на развитие охотничьих инстинктов.",
                "duration": 65,
                "price": 0,
                "pet_type": "cat",
                "category": "entertainment",
                "subcategory": "interactive_games",
                "level": "beginner",
                "format_type": "interactive",
                "lessons_count": 6,
                "videos_count": 4,
                "materials_count": 5,
                "instructor_name": "Игротерапевт Кристина Мурлыкова",
                "instructor_bio": "Специалист по играм с кошками, фелинолог",
                "what_you_will_learn": "Интерактивные игрушки\nИгры с лазерной указкой\nРазвитие охотничьих инстинктов\nБезопасные игры",
                "image_url": "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400"
            },

            # Новые бесплатные универсальные курсы
            {
                "title": "Распознавание болевых сигналов у питомцев",
                "description": "Как понять, что питомец испытывает боль. Скрытые признаки боли у собак и кошек. Когда срочно к ветеринару.",
                "duration": 55,
                "price": 0,
                "pet_type": "all",
                "category": "health",
                "subcategory": "pain_recognition",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Ветеринарный врач Ольга Больнова",
                "instructor_bio": "Специалист по болевому синдрому у животных",
                "what_you_will_learn": "Признаки боли у собак\nПризнаки боли у кошек\nСкрытая боль\nЭкстренные ситуации",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Фотосессия с питомцем: подготовка и проведение",
                "description": "Как подготовить питомца к фотосессии. Выбор поз, естественное поведение, работа с фоном и освещением.",
                "duration": 50,
                "price": 0,
                "pet_type": "all",
                "category": "specialized",
                "subcategory": "pet_photography",
                "level": "beginner",
                "format_type": "mixed",
                "lessons_count": 5,
                "videos_count": 4,
                "materials_count": 4,
                "instructor_name": "Фотограф животных Мария Ленсова",
                "instructor_bio": "Профессиональный фотограф питомцев, автор курсов по пет-фотографии",
                "what_you_will_learn": "Подготовка к съемке\nВыбор поз\nРабота с поведением\nОбработка фотографий",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },
            {
                "title": "Старение питомцев: особенности ухода",
                "description": "Как ухаживать за пожилыми собаками и кошками. Изменения в питании, активность, медицинское сопровождение.",
                "duration": 80,
                "price": 0,
                "pet_type": "all",
                "category": "care",
                "subcategory": "senior_care",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 7,
                "videos_count": 7,
                "materials_count": 5,
                "instructor_name": "Гериатр ветеринар Сергей Старков",
                "instructor_bio": "Ветеринар-гериатр, специалист по пожилым животным",
                "what_you_will_learn": "Признаки старения\nИзменения в питании\nАдаптация активности\nМедицинский уход",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },
            {
                "title": "Питомец и дети: безопасное знакомство",
                "description": "Как познакомить питомца с детьми. Обучение детей правильному обращению с животными. Безопасность в семье.",
                "duration": 60,
                "price": 0,
                "pet_type": "all",
                "category": "behavior",
                "subcategory": "family_introduction",
                "level": "beginner",
                "format_type": "video",
                "lessons_count": 6,
                "videos_count": 6,
                "materials_count": 4,
                "instructor_name": "Семейный психолог Анна Семейкина",
                "instructor_bio": "Психолог, специалист по взаимодействию детей и животных",
                "what_you_will_learn": "Подготовка к знакомству\nОбучение детей\nПравила безопасности\nРазрешение конфликтов",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            },

            # ========== 10 ПЛАТНЫХ КУРСОВ ==========

            # Платные курсы для собак
            {
                "title": "Поисково-спасательная подготовка собак",
                "description": "Обучение собаки поиску людей в природной среде. Развитие нюха, работы в команде, преодоление препятствий.",
                "duration": 180,
                "price": 2990,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "search_and_rescue",
                "level": "advanced",
                "format_type": "workshop",
                "lessons_count": 15,
                "videos_count": 12,
                "materials_count": 10,
                "instructor_name": "Инструктор МЧС Иван Спасов",
                "instructor_bio": "Бывший кинолог МЧС, специалист по поисково-спасательным работам",
                "what_you_will_learn": "Развитие нюха\nРабота в природной среде\nПреодоление препятствий\nКомандная работа",
                "completion_time": "3-4 месяца",
                "requirements": "Собака должна знать базовые команды, быть физически подготовленной",
                "image_url": "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400",
                "recommended_behavior_types": ["active", "obedient", "brave"],
                "recommended_activity_levels": ["high"],
                "min_training_experience": "intermediate"
            },
            {
                "title": "Курс защитника для собак",
                "description": "Подготовка собаки для защитной службы. Контроль импульсов, защита территории, работа с нарушителем.",
                "duration": 220,
                "price": 3990,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "protection",
                "level": "expert",
                "format_type": "workshop",
                "lessons_count": 18,
                "videos_count": 15,
                "materials_count": 12,
                "instructor_name": "Кинолог охраны Максим Щит",
                "instructor_bio": "Специалист по защитным собакам, инструктор служб безопасности",
                "what_you_will_learn": "Контроль агрессии\nЗащита территории\nРабота с нарушителем\nБезопасность применения",
                "completion_time": "4-6 месяцев",
                "requirements": "Собака служебной породы, возраст от 1.5 лет, базовое послушание",
                "image_url": "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400"
            },
            {
                "title": "Танцы с собаками: догдансинг",
                "description": "Обучение собаки танцевальным элементам. Синхронные движения, музыкальность, выступления на соревнованиях.",
                "duration": 140,
                "price": 2490,
                "pet_type": "dog",
                "category": "training",
                "subcategory": "dance",
                "level": "intermediate",
                "format_type": "interactive",
                "lessons_count": 12,
                "videos_count": 10,
                "materials_count": 8,
                "instructor_name": "Хореограф собак Анна Танцова",
                "instructor_bio": "Чемпионка мира по догдансингу, тренер по танцам с собаками",
                "what_you_will_learn": "Базовые танцевальные элементы\nСинхронизация с музыкой\nХореография выступлений\nПодготовка к соревнованиям",
                "completion_time": "3-4 месяца",
                "requirements": "Собака должна быть контактной и любить музыку",
                "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
            },

            # Платные курсы для кошек
            {
                "title": "Дрессировка кошек: продвинутые трюки",
                "description": "Обучение кошки сложным трюкам: прыжки через обруч, ходьба по узкой поверхности, игры с предметами.",
                "duration": 120,
                "price": 1990,
                "pet_type": "cat",
                "category": "training",
                "subcategory": "advanced_tricks",
                "level": "intermediate",
                "format_type": "interactive",
                "lessons_count": 10,
                "videos_count": 8,
                "materials_count": 7,
                "instructor_name": "Фелинолог-трюкач Кристина Котова",
                "instructor_bio": "Специалист по дрессировке кошек, победитель конкурсов кошек-артистов",
                "what_you_will_learn": "Прыжки через обруч\nХодьба по узкой поверхности\nИгры с предметами\nЦепочка команд",
                "completion_time": "2-3 месяца",
                "requirements": "Кошка должна знать базовые команды кликер-дрессировки",
                "image_url": "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400"
            },
            {
                "title": "Кошачья йога и медитация",
                "description": "Создание атмосферы спокойствия для кошки. Медитативные практики, релаксационные техники, ароматерапия.",
                "duration": 90,
                "price": 1490,
                "pet_type": "cat",
                "category": "behavior",
                "subcategory": "relaxation",
                "level": "intermediate",
                "format_type": "mixed",
                "lessons_count": 8,
                "videos_count": 6,
                "materials_count": 6,
                "instructor_name": "Мастер релаксации для кошек Ольга Спокойная",
                "instructor_bio": "Специалист по поведению кошек, мастер йоги",
                "what_you_will_learn": "Техники релаксации\nМедитативные практики\nАроматерапия для кошек\nСоздание спокойной атмосферы",
                "completion_time": "1.5-2 месяца",
                "requirements": "Кошка должна быть относительно спокойной",
                "image_url": "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400"
            },

            # Платные универсальные курсы
            {
                "title": "Ветеринарная нутрициология: составление рационов",
                "description": "Профессиональное составление диет для собак и кошек с различными заболеваниями. Расчет калорий, баланс питательных веществ.",
                "duration": 160,
                "price": 3490,
                "pet_type": "all",
                "category": "nutrition",
                "subcategory": "veterinary_nutrition",
                "level": "advanced",
                "format_type": "webinar",
                "lessons_count": 14,
                "videos_count": 12,
                "materials_count": 15,
                "instructor_name": "Доктор ветеринарных наук Мария Питательна",
                "instructor_bio": "Ветеринарный нутрициолог, кандидат наук",
                "what_you_will_learn": "Расчет калорийности рациона\nБаланс питательных веществ\nДиеты при заболеваниях\nМониторинг веса",
                "completion_time": "3 месяца",
                "requirements": "Базовые знания анатомии и физиологии животных",
                "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"
            },
            {
                "title": "Массаж и физиотерапия для питомцев",
                "description": "Техники массажа для собак и кошек. Физиотерапевтические процедуры, реабилитация после травм.",
                "duration": 130,
                "price": 2290,
                "pet_type": "all",
                "category": "health",
                "subcategory": "massage_therapy",
                "level": "intermediate",
                "format_type": "workshop",
                "lessons_count": 11,
                "videos_count": 9,
                "materials_count": 8,
                "instructor_name": "Физиотерапевт животных Сергей Массажист",
                "instructor_bio": "Сертифицированный физиотерапевт для животных",
                "what_you_will_learn": "Техники массажа\nФизиотерапевтические процедуры\nРеабилитация после травм\nПрофилактика заболеваний",
                "completion_time": "2-3 месяца",
                "requirements": "Желательно иметь опыт работы с животными",
                "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400"
            },
            {
                "title": "Профессиональная выставочная подготовка",
                "description": "Подготовка собаки или кошки к выставкам. Хендлинг, ринговая подготовка, психология выступлений.",
                "duration": 150,
                "price": 2990,
                "pet_type": "all",
                "category": "specialized",
                "subcategory": "show_preparation",
                "level": "advanced",
                "format_type": "workshop",
                "lessons_count": 12,
                "videos_count": 10,
                "materials_count": 9,
                "instructor_name": "Судья выставок Ольга Экспертова",
                "instructor_bio": "Международный судья выставок собак и кошек, хендлер",
                "what_you_will_learn": "Хендлинг техник\nРинговая подготовка\nПсихология выступлений\nПодготовка к экспертизе",
                "completion_time": "2-3 месяца",
                "requirements": "Животное должно соответствовать стандарту породы",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },
            {
                "title": "Поведенческая терапия: комплексный подход",
                "description": "Глубокий анализ и коррекция сложных поведенческих проблем. Работа с фобиями, агрессией, тревогой.",
                "duration": 200,
                "price": 3990,
                "pet_type": "all",
                "category": "behavior",
                "subcategory": "behavioral_therapy",
                "level": "expert",
                "format_type": "webinar",
                "lessons_count": 16,
                "videos_count": 14,
                "materials_count": 12,
                "instructor_name": "Доктор поведенческих наук Алексей Поведенцев",
                "instructor_bio": "Ветеринарный поведенческий терапевт, доктор наук",
                "what_you_will_learn": "Диагностика поведенческих проблем\nМетоды коррекции\nКогнитивно-поведенческая терапия\nРабота с травмами",
                "completion_time": "4-6 месяцев",
                "requirements": "Рекомендуется консультация ветеринара перед началом",
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
            },
            {
                "title": "Эмоциональный интеллект питомцев",
                "description": "Понимание эмоций собак и кошек. Развитие эмоционального интеллекта, работа с чувствами, эмпатия.",
                "duration": 110,
                "price": 1790,
                "pet_type": "all",
                "category": "behavior",
                "subcategory": "emotional_intelligence",
                "level": "intermediate",
                "format_type": "mixed",
                "lessons_count": 9,
                "videos_count": 7,
                "materials_count": 7,
                "instructor_name": "Эмоциональный психолог животных Ирина Чувства",
                "instructor_bio": "Специалист по эмоциональному поведению животных",
                "what_you_will_learn": "Распознавание эмоций\nРазвитие эмпатии\nРабота со страхами\nЭмоциональная поддержка",
                "completion_time": "2 месяца",
                "requirements": "Любовь к животным и интерес к психологии",
                "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"
            }
        ]

        courses_created = 0
        lessons_created = 0
        new_courses = []

        for data in new_courses_data:
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
            new_courses.append(course)
            courses_created += 1

            # Создаем уроки для курса
            lessons_count = self.create_lessons_for_course(course, data)
            lessons_created += lessons_count

            price_text = "Бесплатно" if data["price"] == 0 else f"{data['price']} руб."
            self.stdout.write(f'Создан курс: {data["title"]} [{data["level"]}] - {price_text} ({lessons_count} уроков)')

        # Создаем тестовые комментарии и оценки для новых курсов
        comments_created, ratings_created = self.create_test_comments_and_ratings(new_courses)

        # Статистика новых курсов
        new_total_courses = Course.objects.count()
        new_dog_courses = Course.objects.filter(pet_type='dog').count()
        new_cat_courses = Course.objects.filter(pet_type='cat').count()
        new_all_courses = Course.objects.filter(pet_type='all').count()
        new_free_courses = Course.objects.filter(price=0).count()
        new_paid_courses = Course.objects.filter(price__gt=0).count()

        new_beginner_courses = Course.objects.filter(level='beginner').count()
        new_intermediate_courses = Course.objects.filter(level='intermediate').count()
        new_advanced_courses = Course.objects.filter(level='advanced').count()
        new_expert_courses = Course.objects.filter(level='expert').count()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('НОВЫЕ КУРСЫ ДОБАВЛЕНЫ!'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS(f'Добавлено курсов: {courses_created}'))
        self.stdout.write(self.style.SUCCESS(f'Добавлено уроков: {lessons_created}'))
        self.stdout.write(self.style.SUCCESS(f'Добавлено комментариев: {comments_created}'))
        self.stdout.write(self.style.SUCCESS(f'Добавлено оценок: {ratings_created}'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'ОБЩАЯ СТАТИСТИКА ПРОЕКТА:'))
        self.stdout.write(self.style.SUCCESS(f'Всего курсов: {new_total_courses}'))
        self.stdout.write(f'  [DOG] Курсы для собак: {new_dog_courses}')
        self.stdout.write(f'  [CAT] Курсы для кошек: {new_cat_courses}')
        self.stdout.write(f'  [ALL] Универсальные курсы: {new_all_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'По цене:'))
        self.stdout.write(f'  [FREE] Бесплатные курсы: {new_free_courses}')
        self.stdout.write(f'  [PAID] Платные курсы: {new_paid_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'По уровню сложности:'))
        self.stdout.write(f'  [BEGINNER] Начинающий: {new_beginner_courses}')
        self.stdout.write(f'  [INTERMEDIATE] Средний: {new_intermediate_courses}')
        self.stdout.write(f'  [ADVANCED] Продвинутый: {new_advanced_courses}')
        self.stdout.write(f'  [EXPERT] Эксперт: {new_expert_courses}')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Новые курсы успешно добавлены в систему!'))
