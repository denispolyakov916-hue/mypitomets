/**
 * petAge — чистые функции расчёта возраста/даты рождения для анкеты воронки.
 *
 * Зачем: для щенков/котят неверно было умножать «годы × 0.5». Теперь анкета
 * собирает возраст в одной из трёх форм:
 *   - { ageMode: 'years',  ageYears }   — лет (можно дробно: 1.5)
 *   - { ageMode: 'months', ageMonths }  — месяцев (для малышей < 1 года)
 *   - { ageMode: 'dob',    dob }        — точная дата рождения 'YYYY-MM-DD'
 *
 * Все функции без побочных эффектов и без обращения к API — их легко тестировать.
 * Дату рождения формируем по ЛОКАЛЬНОМУ времени (toLocalISODate), чтобы не было
 * off-by-one в зонах с положительным смещением (МСК +03).
 */
import { toLocalISODate } from '../../utils/date'

/** Безопасный разбор положительного числа (точка/запятая). null если невалидно. */
function parsePositive(value) {
  if (value === '' || value == null) return null
  const n = parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/**
 * Перевести возраст из анкеты в дату рождения 'YYYY-MM-DD' (или null, если не задан).
 * Учитывает три режима. Для месяцев и дробных лет считаем по календарю, а не «×0.5».
 * @param {{ageMode?: string, ageYears?: any, ageMonths?: any, dob?: string, age?: any}} draft
 * @param {Date} [now] — точка отсчёта (для тестов)
 */
export function draftToDateOfBirth(draft = {}, now = new Date()) {
  const mode = draft.ageMode

  if (mode === 'dob') {
    return draft.dob ? toLocalISODate(draft.dob) : null
  }

  if (mode === 'months') {
    const months = parsePositive(draft.ageMonths)
    if (months == null) return null
    const d = new Date(now)
    d.setMonth(d.getMonth() - Math.round(months))
    return toLocalISODate(d)
  }

  // mode === 'years' или legacy-черновик с полем age (годы, возможно дробные).
  const years = parsePositive(mode === 'years' ? draft.ageYears : draft.age)
  if (years == null) return null
  const whole = Math.floor(years)
  const extraMonths = Math.round((years - whole) * 12)
  const d = new Date(now)
  d.setFullYear(d.getFullYear() - whole)
  d.setMonth(d.getMonth() - extraMonths)
  return toLocalISODate(d)
}

/**
 * Возраст в месяцах (для подбора шага веса / порядка пород). null если не задан.
 * @param {object} draft
 * @param {Date} [now]
 */
export function draftAgeMonths(draft = {}, now = new Date()) {
  const mode = draft.ageMode
  if (mode === 'months') return parsePositive(draft.ageMonths)
  if (mode === 'dob') {
    if (!draft.dob) return null
    const born = new Date(draft.dob)
    if (Number.isNaN(born.getTime())) return null
    const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
    return months < 0 ? 0 : months
  }
  const years = parsePositive(mode === 'years' ? draft.ageYears : draft.age)
  return years == null ? null : Math.round(years * 12)
}

/** Есть ли в черновике корректно заданный возраст (для валидации шага). */
export function hasValidAge(draft = {}) {
  return draftToDateOfBirth(draft) != null
}

/** Молодое животное (< 12 мес) — для шага веса 0.05 и «детских» подсказок. */
export function isYoungAnimal(draft = {}) {
  const months = draftAgeMonths(draft)
  return months != null && months < 12
}

/**
 * Шаг поля веса (кг). Для малышей (< 12 мес) и микро-питомцев (< 2 кг) — 0.05,
 * иначе обычные 0.1. Чистая функция: принимает черновик и текущий ввод веса.
 * @param {object} draft
 * @param {any} [weightValue] — текущее значение веса (для микро-пород)
 * @returns {string} '0.05' | '0.1'
 */
export function weightStepFor(draft = {}, weightValue) {
  if (isYoungAnimal(draft)) return '0.05'
  const w = parsePositive(weightValue != null ? weightValue : draft.weight)
  if (w != null && w > 0 && w < 2) return '0.05'
  return '0.1'
}

/** Русская форма слова по числу: pluralRu(2, ['год','года','лет']) → 'года'. */
function pluralRu(n, [one, few, many]) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Человекочитаемая подпись возраста для профиля/чипов ('8 месяцев', '2 года'). */
export function formatAgeLabel(draft = {}) {
  const months = draftAgeMonths(draft)
  if (months == null) return null
  if (months < 12) {
    const m = Math.round(months)
    return `${m} ${pluralRu(m, ['месяц', 'месяца', 'месяцев'])}`
  }
  const years = Math.floor(months / 12)
  return `${years} ${pluralRu(years, ['год', 'года', 'лет'])}`
}
