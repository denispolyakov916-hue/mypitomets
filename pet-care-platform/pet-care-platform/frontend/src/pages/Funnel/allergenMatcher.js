/**
 * allergenMatcher — клиентское исключение кормов по выбранным аллергиям.
 *
 * P0-фикс (BUG 5): воронка строит варианты (эконом/оптимальный/премиум) и набор
 * в корзину из реальных товаров, но НИКАК не исключала аллергены — курица
 * протекала во все варианты. Здесь — зеркало backend allergen_matcher.py:
 * метки аллергий из квиза разворачиваются в токены-синонимы (RU+EN, основа слова),
 * и совпадение ищется подстрокой в нормализованном тексте товара.
 *
 * ВНИМАНИЕ: каталожный сериализатор отдаёт по товару только name + short_description
 * (без полного состава), поэтому матчим по ним — это лучший доступный сигнал на
 * клиенте и ловит типовые случаи («...с курицей», «Chicken», «Lamb & Rice»).
 */

// Канонические группы → токены-основы (RU+EN). Держать в синхроне с backend.
const ALLERGEN_GROUPS = {
  chicken: ['кур', 'куриц', 'куриный', 'куриная', 'куриное', 'курят', 'птиц', 'chicken', 'poultry', 'fowl'],
  beef: ['говяд', 'говяж', 'телятин', 'beef', 'veal'],
  fish: ['рыб', 'лосос', 'лосось', 'тунец', 'треск', 'форел', 'сельд', 'анчоус', 'fish', 'salmon', 'tuna', 'cod', 'trout', 'herring', 'anchovy'],
  lamb: ['баранин', 'ягнен', 'ягнят', 'lamb', 'mutton'],
  pork: ['свинин', 'свин', 'pork', 'ham', 'bacon'],
  eggs: ['яйц', 'яичн', 'egg'],
  dairy: ['молок', 'молочн', 'сыворот', 'лактоз', 'сыр', 'творог', 'казеин', 'dairy', 'milk', 'lactose', 'whey', 'cheese', 'casein'],
  wheat: ['пшениц', 'пшеничн', 'глютен', 'клейковин', 'злак', 'wheat', 'gluten', 'cereal', 'grain'],
  corn: ['кукуруз', 'маис', 'corn', 'maize'],
  soy: ['соя', 'соев', 'soy', 'soya'],
  turkey: ['индейк', 'индюш', 'turkey'],
  duck: ['утк', 'утин', 'duck'],
}

// Метки/коды из квиза (EXCLUDED_INGREDIENTS_OPTIONS хранит RU-label) → группа.
const ALIAS_TO_GROUP = {
  // value-коды (на случай, если придут коды, а не label)
  chicken: 'chicken', beef: 'beef', fish: 'fish', lamb: 'lamb', pork: 'pork',
  eggs: 'eggs', egg: 'eggs', dairy: 'dairy', milk: 'dairy', wheat: 'wheat',
  gluten: 'wheat', corn: 'corn', soy: 'soy',
  // RU-метки квиза (PetQuizPage сохраняет именно label)
  'курица': 'chicken', 'курицу': 'chicken', 'птица': 'chicken',
  'говядина': 'beef', 'говядину': 'beef',
  'рыба': 'fish', 'рыбу': 'fish',
  'баранина': 'lamb', 'баранину': 'lamb', 'ягненок': 'lamb',
  'свинина': 'pork', 'свинину': 'pork',
  'яйца': 'eggs', 'яйцо': 'eggs',
  'молочные продукты': 'dairy', 'молоко': 'dairy',
  'пшеница злаки': 'wheat', 'пшеница': 'wheat', 'глютен': 'wheat',
  'кукуруза': 'corn',
  'соя': 'soy',
}

/** Нормализация: lower + ё→е + небуквенно-цифровое → пробел, с краевыми пробелами. */
export function normalizeText(value) {
  if (!value) return ''
  const text = String(value).toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, ' ').trim()
  return ` ${text} `
}

/** Метка/код аллергии → каноническая группа или ''. */
export function resolveAllergenGroup(raw) {
  if (!raw) return ''
  const norm = normalizeText(raw).trim()
  if (!norm) return ''
  if (ALIAS_TO_GROUP[norm]) return ALIAS_TO_GROUP[norm]
  // запасной разбор: вдруг метка содержит токен группы
  for (const [group, tokens] of Object.entries(ALLERGEN_GROUPS)) {
    if (tokens.some((t) => t && norm.includes(t))) return group
  }
  return ''
}

/** Набор меток аллергий → плоский список токенов-синонимов. */
export function tokensForAllergens(rawAllergens = []) {
  const out = []
  const seen = new Set()
  for (const raw of rawAllergens || []) {
    const group = resolveAllergenGroup(raw)
    if (!group) continue
    for (const t of ALLERGEN_GROUPS[group] || []) {
      if (t && !seen.has(t)) { seen.add(t); out.push(t) }
    }
  }
  return out
}

/** Есть ли в тексте товара хотя бы один аллерген-токен. */
export function productHasAllergen(textParts, allergenTokens) {
  if (!allergenTokens || !allergenTokens.length) return false
  const haystack = (textParts || []).map(normalizeText).join(' ')
  return allergenTokens.some((t) => t && haystack.includes(t))
}

/**
 * Отфильтровать товары, исключив содержащие выбранные аллергены.
 * Матчим по name + short_description (что есть в каталоге).
 */
export function filterOutAllergens(products = [], rawAllergens = []) {
  const tokens = tokensForAllergens(rawAllergens)
  if (!tokens.length) return products || []
  return (products || []).filter(
    (p) => p && !productHasAllergen([p.name, p.short_description], tokens),
  )
}
