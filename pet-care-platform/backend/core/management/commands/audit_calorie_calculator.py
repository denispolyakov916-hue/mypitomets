"""
Management command: audit calorie calculator across many scenarios.

Generates:
- CSV report with inputs, our RER/MER, reference vet range, and status flags
- Markdown summary with aggregated stats and top outliers

Notes:
- Uses real Pet model instances because calorie_calculator relies on ORM for health conditions.
- Cleans up created objects by default (use --keep to retain).
"""

from __future__ import annotations

import csv
import json
import math
import random
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.pets.calorie_calculator import calorie_calculator
from apps.pets.models import Pet
from apps.pets.nutrition_models import HealthCondition, PetHealthCondition


def _today_minus_months(months: int) -> date:
    return date.today() - timedelta(days=int(months * 30.4))


def _rer_ref(weight_kg: float) -> float:
    # WSAVA / PNA / Tufts commonly use 70*(kg^0.75)
    return 70.0 * (float(weight_kg) ** 0.75)


def _vet_factor_range(
    *,
    species: str,
    age_months: int,
    is_neutered: bool,
    activity_level: str,
    bcs: Optional[int],
    reproductive_state: str,
) -> Tuple[float, float, str]:
    """
    Return (min_factor, max_factor, rationale) for MER = RER*factor.
    This is an approximate clinical range (not a single truth).
    """
    sp = species
    age = age_months
    act = activity_level or "moderate"
    bcs_int = None
    try:
        bcs_int = int(bcs) if bcs is not None else None
    except (TypeError, ValueError):
        bcs_int = None
    is_inactive = act in ["very_low", "low"]

    # Growth / reproduction: broader ranges
    if reproductive_state in ["pregnant", "lactating"]:
        if reproductive_state == "pregnant":
            return 1.1, 2.0, "pregnancy_range"
        return 2.0, 4.0, "lactation_range"

    if age < 12:
        return 2.0, 3.0, "growth_range"

    # Weight loss / gain рамки по BCS (контекст важнее активности)
    if bcs_int is not None and bcs_int >= 8:
        return 0.6, 0.8, "weight_loss_obesity_2_3"
    if bcs_int == 7:
        return 0.8, 1.0, "weight_loss_obesity_1"
    if bcs_int is not None and bcs_int <= 3:
        # underweight: клинически часто начинают с повышенного фактора
        return (1.3, 1.6, "underweight") if sp == "cat" else (1.8, 2.2, "underweight")

    if sp == "cat":
        base = 1.2 if is_neutered else 1.4
        rng = (base - 0.1, base + 0.1)
        reason = "cat_neutered_adult" if is_neutered else "cat_intact_adult"
    else:
        base = 1.6 if is_neutered else 1.8
        rng = (base - 0.1, base + 0.1)
        reason = "dog_neutered_adult" if is_neutered else "dog_intact_adult"

    # Activity tweak (small)
    if act in ["very_low"]:
        rng = (max(0.9, rng[0] - 0.2), max(0.9, rng[1] - 0.2))
        reason += "_very_low"
    elif act in ["low"]:
        rng = (max(0.9, rng[0] - 0.1), max(0.9, rng[1] - 0.1))
        reason += "_low"
    elif act in ["high", "very_high"]:
        rng = (rng[0] + 0.1, rng[1] + 0.2)
        reason += "_high"

    return rng[0], rng[1], reason


def _simple_mer_rer_status(ratio: float) -> str:
    # Simplified рамка: normal 0.8–4.0, warn 0.6–5.0, else critical
    if ratio < 0.5 or ratio > 6.0:
        return "critical"
    if ratio < 0.6 or ratio > 5.0:
        return "warn"
    if ratio < 0.8 or ratio > 4.0:
        return "warn"
    return "ok"


@dataclass(frozen=True)
class Scenario:
    species: str
    weight_kg: float
    age_months: int
    is_neutered: bool
    activity_level: str
    sex: str = "male"
    housing_type: Optional[str] = None
    body_condition_score: Optional[int] = None
    reproductive_state: str = "none"
    pregnancy_week: Optional[int] = None
    litter_size: Optional[int] = None
    diseases: Tuple[str, ...] = ()


class Command(BaseCommand):
    help = "Аудит calculate_daily_calories() на широкой матрице сценариев"

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=42, help="Seed для воспроизводимости")
        parser.add_argument("--limit", type=int, default=300, help="Максимум сценариев (после генерации)")
        parser.add_argument("--output-dir", type=str, default="reports", help="Папка для отчетов")
        parser.add_argument("--keep", action="store_true", help="Не удалять созданные записи Pet/links")
        parser.add_argument("--include-diseases", action="store_true", help="Добавить часть сценариев с болезнями")
        parser.add_argument("--pet-id", type=str, default=None, help="Точечный аудит по реальному Pet.id")
        parser.add_argument("--fast", action="store_true", help="Не создавать Pet в БД (быстро, для 20k+ сценариев)")

    def handle(self, *args, **options):
        seed = int(options["seed"])
        limit = int(options["limit"])
        out_dir = str(options["output_dir"])
        keep = bool(options["keep"])
        include_diseases = bool(options["include_diseases"])
        pet_id = options.get("pet_id")
        fast = bool(options.get("fast"))

        rng = random.Random(seed)

        base_dir = Path(settings.BASE_DIR).parent
        reports_dir = base_dir / out_dir
        reports_dir.mkdir(parents=True, exist_ok=True)

        stamp = date.today().strftime("%Y%m%d")
        csv_path = reports_dir / f"calorie_audit_{stamp}.csv"
        md_path = reports_dir / f"calorie_audit_{stamp}.md"

        if pet_id:
            self._audit_single_pet(pet_id=str(pet_id), csv_path=csv_path, md_path=md_path)
            self.stdout.write(self.style.SUCCESS(f"OK: отчет сохранён в {csv_path} и {md_path}"))
            return

        scenarios = list(self._generate_scenarios(include_diseases=include_diseases, rng=rng, limit=limit))

        if include_diseases:
            self._ensure_audit_health_conditions()

        rows: List[Dict[str, Any]] = []

        if fast:
            # Fast path: use lightweight objects, inject diseases to calculator
            from types import SimpleNamespace

            cache_conditions: Dict[str, Any] = {}
            def get_cond(code: str):
                if code not in cache_conditions:
                    cache_conditions[code] = HealthCondition.objects.filter(code=code).first()
                return cache_conditions[code]

            for sc in scenarios:
                pet = SimpleNamespace(
                    weight=sc.weight_kg,
                    species=sc.species,
                    date_of_birth=_today_minus_months(sc.age_months),
                    age_months=sc.age_months,
                    is_neutered=sc.is_neutered,
                    activity_level=sc.activity_level,
                    sex=sc.sex,
                    housing_type=sc.housing_type,
                    body_condition_score=sc.body_condition_score,
                    reproductive_state=sc.reproductive_state,
                    pregnancy_week=sc.pregnancy_week,
                    litter_size=sc.litter_size,
                    ideal_weight_kg=None,
                )
                if sc.diseases:
                    pet.health_conditions_for_calc = [get_cond(c) for c in sc.diseases if get_cond(c)]
                res = calorie_calculator.calculate_daily_calories(pet)
                rer = float(res.rer or 0.0)
                mer = float(res.mer or 0.0)
                ratio = (mer / rer) if rer > 0 else None
                rer_ref = _rer_ref(sc.weight_kg)
                f_min, f_max, f_reason = _vet_factor_range(
                    species=sc.species,
                    age_months=sc.age_months,
                    is_neutered=sc.is_neutered,
                    activity_level=sc.activity_level,
                    bcs=sc.body_condition_score,
                    reproductive_state=sc.reproductive_state,
                )
                vet_min = rer_ref * f_min
                vet_max = rer_ref * f_max
                within_vet = (vet_min <= mer <= vet_max) if rer_ref > 0 else None
                simple_status = _simple_mer_rer_status(float(ratio)) if ratio is not None else "critical"
                delta_pct = ((mer - ((vet_min + vet_max) / 2)) / ((vet_min + vet_max) / 2) * 100.0) if (vet_min + vet_max) > 0 else None
                rows.append(
                    {
                        "species": sc.species,
                        "weight_kg": sc.weight_kg,
                        "age_months": sc.age_months,
                        "is_neutered": sc.is_neutered,
                        "activity_level": sc.activity_level,
                        "sex": sc.sex,
                        "housing_type": sc.housing_type or "",
                        "bcs": sc.body_condition_score if sc.body_condition_score is not None else "",
                        "reproductive_state": sc.reproductive_state,
                        "pregnancy_week": sc.pregnancy_week if sc.pregnancy_week is not None else "",
                        "litter_size": sc.litter_size if sc.litter_size is not None else "",
                        "diseases": ",".join(sc.diseases),
                        "our_rer": round(rer, 1),
                        "our_mer": round(mer, 1),
                        "our_mer_rer_ratio": round(ratio, 3) if ratio is not None else "",
                        "our_warnings_count": len(res.warnings or []),
                        "our_coefficients": json.dumps(res.coefficients_applied or {}, ensure_ascii=False),
                        "caps_applied": json.dumps(res.coefficients_applied.get("caps_applied", []), ensure_ascii=False),
                        "top_influences": json.dumps(res.top_influences or [], ensure_ascii=False),
                        "vet_rer_ref": round(rer_ref, 1),
                        "vet_factor_min": f_min,
                        "vet_factor_max": f_max,
                        "vet_factor_reason": f_reason,
                        "vet_mer_min": round(vet_min, 1),
                        "vet_mer_max": round(vet_max, 1),
                        "within_vet_range": within_vet,
                        "simple_status": simple_status,
                        "delta_vs_vet_mid_pct": round(delta_pct, 1) if delta_pct is not None else "",
                    }
                )
        else:
            User = get_user_model()
            audit_email = "audit_bot@local"
            audit_user = User.objects.filter(email=audit_email).first()
            if not audit_user:
                audit_user = User.objects.create_user(email=audit_email, password="x")

            created_pets: List[Pet] = []
            created_links: List[PetHealthCondition] = []

            for sc in scenarios:
                pet = Pet.objects.create(
                    owner=audit_user,
                    name="AUDIT",
                    species=sc.species,
                    date_of_birth=_today_minus_months(sc.age_months),
                    weight=sc.weight_kg,
                    is_neutered=sc.is_neutered,
                    activity_level=sc.activity_level,
                    sex=sc.sex,
                    housing_type=sc.housing_type,
                    body_condition_score=sc.body_condition_score,
                    reproductive_state=sc.reproductive_state,
                    pregnancy_week=sc.pregnancy_week,
                    litter_size=sc.litter_size,
                )
                created_pets.append(pet)

                for code in sc.diseases:
                    cond = HealthCondition.objects.filter(code=code).first()
                    if cond:
                        link = PetHealthCondition.objects.create(pet=pet, condition=cond, is_active=True)
                        created_links.append(link)

                res = calorie_calculator.calculate_daily_calories(pet)
                rer = float(res.rer or 0.0)
                mer = float(res.mer or 0.0)
                ratio = (mer / rer) if rer > 0 else None

                rer_ref = _rer_ref(sc.weight_kg)
                f_min, f_max, f_reason = _vet_factor_range(
                    species=sc.species,
                    age_months=sc.age_months,
                    is_neutered=sc.is_neutered,
                    activity_level=sc.activity_level,
                    bcs=sc.body_condition_score,
                    reproductive_state=sc.reproductive_state,
                )
                vet_min = rer_ref * f_min
                vet_max = rer_ref * f_max
                within_vet = (vet_min <= mer <= vet_max) if rer_ref > 0 else None

                simple_status = _simple_mer_rer_status(float(ratio)) if ratio is not None else "critical"
                delta_pct = ((mer - ((vet_min + vet_max) / 2)) / ((vet_min + vet_max) / 2) * 100.0) if (vet_min + vet_max) > 0 else None

                rows.append(
                    {
                        "species": sc.species,
                        "weight_kg": sc.weight_kg,
                        "age_months": sc.age_months,
                        "is_neutered": sc.is_neutered,
                        "activity_level": sc.activity_level,
                        "sex": sc.sex,
                        "housing_type": sc.housing_type or "",
                        "bcs": sc.body_condition_score if sc.body_condition_score is not None else "",
                        "reproductive_state": sc.reproductive_state,
                        "pregnancy_week": sc.pregnancy_week if sc.pregnancy_week is not None else "",
                        "litter_size": sc.litter_size if sc.litter_size is not None else "",
                        "diseases": ",".join(sc.diseases),
                        "our_rer": round(rer, 1),
                        "our_mer": round(mer, 1),
                        "our_mer_rer_ratio": round(ratio, 3) if ratio is not None else "",
                        "our_warnings_count": len(res.warnings or []),
                        "our_coefficients": json.dumps(res.coefficients_applied or {}, ensure_ascii=False),
                        "caps_applied": json.dumps(res.coefficients_applied.get("caps_applied", []), ensure_ascii=False),
                        "top_influences": json.dumps(res.top_influences or [], ensure_ascii=False),
                        "vet_rer_ref": round(rer_ref, 1),
                        "vet_factor_min": f_min,
                        "vet_factor_max": f_max,
                        "vet_factor_reason": f_reason,
                        "vet_mer_min": round(vet_min, 1),
                        "vet_mer_max": round(vet_max, 1),
                        "within_vet_range": within_vet,
                        "simple_status": simple_status,
                        "delta_vs_vet_mid_pct": round(delta_pct, 1) if delta_pct is not None else "",
                    }
                )
            rer = float(res.rer or 0.0)
            mer = float(res.mer or 0.0)
            ratio = (mer / rer) if rer > 0 else None

            rer_ref = _rer_ref(sc.weight_kg)
            f_min, f_max, f_reason = _vet_factor_range(
                species=sc.species,
                age_months=sc.age_months,
                is_neutered=sc.is_neutered,
                activity_level=sc.activity_level,
                bcs=sc.body_condition_score,
                reproductive_state=sc.reproductive_state,
            )
            vet_min = rer_ref * f_min
            vet_max = rer_ref * f_max
            within_vet = (vet_min <= mer <= vet_max) if rer_ref > 0 else None

            simple_status = _simple_mer_rer_status(float(ratio)) if ratio is not None else "critical"
            delta_pct = ((mer - ((vet_min + vet_max) / 2)) / ((vet_min + vet_max) / 2) * 100.0) if (vet_min + vet_max) > 0 else None

            rows.append(
                {
                    "species": sc.species,
                    "weight_kg": sc.weight_kg,
                    "age_months": sc.age_months,
                    "is_neutered": sc.is_neutered,
                    "activity_level": sc.activity_level,
                    "sex": sc.sex,
                    "housing_type": sc.housing_type or "",
                    "bcs": sc.body_condition_score if sc.body_condition_score is not None else "",
                    "reproductive_state": sc.reproductive_state,
                    "pregnancy_week": sc.pregnancy_week if sc.pregnancy_week is not None else "",
                    "litter_size": sc.litter_size if sc.litter_size is not None else "",
                    "diseases": ",".join(sc.diseases),
                    "our_rer": round(rer, 1),
                    "our_mer": round(mer, 1),
                    "our_mer_rer_ratio": round(ratio, 3) if ratio is not None else "",
                    "our_warnings_count": len(res.warnings or []),
                    "our_coefficients": json.dumps(res.coefficients_applied or {}, ensure_ascii=False),
                    "caps_applied": json.dumps(res.coefficients_applied.get("caps_applied", []), ensure_ascii=False),
                    "top_influences": json.dumps(res.top_influences or [], ensure_ascii=False),
                    "vet_rer_ref": round(rer_ref, 1),
                    "vet_factor_min": f_min,
                    "vet_factor_max": f_max,
                    "vet_factor_reason": f_reason,
                    "vet_mer_min": round(vet_min, 1),
                    "vet_mer_max": round(vet_max, 1),
                    "within_vet_range": within_vet,
                    "simple_status": simple_status,
                    "delta_vs_vet_mid_pct": round(delta_pct, 1) if delta_pct is not None else "",
                }
            )

        # Write CSV
        if rows:
            with csv_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows(rows)

        # Summary markdown
        ok = sum(1 for r in rows if r.get("within_vet_range") is True)
        warn = sum(1 for r in rows if r.get("simple_status") == "warn")
        crit = sum(1 for r in rows if r.get("simple_status") == "critical")
        caps_used = sum(1 for r in rows if (r.get("caps_applied") not in ("", "[]", None)))

        # Top outliers by absolute delta
        def _abs_delta(r: Dict[str, Any]) -> float:
            try:
                return abs(float(r.get("delta_vs_vet_mid_pct") or 0.0))
            except Exception:
                return 0.0

        top = sorted(rows, key=_abs_delta, reverse=True)[:20]

        md_lines = [
            "## Calorie calculator audit",
            "",
            f"- Seed: `{seed}`",
            f"- Scenarios: `{len(rows)}`",
            f"- CSV: `{csv_path}`",
            "",
            "### Summary",
            f"- **Within vet reference range**: {ok}/{len(rows)}",
            f"- **Simple status warn**: {warn}/{len(rows)}",
            f"- **Simple status critical**: {crit}/{len(rows)}",
            f"- **Caps applied**: {caps_used}/{len(rows)}",
            "",
            "### Top outliers (by |delta_vs_vet_mid_pct|)",
            "",
            "|species|kg|age_m|neutered|act|bcs|repro|our_mer|vet_min..max|delta%|status|",
            "|---|---:|---:|---|---|---:|---|---:|---:|---:|---|",
        ]
        for r in top:
            md_lines.append(
                f"|{r['species']}|{r['weight_kg']}|{r['age_months']}|{r['is_neutered']}|{r['activity_level']}|{r['bcs']}|{r['reproductive_state']}|{r['our_mer']}|{r['vet_mer_min']}..{r['vet_mer_max']}|{r['delta_vs_vet_mid_pct']}|{r['simple_status']}|"
            )
        md_lines.append("")
        md_lines.append("### Notes")
        md_lines.append("- Vet reference is a **range** from public clinical guidance (RER×factor); it is not a single truth.")
        md_lines.append("- Individual needs can differ materially; BCS and weight trend should drive final adjustment.")
        md_lines.append("")

        md_path.write_text("\n".join(md_lines), encoding="utf-8")

        if (not fast) and (not keep):
            # cleanup
            for link in created_links:
                link.delete()
            for pet in created_pets:
                pet.delete()

        self.stdout.write(self.style.SUCCESS(f"OK: отчет сохранён в {csv_path} и {md_path}"))

    def _ensure_audit_health_conditions(self):
        # Minimal set to exercise priority/DECREASE/INCREASE
        defaults = [
            dict(
                code="obesity_2",
                name_ru="Ожирение 2",
                category="metabolic",
                coefficient_min=0.7,
                coefficient_max=0.7,
                priority="HIGH",
                direction="DECREASE",
            ),
            dict(
                code="underweight_severe",
                name_ru="Недобор веса (тяжёлый)",
                category="metabolic",
                coefficient_min=1.4,
                coefficient_max=1.4,
                priority="HIGH",
                direction="INCREASE",
            ),
        ]
        for d in defaults:
            HealthCondition.objects.update_or_create(code=d["code"], defaults=d)

    def _generate_scenarios(self, *, include_diseases: bool, rng: random.Random, limit: int) -> Iterable[Scenario]:
        weights_cat = [3.0, 4.5, 6.0, 8.0]
        weights_dog = [2.5, 8.0, 20.0, 45.0]
        acts = ["very_low", "low", "moderate", "high"]
        bcs_list = [None, 3, 5, 7, 9]

        # Age buckets aligned to Pet.age_category rules:
        # - cat senior at 10y -> 120m; dog senior at 7y -> 84m
        ages_cat = [6, 36, 96, 132]  # kitten, adult, adult(8y), senior(11y)
        ages_dog = [6, 24, 84, 120]  # puppy, adult, senior(7y), geriatric

        count = 0
        for w in weights_cat:
            for age in ages_cat:
                for neut in [True, False]:
                    for act in acts:
                        for bcs in bcs_list:
                            yield Scenario(
                                species="cat",
                                weight_kg=w,
                                age_months=age,
                                is_neutered=neut,
                                activity_level=act,
                                housing_type="apartment",
                                body_condition_score=bcs,
                            )
                            count += 1
                            if count >= limit:
                                return

        for w in weights_dog:
            for age in ages_dog:
                for neut in [True, False]:
                    for act in acts:
                        for bcs in bcs_list:
                            yield Scenario(
                                species="dog",
                                weight_kg=w,
                                age_months=age,
                                is_neutered=neut,
                                activity_level=act,
                                body_condition_score=bcs,
                            )
                            count += 1
                            if count >= limit:
                                return

        # reproductive scenarios (female, not neutered)
        yield Scenario(
            species="dog",
            weight_kg=12.0,
            age_months=36,
            is_neutered=False,
            activity_level="moderate",
            sex="female",
            reproductive_state="pregnant",
            pregnancy_week=5,
        )
        yield Scenario(
            species="cat",
            weight_kg=4.0,
            age_months=24,
            is_neutered=False,
            activity_level="moderate",
            sex="female",
            reproductive_state="lactating",
            litter_size=5,
        )

        if include_diseases:
            yield Scenario(
                species="cat",
                weight_kg=6.0,
                age_months=36,
                is_neutered=True,
                activity_level="low",
                housing_type="apartment",
                body_condition_score=7,
                diseases=("obesity_2",),
            )
            yield Scenario(
                species="dog",
                weight_kg=20.0,
                age_months=48,
                is_neutered=True,
                activity_level="moderate",
                body_condition_score=3,
                diseases=("underweight_severe",),
            )

        # Randomized expansion to reach large limits (e.g. 20k)
        while count < limit:
            sp = rng.choice(["cat", "dog"])
            if sp == "cat":
                w = round(rng.uniform(2.0, 12.0), 1)
                age = rng.choice([3, 6, 12, 24, 60, 96, 132, 160])
                neut = rng.choice([True, False])
                act = rng.choice(acts + ["very_high"])
                bcs = rng.choice([None, 3, 4, 5, 6, 7, 8, 9])
                diseases = ()
                if include_diseases and rng.random() < 0.08:
                    diseases = (rng.choice(["obesity_2", "underweight_severe"]),)
                yield Scenario(
                    species="cat",
                    weight_kg=w,
                    age_months=age,
                    is_neutered=neut,
                    activity_level=act,
                    housing_type="apartment",
                    body_condition_score=bcs,
                    diseases=diseases,
                )
            else:
                w = round(rng.uniform(1.0, 70.0), 1)
                age = rng.choice([3, 6, 12, 24, 48, 84, 120, 156])
                neut = rng.choice([True, False])
                act = rng.choice(acts + ["very_high"])
                bcs = rng.choice([None, 3, 4, 5, 6, 7, 8, 9])
                diseases = ()
                if include_diseases and rng.random() < 0.08:
                    diseases = (rng.choice(["obesity_2", "underweight_severe"]),)
                yield Scenario(
                    species="dog",
                    weight_kg=w,
                    age_months=age,
                    is_neutered=neut,
                    activity_level=act,
                    body_condition_score=bcs,
                    diseases=diseases,
                )
            count += 1

    def _audit_single_pet(self, *, pet_id: str, csv_path: Path, md_path: Path):
        pet = Pet.objects.filter(id=pet_id).first()
        if not pet:
            raise SystemExit(f"Pet not found: {pet_id}")
        res = calorie_calculator.calculate_daily_calories(pet)
        row = {
            "pet_id": pet_id,
            "species": pet.species,
            "weight_kg": float(pet.weight) if pet.weight else "",
            "age_months": pet.age_months,
            "age_category": pet.age_category,
            "is_neutered": pet.is_neutered,
            "activity_level": pet.activity_level,
            "housing_type": getattr(pet, "housing_type", "") or "",
            "bcs": getattr(pet, "body_condition_score", "") or "",
            "our_rer": round(float(res.rer or 0.0), 1),
            "our_mer": round(float(res.mer or 0.0), 1),
            "warnings": json.dumps(res.warnings or [], ensure_ascii=False),
            "coefficients": json.dumps(res.coefficients_applied or {}, ensure_ascii=False),
        }
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(row.keys()))
            writer.writeheader()
            writer.writerow(row)
        md_path.write_text(
            "\n".join(
                [
                    "## Single pet calorie audit",
                    "",
                    f"- pet_id: `{pet_id}`",
                    f"- species: `{pet.species}`",
                    f"- weight_kg: `{row['weight_kg']}`",
                    f"- age_months: `{row['age_months']}`",
                    f"- age_category: `{row['age_category']}`",
                    "",
                    f"### Our result",
                    f"- RER: **{row['our_rer']}** kcal/day",
                    f"- MER: **{row['our_mer']}** kcal/day",
                    "",
                    "### Warnings",
                    *(res.warnings or ["(none)"]),
                    "",
                    "### Coefficients applied (raw)",
                    "```json",
                    json.dumps(res.coefficients_applied or {}, ensure_ascii=False, indent=2),
                    "```",
                    "",
                ]
            ),
            encoding="utf-8",
        )

