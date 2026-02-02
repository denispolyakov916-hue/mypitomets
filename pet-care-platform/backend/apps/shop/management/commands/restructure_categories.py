"""
Management command to restructure categories according to category_tree.md spec.

The spec defines:
- Animal type stored at product level, NOT as category hierarchy
- Universal categories: food, health, toilet, feeding, toys, walk, clothing, care, housing, behavior, misc
- Each with subcategories using dot notation: food.dry, food.wet, etc.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.shop.models import Category, Product


# Category tree from category_tree.md
CATEGORY_TREE = {
    'food': {
        'name': 'Питание',
        'icon': '🍖',
        'children': {
            'food.dry': 'Сухой корм',
            'food.wet': 'Влажный корм',
            'food.semi_moist': 'Полувлажный корм',
            'food.canned': 'Консервы',
            'food.pouches': 'Паучи',
            'food.pate': 'Паштеты',
            'food.holistic': 'Холистики',
            'food.diet': 'Диетический корм',
            'food.hypoallergenic': 'Гипоаллергенный корм',
            'food.treats': 'Лакомства',
            'food.supplements': 'Витамины и добавки',
        }
    },
    'health': {
        'name': 'Ветаптека',
        'icon': '💊',
        'children': {
            'health.parasite': 'Средства от паразитов',
        }
    },
    'toilet': {
        'name': 'Туалеты и гигиена',
        'icon': '🚽',
        'children': {
            'toilet.litter': 'Наполнители',
            'toilet.litter_boxes': 'Лотки',
            'toilet.pads': 'Пелёнки',
            'toilet.waste_bags': 'Пакеты для выгула',
        }
    },
    'feeding': {
        'name': 'Миски и поилки',
        'icon': '🥣',
        'children': {
            'feeding.bowls': 'Миски',
            'feeding.drinkers': 'Поилки',
        }
    },
    'toys': {
        'name': 'Игрушки и развлечения',
        'icon': '🎾',
        'children': {
            'toys.toys': 'Игрушки',
            'toys.scratching_posts': 'Когтеточки',
        }
    },
    'walk': {
        'name': 'Амуниция и выгул',
        'icon': '🎒',
        'children': {
            'walk.collars': 'Ошейники',
            'walk.leashes': 'Поводки',
            'walk.harnesses': 'Шлейки',
            'walk.muzzles': 'Намордники',
            'walk.retractable': 'Рулетки',
        }
    },
    'clothing': {
        'name': 'Одежда и обувь',
        'icon': '👕',
        'children': {
            'clothing.general': 'Одежда',
            'clothing.shoes': 'Обувь',
        }
    },
    'care': {
        'name': 'Уход и гигиена',
        'icon': '🧴',
        'children': {
            'care.grooming': 'Груминг',
            'care.shampoos': 'Шампуни',
        }
    },
    'housing': {
        'name': 'Дом и транспорт',
        'icon': '🏠',
        'children': {
            'housing.beds': 'Лежанки',
            'housing.carriers': 'Переноски',
            'housing.houses': 'Домики',
        }
    },
    'behavior': {
        'name': 'Контроль поведения',
        'icon': '🎯',
        'children': {}
    },
}

# Mapping: old category name/slug patterns -> new category code
# Order matters - more specific patterns should come first
OLD_TO_NEW_MAPPING = {
    # Food related - specific first
    'сухой': 'food.dry',
    'влажный': 'food.wet',
    'полувлажн': 'food.wet',  # Map semi-moist to wet
    'консервы': 'food.canned',
    'паучи': 'food.pouches',
    'паштет': 'food.pate',
    'холистик': 'food.holistic',
    'диетический': 'food.diet',
    'гипоаллерген': 'food.hypoallergenic',
    'лакомств': 'food.treats',
    'витамин': 'food.supplements',
    'добавк': 'food.supplements',
    'корм': 'food',
    
    # Health
    'паразит': 'health.parasite',
    'ветаптек': 'health',
    
    # Toilet - specific first
    'наполнител': 'toilet.litter',
    'лоток': 'toilet.litter_boxes',
    'пелёнк': 'toilet.pads',
    'пеленк': 'toilet.pads',
    'пакет': 'toilet.waste_bags',
    'подгузник': 'toilet.diapers',
    'совочк': 'toilet.scoops',
    'биотуалет': 'toilet.bio_toilets',
    'автоматическ': 'toilet.litter_boxes_auto',
    'туалет': 'toilet',
    
    # Feeding
    'миск': 'feeding.bowls',
    'поилк': 'feeding.drinkers',
    'бутылочк': 'feeding.bottles',
    
    # Toys - specific first
    'когтеточ': 'toys.scratching_posts',
    'тоннел': 'toys.tunnels',
    'площадк': 'toys.playgrounds',
    'игрушк': 'toys.toys',
    
    # Walk/Amunition - specific first
    'ошейник': 'walk.collars',
    'поводок': 'walk.leashes',
    'поводк': 'walk.leashes',
    'шлейк': 'walk.harnesses',
    'намордник': 'walk.muzzles',
    'рулетк': 'walk.retractable',
    'адресник': 'walk.tags',
    'карабин': 'walk.carabiners',
    'кликер': 'walk.clickers',
    'мультибокс': 'walk.multiboxes',
    'подсветк': 'walk.lights',
    'бандан': 'walk.bandanas',
    'попон': 'walk.popons',
    'косынк': 'walk.accessories',
    'пояс': 'walk.belts',
    'амуниц': 'walk',
    
    # Clothing - specific first
    'комбинезон': 'clothing.jumpsuits',
    'дождевик': 'clothing.raincoats',
    'жилетк': 'clothing.vests',
    'куртк': 'clothing.jackets',
    'свитер': 'clothing.sweaters',
    'шапк': 'clothing.hats',
    'носк': 'clothing.socks',
    'ботинк': 'clothing.shoes',
    'футболк': 'clothing.tshirts',
    'майк': 'clothing.tops',
    'костюм': 'clothing.suits',
    'толстовк': 'clothing.hoodies',
    'платья': 'clothing.dresses',
    'платье': 'clothing.dresses',
    'одежд': 'clothing.general',
    
    # Care - specific first
    'груминг': 'care.grooming',
    'шампун': 'care.shampoos',
    'кондиционер': 'care.conditioners',
    'спрей': 'care.sprays',
    'лосьон': 'care.lotions',
    'гел': 'care.gels',
    'воск': 'care.waxes',
    'парфюм': 'care.perfumes',
    'масл': 'care.oils',
    'маск': 'care.masks',
    'сыворотк': 'care.serums',
    'крем': 'care.creams',
    'пен': 'care.foams',
    'мусс': 'care.mousses',
    'тоник': 'care.tonics',
    'бальзам': 'care.balms',
    'дезодорант': 'care.deodorants',
    'салфетк': 'care.wipes',
    'мыло': 'care.soap',
    'жидкост': 'care.liquids',
    'капл': 'care.drops',
    'зубн': 'care.dental_pastes',
    'когтерез': 'care.claw_clippers',
    'гриндер': 'care.claw_grinders',
    'пилочк': 'care.claw_files',
    'щетк': 'care.brushes',
    'расческ': 'care.combs',
    'пуходерк': 'care.slickers',
    'ножниц': 'care.scissors',
    'ролик': 'care.rollers',
    'скребок': 'care.scrapers',
    'пинцет': 'care.tweezers',
    'пудр': 'care.powders',
    'массажер': 'care.massagers',
    'фурминатор': 'care.furminators',
    'машинк': 'care.clippers',
    'триммер': 'care.trimmers',
    'колотунорез': 'care.detanglers',
    'полотенц': 'care.towels',
    'лапомойк': 'care.paw_washers',
    'защитн': 'care.protective_collars',
    'техничк': 'care.misc',
    'средства по уход': 'care',
    'уход': 'care',
    
    # Housing - specific first
    'будк': 'housing.kennels',
    'вольер': 'housing.enclosures',
    'домик': 'housing.houses',
    'клетк': 'housing.cages',
    'перегородк': 'housing.partitions',
    'сумк': 'housing.bags',
    'лежанк': 'housing.beds',
    'переноск': 'housing.carriers',
    'контейнер': 'housing.containers',
    'дверц': 'housing.doors',
    'решетк': 'housing.grates',
    'колес': 'housing.wheels_carriers',
    'поддон': 'housing.trays',
    'тележк': 'housing.carts',
    'колясок': 'housing.strollers',
    'коляск': 'housing.strollers',
    'гамак': 'housing.hammocks',
    'подстилк': 'housing.bedding',
    'матрас': 'housing.mattresses',
    'плед': 'housing.blankets',
    'подушк': 'housing.pillows',
    'коврик': 'housing.mats',
    'пандус': 'housing.ramps',
    'лестниц': 'housing.stairs',
    'ремн': 'housing.carrier_straps',
    'транспортировк': 'housing',
    'содержан': 'housing',
    
    # Behavior
    'контроль поведен': 'behavior',
    
    # Misc
    'паспорт': 'misc.documents',
    'документ': 'misc.documents',
}


class Command(BaseCommand):
    help = 'Restructure categories according to category_tree.md specification'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--create-new',
            action='store_true',
            help='Create new category structure from scratch',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        create_new = options['create_new']

        if create_new:
            self.create_new_structure(dry_run)
        else:
            self.update_existing_categories(dry_run)

    def create_new_structure(self, dry_run):
        """Create new category structure and migrate products."""
        self.stdout.write(self.style.NOTICE('Creating new category structure...'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - no changes will be made'))

        # First, analyze current categories and their products
        self.stdout.write('\n=== Current category analysis ===')
        old_categories = list(Category.objects.all())
        self.stdout.write(f'Total categories: {len(old_categories)}')

        # Map old categories to new codes
        category_mapping = {}  # old_id -> new_code
        
        for cat in old_categories:
            name_lower = cat.name.lower()
            slug_lower = cat.slug.lower()
            
            new_code = None
            for pattern, code in OLD_TO_NEW_MAPPING.items():
                if pattern in name_lower or pattern in slug_lower:
                    new_code = code
                    break
            
            if new_code:
                category_mapping[cat.id] = new_code
                products_count = Product.objects.filter(new_category_id=cat.id).count()
                self.stdout.write(f'  {cat.name} ({cat.id}) -> {new_code} [{products_count} products]')
            else:
                self.stdout.write(self.style.WARNING(f'  {cat.name} ({cat.id}) -> NO MAPPING'))

        if dry_run:
            # Show summary
            self.stdout.write('\n=== Summary ===')
            code_counts = {}
            for old_id, code in category_mapping.items():
                if code not in code_counts:
                    code_counts[code] = 0
                code_counts[code] += Product.objects.filter(new_category_id=old_id).count()
            for code, count in sorted(code_counts.items()):
                self.stdout.write(f'  {code}: {count} products')
            self.stdout.write(self.style.SUCCESS('\nDry run complete. Remove --dry-run to apply changes.'))
            return

        with transaction.atomic():
            # Step 1: Clear all existing category codes to avoid conflicts
            self.stdout.write('\n=== Step 1: Clear existing codes ===')
            Category.objects.all().update(code=None)
            self.stdout.write('  Cleared all category codes')
            
            # Step 2: Create new unified categories
            self.stdout.write('\n=== Step 2: Create new categories ===')
            new_categories = {}  # code -> Category object
            
            for code, info in CATEGORY_TREE.items():
                parent_cat, created = Category.objects.update_or_create(
                    slug=code,
                    defaults={
                        'name': info['name'],
                        'code': code,
                        'icon': info.get('icon', ''),
                        'is_active': True,
                        'parent': None,
                    }
                )
                new_categories[code] = parent_cat
                status = 'CREATED' if created else 'UPDATED'
                self.stdout.write(f'  {status}: {code} = {info["name"]}')
                
                # Create children
                for child_code, child_name in info.get('children', {}).items():
                    child_slug = child_code.replace('.', '-')
                    child_cat, child_created = Category.objects.update_or_create(
                        slug=child_slug,
                        defaults={
                            'name': child_name,
                            'code': child_code,
                            'is_active': True,
                            'parent': parent_cat,
                        }
                    )
                    new_categories[child_code] = child_cat
                    status = 'CREATED' if child_created else 'UPDATED'
                    self.stdout.write(f'    {status}: {child_code} = {child_name}')

            # Step 3: Migrate products to new categories
            self.stdout.write('\n=== Step 3: Migrate products ===')
            products_updated = 0
            for old_id, new_code in category_mapping.items():
                if new_code in new_categories:
                    new_cat = new_categories[new_code]
                    # Don't migrate if already pointing to the new category
                    count = Product.objects.filter(new_category_id=old_id).exclude(new_category=new_cat).update(new_category=new_cat)
                    products_updated += count
                    if count > 0:
                        self.stdout.write(f'  Migrated {count} products to {new_code}')

            # Step 4: Delete old categories that are no longer needed
            self.stdout.write('\n=== Step 4: Clean up old categories ===')
            new_cat_ids = set(c.id for c in new_categories.values())
            old_cats_to_check = Category.objects.exclude(id__in=new_cat_ids)
            
            deleted_count = 0
            for cat in old_cats_to_check:
                # Check if any products still reference this category
                products_with_cat = Product.objects.filter(new_category=cat).count()
                if products_with_cat == 0:
                    self.stdout.write(f'  Deleting unused: {cat.name} ({cat.slug})')
                    cat.delete()
                    deleted_count += 1
                else:
                    self.stdout.write(self.style.WARNING(f'  Keeping (has {products_with_cat} products): {cat.name}'))

            self.stdout.write(self.style.SUCCESS(f'\n=== Complete ==='))
            self.stdout.write(f'Products migrated: {products_updated}')
            self.stdout.write(f'Old categories deleted: {deleted_count}')

    def update_existing_categories(self, dry_run):
        """Analyze and map old categories to new structure."""
        self.stdout.write(self.style.NOTICE('Analyzing existing categories...'))
        
        # Build mapping of old category IDs to new codes
        category_mapping = {}  # old_id -> new_code
        
        for cat in Category.objects.all():
            name_lower = cat.name.lower()
            slug_lower = cat.slug.lower()
            
            for pattern, code in OLD_TO_NEW_MAPPING.items():
                if pattern in name_lower or pattern in slug_lower:
                    category_mapping[cat.id] = code
                    self.stdout.write(f'  {cat.name} (id:{cat.id}) -> {code}')
                    break
            else:
                self.stdout.write(self.style.WARNING(f'  {cat.name} (id:{cat.id}) -> NO MAPPING'))
        
        self.stdout.write(f'\nMapped {len(category_mapping)} categories')
        
        if not dry_run:
            self.stdout.write(self.style.NOTICE('\nTo apply changes, use --create-new flag'))
