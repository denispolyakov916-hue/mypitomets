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
from apps.training.models import Course


class Command(BaseCommand):
    help = 'Загрузка 30 разнообразных курсов для тестирования фильтрации'

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
                "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"
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

        # Очищаем существующие курсы
        Course.objects.all().delete()
        self.stdout.write(self.style.WARNING('Очищены существующие курсы'))

        courses_created = 0
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
                is_active=True,
            )
            courses_created += 1
            price_text = "Бесплатно" if data["price"] == 0 else f"{data['price']} руб."
            self.stdout.write(f'Создан курс: {data["title"]} [{data["level"]}] - {price_text}')

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
