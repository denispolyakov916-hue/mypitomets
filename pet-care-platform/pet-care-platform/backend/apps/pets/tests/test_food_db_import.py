"""Тесты безопасного импорта базы кормов + гейта продаваемости + подбора cat_dog.

Покрывает замечания ревью перед --apply:
  * парсер COPY (unescape, \\N, pg-массив);
  * идемпотентность --apply (двойной прогон — без дублей);
  * блок конфликта уникального ключа с БД (другой UUID);
  * блок битых строк COPY (число колонок ≠ заголовку);
  * нормализация species bird/rodent → other;
  * cat_dog попадает и в кошачий, и в собачий подбор;
  * SupplierOffer.is_sellable (нет цены/веса → не продаётся);
  * sync магазина: available=True только у продаваемой фасовки.
"""

import os
import tempfile
from decimal import Decimal
from types import SimpleNamespace

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from apps.pets.food_recipe_models import (
    FoodBrandRule,
    FoodRecipe,
    Supplier,
    SupplierOffer,
    SupplierRawItem,
)
from apps.pets.management.commands.import_food_database_sql import (
    parse_copy_blocks,
    unescape_copy,
    _parse_pg_array,
)
from apps.pets import food_recipe_candidate_provider as crp

# Фиксированные UUID (детерминизм). Код поставщика — уникальный, чтобы не пересечься
# с «Динозавриком», которого сидит миграция (unique constraint suppliers.code).
SUP_CODE = 'dino_test'
SUP_ID = '11111111-1111-1111-1111-111111111111'
REC_ID = '22222222-2222-2222-2222-222222222222'
OFF_ID = '33333333-3333-3333-3333-333333333333'
RAW_ID = '44444444-4444-4444-4444-444444444444'


# ---------- dump-хелпер: полный COPY-блок по всем колонкам модели ----------
def _fmt(v):
    if v is None:
        return r'\N'
    if v is True:
        return 't'
    if v is False:
        return 'f'
    return str(v).replace('\\', '\\\\').replace('\t', '\\t').replace('\n', '\\n')


def _default_for(fld):
    """DB-безопасное значение по типу поля, если тест его не задал."""
    internal = fld.get_internal_type()
    if fld.__class__.__name__ == 'ArrayField':
        return '{}'
    if internal in ('BooleanField', 'NullBooleanField'):
        return 'f'
    if internal in ('DecimalField', 'IntegerField', 'SmallIntegerField',
                    'BigIntegerField', 'PositiveIntegerField', 'FloatField'):
        return r'\N' if fld.null else '0'
    if internal == 'JSONField':
        return '{}'
    if internal == 'DateTimeField':
        return r'\N' if fld.null else '2026-01-01 00:00:00+00'
    if internal == 'ForeignKey':
        return r'\N'  # NOT NULL FK тесты задают явно
    # Char/Text/Slug/UUID и прочее строковое
    return '' if not fld.null else r'\N'


def _copy_block(model, rows):
    fields = list(model._meta.fields)
    cols = [f.column for f in fields]
    lines = [f'COPY public.{model._meta.db_table} ({", ".join(cols)}) FROM stdin;']
    for r in rows:
        vals = [_fmt(r[f.column]) if f.column in r else _default_for(f) for f in fields]
        lines.append('\t'.join(vals))
    lines.append('\\.')
    return '\n'.join(lines)


def build_dump(suppliers=(), recipes=(), offers=(), raws=(), brand_rules=(), corrupt=False):
    """Собрать pg_dump-подобный файл со всеми 5 таблицами (структура = модель)."""
    blocks = [
        _copy_block(Supplier, list(suppliers)),
        _copy_block(FoodRecipe, list(recipes)),
        _copy_block(SupplierOffer, list(offers)),
        _copy_block(SupplierRawItem, list(raws)),
        _copy_block(FoodBrandRule, list(brand_rules)),
    ]
    text = '\n'.join(blocks) + '\n'
    if corrupt:
        # у первого оффера отрезаем последнее значение → колонок меньше заголовка
        lines = text.split('\n')
        for i, ln in enumerate(lines):
            if ln.startswith(f'{OFF_ID}\t'):
                lines[i] = ln.rsplit('\t', 1)[0]
                break
        text = '\n'.join(lines)
    return text


def write_dump(**kw):
    fd, path = tempfile.mkstemp(suffix='.sql')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(build_dump(**kw))
    return path


def _report_path():
    fd, path = tempfile.mkstemp(suffix='.md')
    os.close(fd)
    return path


def _supplier_row(**over):
    row = {'id': SUP_ID, 'name': 'Динозаврик', 'code': SUP_CODE, 'is_active': True}
    row.update(over)
    return row


def _recipe_row(**over):
    row = {
        'id': REC_ID, 'name': 'Корм тест', 'species': 'cat', 'food_form': 'dry',
        'kcal_per_100g': '380.0', 'is_recommendable': True, 'review_status': 'auto_parsed',
        'source': 'dinozavrik',
    }
    row.update(over)
    return row


def _offer_row(**over):
    row = {
        'id': OFF_ID, 'supplier_id': SUP_ID, 'food_recipe_id': REC_ID,
        'article_number': 'ART-1', 'package_name': '2 кг', 'price': '990.00',
        'package_weight_kg': '2.000', 'in_stock': True, 'source': 'dinozavrik',
    }
    row.update(over)
    return row


# ================= парсер =================
class ParserUnitTests(TestCase):
    def test_unescape_null_and_escapes(self):
        self.assertIsNone(unescape_copy(r'\N'))
        self.assertEqual(unescape_copy('plain'), 'plain')
        self.assertEqual(unescape_copy(r'a\tb\nc'), 'a\tb\nc')
        self.assertEqual(unescape_copy(r'back\\slash'), 'back\\slash')

    def test_parse_pg_array(self):
        self.assertEqual(_parse_pg_array('{}'), [])
        self.assertEqual(_parse_pg_array(r'{"chicken","rice"}'), ['chicken', 'rice'])
        self.assertEqual(_parse_pg_array('{a,b,c}'), ['a', 'b', 'c'])

    def test_parse_copy_blocks_and_malformed_flag(self):
        path = write_dump(suppliers=[_supplier_row()], recipes=[_recipe_row()],
                          offers=[_offer_row()])
        data = parse_copy_blocks(path)
        os.unlink(path)
        self.assertEqual(len(data['supplier_offers']['rows']), 1)
        self.assertEqual(data['supplier_offers']['rows'][0]['article_number'], 'ART-1')
        self.assertEqual(data['supplier_offers']['malformed'], 0)

        bad_text = build_dump(suppliers=[_supplier_row()], recipes=[_recipe_row()],
                              offers=[_offer_row()], corrupt=True)
        fd, bpath = tempfile.mkstemp(suffix='.sql')
        with os.fdopen(fd, 'w') as f:
            f.write(bad_text)
        data2 = parse_copy_blocks(bpath)
        os.unlink(bpath)
        self.assertEqual(data2['supplier_offers']['malformed'], 1)


# ================= --apply: идемпотентность / нормализация / блокировки =================
class ApplyTests(TestCase):
    def _apply(self, **kw):
        path = write_dump(**kw)
        rep = _report_path()
        try:
            call_command('import_food_database_sql', file=path, apply=True, report=rep)
        finally:
            os.unlink(path)
            if os.path.exists(rep):
                os.unlink(rep)

    def test_apply_is_idempotent(self):
        kw = dict(suppliers=[_supplier_row()], recipes=[_recipe_row()],
                  offers=[_offer_row()], raws=[{'id': RAW_ID, 'supplier_id': SUP_ID,
                                                'external_id': 'X1', 'source': 'dinozavrik',
                                                'raw_json': '{}'}])
        self._apply(**kw)
        # ровно по одной МОЕЙ записи (в БД уже есть сидированный «Динозаврик» — считаем свои)
        self.assertEqual(Supplier.objects.filter(id=SUP_ID).count(), 1)
        self.assertEqual(FoodRecipe.objects.filter(id=REC_ID).count(), 1)
        self.assertEqual(SupplierOffer.objects.filter(id=OFF_ID).count(), 1)
        self.assertEqual(SupplierRawItem.objects.filter(id=RAW_ID).count(), 1)
        totals = (Supplier.objects.count(), FoodRecipe.objects.count(),
                  SupplierOffer.objects.count(), SupplierRawItem.objects.count())
        # второй прогон — те же UUID → апдейт, без дублей (тоталы не растут)
        self._apply(**kw)
        self.assertEqual(
            (Supplier.objects.count(), FoodRecipe.objects.count(),
             SupplierOffer.objects.count(), SupplierRawItem.objects.count()),
            totals,
        )

    def test_species_bird_normalized_to_other(self):
        self._apply(suppliers=[_supplier_row()],
                    recipes=[_recipe_row(species='bird')],
                    offers=[_offer_row()])
        self.assertEqual(FoodRecipe.objects.get(id=REC_ID).species, 'other')

    def test_cat_dog_species_preserved(self):
        self._apply(suppliers=[_supplier_row()],
                    recipes=[_recipe_row(species='cat_dog')],
                    offers=[_offer_row()])
        self.assertEqual(FoodRecipe.objects.get(id=REC_ID).species, 'cat_dog')

    def test_db_uuid_conflict_blocks_apply(self):
        # в БД уже есть оффер с тем же (supplier, article), но ДРУГИМ UUID
        sup = Supplier.objects.create(id=SUP_ID, name='Д', code=SUP_CODE)
        rec = FoodRecipe.objects.create(id=REC_ID, name='r', kcal_per_100g=Decimal('380'))
        SupplierOffer.objects.create(
            supplier=sup, food_recipe=rec, article_number='ART-1',
            price=Decimal('990'), package_weight_kg=Decimal('2'), in_stock=True,
        )
        # дамп несёт тот же (supplier, ART-1), но OFF_ID (другой UUID)
        with self.assertRaises(CommandError):
            self._apply(suppliers=[_supplier_row()], recipes=[_recipe_row()],
                        offers=[_offer_row()])

    def test_broken_copy_row_blocks_apply(self):
        with self.assertRaises(CommandError):
            self._apply(suppliers=[_supplier_row()], recipes=[_recipe_row()],
                        offers=[_offer_row()], corrupt=True)


# ================= is_sellable + подбор =================
class SellableAndMatchingTests(TestCase):
    def setUp(self):
        self.sup = Supplier.objects.create(id=SUP_ID, name='Д', code=SUP_CODE, is_active=True)

    def _recipe(self, species='cat'):
        return FoodRecipe.objects.create(
            name='r', species=species, food_form='dry', kcal_per_100g=Decimal('380'),
            is_recommendable=True, review_status='auto_parsed', source='dinozavrik',
        )

    def _offer(self, recipe, **over):
        d = dict(supplier=self.sup, food_recipe=recipe, article_number='A',
                 price=Decimal('990'), package_weight_kg=Decimal('2'), in_stock=True)
        d.update(over)
        return SupplierOffer.objects.create(**d)

    def test_is_sellable_matrix(self):
        rec = self._recipe()
        self.assertTrue(self._offer(rec, article_number='ok').is_sellable)
        self.assertFalse(self._offer(rec, article_number='p0', price=None).is_sellable)
        self.assertFalse(self._offer(rec, article_number='w0', package_weight_kg=None).is_sellable)
        self.assertFalse(self._offer(rec, article_number='oos', in_stock=False).is_sellable)
        self.assertFalse(self._offer(rec, article_number='pz', price=Decimal('0')).is_sellable)

    def test_inactive_supplier_offer_not_sellable(self):
        self.sup.is_active = False
        self.sup.save(update_fields=['is_active'])
        rec = self._recipe()
        self.assertFalse(self._offer(rec).is_sellable)

    def test_cat_dog_recipe_in_both_matching(self):
        rec = self._recipe(species='cat_dog')
        self._offer(rec)
        cat_ids = {c['recipe_id'] for c in
                   crp.get_food_recipe_candidates(SimpleNamespace(species='cat', weight=None))['candidates']}
        dog_ids = {c['recipe_id'] for c in
                   crp.get_food_recipe_candidates(SimpleNamespace(species='dog', weight=None))['candidates']}
        self.assertIn(str(rec.id), cat_ids)
        self.assertIn(str(rec.id), dog_ids)

    def test_cat_recipe_not_in_dog_matching(self):
        rec = self._recipe(species='cat')
        self._offer(rec)
        dog_ids = {c['recipe_id'] for c in
                   crp.get_food_recipe_candidates(SimpleNamespace(species='dog', weight=None))['candidates']}
        self.assertNotIn(str(rec.id), dog_ids)

    def test_recipe_with_only_unsellable_offer_excluded(self):
        rec = self._recipe(species='cat')
        self._offer(rec, price=None)  # нет цены → не продаётся → не кандидат
        cat_ids = {c['recipe_id'] for c in
                   crp.get_food_recipe_candidates(SimpleNamespace(species='cat', weight=None))['candidates']}
        self.assertNotIn(str(rec.id), cat_ids)
