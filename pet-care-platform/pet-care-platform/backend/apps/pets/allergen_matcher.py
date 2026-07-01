"""
allergen_matcher — единый источник правды для исключения кормов по аллергии.

P0-фикс (BUG 5): раньше сопоставление шло как
    allergy.display_name ("Аллергия на курицу") in ingredients_text
— такая строка-предложение почти никогда не встречается в составе, поэтому
курица «протекала» во ВСЕ варианты подбора (оптимальный/эконом/премиум + набор
в корзину). Здесь аллерген раскрывается в набор РОБАСТНЫХ токенов-синонимов
(RU+EN, основа слова), и совпадение ищется как подстрока в нормализованном
тексте состава. Так «куриная грудка», «куриный жир», «Chicken meal»,
«dehydrated chicken» — все ловятся для аллергии «курица».

Используется и backend-сервисом подбора (recipe-режим), и зеркалится во
frontend (recommendationsAdapter) — чтобы исключение применялось ОДИНАКОВО
для всех вариантов и набора в корзину.
"""

import re
from typing import Iterable, List, Set


def normalize_text(value: str) -> str:
    """Нормализовать текст: lower + ё→е + схлопнуть небуквенно-цифровое в пробел."""
    if not value:
        return ""
    text = str(value).lower().replace("ё", "е")
    # оставляем буквы/цифры (рус+лат), всё прочее → пробел
    text = re.sub(r"[^0-9a-zа-я]+", " ", text)
    return f" {text.strip()} "


# Канонические группы аллергенов → токены-основы (RU+EN), которые ищем подстрокой.
# Токены подобраны так, чтобы ловить словоформы: 'кур' → курица/куриная/куриный/курят.
# ВНИМАНИЕ: токены должны быть достаточно специфичны, чтобы не ловить ложно
# (напр. не используем 'рыб' отдельно от контекста — но 'рыб' безопасно: рыба/рыбий/рыбная).
ALLERGEN_GROUPS = {
    "chicken": ["кур", "куриц", "куриный", "куриная", "куриное", "курят", "птиц",
                "chicken", "poultry", "fowl"],
    "beef": ["говяд", "говяж", "телятин", "beef", "veal"],
    "fish": ["рыб", "лосос", "лосось", "тунец", "треск", "форел", "сельд", "анчоус",
             "fish", "salmon", "tuna", "cod", "trout", "herring", "anchovy"],
    "lamb": ["баранин", "ягнен", "ягнят", "lamb", "mutton"],
    "pork": ["свинин", "свин", "pork", "ham", "bacon"],
    "eggs": ["яйц", "яичн", "egg"],
    "dairy": ["молок", "молочн", "сыворот", "лактоз", "сыр", "творог", "казеин",
              "dairy", "milk", "lactose", "whey", "cheese", "casein"],
    "wheat": ["пшениц", "пшеничн", "глютен", "клейковин", "злак", "wheat", "gluten", "cereal", "grain"],
    "corn": ["кукуруз", "маис", "corn", "maize"],
    "soy": ["соя", "соев", "soy", "soya"],
    "turkey": ["индейк", "индюш", "turkey"],
    "duck": ["утк", "утин", "duck"],
    "rabbit": ["крол", "rabbit"],
    "potato": ["картоф", "картош", "potato"],
}

# Синонимы входных меток/кодов → ключ канонической группы.
# Покрывает: value-коды квиза (chicken/beef/...), коды справочника Allergy
# (dog_kurinyy_belok, cat_rybiy_belok, chicken_protein), RU-метки/слова из
# display_name/specific_allergen ("курица", "куриный белок", "Аллергия на рыбу").
_ALIAS_TO_GROUP = {}


def _register(group: str, *aliases: str):
    for a in aliases:
        _ALIAS_TO_GROUP[normalize_text(a).strip()] = group


# value-коды квиза EXCLUDED_INGREDIENTS_OPTIONS
_register("chicken", "chicken")
_register("beef", "beef")
_register("fish", "fish")
_register("lamb", "lamb")
_register("pork", "pork")
_register("eggs", "eggs", "egg")
_register("dairy", "dairy", "milk")
_register("wheat", "wheat", "gluten")
_register("corn", "corn")
_register("soy", "soy")
# RU-метки из квиза (PetQuizPage сохраняет именно label)
_register("chicken", "курица", "курицу", "куриный белок", "аллергия на курицу", "птица")
_register("beef", "говядина", "говядину", "говяжий белок", "аллергия на говядину")
_register("fish", "рыба", "рыбу", "рыбий белок", "аллергия на рыбу")
_register("lamb", "баранина", "баранину", "ягненок")
_register("pork", "свинина", "свинину")
_register("eggs", "яйца", "яйцо", "яичный белок", "аллергия на яйца")
_register("dairy", "молочные продукты", "молоко", "молочный белок", "аллергия на молоко")
_register("wheat", "пшеница злаки", "пшеница", "глютен", "пшеничный белок")
_register("corn", "кукуруза")
_register("soy", "соя", "соевый белок")


def _strip_species_prefix(code: str) -> str:
    c = code.strip()
    for p in ("dog_", "cat_"):
        if c.startswith(p):
            c = c[len(p):]
            break
    return c


def resolve_allergen_group(raw: str) -> str:
    """Привести произвольную метку/код аллергии к канонической группе или ''."""
    if not raw:
        return ""
    norm = normalize_text(raw).strip()
    if not norm:
        return ""
    # 1) прямой алиас (метка/код целиком)
    if norm in _ALIAS_TO_GROUP:
        return _ALIAS_TO_GROUP[norm]
    # 2) код справочника Allergy: снять видовой префикс, искать по основам
    code_like = _strip_species_prefix(raw).lower().replace("ё", "е")
    keymap = {
        "chicken": "chicken", "kurin": "chicken", "kuriny": "chicken", "kurica": "chicken",
        "beef": "beef", "govyaz": "beef", "govyazh": "beef",
        "fish": "fish", "ryb": "fish", "rybiy": "fish",
        "lamb": "lamb", "baranin": "lamb", "yagn": "lamb",
        "pork": "pork", "svin": "pork",
        "egg": "eggs", "yaic": "eggs", "yaichn": "eggs",
        "dairy": "dairy", "milk": "dairy", "molok": "dairy", "molochn": "dairy",
        "wheat": "wheat", "gluten": "wheat", "pshenic": "wheat", "pshenitsa": "wheat",
        "corn": "corn", "kukuruz": "corn",
        "soy": "soy", "soev": "soy", "soya": "soy",
        "turkey": "turkey", "indeyk": "turkey",
        "duck": "duck", "utk": "duck", "utin": "duck",
        "rabbit": "rabbit", "krol": "rabbit",
    }
    for needle, group in keymap.items():
        if needle in code_like:
            return group
    # 3) последняя попытка: вдруг сама нормализованная метка содержит токен группы
    for group, tokens in ALLERGEN_GROUPS.items():
        for t in tokens:
            if t and t in norm:
                return group
    return ""


def tokens_for_allergens(raw_allergens: Iterable[str]) -> List[str]:
    """Развернуть набор меток/кодов аллергий в плоский список токенов-синонимов."""
    out: List[str] = []
    seen: Set[str] = set()
    for raw in raw_allergens or []:
        group = resolve_allergen_group(raw)
        if not group:
            continue
        for t in ALLERGEN_GROUPS.get(group, []):
            if t and t not in seen:
                seen.add(t)
                out.append(t)
    return out


def matched_allergen_tokens(text_parts: Iterable[str], allergen_tokens: Iterable[str]) -> List[str]:
    """Вернуть токены аллергенов, найденные в составе (нормализованная подстрока)."""
    haystack = " ".join(normalize_text(p) for p in text_parts if p)
    hits: List[str] = []
    for t in allergen_tokens or []:
        if t and t in haystack:
            hits.append(t)
    return hits


def has_allergen_conflict(text_parts: Iterable[str], raw_allergens: Iterable[str]) -> bool:
    """True, если состав содержит хотя бы один аллерген из набора."""
    return bool(matched_allergen_tokens(text_parts, tokens_for_allergens(raw_allergens)))
