"""
Импорт нормализованной базы Динозаврика в универсальную витрину магазина.

Источник — НАШ нормализованный слой (FoodRecipe + SupplierOffer), НЕ сырой JSON-фид.
Маппинг:
    FoodRecipe   -> shop.Product   (1 рецепт = 1 карточка товара)
    SupplierOffer-> shop.ProductSKU (1 фасовка = 1 SKU)

Идемпотентно: повторный запуск не плодит дубли (ключи Product.food_recipe и
ProductSKU.supplier_offer), обновляет цены/остатки/наименования/картинки.
Работает только со строками, у которых выставлены food_recipe / supplier_offer,
и не меняет товары без связи с нормализованным слоем Динозаврика.

Запуск:
    python manage.py import_dinozavrik_to_shop
    python manage.py import_dinozavrik_to_shop --limit 50      # частичный прогон
    python manage.py import_dinozavrik_to_shop --dry-run       # без записи (rollback)
"""

from contextlib import nullcontext
from collections import Counter
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.utils.text import slugify

from apps.shop.models import Product, ProductSKU, Brand, Category
from apps.pets.models import FoodRecipe, SupplierOffer, SupplierRawItem, Supplier

DINO_CODE = 'dinozavrik'
DINO_DOMAIN = 'https://www.dinozavrik.ru'
ZERO = Decimal('0.00')
BIG = Decimal('99999999')

# species рецепта -> animal_type товара
SPECIES_TO_ANIMAL = {'cat': 'cat', 'dog': 'dog'}

# code категории по (animal, food_form). Category.code уникален, поэтому у собак
# отдельные коды food.dog.* (cat монополизировал food.dry/food.wet/food.treats).
FORM_CODE = {
    'cat': {'dry': 'food.dry', 'wet': 'food.wet', 'treat': 'food.treats'},
    'dog': {'dry': 'food.dog.dry', 'wet': 'food.dog.wet', 'treat': 'food.dog.treats'},
}
GENERIC_CODE = {'cat': 'food', 'dog': 'food.dog'}
# недостающие dog-категории, которые команда создаёт сама (стиль таксономии: parent=food.dog, slug *-dog)
DOG_CATEGORIES = [
    ('food.dog.dry', 'Сухой', 'сухой-dog'),
    ('food.dog.wet', 'Влажный', 'влажный-dog'),
    ('food.dog.treats', 'Лакомства', 'лакомства-dog'),
]

# Красивые названия для slug-кодов, которые humanize не восстановит
# (кириллические оригиналы + нестандартная капитализация/символы).
KNOWN_BRANDS = {
    'derevenskie-lakomstva': 'Деревенские Лакомства',
    'frikote': 'Фрикотэ',
    'miratorg': 'Мираторг',
    'odno-myaso': 'Одно Мясо',
    'oriko': 'Орико',
    'schastlivyy-kot': 'Счастливый Кот',
    'schastlivyy-pes': 'Счастливый Пёс',
    'chat-chat': 'Chat&Chat',
    'biomenu': 'BioMenu',
    '8in1': '8in1',
}


class Command(BaseCommand):
    help = 'Создаёт shop.Product/ProductSKU из FoodRecipe/SupplierOffer (supplier.code=dinozavrik). Идемпотентно.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=0, help='Обработать только первые N рецептов (0 = все).')
        parser.add_argument('--dry-run', action='store_true', help='Прогон без записи (всё откатывается).')

    # ---------- хелперы ----------
    def _animal_for(self, species):
        return SPECIES_TO_ANIMAL.get(species, 'all')

    @staticmethod
    def _humanize_brand(code):
        """slug-код бренда -> читаемое имя ('best-dinner'->'Best Dinner', '8in1'->'8in1')."""
        code = (code or '').strip()
        if not code:
            return ''
        if code in KNOWN_BRANDS:
            return KNOWN_BRANDS[code]
        parts = code.replace('_', '-').split('-')
        out = [p if any(ch.isdigit() for ch in p) else p[:1].upper() + p[1:]
               for p in parts if p]
        return ' '.join(out) or code

    def _brand_for(self, code):
        """Бренд по slug-коду FoodRecipe.brand с красивым shop.Brand.name. Идемпотентно.

        1) переиспользовать существующий бренд с красивым именем;
        2) иначе переименовать slug-бренд прошлого импорта (name==code) в красивое;
        3) иначе создать. Связь с FoodRecipe.brand (код) не рвём.
        """
        code = (code or '').strip()
        if not code:
            return None
        if code in self._brand_cache:
            return self._brand_cache[code]
        pretty = self._humanize_brand(code)
        brand = Brand.objects.filter(name__iexact=pretty).first()
        if brand is None:
            brand = Brand.objects.filter(name__iexact=code).first()
            if brand is not None and brand.name != pretty:
                brand.name = pretty
                brand.save(update_fields=['name'])
                self.stat['brands_renamed'] += 1
        if brand is None:
            base = slugify(code) or slugify(code, allow_unicode=True) or 'brand'
            slug, i = base, 2
            while Brand.objects.filter(slug=slug).exists():
                slug, i = f'{base}-{i}', i + 1
            brand = Brand.objects.create(name=pretty, slug=slug)
            self.stat['brands_created'] += 1
        self._brand_cache[code] = brand
        return brand

    def _ensure_categories(self):
        """Создать недостающие dog food-категории идемпотентно."""
        parent = Category.objects.filter(code=GENERIC_CODE['dog']).first()  # food.dog
        if parent and parent.product_group != 'food':
            parent.product_group = 'food'
            parent.save(update_fields=['product_group'])
        for code, name, slug in DOG_CATEGORIES:
            _, created = Category.objects.get_or_create(
                code=code,
                defaults=dict(name=name, slug=slug, animal_type='dog',
                              product_group='food', parent=parent,
                              is_active=True, show_in_menu=True),
            )
            if created:
                self.stat['cats_created'] += 1

    def _cat(self, code):
        if code not in self._cat_cache:
            self._cat_cache[code] = Category.objects.filter(product_group='food', code=code).first()
        return self._cat_cache[code]

    def _category_for(self, species, food_form):
        """Подобрать food-категорию по species+food_form. Возвращает (category|None, warning|None)."""
        animal = self._animal_for(species)
        form_label = food_form or '—'
        if animal in ('cat', 'dog'):
            code = FORM_CODE[animal].get(food_form)
            if code:
                c = self._cat(code)
                if c:
                    return c, None
            c = self._cat(GENERIC_CODE[animal])  # generic того же зверя (food / food.dog)
            if c:
                return c, f"{animal}/{form_label}: нет точной формы -> generic '{GENERIC_CODE[animal]}'"
        # species пустой/other -> глобальная 'food'
        c = self._cat('food')
        if c:
            return c, f"{species or '—'}/{form_label}: нет видовой категории -> 'food'"
        return None, f"{species or '—'}/{form_label}: food-категория не найдена"

    def _raw_item(self, recipe, offers):
        ri = recipe.raw_items.filter(supplier=self.dino).first()
        if ri:
            return ri
        arts = [o.article_number for o in offers if o.article_number]
        if arts:
            return SupplierRawItem.objects.filter(supplier=self.dino, article_number__in=arts).first()
        return None

    @staticmethod
    def _s(v):
        """Безопасно привести значение raw_json к строке (поля бывают list/None)."""
        if isinstance(v, str):
            return v
        if isinstance(v, list):
            for x in v:
                if isinstance(x, str):
                    return x
        return ''

    def _image_url(self, raw_json):
        if not isinstance(raw_json, dict):
            return ''
        cand = self._s(raw_json.get('detailPicture')).strip()
        if not cand:
            mp = raw_json.get('morePhoto') or []
            if isinstance(mp, list):
                for x in mp:
                    if isinstance(x, str) and x.strip():
                        cand = x.strip()
                        break
        if not cand:
            cand = self._s(raw_json.get('previewPicture')).strip()
        if not cand:
            return ''
        if cand.startswith('http'):
            return cand
        if not cand.startswith('/'):
            cand = '/' + cand
        return DINO_DOMAIN + cand

    def _descr(self, raw_json, recipe):
        preview = detail = ''
        if isinstance(raw_json, dict):
            preview = self._s(raw_json.get('previewText')).strip()
            detail = self._s(raw_json.get('detailText')).strip()
        ing = getattr(recipe, 'ingredients', None) or []
        if isinstance(ing, (list, tuple)):
            ingredients = ', '.join(str(x).strip() for x in ing if x)
        else:
            ingredients = self._s(ing).strip()
        description = detail or preview or ingredients
        short = (preview or detail)[:500]
        return description, short

    @staticmethod
    def _default_offer(offers):
        """Самый дешёвый in_stock оффер; иначе самый дешёвый с ценой; иначе любой."""
        priced = [o for o in offers if o.price is not None]
        avail = [o for o in priced if o.in_stock]
        pool = avail or priced or offers
        if not pool:
            return None
        return min(pool, key=lambda o: (o.price if o.price is not None else BIG, o.article_number or ''))

    def _product_slug(self, name, recipe_id):
        base = slugify(name) or slugify(name, allow_unicode=True) or 'tovar'
        slug = f'{base[:80]}-{str(recipe_id)[:8]}'
        i = 2
        while Product.objects.filter(slug=slug).exists():
            slug, i = f'{base[:80]}-{str(recipe_id)[:8]}-{i}', i + 1
        return slug

    # ---------- основной проход ----------
    def _process_recipe(self, recipe):
        offers = list(recipe.offers.filter(supplier=self.dino))
        if not offers:
            return
        self.stat['recipes'] += 1

        default_offer = self._default_offer(offers)
        is_available = any(o.in_stock for o in offers)
        price = default_offer.price if (default_offer and default_offer.price is not None) else ZERO

        name = (recipe.name or '').strip() or f'Товар {str(recipe.id)[:8]}'
        animal = self._animal_for(recipe.species)
        brand = self._brand_for(recipe.brand)
        category, cat_warn = self._category_for(recipe.species, recipe.food_form)
        if cat_warn:
            self.warnings[cat_warn] += 1

        raw_item = self._raw_item(recipe, offers)
        raw_json = raw_item.raw_json if raw_item else {}
        image_url = self._image_url(raw_json)
        description, short = self._descr(raw_json, recipe)
        if not image_url:
            self.warnings['нет картинки в raw_json'] += 1

        # --- Product (ключ идемпотентности: food_recipe) ---
        product = Product.objects.filter(food_recipe=recipe).first()
        created = product is None
        if created:
            product = Product(food_recipe=recipe, slug=self._product_slug(name, recipe.id))
        product.name = name[:500]
        product.supplier = self.dino
        product.brand = brand
        product.new_category = category
        product.product_group = 'food'
        product.animal_type = animal
        product.is_available = is_available
        product.price = price
        product.status = 1
        product.image_url = image_url[:500]
        product.description = description
        product.short_description = short[:500]
        product.save()
        self.stat['prod_created' if created else 'prod_updated'] += 1

        # --- ProductSKU (ключ идемпотентности: supplier_offer) ---
        for offer in offers:
            _, sk_created = ProductSKU.objects.update_or_create(
                supplier_offer=offer,
                defaults=dict(
                    product=product,
                    sku=(offer.article_number or '')[:100],
                    name=(offer.package_name or '')[:255],
                    price=offer.price if offer.price is not None else ZERO,
                    weight_kg=offer.package_weight_kg,
                    available=offer.in_stock,
                    status=1,
                ),
            )
            self.stat['sku_created' if sk_created else 'sku_updated'] += 1

        # --- is_default: самый дешёвый in_stock SKU (иначе самый дешёвый) ---
        skus = list(ProductSKU.objects.filter(product=product, supplier_offer__in=offers))
        default_sku_id = None
        if default_offer is not None:
            for s in skus:
                if s.supplier_offer_id == default_offer.id:
                    default_sku_id = s.pk
                    break
        for s in skus:
            want = (s.pk == default_sku_id)
            if s.is_default != want:
                s.is_default = want
                s.save(update_fields=['is_default'])

    def handle(self, *args, **opts):
        w = self.stdout.write
        dry = opts['dry_run']
        limit = opts['limit']

        self.dino = Supplier.objects.filter(code=DINO_CODE).first()
        if not self.dino:
            self.stderr.write(self.style.ERROR(f"Поставщик code='{DINO_CODE}' не найден. Импорт прерван."))
            return

        self.stat = Counter()
        self.warnings = Counter()
        self._brand_cache = {}
        self._cat_cache = {}

        all_ids = list(
            FoodRecipe.objects.filter(offers__supplier=self.dino)
            .order_by('id').values_list('id', flat=True).distinct()
        )
        sel_ids = all_ids[:limit] if limit else all_ids
        total = len(sel_ids)
        brand_names = set(
            FoodRecipe.objects.filter(id__in=sel_ids).exclude(brand='')
            .values_list('brand', flat=True)
        )
        w(f'Рецептов Динозаврика к обработке: {total}{" (DRY-RUN)" if dry else ""}')

        outer = transaction.atomic() if dry else nullcontext()
        with outer:
            # пред-проход по брендам ВНЕ per-recipe savepoint: откат упавшего
            # рецепта не должен оставлять в кэше ссылку на откатанный бренд
            for bname in sorted(brand_names):
                self._brand_for(bname)
            self._ensure_categories()
            recipes = FoodRecipe.objects.filter(id__in=sel_ids).order_by('id')
            for i, recipe in enumerate(recipes.iterator(), 1):
                try:
                    with transaction.atomic():
                        self._process_recipe(recipe)
                except Exception as e:  # один плохой рецепт не должен ронять импорт
                    self.warnings[f'ошибка рецепта: {type(e).__name__}'] += 1
                    self.stderr.write(self.style.WARNING(f'  recipe {recipe.id}: {e}'))
                if i % 250 == 0:
                    w(f'  ...{i}/{total}')
            # уборка осиротевших slug-брендов прошлого импорта (0 товаров после консолидации)
            orphans = (Brand.objects.filter(name__in=brand_names)
                       .annotate(_n=Count('products')).filter(_n=0))
            self.stat['brands_orphans_deleted'] = orphans.count()
            orphans.delete()
            if dry:
                transaction.set_rollback(True)

        # --- итоговые метрики (по факту в БД, кроме dry-run) ---
        dino_products = Product.objects.filter(supplier=self.dino)
        available = dino_products.filter(is_available=True).count()
        not_recommendable = dino_products.filter(food_recipe__is_recommendable=False).count()
        with_images = dino_products.exclude(image_url='').exclude(image_url__isnull=True).count()
        skus_linked = ProductSKU.objects.filter(
            supplier_offer__isnull=False, supplier_offer__supplier=self.dino
        ).count()
        generic_codes = ['food', 'food.dog']
        in_generic = dino_products.filter(new_category__code__in=generic_codes).count()
        dog_proper = dino_products.filter(
            new_category__code__in=['food.dog.dry', 'food.dog.wet', 'food.dog.treats']
        ).count()

        w('')
        w('===== ИМПОРТ ДИНОЗАВРИКА В ВИТРИНУ%s =====' % (' (DRY-RUN, откат)' if dry else ''))
        w(f'Рецептов обработано:            {self.stat["recipes"]}')
        w(f'Product создано:                {self.stat["prod_created"]}')
        w(f'Product обновлено:              {self.stat["prod_updated"]}')
        w(f'SKU создано:                    {self.stat["sku_created"]}')
        w(f'SKU обновлено:                  {self.stat["sku_updated"]}')
        w(f'Брендов создано:                {self.stat["brands_created"]}')
        w(f'Брендов переименовано (slug->красиво): {self.stat["brands_renamed"]}')
        w(f'Брендов-дублей удалено (0 товаров):     {self.stat["brands_orphans_deleted"]}')
        w(f'Dog-категорий создано:          {self.stat["cats_created"]}')
        w('--- состояние витрины (Динозаврик) ---')
        w(f'Товаров доступно (is_available):{available}')
        w(f'Товаров НЕ в подборе (recipe.is_recommendable=False): {not_recommendable}')
        w(f'SKU связано с supplier_offer:   {skus_linked}')
        w(f'Товаров с изображением:         {with_images}')
        w(f'Товаров в generic-категории (food/food.dog): {in_generic}')
        w(f'  собачьих в правильных dog-категориях:      {dog_proper}')
        if self.warnings:
            w('--- топ warning-ов ---')
            for msg, cnt in self.warnings.most_common(10):
                w(f'  [{cnt}] {msg}')
        else:
            w('warning-ов нет')
        w('')
        w(f'В БД всего: Product={Product.objects.count()}, ProductSKU={ProductSKU.objects.count()}, '
          f'из них Динозаврик: Product={dino_products.count()}, SKU={skus_linked}')
