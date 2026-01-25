"""
Команда для создания тестовых пользователей с полными профилями.

Создает:
- Администраторов и менеджеров (staff пользователи)
- Обычных пользователей с профилями
- Питомцев для пользователей
- Заказы и покупки курсов

Использование:
    python manage.py create_test_users
"""

import random
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.pets.models import Pet
from apps.shop.models import Product, Order, OrderItem, CartItem
from apps.training.models import Course, UserCourse

User = get_user_model()


class Command(BaseCommand):
    help = 'Создание тестовых пользователей с полными профилями'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Количество пользователей для создания (по умолчанию 10)',
        )

    def handle(self, *args, **options):
        user_count = options['count']
        self.stdout.write(f'Создание {user_count} тестовых пользователей...')

        # Создаем админов и менеджеров (staff пользователи)
        self.create_staff_users()

        # Создаем обычных пользователей
        users_created = self.create_regular_users(user_count - 3)  # -3 для staff пользователей

        # Создаем питомцев для пользователей
        pets_created = self.create_pets_for_users(users_created)

        # Создаем заказы
        orders_created = self.create_orders_for_users(users_created)

        # Создаем связи с курсами
        courses_enrolled = self.enroll_users_in_courses(users_created)

        self.stdout.write(self.style.SUCCESS(
            f'Создано пользователей: {len(users_created) + 3}, '
            f'питомцев: {pets_created}, '
            f'заказов: {orders_created}, '
            f'записей на курсы: {courses_enrolled}'
        ))

    def create_staff_users(self):
        """Создание администраторов и менеджеров."""
        staff_users = [
            {
                'email': 'admin@pitometsplus.ru',
                'password': 'admin123',
                'first_name': 'Администратор',
                'last_name': 'Системы',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'manager@pitometsplus.ru',
                'password': 'manager123',
                'first_name': 'Менеджер',
                'last_name': 'Контента',
                'is_staff': True,
                'is_superuser': False,
            },
            {
                'email': 'support@pitometsplus.ru',
                'password': 'support123',
                'first_name': 'Специалист',
                'last_name': 'Поддержки',
                'is_staff': True,
                'is_superuser': False,
            },
        ]

        for user_data in staff_users:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults=user_data
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                self.stdout.write(f'Создан staff пользователь: {user.email}')
            else:
                self.stdout.write(f'Staff пользователь уже существует: {user.email}')

    def create_regular_users(self, count):
        """Создание обычных пользователей с профилями."""
        # Фиксированные данные для тестовых пользователей
        test_user_data = [
            {'email': 'alexandr.ivanov@test.ru', 'first_name': 'Александр', 'last_name': 'Иванов'},
            {'email': 'maria.petrov@test.ru', 'first_name': 'Мария', 'last_name': 'Петрова'},
            {'email': 'dmitry.sidorov@test.ru', 'first_name': 'Дмитрий', 'last_name': 'Сидоров'},
            {'email': 'elena.kuznetsova@test.ru', 'first_name': 'Елена', 'last_name': 'Кузнецова'},
            {'email': 'andrey.vasilev@test.ru', 'first_name': 'Андрей', 'last_name': 'Васильев'},
            {'email': 'olga.morozova@test.ru', 'first_name': 'Ольга', 'last_name': 'Морозова'},
            {'email': 'sergey.novikov@test.ru', 'first_name': 'Сергей', 'last_name': 'Новиков'},
            {'email': 'tatyana.fedorova@test.ru', 'first_name': 'Татьяна', 'last_name': 'Федорова'},
            {'email': 'alexey.volkov@test.ru', 'first_name': 'Алексей', 'last_name': 'Волков'},
            {'email': 'natalya.alekseeva@test.ru', 'first_name': 'Наталья', 'last_name': 'Алексеева'},
        ]

        cities = [
            'Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Казань',
            'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону'
        ]

        users_created = []

        for i in range(min(count, len(test_user_data))):
            user_info = test_user_data[i]
            email = user_info['email']

            # Генерируем дату рождения (18-70 лет)
            birth_year = date.today().year - random.randint(18, 70)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            date_of_birth = date(birth_year, birth_month, birth_day)

            user_data = {
                'email': email,
                'first_name': user_info['first_name'],
                'last_name': user_info['last_name'],
                'phone': f'+7{random.randint(9000000000, 9999999999)}',
                'city': random.choice(cities),
                'date_of_birth': date_of_birth,
                'bio': f'Любитель животных, владелец {random.randint(1, 3)} питомцев.',
                'is_active': True,
                'is_staff': False,
            }

            user, created = User.objects.get_or_create(
                email=email,
                defaults=user_data
            )

            if created:
                user.set_password('test123')
                user.save()
                users_created.append(user)
                self.stdout.write(f'Создан пользователь: {user.email}')
            else:
                # Если пользователь уже существует, добавляем его в список для создания питомцев
                users_created.append(user)

        return users_created

    def create_pets_for_users(self, users):
        """Создание питомцев для пользователей."""
        dog_breeds = [
            'Лабрадор', 'Бульдог', 'Пудель', 'Чихуахуа', 'Йоркширский терьер',
            'Немецкая овчарка', 'Бигль', 'Шарпей', 'Хаски', 'Далматинец'
        ]

        cat_breeds = [
            'Британская короткошерстная', 'Сиамская', 'Персидская', 'Мейн-кун',
            'Русская голубая', 'Сфинкс', 'Бенгальская', 'Шотландская вислоухая'
        ]

        pet_names = [
            'Барон', 'Мурка', 'Шарик', 'Мурзик', 'Белка', 'Тузик', 'Мася', 'Рекс',
            'Лола', 'Симба', 'Дуся', 'Граф', 'Муся', 'Боня', 'Луна', 'Тимка'
        ]

        pets_created = 0

        for user in users:
            # Создаем 1-3 питомцев для каждого пользователя
            pet_count = random.randint(1, 3)

            for _ in range(pet_count):
                species = random.choice(['dog', 'cat'])
                if species == 'dog':
                    breed = random.choice(dog_breeds)
                else:
                    breed = random.choice(cat_breeds)

                # Генерируем дату рождения (от 6 месяцев до 15 лет)
                birth_days_ago = random.randint(180, 5475)  # 6 мес - 15 лет
                date_of_birth = date.today() - timedelta(days=birth_days_ago)

                # Вес в зависимости от вида
                if species == 'dog':
                    weight = round(random.uniform(3, 50), 1)
                else:
                    weight = round(random.uniform(2, 8), 1)

                pet_data = {
                    'owner': user,
                    'name': random.choice(pet_names),
                    'species': species,
                    'breed': breed,
                    'date_of_birth': date_of_birth,
                    'weight': weight,
                    'gender': random.choice(['male', 'female']),
                    'is_neutered': random.choice([True, False]),
                    'activity_level': random.choice(['low', 'medium', 'high']),
                    'behavioral_problems': random.sample([
                        'агрессия', 'трусость', 'гиперактивность', 'разрушение'
                    ], random.randint(0, 2)),
                }

                # Добавляем аллергии для некоторых питомцев
                if random.random() < 0.3:  # 30% питомцев имеют аллергии
                    pet_data['allergies'] = random.sample([
                        'курица', 'рыба', 'злаки', 'молочные продукты'
                    ], random.randint(1, 3))

                # Добавляем любимые продукты
                pet_data['favorite_foods'] = random.sample([
                    'курица', 'говядина', 'рыба', 'индейка', 'кролик'
                ], random.randint(1, 3))

                pet = Pet.objects.create(**pet_data)
                pets_created += 1

        self.stdout.write(f'Создано питомцев: {pets_created}')
        return pets_created

    def create_orders_for_users(self, users):
        """Создание заказов для пользователей."""
        orders_created = 0

        # Получаем все товары
        products = list(Product.objects.all())
        if not products:
            self.stdout.write(self.style.WARNING('Нет товаров для создания заказов'))
            return 0

        for user in users:
            # Создаем 5-10 заказов для каждого пользователя
            order_count = random.randint(5, 10)

            for _ in range(order_count):
                # Выбираем 1-5 товаров для заказа
                order_products = random.sample(products, random.randint(1, min(5, len(products))))

                # Сначала рассчитываем суммы
                total_amount = 0
                delivery_cost = random.randint(0, 500)

                for product in order_products:
                    quantity = random.randint(1, 3)
                    total_amount += product.price * quantity

                # Создаем заказ со всеми необходимыми полями
                order = Order.objects.create(
                    user=user,
                    status=random.choice(['pending', 'processing', 'shipped', 'delivered']),
                    delivery_type=random.choice(['standard', 'express', 'pickup']),
                    subtotal_amount=total_amount,
                    delivery_cost=delivery_cost,
                    total_amount=total_amount + delivery_cost,
                    shipping_address=f"{user.city}, ул. Тестовая, д. {random.randint(1, 100)}",
                )

                # Добавляем товары в заказ
                for product in order_products:
                    quantity = random.randint(1, 3)
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=quantity,
                        price=product.price,
                    )

                orders_created += 1

        self.stdout.write(f'Создано заказов: {orders_created}')
        return orders_created

    def enroll_users_in_courses(self, users):
        """Запись пользователей на курсы."""
        courses_enrolled = 0

        # Получаем все курсы
        courses = list(Course.objects.all())
        if not courses:
            self.stdout.write(self.style.WARNING('Нет курсов для записи пользователей'))
            return 0

        for user in users:
            # Получаем питомцев пользователя
            user_pets = list(user.pets.all())

            if not user_pets:
                continue

            # 60% пользователей записаны на курсы
            if random.random() < 0.6:
                # Выбираем 1-3 курса
                selected_courses = random.sample(courses, random.randint(1, min(3, len(courses))))

                for course in selected_courses:
                    # Выбираем случайного питомца пользователя
                    pet = random.choice(user_pets)

                    # Создаем запись на курс
                    user_course, created = UserCourse.objects.get_or_create(
                        user=user,
                        course=course,
                        pet=pet,
                        defaults={
                            'purchased_at': timezone.now() - timedelta(days=random.randint(0, 30)),
                            'progress': 100 if random.random() < 0.3 else random.randint(0, 90),  # 30% завершили курс
                        }
                    )

                    if not created:
                        # Если запись уже существует, обновляем прогресс
                        user_course.progress = 100 if random.random() < 0.3 else random.randint(0, 90)
                        user_course.save()
                    courses_enrolled += 1

        self.stdout.write(f'Создано записей на курсы: {courses_enrolled}')
        return courses_enrolled
