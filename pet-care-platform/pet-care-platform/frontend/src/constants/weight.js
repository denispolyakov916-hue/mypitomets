/**
 * История веса (MVP через CalendarEvent) — единый источник правды формата.
 *
 * ВНИМАНИЕ: это ВРЕМЕННОЕ MVP-решение. Вес пишется как обычное событие дневника
 * (event_type='other') с распознаваемым заголовком `Вес: X кг`. Число хранится
 * в `title`, потому что списочный сериализатор backend НЕ возвращает description/notes
 * — иначе ленту веса нельзя было бы построить без N+1 запросов.
 *
 * TODO(backend): заменить на нормальную модель PetWeightRecord
 *   (pet, weight_kg, date, note) + endpoints list/create/delete и серверной
 *   валидацией числа/единицы. Тогда этот файл и парсинг title уйдут.
 */

import { Scale } from 'lucide-react'

/** Тип события дневника, под которым живёт запись веса (без миграции backend). */
export const WEIGHT_EVENT_TYPE = 'other'

/** Разумные диапазоны веса (кг) для клиентской валидации. Совпадают с backend validate_weight.
 * Минимум 0.3 кг — общий нижний порог форм PetID (новорождённые/мелкие питомцы),
 * чтобы общий валидатор не отклонял уже существующие корректные значения. */
export const WEIGHT_RANGES = {
  cat: { min: 0.3, max: 20 },
  dog: { min: 0.3, max: 100 },
  default: { min: 0.3, max: 100 },
}

/** Строгий разбор заголовка `Вес: X кг` (поддержка точки и запятой, до 2 знаков). */
export const WEIGHT_TITLE_REGEX = /^Вес:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*кг$/

/** Диапазон по виду питомца. */
export function weightRangeForSpecies(species) {
  return WEIGHT_RANGES[species] || WEIGHT_RANGES.default
}

/** Округление до 2 знаков без хвостовых нулей: 5 → '5', 5.2 → '5.2', 5.25 → '5.25'. */
export function formatWeightNumber(value) {
  const rounded = Math.round(Number(value) * 100) / 100
  return String(rounded)
}

/** Число → заголовок события: 5.2 → 'Вес: 5.2 кг'. */
export function formatWeightTitle(value) {
  return `Вес: ${formatWeightNumber(value)} кг`
}

/** Отображение для UI с локалью: 5.2 → '5,2 кг'. */
export function formatWeightDisplay(value) {
  const rounded = Math.round(Number(value) * 100) / 100
  return `${rounded.toLocaleString('ru-RU')} кг`
}

/**
 * Нормализация и валидация ввода веса.
 * @returns {{ ok: boolean, value?: number, error?: string }}
 */
export function validateWeightInput(raw, species) {
  const str = String(raw == null ? '' : raw).trim().replace(',', '.')
  if (!str) return { ok: false, error: 'Введите вес' }
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(str)) {
    return { ok: false, error: 'Только число, до 2 знаков после запятой' }
  }
  const value = parseFloat(str)
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'Введите корректный вес' }
  }
  const { min, max } = weightRangeForSpecies(species)
  if (value < min || value > max) {
    return { ok: false, error: `Вес вне диапазона (${min}–${max} кг)` }
  }
  return { ok: true, value }
}

/**
 * Распознать запись веса в событии. Работает с обеими формами:
 *   - backend-список: { id, event_type, start_date, title }
 *   - адаптер дневника: { id, type, date, title, description }
 * @returns {{ eventId, weight, date, note } | null} — null, если это НЕ запись веса.
 */
export function parseWeightFromEvent(event) {
  if (!event) return null
  const type = event.type != null ? event.type : event.event_type
  if (type !== WEIGHT_EVENT_TYPE) return null
  const match = WEIGHT_TITLE_REGEX.exec(event.title || '')
  if (!match) return null
  const weight = parseFloat(match[1].replace(',', '.'))
  if (!Number.isFinite(weight)) return null
  return {
    eventId: event.id,
    weight,
    date: event.date != null ? event.date : event.start_date,
    note: event.description || event.notes || '',
  }
}

/** Является ли событие записью веса. */
export const isWeightEvent = (event) => parseWeightFromEvent(event) !== null

/** Псевдо-meta для рендера записи веса в дневнике (как getEventTypeMeta, но для «Взвешивания»). */
export const WEIGHT_META = {
  icon: Scale,
  label: 'Взвешивание',
  shortLabel: 'Взвешивание',
  color: '#0284c7',
  bgColor: '#e0f2fe',
  tint: 'bg-sky-50 text-sky-600',
}
