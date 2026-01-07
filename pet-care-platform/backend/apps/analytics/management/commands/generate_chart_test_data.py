"""
Management command for generating test data for chart builder.

Usage: python manage.py generate_chart_test_data
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    """Generate test data for chart builder visualization."""

    help = 'Generate test data for chart builder visualization'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days to generate data for (default: 90)'
        )
        parser.add_argument(
            '--users',
            type=int,
            default=50,
            help='Number of users to create (default: 50)'
        )
        parser.add_argument(
            '--pets',
            type=int,
            default=80,
            help='Number of pets to create (default: 80)'
        )
        parser.add_argument(
            '--orders',
            type=int,
            default=200,
            help='Number of orders to create (default: 200)'
        )

    def handle(self, *args, **options):
        """Execute the command."""
        from apps.users.models import User
        from apps.pets.models import Pet
        from apps.shop.models import Order, Product
        
        days = options['days']
        num_users = options['users']
        num_pets = options['pets']
        num_orders = options['orders']
        
        self.stdout.write(
            self.style.SUCCESS(f'Generating test data for {days} days...')
        )

        # Get or create test users
        self.stdout.write('Creating test users...')
        users = self._create_test_users(num_users, days)
        self.stdout.write(self.style.SUCCESS(f'Created {len(users)} test users'))

        # Create test pets
        self.stdout.write('Creating test pets...')
        pets_created = self._create_test_pets(users, num_pets, days)
        self.stdout.write(self.style.SUCCESS(f'Created {pets_created} test pets'))

        # Create test orders (if products exist)
        self.stdout.write('Creating test orders...')
        orders_created = self._create_test_orders(users, num_orders, days)
        self.stdout.write(self.style.SUCCESS(f'Created {orders_created} test orders'))

        # Initialize analytics metrics
        self.stdout.write('Initializing analytics metrics...')
        from apps.analytics.services import AnalyticsMetricsInitializer
        initializer = AnalyticsMetricsInitializer()
        initializer.initialize_base_metrics()
        self.stdout.write(self.style.SUCCESS('Metrics initialized'))

        self.stdout.write(
            self.style.SUCCESS('Test data generation completed!')
        )

    def _create_test_users(self, count: int, days: int):
        """Create test users with distributed creation dates."""
        from apps.users.models import User
        
        users = []
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        for i in range(count):
            email = f'test_chart_user_{i}@example.com'
            
            # Check if user already exists
            existing = User.objects.filter(email=email).first()
            if existing:
                users.append(existing)
                continue
            
            # Random date within the range
            random_days = random.randint(0, days)
            created_at = start_date + timedelta(days=random_days)
            
            # Add some variation - more users in recent days
            if random.random() > 0.5:
                random_days = random.randint(days // 2, days)
                created_at = start_date + timedelta(days=random_days)
            
            user = User.objects.create_user(
                email=email,
                password='testpassword123',
                first_name=f'Test{i}',
                last_name=f'User{i}',
                is_activated=random.random() > 0.2,
            )
            
            # Update created_at
            User.objects.filter(id=user.id).update(created_at=created_at)
            
            # Set some users with last_login
            if random.random() > 0.3:
                last_login = created_at + timedelta(days=random.randint(1, max(1, (end_date - created_at).days)))
                User.objects.filter(id=user.id).update(last_login=last_login)
            
            users.append(user)
        
        return users

    def _create_test_pets(self, users, count: int, days: int):
        """Create test pets with distributed creation dates."""
        from apps.pets.models import Pet
        
        if not users:
            return 0
        
        species_weights = [
            ('dog', 0.45),
            ('cat', 0.40),
            ('bird', 0.05),
            ('rodent', 0.05),
            ('fish', 0.03),
            ('reptile', 0.02),
        ]
        
        dog_breeds = ['Лабрадор', 'Немецкая овчарка', 'Бульдог', 'Пудель', 'Хаски', 'Корги', 'Йоркширский терьер', None]
        cat_breeds = ['Британская', 'Персидская', 'Мейн-кун', 'Сфинкс', 'Сиамская', 'Шотландская вислоухая', None]
        
        pet_names = [
            'Барсик', 'Мурка', 'Шарик', 'Рекс', 'Бобик', 'Пушок', 
            'Снежок', 'Черныш', 'Рыжик', 'Белка', 'Стрелка', 'Лайка',
            'Джек', 'Макс', 'Чарли', 'Бадди', 'Оскар', 'Лео',
        ]
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        created = 0
        
        for i in range(count):
            user = random.choice(users)
            
            # Weighted random species
            rand = random.random()
            cumulative = 0
            species = 'dog'
            for sp, weight in species_weights:
                cumulative += weight
                if rand <= cumulative:
                    species = sp
                    break
            
            # Select breed based on species
            breed = None
            if species == 'dog':
                breed = random.choice(dog_breeds)
            elif species == 'cat':
                breed = random.choice(cat_breeds)
            
            # Random date
            random_days = random.randint(0, days)
            created_at = start_date + timedelta(days=random_days)
            
            name = random.choice(pet_names) + str(i)
            
            # Check if pet with this name already exists for this user
            if Pet.objects.filter(owner=user, name=name).exists():
                continue
            
            pet = Pet.objects.create(
                owner=user,
                name=name,
                species=species,
                breed=breed,
                gender=random.choice(['male', 'female']),
                activity_level=random.choice(['low', 'medium', 'high']),
                weight=Decimal(str(round(random.uniform(2, 40), 2))) if species in ['dog', 'cat'] else None,
            )
            
            # Update created_at
            Pet.objects.filter(id=pet.id).update(created_at=created_at)
            created += 1
        
        return created

    def _create_test_orders(self, users, count: int, days: int):
        """Create test orders with distributed creation dates."""
        from apps.shop.models import Order, Product
        
        if not users:
            return 0
        
        statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
        status_weights = [0.1, 0.1, 0.15, 0.55, 0.1]
        delivery_types = ['standard', 'express', 'pickup']
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        created = 0
        
        for i in range(count):
            user = random.choice(users)
            
            # Random date - more orders in recent period
            if random.random() > 0.3:
                random_days = random.randint(days // 3, days)
            else:
                random_days = random.randint(0, days)
            created_at = start_date + timedelta(days=random_days)
            
            # Random amounts
            subtotal = Decimal(str(round(random.uniform(500, 12000), 2)))
            delivery_cost = Decimal(str(round(random.uniform(0, 500), 2)))
            total_amount = subtotal + delivery_cost
            
            # Weighted random status
            rand = random.random()
            cumulative = 0
            status = 'delivered'
            for st, weight in zip(statuses, status_weights):
                cumulative += weight
                if rand <= cumulative:
                    status = st
                    break
            
            try:
                order = Order.objects.create(
                    user=user,
                    status=status,
                    subtotal_amount=subtotal,
                    delivery_cost=delivery_cost,
                    total_amount=total_amount,
                    shipping_address=f'г. Москва, ул. Тестовая {i}, кв. {random.randint(1, 200)}',
                    delivery_type=random.choice(delivery_types),
                    recipient_name=f'{user.first_name} {user.last_name}' if user.first_name else f'Тест {i}',
                    recipient_phone=f'+7900{str(i).zfill(7)}',
                )
                
                # Update created_at
                Order.objects.filter(id=order.id).update(created_at=created_at)
                created += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Could not create order: {e}'))
                continue
        
        return created

