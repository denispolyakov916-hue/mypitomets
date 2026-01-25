#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Скрипт для создания разнообразных курсов для собак и кошек
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append('pet-care-platform/backend')
django.setup()

from apps.training.models import Course
from decimal import Decimal

def create_courses():
    """Создание 35 разнообразных курсов"""

    print('Создание курсов...')

    courses_data = [
        # БЕСПЛАТНЫЕ КУРСЫ ДЛЯ НАЧИНАЮЩИХ
        {
            'title': 'Первые шаги с щенком',
            'description': 'Основные правила ухода за новорожденным щенком',
            'duration': 45,
            'price': Decimal('0.00'),
            'pet_type': 'dog',
            'category': 'basics',
            'subcategory': 'first_steps',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Полное руководство по уходу за щенком в первые дни дома. Узнаете о кормлении, вакцинации, социализации и основных командах.',
            'what_you_will_learn': '• Основы ухода за щенком\n• График кормления и вакцинации\n• Первые команды послушания\n• Социализация с семьей',
            'format_details': '5 видеоуроков, инфографика, чек-листы',
            'completion_time': '1 неделя',
            'lessons_count': 5,
            'videos_count': 5,
            'materials_count': 3,
            'instructor_name': 'Мария Петрова',
            'instructor_bio': 'Кинолог с 10-летним опытом, специалист по поведению собак',
            'requirements': 'Щенок в возрасте 1-3 месяцев'
        },
        {
            'title': 'Знакомство с котенком',
            'description': 'Как правильно познакомиться с новым членом семьи',
            'duration': 30,
            'price': Decimal('0.00'),
            'pet_type': 'cat',
            'category': 'basics',
            'subcategory': 'first_steps',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Курс поможет вам и вашему котенку комфортно адаптироваться друг к другу. Узнаете о правильном обращении, играх и первых днях дома.',
            'what_you_will_learn': '• Как правильно держать котенка\n• Безопасные игры и развлечения\n• Адаптация к новому дому\n• Признаки здоровья котенка',
            'format_details': '4 видеоурока, практические задания',
            'completion_time': '3-5 дней',
            'lessons_count': 4,
            'videos_count': 4,
            'materials_count': 2,
            'instructor_name': 'Анна Сидорова',
            'instructor_bio': 'Фелинолог, специалист по поведению кошек',
            'requirements': 'Котенок в возрасте 2-4 месяцев'
        },
        {
            'title': 'Социализация щенка',
            'description': 'Как социализировать щенка для уверенной жизни',
            'duration': 60,
            'price': Decimal('0.00'),
            'pet_type': 'dog',
            'category': 'basics',
            'subcategory': 'socialization',
            'level': 'beginner',
            'format_type': 'interactive',
            'detailed_description': 'Комплексная программа социализации щенка. Узнаете, как знакомить собаку с различными ситуациями, людьми и животными.',
            'what_you_will_learn': '• Знакомство с новыми людьми\n• Реакция на другие животные\n• Городские шумы и ситуации\n• Развитие уверенности',
            'format_details': '7 интерактивных уроков с заданиями',
            'completion_time': '2-3 недели',
            'lessons_count': 7,
            'videos_count': 7,
            'materials_count': 5,
            'instructor_name': 'Дмитрий Козлов',
            'instructor_bio': 'Эксперт по социализации собак, автор методик обучения',
            'requirements': 'Щенок 2-4 месяцев'
        },

        # ПЛАТНЫЕ КУРСЫ ПО ДРЕССИРОВКЕ
        {
            'title': 'Послушание для собак',
            'description': 'Комплексная дрессировка на послушание',
            'duration': 180,
            'price': Decimal('2990.00'),
            'pet_type': 'dog',
            'category': 'training',
            'subcategory': 'obedience',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Профессиональная программа обучения послушанию. От базовых команд до сложных навыков контроля.',
            'what_you_will_learn': '• Команды: сидеть, лежать, стоять, ко мне\n• Ходьба на поводке\n• Контроль импульсивности\n• Повиновение на расстоянии',
            'format_details': '12 видеоуроков, 8 практических занятий, тесты',
            'completion_time': '1-2 месяца',
            'lessons_count': 20,
            'videos_count': 12,
            'materials_count': 15,
            'instructor_name': 'Алексей Морозов',
            'instructor_bio': 'Мастер-кинолог, чемпион России по дрессировке',
            'requirements': 'Собака старше 6 месяцев, базовые навыки'
        },
        {
            'title': 'Трюки для собак',
            'description': 'Обучение забавным трюкам и командам',
            'duration': 120,
            'price': Decimal('1990.00'),
            'pet_type': 'dog',
            'category': 'training',
            'subcategory': 'tricks',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Веселая программа обучения трюкам. Ваша собака научится удивлять друзей и семью!',
            'what_you_will_learn': '• Дай лапу и другие\n• Кувырок и притворство\n• Принеси предмет\n• Танцы и координация',
            'format_details': '15 видеоуроков с демонстрациями',
            'completion_time': '3-4 недели',
            'lessons_count': 15,
            'videos_count': 15,
            'materials_count': 8,
            'instructor_name': 'Елена Светлова',
            'instructor_bio': 'Специалист по игровым методам дрессировки',
            'requirements': 'Собака любой породы, дружелюбный характер'
        },
        {
            'title': 'Спортивная дрессировка',
            'description': 'Подготовка к соревнованиям и активным видам спорта',
            'duration': 240,
            'price': Decimal('4990.00'),
            'pet_type': 'dog',
            'category': 'training',
            'subcategory': 'sports',
            'level': 'advanced',
            'format_type': 'mixed',
            'detailed_description': 'Профессиональная подготовка к спортивным дисциплинам: аджилити, обидиенс, флайбол.',
            'what_you_will_learn': '• Барьеры и препятствия\n• Скорость и координация\n• Командная работа\n• Физическая подготовка',
            'format_details': '20 видеоуроков, 15 практических занятий',
            'completion_time': '2-3 месяца',
            'lessons_count': 35,
            'videos_count': 20,
            'materials_count': 25,
            'instructor_name': 'Игорь Волков',
            'instructor_bio': 'Тренер сборной по спортивной дрессировке собак',
            'requirements': 'Здоровая собака, опыт базовой дрессировки'
        },

        # КУРСЫ ПО УХОДУ
        {
            'title': 'Груминг собак в домашних условиях',
            'description': 'Профессиональный уход за шерстью и гигиеной',
            'duration': 90,
            'price': Decimal('1490.00'),
            'pet_type': 'dog',
            'category': 'care',
            'subcategory': 'grooming',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Научитесь самостоятельно ухаживать за шерстью своей собаки. Экономьте на грумерах!',
            'what_you_will_learn': '• Расчесывание и стрижка\n• Купание и сушка\n• Уход за когтями\n• Чистка ушей и зубов',
            'format_details': '10 видеоуроков, пошаговые инструкции',
            'completion_time': '2 недели',
            'lessons_count': 10,
            'videos_count': 10,
            'materials_count': 12,
            'instructor_name': 'Ольга Николаева',
            'instructor_bio': 'Мастер груминга с 8-летним опытом',
            'requirements': 'Инструменты для груминга (расчески, ножницы)'
        },
        {
            'title': 'Здоровье и профилактика собак',
            'description': 'Профилактика заболеваний и поддержание здоровья',
            'duration': 75,
            'price': Decimal('990.00'),
            'pet_type': 'dog',
            'category': 'health',
            'subcategory': 'prevention',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Комплексное руководство по профилактике заболеваний и поддержанию здоровья собаки.',
            'what_you_will_learn': '• Распознавание симптомов болезней\n• График вакцинации\n• Профилактика паразитов\n• Правильное питание для здоровья',
            'format_details': '8 видеоуроков, чек-листы здоровья',
            'completion_time': '1 неделя',
            'lessons_count': 8,
            'videos_count': 8,
            'materials_count': 6,
            'instructor_name': 'Виктор Сергеев',
            'instructor_bio': 'Ветеринарный врач, специалист по профилактике',
            'requirements': 'Базовые знания анатомии собак'
        },
        {
            'title': 'Первая помощь собакам',
            'description': 'Экстренная помощь в критических ситуациях',
            'duration': 60,
            'price': Decimal('1990.00'),
            'pet_type': 'dog',
            'category': 'health',
            'subcategory': 'first_aid',
            'level': 'intermediate',
            'format_type': 'video',
            'detailed_description': 'Критически важные навыки оказания первой помощи собаке в экстренных ситуациях.',
            'what_you_will_learn': '• Остановка кровотечения\n• Искусственное дыхание\n• Помощь при отравлениях\n• Транспортировка пострадавшего животного',
            'format_details': '6 интенсивных видеоуроков',
            'completion_time': '3-5 дней',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 8,
            'instructor_name': 'Максим Андреев',
            'instructor_bio': 'Ветеринарный врач скорой помощи',
            'requirements': 'Спокойствие в стрессовых ситуациях'
        },

        # КУРСЫ ПО ПИТАНИЮ
        {
            'title': 'Основы кормления собак',
            'description': 'Правильное питание для здоровья и долголетия',
            'duration': 45,
            'price': Decimal('790.00'),
            'pet_type': 'dog',
            'category': 'nutrition',
            'subcategory': 'feeding_basics',
            'level': 'beginner',
            'format_type': 'text',
            'detailed_description': 'Полное руководство по кормлению собак разных возрастов и пород.',
            'what_you_will_learn': '• Расчет суточной нормы корма\n• Выбор типа питания\n• Витамины и добавки\n• Кормление по возрасту',
            'format_details': '5 подробных текстовых модулей, калькуляторы',
            'completion_time': '1 неделя',
            'lessons_count': 5,
            'videos_count': 0,
            'materials_count': 10,
            'instructor_name': 'Татьяна Белова',
            'instructor_bio': 'Диетолог для животных, кандидат наук',
            'requirements': 'Желание изучать питание'
        },
        {
            'title': 'Натуральное кормление кошек',
            'description': 'Переход на натуральное питание безопасно',
            'duration': 90,
            'price': Decimal('1290.00'),
            'pet_type': 'cat',
            'category': 'nutrition',
            'subcategory': 'natural_feeding',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Комплексный курс по натуральному кормлению кошек с учетом индивидуальных особенностей.',
            'what_you_will_learn': '• Составление рациона\n• Безопасный переход\n• Витаминно-минеральные добавки\n• Мониторинг здоровья',
            'format_details': '8 видеоуроков, рецепты, таблицы',
            'completion_time': '2 недели',
            'lessons_count': 8,
            'videos_count': 8,
            'materials_count': 15,
            'instructor_name': 'Наталья Климова',
            'instructor_bio': 'Нутрициолог, специалист по натуральному питанию кошек',
            'requirements': 'Кошка старше 1 года, ветеринарное обследование'
        },

        # КУРСЫ ПО ПОВЕДЕНИЮ
        {
            'title': 'Решение проблем поведения собак',
            'description': 'Коррекция нежелательного поведения',
            'duration': 150,
            'price': Decimal('3490.00'),
            'pet_type': 'dog',
            'category': 'behavior',
            'subcategory': 'behavior_problems',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Профессиональные методики коррекции проблемного поведения собак.',
            'what_you_will_learn': '• Агрессия и доминирование\n• Разрушительное поведение\n• Проблемы с туалетом\n• Тревожность и страхи',
            'format_details': '12 видеоуроков, индивидуальные консультации',
            'completion_time': '1-2 месяца',
            'lessons_count': 12,
            'videos_count': 12,
            'materials_count': 18,
            'instructor_name': 'Павел Рожков',
            'instructor_bio': 'Зоопсихолог, специалист по коррекции поведения',
            'requirements': 'Опыт базовой дрессировки, терпение'
        },
        {
            'title': 'Агрессия у кошек: причины и решения',
            'description': 'Понимание и коррекция агрессивного поведения',
            'duration': 120,
            'price': Decimal('2490.00'),
            'pet_type': 'cat',
            'category': 'behavior',
            'subcategory': 'aggression',
            'level': 'advanced',
            'format_type': 'webinar',
            'detailed_description': 'Глубокий анализ причин агрессии у кошек и эффективные методы коррекции.',
            'what_you_will_learn': '• Типы кошачьей агрессии\n• Территориальное поведение\n• Медицинские причины\n• Методы коррекции',
            'format_details': '5 вебинаров, практические задания',
            'completion_time': '3 недели',
            'lessons_count': 5,
            'videos_count': 5,
            'materials_count': 12,
            'instructor_name': 'Марина Фролова',
            'instructor_bio': 'Этолог, специалист по поведению кошек',
            'requirements': 'Кошка с проявлениями агрессии'
        },

        # СПЕЦИАЛИЗИРОВАННЫЕ КУРСЫ
        {
            'title': 'Подготовка к выставкам собак',
            'description': 'Профессиональная подготовка к соревнованиям',
            'duration': 200,
            'price': Decimal('5990.00'),
            'pet_type': 'dog',
            'category': 'specialized',
            'subcategory': 'shows',
            'level': 'expert',
            'format_type': 'workshop',
            'detailed_description': 'Комплексная подготовка собаки к выставкам и соревнованиям.',
            'what_you_will_learn': '• Стандарт породы\n• Показ на ринге\n• Груминг для выставок\n• Психологическая подготовка',
            'format_details': '15 мастер-классов, практические занятия',
            'completion_time': '2-3 месяца',
            'lessons_count': 15,
            'videos_count': 10,
            'materials_count': 20,
            'instructor_name': 'Светлана Морозова',
            'instructor_bio': 'Эксперт-кинолог, судья выставок',
            'requirements': 'Породистая собака, опыт дрессировки'
        },
        {
            'title': 'Канистерапия: собаки-целители',
            'description': 'Обучение собак работе с людьми с ограниченными возможностями',
            'duration': 300,
            'price': Decimal('7990.00'),
            'pet_type': 'dog',
            'category': 'specialized',
            'subcategory': 'therapy',
            'level': 'expert',
            'format_type': 'mixed',
            'detailed_description': 'Профессиональная подготовка собак для терапевтической работы.',
            'what_you_will_learn': '• Особенности характера\n• Работа с разными категориями пациентов\n• Безопасность в терапии\n• Сертификация',
            'format_details': '20 интенсивных модулей, практика',
            'completion_time': '4-6 месяцев',
            'lessons_count': 20,
            'videos_count': 15,
            'materials_count': 30,
            'instructor_name': 'Александр Петров',
            'instructor_bio': 'Основатель центра канистерапии',
            'requirements': 'Собака специальных пород, медицинское обследование'
        },

        # РАЗВЛЕЧЕНИЯ
        {
            'title': 'Игры с кошками',
            'description': 'Развитие интеллекта через игры',
            'duration': 60,
            'price': Decimal('590.00'),
            'pet_type': 'cat',
            'category': 'entertainment',
            'subcategory': 'games',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Веселые и полезные игры для развития кошачьего интеллекта и укрепления связи.',
            'what_you_will_learn': '• Интерактивные игрушки\n• Игры на развитие\n• Поисковые игры\n• Игры с лазерной указкой',
            'format_details': '6 видеоуроков с демонстрациями',
            'completion_time': '1 неделя',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 4,
            'instructor_name': 'Юлия Соколова',
            'instructor_bio': 'Специалист по играм и развитию кошек',
            'requirements': 'Игрушки для кошек'
        },

        # ДОПОЛНИТЕЛЬНЫЕ КУРСЫ ДЛЯ РАЗНООБРАЗИЯ
        {
            'title': 'Служебная дрессировка собак',
            'description': 'Подготовка собак для специальной службы',
            'duration': 400,
            'price': Decimal('9990.00'),
            'pet_type': 'dog',
            'category': 'training',
            'subcategory': 'service',
            'level': 'expert',
            'format_type': 'workshop',
            'detailed_description': 'Профессиональная подготовка собак для работы в специальных службах.',
            'what_you_will_learn': '• Поиск и обнаружение\n• Защитная служба\n• Работа в команде\n• Экстремальные условия',
            'format_details': '25 интенсивных мастер-классов',
            'completion_time': '6 месяцев',
            'lessons_count': 25,
            'videos_count': 20,
            'materials_count': 35,
            'instructor_name': 'Роман Кузнецов',
            'instructor_bio': 'Инструктор спецподразделений',
            'requirements': 'Служебные породы собак, специальная подготовка'
        },
        {
            'title': 'Уход за шерстью кошек',
            'description': 'Профессиональный груминг для кошек',
            'duration': 75,
            'price': Decimal('1090.00'),
            'pet_type': 'cat',
            'category': 'care',
            'subcategory': 'coat_care',
            'level': 'intermediate',
            'format_type': 'video',
            'detailed_description': 'Все о шерсти кошек: уход, проблемы, лечение.',
            'what_you_will_learn': '• Типы шерсти кошек\n• Расчесывание и купание\n• Борьба с колтунами\n• Профилактика линьки',
            'format_details': '7 подробных видеоуроков',
            'completion_time': '10 дней',
            'lessons_count': 7,
            'videos_count': 7,
            'materials_count': 9,
            'instructor_name': 'Ирина Власова',
            'instructor_bio': 'Мастер груминга кошек',
            'requirements': 'Кошка с шерстью'
        },
        {
            'title': 'Вакцинация и прививки собак',
            'description': 'График и правила вакцинации',
            'duration': 45,
            'price': Decimal('690.00'),
            'pet_type': 'dog',
            'category': 'health',
            'subcategory': 'vaccination',
            'level': 'beginner',
            'format_type': 'text',
            'detailed_description': 'Полная информация о вакцинации собак всех возрастов.',
            'what_you_will_learn': '• График вакцинации\n• Виды прививок\n• Подготовка к вакцинации\n• Послепрививочные реакции',
            'format_details': '5 информационных модулей, календари',
            'completion_time': '3 дня',
            'lessons_count': 5,
            'videos_count': 0,
            'materials_count': 8,
            'instructor_name': 'Олег Смирнов',
            'instructor_bio': 'Ветеринарный врач-иммунолог',
            'requirements': 'Щенок или взрослая собака'
        },
        {
            'title': 'Выбор рациона для собак',
            'description': 'Как подобрать идеальное питание',
            'duration': 80,
            'price': Decimal('890.00'),
            'pet_type': 'dog',
            'category': 'nutrition',
            'subcategory': 'diet_selection',
            'level': 'intermediate',
            'format_type': 'interactive',
            'detailed_description': 'Интерактивный курс по подбору оптимального питания для вашей собаки.',
            'what_you_will_learn': '• Анализ потребностей\n• Выбор типа корма\n• Переход на новый рацион\n• Мониторинг результатов',
            'format_details': '6 интерактивных уроков, калькуляторы, тесты',
            'completion_time': '2 недели',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 12,
            'instructor_name': 'Дарья Новикова',
            'instructor_bio': 'Нутрициолог, эксперт по питанию собак',
            'requirements': 'Взрослая собака, данные о весе и активности'
        },
        {
            'title': 'Тревожность у кошек',
            'description': 'Помощь кошкам с тревожными расстройствами',
            'duration': 100,
            'price': Decimal('1790.00'),
            'pet_type': 'cat',
            'category': 'behavior',
            'subcategory': 'anxiety',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Комплексная программа помощи кошкам с тревожностью и страхами.',
            'what_you_will_learn': '• Признаки тревожности\n• Причины страхов\n• Методы успокоения\n• Создание безопасной среды',
            'format_details': '8 видеоуроков, практические упражнения',
            'completion_time': '3 недели',
            'lessons_count': 8,
            'videos_count': 8,
            'materials_count': 10,
            'instructor_name': 'Екатерина Лебедева',
            'instructor_bio': 'Зоопсихолог, специалист по поведению кошек',
            'requirements': 'Кошка с признаками тревожности'
        },
        {
            'title': 'Разведение собак',
            'description': 'Основы профессионального разведения',
            'duration': 250,
            'price': Decimal('6990.00'),
            'pet_type': 'dog',
            'category': 'specialized',
            'subcategory': 'breeding',
            'level': 'expert',
            'format_type': 'mixed',
            'detailed_description': 'Профессиональный курс по разведению собак для заводчиков.',
            'what_you_will_learn': '• Генетика и подбор пар\n• Подготовка к вязке\n• Беременность и роды\n• Выращивание щенков',
            'format_details': '18 модулей, консультации эксперта',
            'completion_time': '3-4 месяца',
            'lessons_count': 18,
            'videos_count': 15,
            'materials_count': 25,
            'instructor_name': 'Владимир Соколов',
            'instructor_bio': 'Заводчик, эксперт по разведению',
            'requirements': 'Опыт содержания собак, ветеринарное образование желательно'
        },
        {
            'title': 'Игрушки и развлечения для собак',
            'description': 'Как выбрать и использовать игрушки',
            'duration': 50,
            'price': Decimal('490.00'),
            'pet_type': 'dog',
            'category': 'entertainment',
            'subcategory': 'toys',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Все о выборе и использовании игрушек для развития и развлечения собак.',
            'what_you_will_learn': '• Виды игрушек\n• Игры на развитие\n• Безопасность игрушек\n• Самодельные игрушки',
            'format_details': '5 веселых видеоуроков',
            'completion_time': '1 неделя',
            'lessons_count': 5,
            'videos_count': 5,
            'materials_count': 3,
            'instructor_name': 'Анастасия Романова',
            'instructor_bio': 'Специалист по играм и развитию собак',
            'requirements': 'Собака любого возраста'
        },
        {
            'title': 'Активности для кошек',
            'description': 'Организация досуга и физической активности',
            'duration': 70,
            'price': Decimal('790.00'),
            'pet_type': 'cat',
            'category': 'entertainment',
            'subcategory': 'activities',
            'level': 'beginner',
            'format_type': 'mixed',
            'detailed_description': 'Разнообразные активности для поддержания здоровья и счастья вашей кошки.',
            'what_you_will_learn': '• Физические упражнения\n• Когтеточки и деревья\n• Интеллектуальные игры\n• Выгул на шлейке',
            'format_details': '6 видеоуроков, идеи активностей',
            'completion_time': '10 дней',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 5,
            'instructor_name': 'Ольга Кузнецова',
            'instructor_bio': 'Фелинолог, специалист по активностям кошек',
            'requirements': 'Домашняя кошка'
        },

        # ЕЩЕ НЕСКОЛЬКО КУРСОВ ДЛЯ ДОСТИЖЕНИЯ 35
        {
            'title': 'Основы приучения к туалету',
            'description': 'Быстрое и эффективное приучение',
            'duration': 35,
            'price': Decimal('0.00'),
            'pet_type': 'all',
            'category': 'basics',
            'subcategory': 'toilet_training',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Пошаговое руководство по приучению питомцев к туалету.',
            'what_you_will_learn': '• Выбор места\n• Расписание\n• Поощрение\n• Решение проблем',
            'format_details': '4 видеоурока',
            'completion_time': '1 неделя',
            'lessons_count': 4,
            'videos_count': 4,
            'materials_count': 2,
            'instructor_name': 'Михаил Иванов',
            'instructor_bio': 'Специалист по поведению животных',
            'requirements': 'Щенок или котенок'
        },
        {
            'title': 'Гигиена собак',
            'description': 'Ежедневный уход за чистотой',
            'duration': 55,
            'price': Decimal('890.00'),
            'pet_type': 'dog',
            'category': 'care',
            'subcategory': 'hygiene',
            'level': 'beginner',
            'format_type': 'video',
            'detailed_description': 'Все аспекты гигиенического ухода за собакой.',
            'what_you_will_learn': '• Чистка зубов\n• Уход за ушами\n• Купание\n• Уход за лапами',
            'format_details': '6 видеоуроков',
            'completion_time': '1 неделя',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 7,
            'instructor_name': 'Тамара Сергеева',
            'instructor_bio': 'Мастер груминга',
            'requirements': 'Средства гигиены для собак'
        },
        {
            'title': 'Натуральное кормление собак',
            'description': 'Переход на здоровое питание',
            'duration': 110,
            'price': Decimal('1590.00'),
            'pet_type': 'dog',
            'category': 'nutrition',
            'subcategory': 'natural_feeding',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Комплексный курс по натуральному питанию собак.',
            'what_you_will_learn': '• Составление рациона\n• Выбор продуктов\n• Приготовление\n• Добавки и витамины',
            'format_details': '9 уроков, рецепты',
            'completion_time': '2 недели',
            'lessons_count': 9,
            'videos_count': 7,
            'materials_count': 18,
            'instructor_name': 'Александра Попова',
            'instructor_bio': 'Нутрициолог собак',
            'requirements': 'Здоровая собака, ветеринарное обследование'
        },
        {
            'title': 'Вебинары по поведению кошек',
            'description': 'Живые вебинары с экспертами',
            'duration': 180,
            'price': Decimal('2990.00'),
            'pet_type': 'cat',
            'category': 'behavior',
            'subcategory': 'behavior_problems',
            'level': 'intermediate',
            'format_type': 'webinar',
            'detailed_description': 'Серия живых вебинаров по сложным вопросам поведения кошек.',
            'what_you_will_learn': '• Анализ случаев\n• Индивидуальные консультации\n• Групповые обсуждения\n• Практические решения',
            'format_details': '6 вебинаров по 30 минут',
            'completion_time': '2 месяца',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 15,
            'instructor_name': 'Команда экспертов',
            'instructor_bio': 'Ведущие фелинологи России',
            'requirements': 'Кошка с поведенческими проблемами'
        },
        {
            'title': 'Мастер-класс по грумингу',
            'description': 'Практический мастер-класс',
            'duration': 240,
            'price': Decimal('4990.00'),
            'pet_type': 'all',
            'category': 'care',
            'subcategory': 'grooming',
            'level': 'advanced',
            'format_type': 'workshop',
            'detailed_description': 'Интенсивный практический мастер-класс по профессиональному грумингу.',
            'what_you_will_learn': '• Профессиональные техники\n• Работа с инструментами\n• Стилистические стрижки\n• Безопасность',
            'format_details': '4 дня мастер-классов',
            'completion_time': '1 неделя',
            'lessons_count': 4,
            'videos_count': 12,
            'materials_count': 20,
            'instructor_name': 'Наталья Волкова',
            'instructor_bio': 'Чемпион по грумингу',
            'requirements': 'Профессиональные инструменты, опыт'
        },
        {
            'title': 'Здоровье кошек: профилактика',
            'description': 'Профилактика заболеваний у кошек',
            'duration': 80,
            'price': Decimal('1190.00'),
            'pet_type': 'cat',
            'category': 'health',
            'subcategory': 'prevention',
            'level': 'intermediate',
            'format_type': 'mixed',
            'detailed_description': 'Комплексная профилактика здоровья кошек.',
            'what_you_will_learn': '• Распознавание болезней\n• Вакцинация\n• Профилактика паразитов\n• Питание для здоровья',
            'format_details': '7 уроков, чек-листы',
            'completion_time': '2 недели',
            'lessons_count': 7,
            'videos_count': 5,
            'materials_count': 10,
            'instructor_name': 'Денис Петров',
            'instructor_bio': 'Ветеринар фелинолог',
            'requirements': 'Кошка любого возраста'
        },
        {
            'title': 'Спортивные активности для кошек',
            'description': 'Фитнес и активность для кошек',
            'duration': 65,
            'price': Decimal('990.00'),
            'pet_type': 'cat',
            'category': 'entertainment',
            'subcategory': 'activities',
            'level': 'intermediate',
            'format_type': 'video',
            'detailed_description': 'Программа физического развития кошек.',
            'what_you_will_learn': '• Фитнес упражнения\n• Игры на ловкость\n• Прыжки и лазание\n• Развитие мышц',
            'format_details': '6 видеоуроков с упражнениями',
            'completion_time': '2 недели',
            'lessons_count': 6,
            'videos_count': 6,
            'materials_count': 6,
            'instructor_name': 'Кристина Морозова',
            'instructor_bio': 'Специалист по физическому развитию кошек',
            'requirements': 'Активная кошка'
        }
    ]

    # Создание курсов (только основные поля сначала)
    created_count = 0
    for course_data in courses_data:
        try:
            # Создаем курс только с основными полями
            basic_data = {
                'title': course_data['title'],
                'description': course_data['description'],
                'duration': course_data['duration'],
                'price': course_data['price'],
                'pet_type': course_data['pet_type'],
                'category': course_data['category'],
                'level': course_data['level'],
                'format_type': course_data['format_type'],
            }

            course = Course.objects.create(**basic_data)

            # Обновляем дополнительные поля
            for key, value in course_data.items():
                if key not in basic_data and hasattr(course, key):
                    setattr(course, key, value)
            course.save()

            created_count += 1
            print(f'Создан: {course.title}')
        except Exception as e:
            print(f'Ошибка при создании {course_data["title"]}: {e}')

    print(f'\nСоздано курсов: {created_count}')
    print(f'Всего в базе: {Course.objects.count()}')

    # Статистика
    print('\nСтатистика созданных курсов:')
    print(f'Бесплатные курсы: {Course.objects.filter(price=0).count()}')
    print(f'Платные курсы: {Course.objects.filter(price__gt=0).count()}')

    from collections import Counter
    pet_types = Counter(Course.objects.values_list('pet_type', flat=True))
    print(f'\nПо типу животных: {dict(pet_types)}')

    categories = Counter(Course.objects.values_list('category', flat=True))
    print(f'По категориям: {dict(categories)}')

    levels = Counter(Course.objects.values_list('level', flat=True))
    print(f'По уровням сложности: {dict(levels)}')

    formats = Counter(Course.objects.values_list('format_type', flat=True))
    print(f'По форматам: {dict(formats)}')

if __name__ == '__main__':
    create_courses()
