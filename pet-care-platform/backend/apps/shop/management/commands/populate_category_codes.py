"""
Заполнение технических кодов категорий.

Использует маппинг из category_tree.md для установки кодов
вида food.dry, care.shampoos и т.д.

Использование:
    python manage.py populate_category_codes
"""

from django.core.management.base import BaseCommand
from apps.shop.models import Category


# Маппинг: kotmatros_category_id -> code
# Из docs/04 Магазин/Структура категорий/category_tree.md
CATEGORY_CODE_MAPPING = {
    # === КОШКИ ===
    2137: 'food',
    2322: 'food.dry',
    2320: 'food.wet',
    2319: 'food.canned',
    2318: 'food.pouches',
    2317: 'food.pate',
    2316: 'food.holistic',
    2315: 'food.diet',
    2314: 'food.hypoallergenic',
    2140: 'food.treats',
    2141: 'food.supplements',
    2342: 'health',
    2152: 'health.parasite',
    2153: 'toilet.litter',
    2154: 'feeding.bowls',
    2155: 'toys.toys',
    2156: 'walk',
    2178: 'walk.tags',
    2177: 'walk.harnesses',
    2176: 'walk.belts',
    2175: 'walk.leashes',
    2174: 'walk.collars',
    2157: 'care',
    2334: 'care.grooming',
    2337: 'toys.scratching_posts',
    2158: 'housing',
    2276: 'feeding.bottles',
    2275: 'housing.wheels_carriers',
    2274: 'housing.grates',
    2273: 'housing.doors',
    2272: 'toys.tunnels',
    2271: 'feeding.drinkers',
    2270: 'housing.blankets',
    2269: 'toys.playgrounds',
    2268: 'housing.trays',
    2267: 'housing.wheels_cages',
    2266: 'housing.cages',
    2265: 'toilet.scoops',
    2264: 'toilet.pads',
    2263: 'housing.carts',
    2262: 'housing.bags',
    2261: 'housing.strollers',
    2260: 'housing.hammocks',
    2259: 'housing.containers',
    2258: 'housing.carrier_straps',
    2257: 'housing.bedding',
    2256: 'housing.carriers',
    2255: 'housing.houses',
    2254: 'housing.mattresses',
    2253: 'housing.beds',
    2252: 'misc.documents',
    2159: 'clothing.general',
    2160: 'toilet',
    2339: 'behavior',
    
    # === СОБАКИ ===
    2136: 'food',  # Дубликат - будет пропущен
    2305: 'food.dry',  # Дубликат
    2307: 'food.wet',  # Дубликат
    2306: 'food.semi_moist',
    2308: 'food.canned',  # Дубликат
    2309: 'food.pouches',  # Дубликат
    2310: 'food.pate',  # Дубликат
    2311: 'food.holistic',  # Дубликат
    2312: 'food.diet',  # Дубликат
    2313: 'food.hypoallergenic',  # Дубликат
    2138: 'food.treats',  # Дубликат
    2139: 'food.supplements',  # Дубликат
    2346: 'food.lifestage.puppy',
    2345: 'food.lifestage.kitten',
    2341: 'health',  # Дубликат
    2144: 'health.parasite',  # Дубликат
    2143: 'feeding.bowls',  # Дубликат
    2142: 'toys.toys',  # Дубликат
    2332: 'care.grooming',  # Дубликат
    2145: 'walk',  # Дубликат
    2164: 'walk.harnesses',  # Дубликат
    2170: 'walk.tags',  # Дубликат
    2173: 'walk.carabiners',
    2168: 'walk.clickers',
    2165: 'walk.multiboxes',
    2169: 'walk.muzzles',
    2161: 'walk.collars',  # Дубликат
    2162: 'walk.leashes',  # Дубликат
    2166: 'walk.lights',
    2167: 'walk.retractable',
    2172: 'walk.popons',
    2171: 'walk.bandanas',
    2163: 'walk.belts',  # Дубликат
    2149: 'clothing.general',  # Дубликат
    2289: 'clothing.jumpsuits',
    2290: 'clothing.raincoats',
    2291: 'clothing.vests',
    2292: 'clothing.popons',
    2293: 'clothing.jackets',
    2294: 'clothing.sweaters',
    2295: 'clothing.hats',
    2296: 'clothing.socks',
    2297: 'clothing.shoes',
    2298: 'clothing.tshirts',
    2299: 'clothing.tops',
    2300: 'clothing.suits',
    2301: 'clothing.hoodies',
    2302: 'clothing.dresses',
    2147: 'care',  # Дубликат
    2304: 'care.shampoos',
    2288: 'care.misc',
    2216: 'care.towels',
    2212: 'care.claw_grinders',
    2213: 'care.dental_pastes',
    2208: 'care.deodorants',
    2207: 'care.balms',
    2209: 'care.tonics',
    2215: 'care.mousses',
    2210: 'care.claw_files',
    2206: 'care.drops',
    2211: 'care.foams',
    2205: 'care.creams',
    2203: 'care.masks',
    2202: 'care.serums',
    2204: 'care.claw_clippers',
    2200: 'care.furminators',
    2201: 'care.oils',
    2214: 'care.clippers',
    2197: 'care.combs',
    2196: 'care.slickers',
    2194: 'care.scissors',
    2198: 'care.rollers',
    2193: 'care.brushes',
    2199: 'care.scrapers',
    2187: 'care.wipes',
    2195: 'care.tweezers',
    2217: 'care.powders',
    2189: 'care.dental_brushes',
    2191: 'care.massagers',
    2186: 'care.soap',
    2185: 'care.conditioners',
    2179: 'care.shampoos',  # Дубликат
    2188: 'care.liquids',
    2180: 'care.sprays',
    2183: 'care.waxes',
    2181: 'care.gels',
    2182: 'care.lotions',
    2184: 'care.perfumes',
    2190: 'care.trimmers',
    2192: 'care.detanglers',
    2148: 'housing',  # Дубликат
    2284: 'housing.kennels',
    2285: 'housing.enclosures',
    2286: 'housing.houses',  # Дубликат
    2287: 'housing.cages',  # Дубликат
    2230: 'housing.partitions',
    2232: 'housing.bags',  # Дубликат
    2219: 'housing.beds',  # Дубликат
    2223: 'housing.carriers',  # Дубликат
    2234: 'toilet.pads',  # Дубликат
    2283: 'housing.accessories',
    2251: 'toys.tunnels',  # Дубликат
    2250: 'housing.ramps',
    2249: 'feeding.bottles',  # Дубликат
    2248: 'housing.stairs',
    2247: 'housing.doors',  # Дубликат
    2246: 'walk.belts',  # Дубликат
    2245: 'housing.grates',  # Дубликат
    2243: 'feeding.drinkers',  # Дубликат
    2242: 'care.paw_washers',
    2241: 'housing.blankets',  # Дубликат
    2240: 'housing.trays',  # Дубликат
    2239: 'housing.wheels_cages',  # Дубликат
    2233: 'housing.carts',  # Дубликат
    2236: 'walk.accessories',
    2235: 'housing.mats',
    2229: 'housing.strollers',  # Дубликат
    2227: 'care.protective_collars',
    2226: 'housing.pillows',
    2231: 'housing.safety_belts',
    2224: 'housing.containers',  # Дубликат
    2222: 'housing.carrier_straps',  # Дубликат
    2221: 'housing.bedding',  # Дубликат
    2228: 'housing.hammocks',  # Дубликат
    2225: 'housing.wheels_carriers',  # Дубликат
    2220: 'housing.mattresses',  # Дубликат
    2218: 'misc.documents',  # Дубликат
    2151: 'toilet',  # Дубликат
    2277: 'toilet.litter_boxes_auto',
    2278: 'toilet.bio_toilets',
    2279: 'toilet.waste_bags',
    2280: 'toilet.litter_boxes',
    2281: 'toilet.pads',  # Дубликат
    2282: 'toilet.diapers',
    2338: 'behavior',  # Дубликат
}


class Command(BaseCommand):
    help = 'Заполнение технических кодов категорий'

    def handle(self, *args, **options):
        updated = 0
        skipped = 0
        used_codes = set()
        
        for kotmatros_id, code in CATEGORY_CODE_MAPPING.items():
            try:
                category = Category.objects.get(kotmatros_category_id=kotmatros_id)
                
                # Пропускаем дубликаты кодов (разные external_id для кошек/собак)
                if code in used_codes:
                    # Делаем уникальный код, добавляя animal_type
                    unique_code = f"{code}.{category.animal_type}"
                    if unique_code in used_codes:
                        skipped += 1
                        continue
                    code = unique_code
                
                category.code = code
                category.save(update_fields=['code'])
                used_codes.add(code)
                updated += 1
                
            except Category.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f'Категория с kotmatros_id={kotmatros_id} не найдена'
                ))
                skipped += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Обновлено: {updated}, пропущено: {skipped}'
        ))
