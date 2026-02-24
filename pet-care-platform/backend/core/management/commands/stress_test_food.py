"""
Management command: полный стресс-тест подбора корма (до 100K сценариев).

Использует общий генератор и валидаторы из apps.pets.tests.stress_test_food.

Выход:
- CSV со всеми результатами
- Markdown-отчёт со сводкой
- Exit code 1 при CRITICAL ошибках
"""

import csv
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from django.core.management.base import BaseCommand

from apps.pets.tests.stress_test_food import (
    PetScenario,
    ValidationResult,
    generate_scenarios,
    build_mock_pet,
    validate_calorie_result,
    aggregate_results,
)


class Command(BaseCommand):
    help = 'Стресс-тест подбора корма (до 100K сценариев)'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=100_000,
                            help='Количество сценариев (default: 100000)')
        parser.add_argument('--seed', type=int, default=42,
                            help='Seed для воспроизводимости (default: 42)')
        parser.add_argument('--fast', action='store_true',
                            help='Только CalorieCalculator, без подбора корма')
        parser.add_argument('--include-diseases', action='store_true',
                            help='Включить сценарии с заболеваниями')
        parser.add_argument('--output-dir', type=str, default=None,
                            help='Директория для отчётов (default: reports/)')
        parser.add_argument('--ci', action='store_true',
                            help='CI-режим: exit code 1 при CRITICAL или WARNING > 5%%')

    def handle(self, *args, **options):
        limit = options['limit']
        seed = options['seed']
        fast = options['fast']
        ci_mode = options['ci']

        output_dir = Path(options['output_dir']) if options['output_dir'] else (
            Path(__file__).resolve().parent.parent.parent.parent.parent / 'reports'
        )
        output_dir.mkdir(exist_ok=True)

        self.stdout.write(f'Генерация сценариев (limit={limit}, seed={seed})...')
        scenarios = generate_scenarios(limit=limit, seed=seed)
        self.stdout.write(f'  Сгенерировано: {len(scenarios)}')

        self.stdout.write('Выполнение стресс-теста...')
        t0 = time.time()
        results = self._run(scenarios, fast)
        elapsed = time.time() - t0
        self.stdout.write(f'  Выполнено за {elapsed:.1f}с ({elapsed / len(scenarios) * 1000:.2f} мс/сценарий)')

        agg = aggregate_results(results)

        # Cell coverage
        cell_stats = self._cell_coverage(scenarios, results)

        ts = datetime.now().strftime('%Y%m%d_%H%M%S')

        csv_path = output_dir / f'food_stress_test_{ts}.csv'
        self._save_csv(results, csv_path)
        self.stdout.write(f'  CSV: {csv_path}')

        md_path = output_dir / f'food_stress_test_report_{ts}.md'
        self._save_md(agg, cell_stats, elapsed, md_path, seed)
        self.stdout.write(f'  Report: {md_path}')

        self._print_summary(agg, elapsed)

        if ci_mode:
            if agg['critical'] > 0 or agg['warning_pct'] > 5.0:
                self.stderr.write(self.style.ERROR(
                    f'CI FAILED: {agg["critical"]} critical, {agg["warning_pct"]}% warnings'
                ))
                sys.exit(1)
            self.stdout.write(self.style.SUCCESS('CI PASSED'))

    # ------------------------------------------------------------------

    def _run(self, scenarios: List[PetScenario], fast: bool) -> List[ValidationResult]:
        from apps.pets.calorie_calculator import calorie_calculator

        results: List[ValidationResult] = []
        total = len(scenarios)

        for i, sc in enumerate(scenarios):
            if i > 0 and i % 5000 == 0:
                self.stdout.write(f'  {i}/{total} ({i * 100 // total}%)')
            try:
                pet = build_mock_pet(sc)
                cr = calorie_calculator.calculate_daily_calories(pet)
                vr = validate_calorie_result(sc, cr)
                results.append(vr)
            except Exception as e:
                results.append(ValidationResult(
                    scenario_id=sc.id,
                    status='CRITICAL',
                    critical_codes=['C1_CRASH'],
                    error_message=str(e)[:200],
                ))

        return results

    def _cell_coverage(
        self,
        scenarios: List[PetScenario],
        results: List[ValidationResult],
    ) -> List[Dict[str, Any]]:
        result_map = {r.scenario_id: r for r in results}
        cells: Dict[tuple, list] = defaultdict(list)
        for sc in scenarios:
            age_group = self._age_group_label(sc.age_months)
            key = (sc.species, age_group, sc.size_category)
            r = result_map.get(sc.id)
            cells[key].append(r.status if r else 'MISSING')

        rows = []
        for (species, age_group, size), statuses in sorted(cells.items()):
            n = len(statuses)
            ok = sum(1 for s in statuses if s == 'OK')
            rows.append({
                'species': species,
                'age_group': age_group,
                'size': size,
                'count': n,
                'ok_pct': round(ok / n * 100, 1) if n else 0,
            })
        return rows

    @staticmethod
    def _age_group_label(age_months: int) -> str:
        if age_months <= 4:
            return 'puppy_early'
        if age_months <= 11:
            return 'puppy_late'
        if age_months <= 36:
            return 'adult_young'
        if age_months <= 83:
            return 'adult'
        if age_months <= 119:
            return 'senior'
        return 'geriatric'

    # ------------------------------------------------------------------
    # Reports
    # ------------------------------------------------------------------

    def _save_csv(self, results: List[ValidationResult], path: Path):
        fields = ['scenario_id', 'status', 'critical_codes', 'warning_codes', 'error_message']
        with open(path, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for r in results:
                w.writerow({
                    'scenario_id': r.scenario_id,
                    'status': r.status,
                    'critical_codes': ','.join(r.critical_codes),
                    'warning_codes': ','.join(r.warning_codes),
                    'error_message': r.error_message or '',
                })

    def _save_md(
        self,
        agg: Dict[str, Any],
        cell_stats: List[Dict[str, Any]],
        elapsed: float,
        path: Path,
        seed: int,
    ):
        total = agg['total']
        lines = [
            '# Стресс-тест подбора корма',
            '',
            f'**Дата:** {datetime.now().strftime("%Y-%m-%d %H:%M")}  ',
            f'**Seed:** {seed}  ',
            f'**Сценариев:** {total}  ',
            f'**Время:** {elapsed:.1f}с ({elapsed / total * 1000:.2f} мс/сценарий)',
            '',
            '## Сводка',
            '',
            f'- **OK:** {agg["ok"]} ({agg["ok_pct"]}%)',
            f'- **WARNING:** {agg["warning"]} ({agg["warning_pct"]}%)'
            + (' -- PASS' if agg['warning_pct'] <= 5 else ' -- **FAIL** (порог 5%)'),
            f'- **CRITICAL:** {agg["critical"]} ({agg["critical_pct"]}%)'
            + (' -- PASS' if agg['critical'] == 0 else ' -- **FAIL**'),
            '',
        ]

        if agg.get('code_counts'):
            lines += [
                '## Ошибки по кодам',
                '',
                '| Код | Кол-во | % |',
                '|-----|--------|---|',
            ]
            for code, cnt in sorted(agg['code_counts'].items(), key=lambda x: -x[1]):
                lines.append(f'| {code} | {cnt} | {round(cnt / total * 100, 2)}% |')
            lines.append('')

        lines += [
            '## Покрытие по ячейкам (species x age x size)',
            '',
            '| Вид | Возраст | Размер | Сценариев | OK% |',
            '|-----|---------|--------|-----------|-----|',
        ]
        for row in cell_stats:
            lines.append(
                f'| {row["species"]} | {row["age_group"]} | {row["size"]} '
                f'| {row["count"]} | {row["ok_pct"]}% |'
            )
        lines.append('')

        lines += [
            '## Критерии CI/CD',
            '',
            f'- [{"x" if agg["critical"] == 0 else " "}] 0 CRITICAL ошибок',
            f'- [{"x" if agg["warning_pct"] <= 5 else " "}] WARNING <= 5% '
            f'(текущий: {agg["warning_pct"]}%)',
            '',
        ]

        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

    def _print_summary(self, agg: Dict[str, Any], elapsed: float):
        self.stdout.write('')
        self.stdout.write('=== СВОДКА СТРЕСС-ТЕСТА ===')
        self.stdout.write(f'  Сценариев: {agg["total"]}')
        self.stdout.write(f'  OK:       {agg["ok"]} ({agg["ok_pct"]}%)')
        self.stdout.write(f'  WARNING:  {agg["warning"]} ({agg["warning_pct"]}%)')
        self.stdout.write(f'  CRITICAL: {agg["critical"]} ({agg["critical_pct"]}%)')
        self.stdout.write(f'  Время:    {elapsed:.1f}с')
        self.stdout.write('')

        if agg['critical'] == 0 and agg['warning_pct'] <= 5:
            self.stdout.write(self.style.SUCCESS('[PASS] Все критерии выполнены'))
        else:
            self.stdout.write(self.style.WARNING('[FAIL] Есть проблемы'))
