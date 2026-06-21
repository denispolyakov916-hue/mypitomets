/**
 * rationPlan — приблизительный расчёт рациона (чистые функции, без API).
 *
 * TODO(ration): формулы RER/MER и БЖУ — ветеринарная норма «ориентировочно».
 * Точный расчёт по составу корма появится, когда подключим анонимный
 * scored-эндпоинт (NutritionCalculatorView). Здесь — честная оценка с пометкой.
 */

const SPECIES = {
  cat: { macro: { protein: 0.40, fat: 0.32, carbs: 0.28 } },
  dog: { macro: { protein: 0.30, fat: 0.30, carbs: 0.40 } },
}

/** Коэффициент суточной энергии (MER = RER × factor) по виду/статусу/цели. */
function merFactor(draft) {
  const isDog = draft.species === 'dog'
  if (draft.goal === 'weight') return isDog ? 1.0 : 0.8 // контроль/снижение веса
  const neutered = draft.neutered === true
  if (isDog) return neutered ? 1.6 : 1.8
  return neutered ? 1.2 : 1.4 // кошка
}

/** Влажный корм? — по названию/категории товара (для оценки калорийности на грамм). */
function isWetFood(product) {
  if (!product) return false
  const hay = `${product.name || ''} ${product.category?.code || ''} ${product.category?.name || ''}`
  return /влаж|консерв|пауч|wet|мусс|желе|соус/i.test(hay)
}

const MEAL_SLOTS = [
  { key: 'morning', label: 'Утро', share: 0.35 },
  { key: 'day', label: 'День', share: 0.30 },
  { key: 'evening', label: 'Вечер', share: 0.35 },
]

/**
 * computeRation(draft, product) → план рациона.
 * Всё «ориентировочно»; если нет веса — калораж/граммы не считаем (показываем прочерк).
 */
export function computeRation(draft = {}, product = null) {
  const species = draft.species === 'dog' ? 'dog' : 'cat'
  const def = SPECIES[species]
  const weight = Number(draft.weight)
  const hasWeight = Number.isFinite(weight) && weight > 0

  const rer = hasWeight ? Math.round(70 * weight ** 0.75) : null
  const mer = rer != null ? Math.round(rer * merFactor(draft)) : null

  let macros = null
  if (mer != null) {
    const m = def.macro
    macros = [
      { key: 'protein', label: 'Белки', pct: Math.round(m.protein * 100), grams: Math.round((mer * m.protein) / 4) },
      { key: 'fat', label: 'Жиры', pct: Math.round(m.fat * 100), grams: Math.round((mer * m.fat) / 9) },
      { key: 'carbs', label: 'Углеводы', pct: Math.round(m.carbs * 100), grams: Math.round((mer * m.carbs) / 4) },
    ]
  }

  const wet = isWetFood(product)
  const kcalPerGram = wet ? 0.9 : 3.6
  const gramsPerDay = mer != null ? Math.round(mer / kcalPerGram) : null

  const meals = MEAL_SLOTS.map((s) => ({
    ...s,
    grams: gramsPerDay != null ? Math.round(gramsPerDay * s.share) : null,
  }))

  return { rer, mer, macros, wet, kcalPerGram, gramsPerDay, meals, approximate: true, hasWeight }
}
