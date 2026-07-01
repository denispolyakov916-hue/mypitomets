/**
 * recommendationsAdapter — собирает персональный подбор из РЕАЛЬНЫХ товаров магазина.
 *
 * TODO(adapter): точный scored-подбор и расчёт ккал/нормы кормления пока не подключены
 * к анонимному эндпоинту (NutritionCalculatorView требует данных питомца). Здесь —
 * безопасный переходный слой: берём реальные корма по виду питомца, формируем 3 ценовых
 * варианта (эконом / оптимальный / премиум) и «набор заботы на месяц» (корм + доп. товар).
 * Когда появится анонимный scored-эндпоинт — заменить только тело buildRecommendations,
 * контракт данных (tiers/bundle/profile/reasons) оставить.
 *
 * BUG-FIX (рацион 70/30): раньше подбирался ОДИН корм на тир, и рацион по факту был
 * либо полностью сухим, либо полностью влажным — но экран обещал смесь «70/30».
 * Теперь на каждый тир подбираем ДВА корма (сухой + влажный) из одного пула (после
 * единого исключения аллергенов) и строим настоящую смесь с честной пропорцией. Если
 * после фильтра доступна только одна форма — не врём: пропорция схлопывается в 100%
 * доступной формы, а mix.label честно это отражает.
 */
import { getProducts } from '../../api/shop'
import { formatPrice } from '../../utils/format'
import { formatAgeLabel } from './petAge'
import { filterOutAllergens, tokensForAllergens } from './allergenMatcher'

// Группы для доп. товара «набора заботы» — пробуем по приоритету, берём первый доступный.
const ADDON_GROUPS = ['treats', 'grooming', 'care', 'toilet', 'vet']
const ADDON_LABELS = {
  treats: 'Лакомство',
  grooming: 'Уход',
  care: 'Уход',
  toilet: 'Гигиена',
  vet: 'Здоровье',
}

const BUDGET_LABELS = { economy: 'Экономно', balanced: 'Сбалансированно', premium: 'Премиум' }
const GOAL_LABELS = { maintain: 'Поддержание формы', weight: 'Контроль веса', sensitive: 'Чувствительность' }

// Целевая доля сухого корма в смешанном рационе (сухой/влажный). Остальное — влажный.
export const DRY_SHARE = 0.7

async function fetchGroup(species, group) {
  try {
    const res = await getProducts({ animal: species, product_group: group, page_size: 24 })
    return (res?.products || []).filter((p) => p && p.is_available !== false && p.price)
  } catch {
    return []
  }
}

/**
 * Влажный корм? — определяем по названию / короткому описанию / названию категории
 * (полного состава каталог не отдаёт). Совпадение по влажным маркерам = wet.
 */
export function isWetFood(product) {
  if (!product) return false
  const hay = `${product.name || ''} ${product.short_description || ''} ${product.category_name || ''} ${product.category?.name || ''} ${product.category?.code || ''}`.toLowerCase()
  return /влаж|консерв|пауч|пресерв|wet|мусс|желе|паштет|кусочки в соусе|соус|pouch/i.test(hay)
}

/** Сухой корм? — не помечен влажным (по доступным текстовым сигналам). */
export function isDryFood(product) {
  return !!product && !isWetFood(product)
}

/**
 * rationMix(dry, wet, dryShare) → честная смесь двух форм с пропорцией и подписью.
 * Чистая функция (без API) — тестируется отдельно.
 *
 * — Обе формы есть → пропорция dryShare/(1-dryShare), подпись «X% сухой / Y% влажный».
 * — Только сухой → 100% сухой, подпись честно про одну форму.
 * — Только влажный → 100% влажный.
 * — Ничего → null.
 *
 * cost = взвешенная стоимость рациона на период (share × цена каждой формы),
 * чтобы «итого/на период» соответствовало заявленной смеси, а не одной пачке.
 */
export function rationMix(dry = null, wet = null, dryShare = DRY_SHARE) {
  const clamp = (x) => Math.min(1, Math.max(0, x))
  const share = clamp(Number.isFinite(dryShare) ? dryShare : DRY_SHARE)

  if (dry && wet) {
    const dryPct = Math.round(share * 100)
    const wetPct = 100 - dryPct
    return {
      dry,
      wet,
      dryPct,
      wetPct,
      mixed: true,
      form: 'mixed',
      label: `${dryPct}% сухой / ${wetPct}% влажный`,
      note: null,
      cost: Math.round((dry.price || 0) * share + (wet.price || 0) * (1 - share)),
    }
  }
  if (dry) {
    return {
      dry,
      wet: null,
      dryPct: 100,
      wetPct: 0,
      mixed: false,
      form: 'dry',
      label: '100% сухой',
      note: 'Влажный корм без выбранных аллергенов не нашёлся — рацион только из сухого.',
      cost: Math.round(dry.price || 0),
    }
  }
  if (wet) {
    return {
      dry: null,
      wet,
      dryPct: 0,
      wetPct: 100,
      mixed: false,
      form: 'wet',
      label: '100% влажный',
      note: 'Сухой корм без выбранных аллергенов не нашёлся — рацион только из влажного.',
      cost: Math.round(wet.price || 0),
    }
  }
  return null
}

/** Привязки атрибутов товара (для блока «почему подходит» и бейджей карточек). */
function productAttrs(p) {
  return {
    brandClass: p.brand_class || null,
    isHypoallergenic: !!p.is_hypoallergenic,
    isGrainFree: !!p.is_grain_free,
    isVeterinary: !!p.is_veterinary,
    ageGroup: p.age_group || null,
    rating: p.rating || 0,
    ratingCount: p.rating_count || 0,
    hasDiscount: !!(p.compare_price && p.compare_price > p.price),
  }
}

/** Оптимальный = лучшее соотношение цены и пользы: средний ценовой диапазон, выше рейтинг. */
function pickOptimal(sorted) {
  const n = sorted.length
  if (n <= 2) return sorted[Math.floor(n / 2)] || sorted[0]
  const lo = Math.floor(n * 0.34)
  const hi = Math.ceil(n * 0.7)
  const band = sorted.slice(lo, hi)
  const byValue = [...band].sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.price || 0) - (b.price || 0))
  return byValue[0] || sorted[Math.floor(n / 2)]
}

/**
 * Три «ценовых точки» из отсортированного (по цене) пула: эконом / оптимальный / премиум.
 * Работает и для сухого, и для влажного пула по отдельности.
 */
function tierPicksFrom(pool) {
  const sorted = [...pool].sort((a, b) => (a.price || 0) - (b.price || 0))
  if (!sorted.length) return { economy: null, optimal: null, premium: null }
  return {
    economy: sorted[0],
    optimal: pickOptimal(sorted) || sorted[0],
    premium: sorted[sorted.length - 1],
  }
}

function neuteredLabel(value) {
  if (value === true) return 'Стерилизован'
  if (value === false) return 'Не стерилизован'
  return null
}

/** Сводка особенностей здоровья/аллергий из чипов + свободного ввода. */
function healthSummary(draft) {
  const parts = []
  if (Array.isArray(draft.healthTags) && draft.healthTags.length) parts.push(draft.healthTags.join(', '))
  if (Array.isArray(draft.allergyTags) && draft.allergyTags.length) parts.push(`аллергии: ${draft.allergyTags.join(', ')}`)
  if (draft.health && String(draft.health).trim()) parts.push(String(draft.health).trim())
  return parts.length ? parts.join('; ') : null
}

/** Карточка профиля питомца для hero (паспорт рациона). Пустые поля не показываем. */
function buildProfile(draft) {
  const speciesLabel = draft.species === 'dog' ? 'Собака' : 'Кошка'
  const breed = draft.breed && String(draft.breed).trim() ? String(draft.breed).trim() : null
  // Возраст: корректная подпись для малышей (мес) и взрослых (лет) — не «годы×0.5».
  const age = formatAgeLabel(draft)
  const weight = draft.weight != null && draft.weight !== '' ? `${draft.weight} кг` : null
  const health = healthSummary(draft)
  const rows = [
    { key: 'species', label: 'Вид', value: speciesLabel },
    { key: 'breed', label: 'Порода', value: breed },
    { key: 'age', label: 'Возраст', value: age },
    { key: 'weight', label: 'Вес', value: weight },
    { key: 'neutered', label: 'Статус', value: neuteredLabel(draft.neutered) },
    { key: 'health', label: 'Здоровье', value: health },
    { key: 'budget', label: 'Бюджет', value: BUDGET_LABELS[draft.budget] || null },
    { key: 'goal', label: 'Цель', value: GOAL_LABELS[draft.goal] || null },
  ]
  return rows.filter((r) => r.value)
}

function healthReasonText(draft, optimal) {
  const note = healthSummary(draft)
  if (draft.goal === 'sensitive' || note) return `Учли чувствительность: ${note || 'бережный состав'}.`
  if (draft.goal === 'weight') return 'Рацион ориентирован на контроль веса.'
  if (optimal && optimal.is_hypoallergenic) return 'Гипоаллергенный состав.'
  if (draft.neutered === true) return 'Рацион подходит стерилизованным питомцам.'
  return 'Поддерживает форму здорового питомца.'
}

/** Текст «Тип рациона» для блока «почему подходит» — из реальной смеси. */
function rationReasonText(mix) {
  if (!mix) return 'Смешанный рацион под потребности питомца.'
  if (mix.mixed) return `Смешанный рацион: ${mix.label} — сухой для зубов и сытости, влажный для влаги и аппетита.`
  if (mix.form === 'dry') return 'Рацион из сухого корма (влажного без ваших аллергенов не нашлось).'
  return 'Рацион из влажного корма (сухого без ваших аллергенов не нашлось).'
}

/** Блок «Почему подходит» — каждый пункт опирается на реальные данные питомца. */
function buildReasons(draft, optimal, monthly, mix) {
  const reasons = []
  const ageLabel = formatAgeLabel(draft)
  if (ageLabel) {
    reasons.push({ key: 'age', title: 'Подходит по возрасту', text: `Рацион рассчитан на питомца ${ageLabel}.` })
  }
  const hasWeight = draft.weight != null && draft.weight !== ''
  if (hasWeight) {
    const text = draft.goal === 'weight'
      ? `Калорийность с учётом контроля веса при ${draft.weight} кг.`
      : `Порции и калорийность под вес ${draft.weight} кг.`
    reasons.push({ key: 'weight', title: 'Учитывает вес', text })
  }
  reasons.push({ key: 'ration', title: 'Сбалансированный рацион', text: rationReasonText(mix) })
  reasons.push({ key: 'budget', title: 'Подходит под бюджет', text: `Уложились в бюджет «${BUDGET_LABELS[draft.budget] || 'сбалансированно'}».` })

  reasons.push({ key: 'health', title: 'Учитывает здоровье и цель', text: healthReasonText(draft, optimal) })

  reasons.push({ key: 'monthly', title: 'Понятная стоимость в месяц', text: `Около ${formatPrice(monthly)} в месяц — без сюрпризов.` })
  return reasons
}

/** Пул кормов по виду + ЕДИНОЕ исключение аллергенов (до деления на варианты/набор). */
async function fetchFoodPool(species, allergyTags) {
  let food = await fetchGroup(species, 'food')
  if (food.length < 3) {
    // запасной путь: общий список и фильтр по названию/группе
    const general = await fetchGroup(species, null)
    const asFood = general.filter((p) => /корм|food/i.test(`${p.name || ''} ${p.product_group || ''}`))
    food = asFood.length >= 3 ? asFood : general
  }
  const safe = filterOutAllergens(food, allergyTags)
  return { safe, excludedAll: food.length > 0 && safe.length === 0 }
}

/** Доп. товар набора заботы — тоже без аллергенов (набор уходит в корзину). */
async function pickAddon(species, allergyTags, excludeIds) {
  const exclude = new Set((excludeIds || []).filter((id) => id != null))
  for (const group of ADDON_GROUPS) {
    const items = filterOutAllergens(await fetchGroup(species, group), allergyTags)
      .filter((it) => !exclude.has(it.id))
    if (items.length) {
      const byPrice = [...items].sort((a, b) => (a.price || 0) - (b.price || 0))
      // не самый дешёвый «мусор» и не самый дорогой — берём из нижней трети
      return { addon: byPrice[Math.min(byPrice.length - 1, Math.floor(byPrice.length * 0.25))], group }
    }
  }
  return { addon: null, group: null }
}

// Метаданные трёх ценовых тиров (эконом / оптимальный / премиум).
const TIER_KEYS = [
  { key: 'optimal', label: 'Оптимальный выбор', badge: 'gold', recommended: true, why: 'Лучшее соотношение пользы и цены под вашего питомца.' },
  { key: 'economy', label: 'Экономный вариант', badge: 'soft', recommended: false, why: 'Бережёт бюджет и закрывает базовые потребности.' },
  { key: 'premium', label: 'Премиум-решение', badge: 'violet', recommended: false, why: 'Премиальный состав для максимальной заботы.' },
]

/** Стоимость рациона за (условный) месяц — взвешенная по смеси. */
const monthlyOfMix = (mix) => (mix ? Math.round(mix.cost || 0) : 0)

/** Честное «нет безопасного корма» сообщение (или null). */
function noSafeFoodNotice(hasAllergens, excludedAll, allergyTags) {
  return (hasAllergens && excludedAll)
    ? `Не нашли корм без выбранных аллергенов (${allergyTags.join(', ')}). Измените список аллергий или обратитесь к специалисту.`
    : null
}

/**
 * Собрать 3 тира настоящих смесей (сухой + влажный) из безопасного пула.
 * Дедупим по паре (dry,wet): при малом каталоге тиры могут совпасть целиком.
 */
function buildTiers(food) {
  const dryPicks = tierPicksFrom(food.filter(isDryFood))
  const wetPicks = tierPicksFrom(food.filter(isWetFood))
  // Ценовые точки по всему пулу — чтобы при отсутствии одной формы честно
  // деградировать до 100% доступной формы, сохранив 3 тира.
  const allPicks = tierPicksFrom(food)

  const seen = new Set()
  const tiers = []
  for (const t of TIER_KEYS) {
    const dry = dryPicks[t.key] || allPicks[t.key] || null
    const wet = wetPicks[t.key] || null
    const mix = rationMix(dry, wet, DRY_SHARE)
    if (!mix) continue
    const sig = `${mix.dry?.id ?? '-'}|${mix.wet?.id ?? '-'}`
    if (seen.has(sig)) continue
    seen.add(sig)
    // Представитель тира для конструктора-UI: сухой корм (или влажный, если сухого нет).
    const product = mix.dry || mix.wet
    tiers.push({ ...t, product, mix, attrs: productAttrs(product), monthly: monthlyOfMix(mix) })
  }
  return tiers
}

/** Набор заботы: рацион (смесь сухой+влажный) + доп. товар. total — за условный месяц. */
function buildBundle(mix, addon, addonGroup) {
  const rationCost = mix.cost || 0
  return {
    // main — представитель рациона для UI (сухой корм); полный рацион в mix.
    main: mix.dry || mix.wet,
    mix,
    dry: mix.dry,
    wet: mix.wet,
    addon,
    addonGroup,
    addonLabel: addonGroup ? ADDON_LABELS[addonGroup] : null,
    days: '28–30',
    rationCost,
    total: rationCost + (addon?.price || 0),
    monthly: monthlyOfMix(mix),
  }
}

/** Прозрачное сообщение: про деградацию смеси и/или исключённые аллергены. */
function buildNotice(mix, hasAllergens, allergyTags) {
  const parts = []
  if (!mix.mixed && mix.note) parts.push(mix.note)
  if (hasAllergens) parts.push(`Из подбора исключены корма с выбранными аллергенами: ${allergyTags.join(', ')}.`)
  return parts.length ? parts.join(' ') : null
}

export async function buildRecommendations(draft = {}) {
  const species = draft.species === 'dog' ? 'dog' : 'cat'

  // Выбранные аллергии (квиз хранит RU-метки). Единый источник исключения для
  // ВСЕХ вариантов (эконом/оптимальный/премиум) и набора в корзину.
  const allergyTags = Array.isArray(draft.allergyTags) ? draft.allergyTags : []
  const hasAllergens = tokensForAllergens(allergyTags).length > 0

  const { safe: food, excludedAll } = await fetchFoodPool(species, allergyTags)

  // Делим уже безопасный (без аллергенов) пул на сухой и влажный, собираем тиры-смеси.
  const tiers = buildTiers(food)

  if (tiers.length === 0) {
    // Честное сообщение вместо подсовывания корма с аллергеном.
    const notice = noSafeFoodNotice(hasAllergens, excludedAll, allergyTags)
    return { species, tiers: [], profile: buildProfile(draft), reasons: [], bundle: null, mix: null, notice }
  }

  const optimalMix = (tiers.find((t) => t.key === 'optimal') || tiers[0]).mix
  const optimal = optimalMix.dry || optimalMix.wet

  // Набор заботы: рацион (сухой + влажный, если есть) + доп. товар из смежной группы.
  const { addon, group: addonGroup } = await pickAddon(species, allergyTags, [optimalMix.dry?.id, optimalMix.wet?.id])
  const bundle = buildBundle(optimalMix, addon, addonGroup)

  const reasons = buildReasons(draft, optimal, monthlyOfMix(optimalMix), optimalMix)
  const profile = buildProfile(draft)
  const notice = buildNotice(optimalMix, hasAllergens, allergyTags)

  return { species, tiers, bundle, mix: optimalMix, profile, reasons, notice }
}
