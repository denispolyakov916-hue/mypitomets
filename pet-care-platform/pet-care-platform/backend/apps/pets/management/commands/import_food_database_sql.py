"""
Безопасный импорт базы кормов из pg_dump (COPY) БЕЗ выполнения SQL в рабочей БД.

Дамп содержит DROP TABLE — выполнять его напрямую НЕЛЬЗЯ. Эта команда:
  * парсит только COPY-блоки (не выполняет никакого SQL из файла);
  * прогоняет пред-импортные проверки и пишет отчёт food-db-import-report.md;
  * --dry-run (по умолчанию): ничего не пишет в БД, только отчёт + предпросмотр
    создано/обновлено по UUID;
  * --apply: идемпотентный upsert по UUID в одной транзакции (update_or_create),
    существующие записи обновляются, ничего не удаляется. Порядок: suppliers →
    food_recipes → supplier_offers → supplier_raw_items → food_brand_rules.

Запуск:
  python manage.py import_food_database_sql --file dump.sql --dry-run
  python manage.py import_food_database_sql --file dump.sql --apply
"""

import json
import re
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from apps.pets.food_recipe_models import (
    FoodBrandRule,
    FoodRecipe,
    Supplier,
    SupplierOffer,
    SupplierRawItem,
)

# Таблица дампа → модель. Порядок = порядок применения (FK-зависимости).
TABLE_ORDER = ['suppliers', 'food_recipes', 'supplier_offers', 'supplier_raw_items', 'food_brand_rules']
TABLE_MODELS = {
    'suppliers': Supplier,
    'food_recipes': FoodRecipe,
    'supplier_offers': SupplierOffer,
    'supplier_raw_items': SupplierRawItem,
    'food_brand_rules': FoodBrandRule,
}

# Допустимые enum-значения (пустая строка = blank, допускается для необязательных).
ENUM_VALID = {
    ('food_recipes', 'species'): {'cat', 'dog', 'other', ''},
    ('food_recipes', 'food_form'): {'dry', 'wet', 'treat', 'other', ''},
    ('food_recipes', 'parse_status'): {'pending', 'auto_parsed', 'partial', 'failed'},
    ('food_recipes', 'review_status'): {'unverified', 'auto_parsed', 'manual_verified'},
    ('suppliers', 'supplier_type'): {'feed', 'api', 'manual'},
    ('suppliers', 'payment_model'): {'partner_checkout', 'platform_checkout', 'cash_on_pickup'},
    ('suppliers', 'settlement_model'): {'agent_commission', 'resale_margin', 'manual_reconciliation'},
}
# jsonb-колонки, которые должны быть валидным JSON.
JSON_COLUMNS = {
    ('food_recipes', 'field_confidence'),
    ('supplier_offers', 'raw'),
    ('supplier_raw_items', 'raw_json'),
}

_ESCAPES = {'t': '\t', 'n': '\n', 'r': '\r', '\\': '\\', 'b': '\b', 'f': '\f', 'v': '\v'}


def unescape_copy(value):
    """Раскодировать одно значение COPY text-формата. '\\N' → None."""
    if value == r'\N':
        return None
    out, i, n = [], 0, len(value)
    while i < n:
        ch = value[i]
        if ch == '\\' and i + 1 < n:
            out.append(_ESCAPES.get(value[i + 1], value[i + 1]))
            i += 2
        else:
            out.append(ch)
            i += 1
    return ''.join(out)


def parse_copy_blocks(path):
    """Парсер pg_dump: возвращает {table: {'columns': [...], 'rows': [dict, ...]}}.

    Никакой SQL не исполняется — читаются только строки между
    `COPY public.<table> (<cols>) FROM stdin;` и терминатором `\\.`.
    """
    header_re = re.compile(r'^COPY public\.(\w+) \(([^)]*)\) FROM stdin;')
    data = {}
    current = None
    cols = None
    table = None
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if current is None:
                m = header_re.match(line)
                if m:
                    table = m.group(1)
                    cols = [c.strip() for c in m.group(2).split(',')]
                    current = []
                continue
            if line.rstrip('\n') == r'\.':
                data[table] = {'columns': cols, 'rows': current}
                current = cols = table = None
                continue
            raw = line.rstrip('\n')
            parts = raw.split('\t')
            # Если колонок меньше (край дампа) — не падаем, помечаем как есть.
            row = {cols[i]: unescape_copy(parts[i]) for i in range(min(len(cols), len(parts)))}
            current.append(row)
    return data


def is_blank(v):
    return v is None or v == ''


def is_empty_array(v):
    return v is None or v in ('{}', '')


def json_ok(v):
    if is_blank(v):
        return True  # NULL/пусто трактуем отдельно; здесь проверяем только «битый JSON»
    try:
        json.loads(v)
        return True
    except (ValueError, TypeError):
        return False


def positive_decimal(v):
    if is_blank(v):
        return None
    try:
        return Decimal(v)
    except (InvalidOperation, ValueError):
        return None


class Command(BaseCommand):
    help = 'Безопасный импорт базы кормов из pg_dump (COPY) с dry-run и отчётом.'

    def add_arguments(self, parser):
        parser.add_argument('--file', required=True, help='Путь к .sql дампу (pg_dump).')
        parser.add_argument('--apply', action='store_true', help='Применить (upsert по UUID). По умолчанию dry-run.')
        parser.add_argument('--dry-run', action='store_true', help='Только проверки и отчёт (по умолчанию).')
        parser.add_argument('--report', default='food-db-import-report.md', help='Путь к файлу отчёта.')

    def handle(self, *args, **opts):
        path = opts['file']
        apply = opts['apply']
        report_path = opts['report']

        try:
            data = parse_copy_blocks(path)
        except FileNotFoundError:
            raise CommandError(f'Файл не найден: {path}')

        checks = self._run_checks(data)
        preview = self._idempotency_preview(data)
        blocking = [c for c in checks if c['severity'] == 'error']

        report = self._render_report(path, data, checks, preview, apply, blocking)
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        self.stdout.write(f'Отчёт: {report_path}')
        self.stdout.write(self._summary_line(data, checks, preview))

        if not apply:
            self.stdout.write(self.style.WARNING('DRY-RUN: в БД ничего не записано.'))
            return

        if blocking:
            raise CommandError(
                f'Импорт остановлен: {len(blocking)} блокирующих проблем(ы). См. {report_path}. '
                f'Исправьте данные или снимите блокировку осознанно.'
            )
        self._apply(data)
        self.stdout.write(self.style.SUCCESS('APPLY завершён (upsert по UUID).'))

    # ---------- проверки ----------
    def _run_checks(self, data):
        checks = []

        def add(name, severity, count, detail=''):
            checks.append({'name': name, 'severity': severity, 'count': count, 'detail': detail})

        # 0. Расхождение структуры SQL ↔ модели
        for table in TABLE_ORDER:
            block = data.get(table)
            if not block:
                add(f'{table}: таблица отсутствует в дампе', 'error', 0)
                continue
            model = TABLE_MODELS[table]
            model_cols = {fld.column for fld in model._meta.fields}
            sql_cols = set(block['columns'])
            missing_in_sql = model_cols - sql_cols
            extra_in_sql = sql_cols - model_cols
            if missing_in_sql or extra_in_sql:
                add(
                    f'{table}: структура SQL≠модель', 'error', len(missing_in_sql) + len(extra_in_sql),
                    f'нет в SQL: {sorted(missing_in_sql)}; лишние в SQL: {sorted(extra_in_sql)}',
                )

        recipes = data.get('food_recipes', {}).get('rows', [])
        offers = data.get('supplier_offers', {}).get('rows', [])
        raws = data.get('supplier_raw_items', {}).get('rows', [])

        # 2. Дубли recipe_key
        keys = [r.get('recipe_key') for r in recipes if not is_blank(r.get('recipe_key'))]
        dup_keys = _dups(keys)
        add('food_recipes: дубли recipe_key', 'warning' if dup_keys else 'ok', len(dup_keys), _head(dup_keys))

        # 3. Дубли supplier + article_number
        pair = [(o.get('supplier_id'), o.get('article_number')) for o in offers]
        dup_pairs = _dups([p for p in pair if p[1]])
        add('supplier_offers: дубли (supplier+article)', 'error' if dup_pairs else 'ok', len(dup_pairs), _head(dup_pairs))

        # 4. Рецепты без офферов
        recipe_ids = {r.get('id') for r in recipes}
        offer_recipe_ids = {o.get('food_recipe_id') for o in offers if not is_blank(o.get('food_recipe_id'))}
        no_offer = recipe_ids - offer_recipe_ids
        add('food_recipes: без офферов', 'warning' if no_offer else 'ok', len(no_offer))

        # 5. Офферы без рецепта
        orphan_offers = [o['id'] for o in offers if is_blank(o.get('food_recipe_id'))]
        add('supplier_offers: без рецепта', 'warning' if orphan_offers else 'ok', len(orphan_offers))

        # 6-8. Офферы без цены/веса, in_stock без цены/веса
        no_price = [o['id'] for o in offers if positive_decimal(o.get('price')) is None]
        no_weight = [o['id'] for o in offers if positive_decimal(o.get('package_weight_kg')) is None]
        instock_bad = [
            o['id'] for o in offers
            if o.get('in_stock') == 't' and (
                positive_decimal(o.get('price')) is None or positive_decimal(o.get('package_weight_kg')) is None
            )
        ]
        add('supplier_offers: без цены', 'warning' if no_price else 'ok', len(no_price))
        add('supplier_offers: без веса', 'warning' if no_weight else 'ok', len(no_weight))
        add('supplier_offers: in_stock=true без цены/веса (не продаётся)', 'error' if instock_bad else 'ok', len(instock_bad), _head(instock_bad))

        # 9-11. Рецепты без species/food_form/kcal
        add('food_recipes: без species', 'warning' if _any_blank(recipes, 'species') else 'ok', _count_blank(recipes, 'species'))
        add('food_recipes: без food_form', 'warning' if _any_blank(recipes, 'food_form') else 'ok', _count_blank(recipes, 'food_form'))
        no_kcal = [r for r in recipes if positive_decimal(r.get('kcal_per_100g')) is None]
        add('food_recipes: без kcal_per_100g', 'warning' if no_kcal else 'ok', len(no_kcal))

        # 12. Некорректные enum
        for (table, col), valid in ENUM_VALID.items():
            rows = data.get(table, {}).get('rows', [])
            bad = [(r.get('id'), r.get(col)) for r in rows if (r.get(col) or '') not in valid]
            add(f'{table}.{col}: недопустимые enum', 'error' if bad else 'ok', len(bad), _head(bad))

        # 13. Битый JSON
        for (table, col) in JSON_COLUMNS:
            rows = data.get(table, {}).get('rows', [])
            bad = [r.get('id') for r in rows if not json_ok(r.get(col))]
            add(f'{table}.{col}: битый JSON', 'error' if bad else 'ok', len(bad), _head(bad))

        return checks

    def _idempotency_preview(self, data):
        preview = {}
        for table in TABLE_ORDER:
            block = data.get(table)
            if not block:
                continue
            model = TABLE_MODELS[table]
            ids = [r.get('id') for r in block['rows'] if r.get('id')]
            existing = set(model.objects.filter(id__in=ids).values_list('id', flat=True))
            existing = {str(x) for x in existing}
            create = sum(1 for i in ids if i not in existing)
            update = sum(1 for i in ids if i in existing)
            preview[table] = {'total': len(ids), 'create': create, 'update': update}
        return preview

    # ---------- apply ----------
    def _apply(self, data):
        with transaction.atomic():
            for table in TABLE_ORDER:
                block = data.get(table)
                if not block:
                    continue
                model = TABLE_MODELS[table]
                cols = block['columns']
                array_cols = {
                    fld.column for fld in model._meta.fields
                    if fld.get_internal_type() == 'ArrayField' or fld.__class__.__name__ == 'ArrayField'
                }
                for row in block['rows']:
                    obj_fields = self._coerce_row(model, cols, row, array_cols)
                    pk = obj_fields.pop('id')
                    model.objects.update_or_create(id=pk, defaults=obj_fields)

    def _coerce_row(self, model, cols, row, array_cols):
        """Привести значения COPY к python-типам для update_or_create (по column→field)."""
        by_col = {fld.column: fld for fld in model._meta.fields}
        out = {}
        for col in cols:
            fld = by_col.get(col)
            if fld is None:
                continue
            raw = row.get(col)
            out[fld.attname] = self._coerce_value(fld, raw, col in array_cols)
        return out

    def _coerce_value(self, fld, raw, is_array):
        internal = fld.get_internal_type()
        if raw is None:
            return None
        if is_array or fld.__class__.__name__ == 'ArrayField':
            return _parse_pg_array(raw)
        if internal in ('BooleanField', 'NullBooleanField'):
            return raw == 't'
        if internal in ('DecimalField',):
            return positive_decimal(raw)
        if internal in ('IntegerField', 'SmallIntegerField', 'BigIntegerField', 'PositiveIntegerField'):
            try:
                return int(raw)
            except (ValueError, TypeError):
                return None
        if internal in ('JSONField',):
            try:
                return json.loads(raw)
            except (ValueError, TypeError):
                return {}
        if internal in ('DateTimeField',):
            return parse_datetime(raw)
        return raw

    # ---------- отчёт ----------
    def _summary_line(self, data, checks, preview):
        errors = sum(1 for c in checks if c['severity'] == 'error' and c['count'])
        warns = sum(1 for c in checks if c['severity'] == 'warning' and c['count'])
        counts = ', '.join(f'{t}={len(data.get(t, {}).get("rows", []))}' for t in TABLE_ORDER)
        return f'Строк: {counts} | блокирующих: {errors}, предупреждений: {warns}'

    def _render_report(self, path, data, checks, preview, apply, blocking):
        lines = []
        w = lines.append
        w('# Отчёт импорта базы кормов (dry-run)\n')
        w(f'- Файл: `{path}`')
        w(f'- Режим: {"APPLY" if apply else "DRY-RUN (запись в БД не выполняется)"}')
        w(f'- Блокирующих проблем: **{len(blocking)}**\n')

        w('## Строки в дампе\n')
        w('| Таблица | Строк | Создано (нов.) | Обновлено (сущ.) |')
        w('|---|---:|---:|---:|')
        for t in TABLE_ORDER:
            n = len(data.get(t, {}).get('rows', []))
            p = preview.get(t, {})
            w(f'| {t} | {n} | {p.get("create", "-")} | {p.get("update", "-")} |')
        w('')

        w('## Проверки\n')
        w('| Проверка | Итог | Кол-во | Детали |')
        w('|---|---|---:|---|')
        icon = {'ok': '✅', 'warning': '⚠️', 'error': '⛔'}
        for c in checks:
            mark = icon.get(c['severity'], '')
            det = (c['detail'][:200] + '…') if len(c['detail']) > 200 else c['detail']
            w(f'| {c["name"]} | {mark} {c["severity"]} | {c["count"]} | {det} |')
        w('')

        if blocking:
            w('## ⛔ Блокирующие проблемы (импорт --apply не выполнится, пока не сняты)\n')
            for c in blocking:
                if c['count']:
                    w(f'- **{c["name"]}** — {c["count"]}. {c["detail"]}')
            w('')

        w('## Как воронка сходится (1583 сырья → рецепты/офферы)\n')
        w('- `supplier_raw_items` — сырьё Динозаврика как пришло из выгрузки.')
        w('- Часть сырья — не корма (игрушки и т.п.), поэтому рецептов меньше, чем сырья.')
        w('- Один `FoodRecipe` = много `SupplierOffer` (фасовок), поэтому офферов больше, чем рецептов.')
        w('- В подбор/магазин пойдут только рецепты с валидным продаваемым оффером (см. sync + гейт).')
        w('')
        w('## Rollback-план (перед --apply на сервере)\n')
        w('1. Бэкап БД (scripts/backup-db.sh) — обязателен и блокирующий.')
        w('2. `--apply` идемпотентен (upsert по UUID) и в одной транзакции: при ошибке — полный откат.')
        w('3. Данные не удаляются; при откате восстановление из бэкапа шага 1.')
        return '\n'.join(lines) + '\n'


def _dups(seq):
    seen, dups = set(), set()
    for x in seq:
        if x in seen:
            dups.add(x)
        seen.add(x)
    return list(dups)


def _head(seq, n=5):
    seq = list(seq)
    return ', '.join(str(x) for x in seq[:n]) + (f' … (+{len(seq) - n})' if len(seq) > n else '')


def _any_blank(rows, col):
    return any(is_blank(r.get(col)) for r in rows)


def _count_blank(rows, col):
    return sum(1 for r in rows if is_blank(r.get(col)))


def _parse_pg_array(raw):
    """Грубый парсер postgres array-literal {"a","b"} → [a, b]. Для apply."""
    if raw is None or raw == '{}':
        return []
    inner = raw.strip()
    if inner.startswith('{') and inner.endswith('}'):
        inner = inner[1:-1]
    if not inner:
        return []
    out, buf, in_q, i = [], [], False, 0
    while i < len(inner):
        ch = inner[i]
        if ch == '"':
            in_q = not in_q
        elif ch == '\\' and i + 1 < len(inner):
            buf.append(inner[i + 1])
            i += 2
            continue
        elif ch == ',' and not in_q:
            out.append(''.join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    out.append(''.join(buf))
    return [x.strip('"') for x in out]
