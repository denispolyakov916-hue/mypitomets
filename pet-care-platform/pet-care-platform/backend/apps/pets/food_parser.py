"""
Парсер данных Динозаврика (Bitrix catalog export) → нормализованный рецепт.

Отдельный слой (без Django/DB-зависимостей), чтобы был юнит-тестируемым и
переиспользуемым в management-команде импорта. На вход — один product-объект
из catalog.json (с props-списком и offers), на выход — dict полей FoodRecipe
+ parse_status + reasons + извлечённые offer'ы (фасовки).
"""

import re

# --- словари нормализации ---
SPECIES_MAP = {'sobaki': 'dog', 'koshki': 'cat', 'sobak': 'dog', 'koshek': 'cat'}
FORM_BY_UPAKOVKA = {
    'sukhoy-korm': 'dry', 'sukhoy': 'dry',
    'vlazhnyy-korm': 'wet', 'vlazhnyy': 'wet', 'konservy': 'wet',
    'banka': 'wet', 'pauch': 'wet', 'lamister': 'wet', 'krem-sup': 'wet',
}
WET_PTYPE = ('банки', 'паучи', 'консервы', 'ламистеры', 'крем-суп', 'влажн')
LIFE_STAGE_MAP = {
    'взрослые': 'adult', 'vzroslye': 'adult',
    'щенки': 'puppy', 'shchenki': 'puppy', 'shchenok': 'puppy',
    'котята': 'kitten', 'kotyata': 'kitten',
    'пожилые': 'senior', 'pozhilye': 'senior', 'starshe': 'senior',
    'юниоры': 'junior', 'yuniory': 'junior',
    'все возраста': 'all', 'всех возрастов': 'all', 'vsekh-vozrastov': 'all', 'vse': 'all',
}
PROTEIN_FLAGS = {
    'VKUS_KURITSA': 'курица', 'I_KURITSA': 'курица', 'VKUS_PTITSA': 'птица',
    'VKUS_INDEYKA': 'индейка', 'I_INDEYKA': 'индейка', 'VKUS_RYBA': 'рыба',
    'VKUS_YAGNYENOK': 'ягнёнок', 'I_YAGNENOK_BARANINA': 'ягнёнок',
    'VKUS_GOVYADINA': 'говядина', 'VKUS_UTKA': 'утка', 'I_UTKA': 'утка',
    'VKUS_KROLIK': 'кролик', 'I_KROLIK': 'кролик', 'VKUS_DICH': 'дичь',
    'VKUS_MOREPRODUKTY': 'морепродукты',
}
ALLERGEN_HINTS = ['курица', 'птица', 'говядина', 'рыба', 'злаки', 'кукуруза', 'пшеница', 'соя', 'молоч']

# OS_* / I_* коды → назначение (diet_purpose) и булевы флаги
PURPOSE_FLAG_MAP = {
    'OS_PROFILAKTIKA_MKB': ('urinary', 'is_urinary'),
    'OS_PRI_MOCHEKAMENNOY_BOLEZNI': ('urinary', 'is_urinary'),
    'OS_STERILIZATSIYA_I_KASTRATSIYA': ('sterilized', 'is_sterilized'),
    'OS_CHUVSTVITELNOE_PISHCHEVARENIE': ('gi', 'is_sensitive_digestion'),
    'OS_KONTROL_VESA_NIZKOKALORIYNYY': ('weight', 'is_weight_control'),
    'OS_GIPOALLERGENNYY': ('allergy', 'is_hypoallergenic'),
    'OS_PRI_PISHCHEVOY_ALLERGII': ('allergy', 'is_hypoallergenic'),
    'I_BEZZERNOVOY': ('grain_free', 'is_grain_free'),
    'OS_POCHECHNAYA_NEDOSTATOCHNOST': ('renal', None),
    'OS_DLYA_KOZHI_I_SHERSTI': ('skin', None),
    'OS_IDEALNAYA_KOZHA_I_SHERST': ('skin', None),
    'OS_PRI_ZABOLEVANIYAKH_KOZHI': ('skin', None),
    'OS_PRI_ZABOLEVANII_PECHENI': ('hepatic', None),
    'OS_PECHENOCHNAYA_NEDOSTATOCHNOST': ('hepatic', None),
    'OS_SERDECHNAYA_NEDOSTATOCHNOST': ('cardiac', None),
    'OS_DLYA_SUSTAVOV': ('joints', None),
    'OS_PROFILAKTIKA_SAKHARNOGO_DIABE': ('diabetes', None),
    'OS_DLYA_DIABETIKOV': ('diabetes', None),
    'OS_VYVOD_SHERSTI': ('hairball', None),
}

# Поля-кандидаты под агентский %% (появятся в свежем фиде). Парсер прочитает, как только узнаем код.
AGENCY_CODE_CANDIDATES = ('AGENCY_PERCENT', 'AGENT_PERCENT', 'AGENTSKIY_PROTSENT', 'VOZNAGRAZHDENIE')


def _props_dict(product):
    """props (список {code,name,value/values}) → {code: value}."""
    out = {}
    for it in (product.get('props') or []):
        code = it.get('code')
        if not code:
            continue
        v = it.get('value')
        if v is None:
            v = it.get('values')
        out[code] = v
    return out


def _text(v):
    if isinstance(v, dict):
        return (v.get('TEXT') or v.get('value') or '').strip()
    if isinstance(v, list):
        return ' '.join(_text(x) for x in v)
    return str(v).strip() if v else ''


def _attr_value(props, description):
    """Значение из CML2_ATTRIBUTES/CML2_TRAITS по description (напр. 'АП_ПИТОМЕЦПЛЮС')."""
    for it in (props or []):
        if it.get('code') in ('CML2_ATTRIBUTES', 'CML2_TRAITS'):
            for v in (it.get('values') or []):
                if isinstance(v, dict) and v.get('description') == description:
                    return v.get('value')
    return None


def _percent(s):
    """'10%' / '15 %' / '10,5' → float."""
    if not s:
        return None
    m = re.search(r'(\d+[.,]?\d*)', str(s))
    return float(m.group(1).replace(',', '.')) if m else None


def _num(s):
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def _parse_nutrition(text):
    """Извлечь ккал/БЖУ из свободного текста. ккал>1000 трактуем как на кг → /10."""
    out, conf = {}, {}
    m = re.search(r'(\d+[.,]?\d*)\s*ккал', text, re.I)
    if m:
        kcal = _num(m.group(1))
        if kcal and kcal > 1000:
            kcal = round(kcal / 10, 1)  # ккал/кг → ккал/100 г
        if kcal:
            out['kcal_per_100g'] = kcal
            conf['kcal_per_100g'] = 'parsed'
    for field, pat in [
        ('protein_percent', r'(?:белок|протеин)\D{0,12}(\d+[.,]?\d*)\s*%'),
        ('fat_percent', r'жир\D{0,12}(\d+[.,]?\d*)\s*%'),
        ('fiber_percent', r'клетчатк\D{0,12}(\d+[.,]?\d*)\s*%'),
        ('ash_percent', r'зол\D{0,12}(\d+[.,]?\d*)\s*%'),
        ('moisture_percent', r'влаж\D{0,12}(\d+[.,]?\d*)\s*%'),
        ('calcium_percent', r'кальци\D{0,12}(\d+[.,]?\d*)\s*%'),
        ('phosphorus_percent', r'фосфор\D{0,12}(\d+[.,]?\d*)\s*%'),
    ]:
        m = re.search(pat, text, re.I)
        if m:
            val = _num(m.group(1))
            if val is not None:
                out[field] = val
                conf[field] = 'parsed'
    return out, conf


def parse_recipe(product):
    """product (из catalog.json) → {fields, parse_status, reasons, offers, article, external_id}."""
    p = _props_dict(product)
    reasons = []
    conf = {}

    # вид
    vid = _text(p.get('VZH_VID_ZHIVOTNOGO')).lower()
    species = SPECIES_MAP.get(vid, '')
    if not species:
        url = (product.get('detailPageUrl') or '')
        if '/koshki' in url:
            species = 'cat'
        elif '/sobaki' in url:
            species = 'dog'
    if species:
        conf['species'] = 'supplier'

    # форма
    upak = _text(p.get('UPAKOVKA')).lower()
    food_form = FORM_BY_UPAKOVKA.get(upak, '')
    ptype = _text(p.get('PRODUCT_TYPE')).lower()
    if not food_form:
        if 'лаком' in ptype or p.get('VL_VID_LAKOMSTVA'):
            food_form = 'treat'
        elif 'sukhoy' in upak or 'сух' in ptype:
            food_form = 'dry'
        elif 'vlazh' in upak or any(w in ptype for w in WET_PTYPE):
            food_form = 'wet'
    if food_form:
        conf['food_form'] = 'supplier'

    # возраст
    age_raw = _text(p.get('VOZRAST') or p.get('SV_VOZRAST') or p.get('KV_VOZRAST')).lower()
    life_stage = ''
    for k, v in LIFE_STAGE_MAP.items():
        if k in age_raw:
            life_stage = v
            break

    # размер
    size = _text(p.get('SIZE_BREED'))
    if not size:
        for code, label in [('RS_KRUPNYE_PORODY', 'large'), ('RS_SREDNIE_PORODY', 'medium'),
                            ('RS_MELKIE_PORODY', 'small'), ('RS_MALYE_PORODY', 'small')]:
            if str(p.get(code)).lower() in ('true', 'верно'):
                size = label
                break

    # назначение + флаги (по карте OS_*/I_*)
    diet_purpose, flags = [], {}
    pok = _text(p.get('POKAZANIE')).lower()
    if 'мкб' in pok or 'мочекам' in pok:
        diet_purpose.append('urinary'); flags['is_urinary'] = True
    for code, (purpose, flag) in PURPOSE_FLAG_MAP.items():
        if str(p.get(code)).lower() in ('true', 'верно'):
            if purpose and purpose not in diet_purpose:
                diet_purpose.append(purpose)
            if flag:
                flags[flag] = True

    # состав
    ingredients_text = _text(p.get('INGREDIENTS'))
    ingredients = []
    if ingredients_text:
        clean = re.sub(r'^\s*состав\s*:?\s*', '', ingredients_text, flags=re.I)
        ingredients = [x.strip(' .') for x in re.split(r'[,;]', clean) if x.strip(' .')][:40]
        conf['ingredients'] = 'supplier'

    # основной белок + аллергены
    main_protein = ''
    for code, label in PROTEIN_FLAGS.items():
        if str(p.get(code)).lower() in ('true', 'верно'):
            main_protein = label
            break
    if not main_protein:
        main_protein = _text(p.get('VKUS'))
    allergens = []
    low_ingr = ingredients_text.lower()
    for a in ALLERGEN_HINTS:
        if a in low_ingr:
            allergens.append(a)

    # нутриенты из текста
    nutri_text = _text(p.get('DESCRIPTION')) + ' \n ' + ingredients_text
    nutri, nconf = _parse_nutrition(nutri_text)
    conf.update(nconf)

    # агентский %% — из свежего партнёрского фида (в текущем публичном его нет)
    agency_percent = None
    for code in AGENCY_CODE_CANDIDATES:
        v = _num(_text(p.get(code)) or '')
        if v is not None:
            agency_percent = v
            conf['agency_percent'] = 'supplier'
            break

    fields = {
        'name': product.get('name', '')[:500],
        'brand': _text(p.get('BREND'))[:255],
        'line': _text(p.get('SERIYA_BRENDA'))[:255],
        'species': species,
        'food_form': food_form,
        'life_stage': life_stage,
        'size_group': str(size)[:20],
        'diet_purpose': diet_purpose,
        'ingredients': ingredients,
        'main_protein': str(main_protein)[:80],
        'allergens': allergens,
        'agency_percent': agency_percent,
        'field_confidence': conf,
        **flags,
        **nutri,
    }

    # offers (фасовки)
    offers = []
    for o in (product.get('offers') or []):
        op = {it.get('code'): it.get('value') for it in (o.get('props') or [])}
        ap = _percent(_attr_value(o.get('props'), 'АП_ПИТОМЕЦПЛЮС'))
        offers.append({
            'name': o.get('name', ''),
            'price': o.get('price'),
            'article_number': str(op.get('CODE_1C') or '').strip(),
            'barcode': str(op.get('CML2_BAR_CODE') or '').strip(),
            'agency_percent': ap,
            'hide_for_feed': str(op.get('HIDE_FOR_FEED') or '').upper() == 'Y',
        })
    # представительный агентский %% на рецепт (макс по фасовкам) — для отчётов/CRM
    ap_vals = [o['agency_percent'] for o in offers if o.get('agency_percent') is not None]
    if ap_vals:
        fields['agency_percent'] = max(ap_vals)
        conf['agency_percent'] = 'supplier'

    # статус парсинга
    has_class = bool(species and food_form)
    has_nutri = 'kcal_per_100g' in nutri or 'protein_percent' in nutri or 'fat_percent' in nutri
    if has_class and (ingredients or has_nutri):
        parse_status = 'auto_parsed'
    elif has_class or ingredients or has_nutri:
        parse_status = 'partial'
    else:
        parse_status = 'failed'

    # Двухуровневый гейт.
    # nutrition_complete — точная граммовка/«хватит на N дней» (нужны ккал + БЖУ).
    nutrition_complete = bool(nutri.get('kcal_per_100g') and (nutri.get('protein_percent') or nutri.get('fat_percent')))
    fields['nutrition_complete'] = nutrition_complete

    # is_recommendable (relaxed) — честная фильтрация по здоровью/аллергенам.
    price = _num(_text(p.get('MINIMUM_PRICE')) or '0')
    in_stock = str(p.get('IN_STOCK')).upper() == 'Y' or bool(_num(_text(p.get('COUNT')) or '0'))
    if not species:
        reasons.append('no_species')
    if not food_form:
        reasons.append('no_food_form')
    if not (ingredients or allergens):
        reasons.append('no_composition')
    if not price:
        reasons.append('no_price')
    if not in_stock:
        reasons.append('no_stock')
    if str(p.get('HIDE_FOR_FEED')).upper() == 'Y':
        reasons.append('hide_for_feed')
    if parse_status == 'failed':
        reasons.append('parse_failed')
    if not nutrition_complete:
        # не блокирует подбор, но помечаем причину «норма уточняется»
        fields['nutrition_note'] = 'approx_until_filled'

    return {
        'fields': fields,
        'parse_status': parse_status,
        'reasons': reasons,
        'offers': offers,
        'article': _text(p.get('CML2_ARTICLE')),
        'external_id': product.get('xmlId') or str(product.get('id')),
        'is_food': bool(p.get('V_VSE_KORMA') or 'корм' in ptype or food_form in ('dry', 'wet', 'treat')),
        'price': price,
        'in_stock': bool(in_stock),
    }
