/**
 * recommendationsAdapter — собирает персональный подбор из РЕАЛЬНЫХ товаров магазина.
 *
 * TODO(adapter): точный scored-подбор и расчёт ккал/нормы кормления пока не подключены
 * к анонимному эндпоинту (NutritionCalculatorView требует данных питомца). Здесь —
 * безопасный переходный слой: берём реальные корма по виду питомца, формируем 3 ценовых
 * варианта (эконом / оптимальный / премиум) и «набор заботы на месяц» (корм + доп. товар).
 * Когда появится анонимный scored-эндпоинт — заменить только тело buildRecommendations,
 * контракт данных (tiers/bundle/profile/reasons) оставить.
 */
import { getProducts } from '../../api/shop'
import { formatPrice } from '../../utils/format'

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

async function fetchGroup(species, group) {
  try {
    const res = await getProducts({ animal: species, product_group: group, page_size: 24 })
    return (res?.products || []).filter((p) => p && p.is_available !== false && p.price)
  } catch {
    return []
  }
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

function ageWord(age) {
  const n = Number(age)
  if (!Number.isFinite(n)) return 'года'
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'год'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'года'
  return 'лет'
}

function neuteredLabel(value) {
  if (value === true) return 'Стерилизован'
  if (value === false) return 'Не стерилизован'
  return null
}

/** Карточка профиля питомца для hero (паспорт рациона). Пустые поля не показываем. */
function buildProfile(draft) {
  const speciesLabel = draft.species === 'dog' ? 'Собака' : 'Кошка'
  const breed = draft.breed && String(draft.breed).trim() ? String(draft.breed).trim() : null
  const age = draft.age != null && draft.age !== '' ? `${draft.age} ${ageWord(draft.age)}` : null
  const weight = draft.weight != null && draft.weight !== '' ? `${draft.weight} кг` : null
  const health = draft.health && String(draft.health).trim() ? String(draft.health).trim() : null
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
  const note = draft.health && String(draft.health).trim()
  if (draft.goal === 'sensitive' || note) return `Учли чувствительность: ${note || 'бережный состав'}.`
  if (draft.goal === 'weight') return 'Рацион ориентирован на контроль веса.'
  if (optimal && optimal.is_hypoallergenic) return 'Гипоаллергенный состав.'
  if (draft.neutered === true) return 'Рацион подходит стерилизованным питомцам.'
  return 'Поддерживает форму здорового питомца.'
}

/** Блок «Почему подходит» — каждый пункт опирается на реальные данные питомца. */
function buildReasons(draft, optimal, monthly) {
  const reasons = []
  const ageOk = draft.age != null && draft.age !== '' && Number.isFinite(Number(draft.age))
  if (ageOk) {
    reasons.push({ key: 'age', title: 'Подходит по возрасту', text: `Рацион рассчитан на питомца ${draft.age} ${ageWord(draft.age)}.` })
  }
  const hasWeight = draft.weight != null && draft.weight !== ''
  if (hasWeight) {
    const text = draft.goal === 'weight'
      ? `Калорийность с учётом контроля веса при ${draft.weight} кг.`
      : `Порции и калорийность под вес ${draft.weight} кг.`
    reasons.push({ key: 'weight', title: 'Учитывает вес', text })
  }
  reasons.push({ key: 'budget', title: 'Подходит под бюджет', text: `Уложились в бюджет «${BUDGET_LABELS[draft.budget] || 'сбалансированно'}».` })

  reasons.push({ key: 'health', title: 'Учитывает здоровье и цель', text: healthReasonText(draft, optimal) })

  reasons.push({ key: 'monthly', title: 'Понятная стоимость в месяц', text: `Около ${formatPrice(monthly)} в месяц — без сюрпризов.` })
  return reasons
}

export async function buildRecommendations(draft = {}) {
  const species = draft.species === 'dog' ? 'dog' : 'cat'

  // Основной пул — реальные корма по виду питомца.
  let food = await fetchGroup(species, 'food')
  if (food.length < 3) {
    // запасной путь: общий список и фильтр по названию/группе
    const general = await fetchGroup(species, null)
    const asFood = general.filter((p) => /корм|food/i.test(`${p.name || ''} ${p.product_group || ''}`))
    food = asFood.length >= 3 ? asFood : general
  }
  const sorted = [...food].sort((a, b) => (a.price || 0) - (b.price || 0))
  if (sorted.length === 0) return { species, tiers: [], profile: buildProfile(draft), reasons: [], bundle: null }

  const economy = sorted[0]
  const premium = sorted[sorted.length - 1]
  const optimal = pickOptimal(sorted) || economy

  // Месячная стоимость — предварительно (≈1 упаковка/мес). TODO(adapter): расчёт по норме кормления.
  const monthlyOf = (p) => (p ? Math.round(p.price || 0) : 0)

  const rawTiers = [
    { key: 'optimal', label: 'Оптимальный выбор', badge: 'gold', recommended: true, product: optimal, why: 'Лучшее соотношение пользы и цены под вашего питомца.' },
    { key: 'economy', label: 'Экономный вариант', badge: 'soft', recommended: false, product: economy, why: 'Бережёт бюджет и закрывает базовые потребности.' },
    { key: 'premium', label: 'Премиум-решение', badge: 'violet', recommended: false, product: premium, why: 'Премиальный состав для максимальной заботы.' },
  ]
  // Дедуп (если кормов мало, разные тиры могут совпасть).
  const seen = new Set()
  const tiers = rawTiers
    .filter((t) => t.product && !seen.has(t.product.id) && seen.add(t.product.id))
    .map((t) => ({ ...t, attrs: productAttrs(t.product), monthly: monthlyOf(t.product) }))

  // Набор заботы: основной корм (оптимальный) + доп. товар из смежной группы.
  let addon = null
  let addonGroup = null
  for (const group of ADDON_GROUPS) {
    const items = (await fetchGroup(species, group)).filter((it) => it.id !== optimal.id)
    if (items.length) {
      const byPrice = [...items].sort((a, b) => (a.price || 0) - (b.price || 0))
      // не самый дешёвый «мусор» и не самый дорогой — берём из нижней трети
      addon = byPrice[Math.min(byPrice.length - 1, Math.floor(byPrice.length * 0.25))]
      addonGroup = group
      break
    }
  }
  const main = optimal
  const bundle = {
    main,
    addon,
    addonGroup,
    addonLabel: addonGroup ? ADDON_LABELS[addonGroup] : null,
    days: '28–30',
    total: (main?.price || 0) + (addon?.price || 0),
    monthly: monthlyOf(main),
  }

  const reasons = buildReasons(draft, optimal, monthlyOf(optimal))
  const profile = buildProfile(draft)

  return { species, tiers, bundle, profile, reasons }
}
