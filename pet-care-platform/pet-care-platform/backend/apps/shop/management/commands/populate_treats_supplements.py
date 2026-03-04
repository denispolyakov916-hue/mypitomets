"""
Management command для заполнения базы лакомствами и добавками.

Создаёт тестовые данные для категорий 'treats' и 'supplements'
с учётом возраста, породы и заболеваний питомцев.
"""

import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Product


class Command(BaseCommand):
    help = 'Заполняет базу лакомствами и добавками для подбора корма'

    # Лакомства для собак
    DOG_TREATS = [
        {
            'name': 'Мнямс лакомство для собак "Утиная грудка"',
            'subcategory': 'natural',
            'price': 250,
            'weight': 0.1,
            'description': 'Натуральное лакомство из утиной грудки для собак всех пород. Без консервантов.',
            'min_age_months': 3,
            'target_size': 'all',
        },
        {
            'name': 'TiTBiT Печенье для дрессировки',
            'subcategory': 'training',
            'price': 180,
            'weight': 0.15,
            'description': 'Мини-печенье для поощрения при дрессировке. Низкокалорийное.',
            'min_age_months': 2,
            'target_size': 'all',
        },
        {
            'name': 'Pedigree DentaStix для чистки зубов (средние породы)',
            'subcategory': 'dental',
            'price': 320,
            'weight': 0.18,
            'description': 'Палочки для ежедневного ухода за зубами. Снижает образование зубного камня на 80%.',
            'min_age_months': 6,
            'target_size': 'medium',
        },
        {
            'name': 'Pedigree DentaStix для чистки зубов (крупные породы)',
            'subcategory': 'dental',
            'price': 380,
            'weight': 0.27,
            'description': 'Палочки для крупных пород. Уход за зубами и свежее дыхание.',
            'min_age_months': 6,
            'target_size': 'large',
        },
        {
            'name': 'Pedigree DentaStix для чистки зубов (мелкие породы)',
            'subcategory': 'dental',
            'price': 280,
            'weight': 0.11,
            'description': 'Палочки для мелких пород. Защита от зубного камня.',
            'min_age_months': 6,
            'target_size': 'small',
        },
        {
            'name': 'Деревенские лакомства Куриные ломтики сушёные',
            'subcategory': 'natural',
            'price': 290,
            'weight': 0.08,
            'description': '100% натуральная курица. Высокое содержание белка.',
            'min_age_months': 4,
            'target_size': 'all',
        },
        {
            'name': 'TiTBiT Бисквит для щенков с ягнёнком',
            'subcategory': 'training',
            'price': 150,
            'weight': 0.1,
            'description': 'Специально для щенков. Легко усваивается.',
            'min_age_months': 2,
            'max_age_months': 12,
            'target_size': 'all',
        },
        {
            'name': 'Greenies лакомство для суставов',
            'subcategory': 'functional',
            'price': 450,
            'weight': 0.17,
            'description': 'С глюкозамином и хондроитином. Поддержка суставов для активных собак.',
            'min_age_months': 12,
            'target_size': 'all',
            'health_benefit': 'joint',
        },
        {
            'name': 'Мнямс лакомство для пожилых собак "Мягкие кусочки"',
            'subcategory': 'functional',
            'price': 280,
            'weight': 0.12,
            'description': 'Мягкая текстура для собак старшего возраста. Легко жевать.',
            'min_age_months': 84,
            'target_size': 'all',
        },
        {
            'name': 'Brit Care лакомство гипоаллергенное с кроликом',
            'subcategory': 'functional',
            'price': 340,
            'weight': 0.1,
            'description': 'Гипоаллергенное лакомство на основе кролика. Без курицы и говядины.',
            'min_age_months': 3,
            'target_size': 'all',
            'allergen_free': True,
        },
    ]

    # Лакомства для кошек
    CAT_TREATS = [
        {
            'name': 'Dreamies с курицей',
            'subcategory': 'training',
            'price': 120,
            'weight': 0.06,
            'description': 'Хрустящие подушечки с нежной начинкой. Любимое лакомство кошек.',
            'min_age_months': 2,
            'target_size': 'all',
        },
        {
            'name': 'GimCat Мальт-паста',
            'subcategory': 'functional',
            'price': 280,
            'weight': 0.05,
            'description': 'Выводит шерсть из желудка. Для длинношёрстных кошек.',
            'min_age_months': 6,
            'target_size': 'all',
            'health_benefit': 'hairball',
        },
        {
            'name': 'Whiskas Temptations с лососем',
            'subcategory': 'natural',
            'price': 150,
            'weight': 0.08,
            'description': 'Хрустящее снаружи, мягкое внутри. Вкус лосося.',
            'min_age_months': 2,
            'target_size': 'all',
        },
        {
            'name': 'Felix Party Mix Гриль',
            'subcategory': 'natural',
            'price': 130,
            'weight': 0.06,
            'description': 'Ассорти вкусов: курица, говядина, лосось.',
            'min_age_months': 2,
            'target_size': 'all',
        },
        {
            'name': 'Мнямс лакомство для котят "Нежные кусочки"',
            'subcategory': 'training',
            'price': 140,
            'weight': 0.05,
            'description': 'Специально для котят. Мягкая текстура.',
            'min_age_months': 2,
            'max_age_months': 12,
            'target_size': 'all',
        },
        {
            'name': 'GimCat Дента-Кисс для зубов',
            'subcategory': 'dental',
            'price': 220,
            'weight': 0.04,
            'description': 'Для ухода за зубами кошек. Уменьшает зубной налёт.',
            'min_age_months': 6,
            'target_size': 'all',
        },
        {
            'name': 'Brit Care лакомство для кошек с уткой',
            'subcategory': 'natural',
            'price': 180,
            'weight': 0.05,
            'description': 'Беззерновое лакомство. Гипоаллергенное.',
            'min_age_months': 3,
            'target_size': 'all',
            'allergen_free': True,
        },
    ]

    # Добавки для собак
    DOG_SUPPLEMENTS = [
        {
            'name': 'Excel 8in1 Мультивитамины для взрослых собак',
            'subcategory': 'vitamins',
            'price': 890,
            'weight': 0.15,
            'description': 'Комплекс витаминов и минералов для ежедневного применения.',
            'min_age_months': 12,
            'target_size': 'all',
            'supplement_type': 'vitamins',
        },
        {
            'name': 'Excel 8in1 Мультивитамины для щенков',
            'subcategory': 'vitamins',
            'price': 780,
            'weight': 0.12,
            'description': 'Витамины для роста и развития щенков.',
            'min_age_months': 2,
            'max_age_months': 12,
            'target_size': 'all',
            'supplement_type': 'vitamins',
        },
        {
            'name': 'Canvit Chondro Super для суставов',
            'subcategory': 'joint',
            'price': 1450,
            'weight': 0.23,
            'description': 'Глюкозамин + хондроитин + MSM. Для крупных пород и активных собак.',
            'min_age_months': 12,
            'target_size': 'large',
            'supplement_type': 'joint',
        },
        {
            'name': 'Polidex Gelabon plus Glucosamine для суставов',
            'subcategory': 'joint',
            'price': 1200,
            'weight': 0.2,
            'description': 'Хондропротектор для собак всех пород.',
            'min_age_months': 6,
            'target_size': 'all',
            'supplement_type': 'joint',
        },
        {
            'name': 'Nordic Naturals Omega-3 Pet для кожи и шерсти',
            'subcategory': 'omega3',
            'price': 1680,
            'weight': 0.12,
            'description': 'Рыбий жир высокой очистки. Блестящая шерсть и здоровая кожа.',
            'min_age_months': 3,
            'target_size': 'all',
            'supplement_type': 'omega3',
        },
        {
            'name': 'Beaphar Кальций для щенков и беременных',
            'subcategory': 'calcium',
            'price': 650,
            'weight': 0.18,
            'description': 'Кальций и витамин D3 для костей и зубов.',
            'min_age_months': 2,
            'target_size': 'all',
            'supplement_type': 'calcium',
        },
        {
            'name': 'Excel 8in1 Senior Multi Vitamin для пожилых собак',
            'subcategory': 'senior',
            'price': 950,
            'weight': 0.15,
            'description': 'Специальный комплекс для собак старше 7 лет.',
            'min_age_months': 84,
            'target_size': 'all',
            'supplement_type': 'senior',
        },
        {
            'name': 'Canina Petvital Derm Caps для кожи',
            'subcategory': 'skin',
            'price': 1100,
            'weight': 0.1,
            'description': 'При проблемах с кожей и шерстью. Биотин + цинк.',
            'min_age_months': 6,
            'target_size': 'all',
            'supplement_type': 'skin',
        },
        {
            'name': 'ProPlan FortiFlora пробиотик для ЖКТ',
            'subcategory': 'digestion',
            'price': 1350,
            'weight': 0.03,
            'description': 'Пробиотик для нормализации пищеварения.',
            'min_age_months': 3,
            'target_size': 'all',
            'supplement_type': 'digestion',
        },
        {
            'name': 'Canina Biotin Forte для шерсти',
            'subcategory': 'skin',
            'price': 980,
            'weight': 0.21,
            'description': 'Высокая концентрация биотина. Против линьки.',
            'min_age_months': 6,
            'target_size': 'all',
            'supplement_type': 'skin',
        },
    ]

    # Добавки для кошек
    CAT_SUPPLEMENTS = [
        {
            'name': 'Beaphar Kitty\'s Mix Мультивитамины для кошек',
            'subcategory': 'vitamins',
            'price': 580,
            'weight': 0.08,
            'description': 'Витамины в форме таблеток-лакомств. Таурин + биотин.',
            'min_age_months': 6,
            'target_size': 'all',
            'supplement_type': 'vitamins',
        },
        {
            'name': 'GimCat Multi-Vitamin Paste',
            'subcategory': 'vitamins',
            'price': 450,
            'weight': 0.05,
            'description': 'Мультивитаминная паста с таурином.',
            'min_age_months': 3,
            'target_size': 'all',
            'supplement_type': 'vitamins',
        },
        {
            'name': 'Canina Cat-Mineral Tabs',
            'subcategory': 'calcium',
            'price': 720,
            'weight': 0.15,
            'description': 'Минеральный комплекс с кальцием для кошек.',
            'min_age_months': 6,
            'target_size': 'all',
            'supplement_type': 'calcium',
        },
        {
            'name': 'Beaphar Laveta Super для шерсти кошек',
            'subcategory': 'skin',
            'price': 650,
            'weight': 0.05,
            'description': 'Жидкие витамины. Против выпадения шерсти.',
            'min_age_months': 6,
            'target_size': 'all',
            'supplement_type': 'skin',
        },
        {
            'name': 'GimCat Taurin Paste',
            'subcategory': 'vitamins',
            'price': 380,
            'weight': 0.05,
            'description': 'Таурин для здоровья сердца и зрения.',
            'min_age_months': 3,
            'target_size': 'all',
            'supplement_type': 'immune',
        },
        {
            'name': 'Canina Katzenmilch заменитель молока для котят',
            'subcategory': 'vitamins',
            'price': 890,
            'weight': 0.15,
            'description': 'Полноценный заменитель кошачьего молока для котят.',
            'min_age_months': 0,
            'max_age_months': 3,
            'target_size': 'all',
            'supplement_type': 'vitamins',
        },
        {
            'name': 'ProPlan FortiFlora для кошек',
            'subcategory': 'digestion',
            'price': 1250,
            'weight': 0.03,
            'description': 'Пробиотик для кошек при проблемах с ЖКТ.',
            'min_age_months': 3,
            'target_size': 'all',
            'supplement_type': 'digestion',
        },
        {
            'name': 'Beaphar Senior Vitamine для пожилых кошек',
            'subcategory': 'senior',
            'price': 690,
            'weight': 0.08,
            'description': 'Витамины для кошек старше 7 лет.',
            'min_age_months': 84,
            'target_size': 'all',
            'supplement_type': 'senior',
        },
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет сделано, без сохранения'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Удалить существующие и создать заново'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        if force and not dry_run:
            # Удаляем существующие
            deleted_treats = Product.objects.filter(category='treats').delete()[0]
            deleted_supps = Product.objects.filter(category='supplements').delete()[0]
            self.stdout.write(f'Удалено: {deleted_treats} лакомств, {deleted_supps} добавок')
        
        created_count = 0
        
        # Создаём лакомства для собак
        for item in self.DOG_TREATS:
            created = self._create_product(item, 'treats', 'dog', dry_run)
            if created:
                created_count += 1
        
        # Создаём лакомства для кошек
        for item in self.CAT_TREATS:
            created = self._create_product(item, 'treats', 'cat', dry_run)
            if created:
                created_count += 1
        
        # Создаём добавки для собак
        for item in self.DOG_SUPPLEMENTS:
            created = self._create_product(item, 'supplements', 'dog', dry_run)
            if created:
                created_count += 1
        
        # Создаём добавки для кошек
        for item in self.CAT_SUPPLEMENTS:
            created = self._create_product(item, 'supplements', 'cat', dry_run)
            if created:
                created_count += 1
        
        if dry_run:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] Было бы создано {created_count} товаров'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Создано {created_count} товаров (лакомства + добавки)'))

    def _create_product(self, item, category, animal, dry_run):
        """Создать товар."""
        external_id = f"{category}_{animal}_{item['name'][:30].replace(' ', '_')}"
        
        # Проверяем существование
        if Product.objects.filter(external_id=external_id).exists():
            if not dry_run:
                self.stdout.write(f'  [SKIP] {item["name"]} - уже существует')
            return False
        
        if dry_run:
            self.stdout.write(f'  [CREATE] {category}/{animal}: {item["name"]}')
            return True
        
        # Создаём продукт
        product = Product.objects.create(
            external_id=external_id,
            name=item['name'],
            description=item.get('description', ''),
            price=Decimal(str(item['price'])),
            weight=Decimal(str(item.get('weight', 0.1))),
            animal=animal,
            category=category,
            subcategory=item.get('subcategory', 'general'),
            in_stock=True,
            stock_count=random.randint(10, 100),
            # Поля для подбора корма
            min_age_months=item.get('min_age_months'),
            max_age_months=item.get('max_age_months'),
            target_size=item.get('target_size', 'all'),
            # Калорийность (примерная)
            kcal_per_100g=Decimal(str(random.randint(300, 400))) if category == 'treats' else None,
        )
        
        self.stdout.write(f'  [OK] {item["name"]}')
        return True
