/**
 * Разовая миграция событий «Дневника здоровья» из localStorage в backend CalendarEvent.
 *
 * Принципы (Шаг 1.3):
 *  - переносим ТОЛЬКО реальные пользовательские записи (числовой id = Date.now());
 *  - демо-события (id с префиксами birthday_/vaccine_/vet_/grooming_/past_vet_ и пр.) НЕ переносим;
 *  - дедуп по (event_type | start_date | title) против уже существующих backend-событий;
 *  - флаг calendar_migrated_{petId} ставим только если ничего не упало (повтор безопасен — дедуп);
 *  - localStorage НЕ удаляем (нужен лишь как одноразовый источник импорта).
 */

import {
  getPetCalendarEvents,
  createCalendarEvent,
  completeCalendarEvent,
} from '../api/calendar'
import { mapLegacyEventType } from '../constants/eventTypes'

const STORE_PREFIX = 'calendar_events_'
const MIGRATED_PREFIX = 'calendar_migrated_'

// Защита от параллельного запуска миграции одного и того же питомца (быстрое переключение).
const inFlight = new Set()

/** Реальное пользовательское событие — с числовым id (Date.now()). Демо имеют префиксные id. */
function isRealUserEvent(ev) {
  return ev && typeof ev.id !== 'undefined' && /^\d+$/.test(String(ev.id))
}

/** Любая дата → 'YYYY-MM-DD' (локальная). */
function toDateStr(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function setFlag(petId) {
  try { localStorage.setItem(`${MIGRATED_PREFIX}${petId}`, 'true') } catch { /* noop */ }
}

/**
 * Выполнить миграцию для питомца. Идемпотентно.
 * @returns {Promise<{migrated:number, skipped:number, failed:number, alreadyDone?:boolean}>}
 */
export async function migrateDiaryEventsToBackend(petId) {
  if (!petId) return { migrated: 0, skipped: 0, failed: 0, alreadyDone: true }
  const lockKey = String(petId)
  if (inFlight.has(lockKey)) return { migrated: 0, skipped: 0, failed: 0, inFlight: true }
  inFlight.add(lockKey)
  try {
  let alreadyMigrated = false
  try { alreadyMigrated = localStorage.getItem(`${MIGRATED_PREFIX}${petId}`) === 'true' } catch { /* noop */ }
  if (alreadyMigrated) return { migrated: 0, skipped: 0, failed: 0, alreadyDone: true }

  let raw = null
  try { raw = localStorage.getItem(`${STORE_PREFIX}${petId}`) } catch { raw = null }
  if (!raw) { setFlag(petId); return { migrated: 0, skipped: 0, failed: 0 } }

  let stored = []
  try { stored = JSON.parse(raw) } catch { stored = [] }
  const real = (Array.isArray(stored) ? stored : []).filter(isRealUserEvent)
  if (real.length === 0) { setFlag(petId); return { migrated: 0, skipped: 0, failed: 0 } }

  // Дедуп против уже существующих backend-событий питомца.
  let existing = []
  try {
    const data = await getPetCalendarEvents(petId)
    existing = (data && data.events) || []
  } catch { existing = [] }
  const seen = new Set(
    existing.map((e) => `${e.event_type}|${e.start_date}|${String(e.title || '').trim()}`)
  )

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const ev of real) {
    const startDate = toDateStr(ev.date)
    if (!startDate) { skipped += 1; continue }
    const eventType = mapLegacyEventType(ev.type)
    const title = String(ev.title || '').trim() || 'Событие'
    const key = `${eventType}|${startDate}|${title}`
    if (seen.has(key)) { skipped += 1; continue }

    try {
      const res = await createCalendarEvent({
        pet: petId,
        title,
        event_type: eventType,
        start_date: startDate,
        description: String(ev.description || '').trim(),
      })
      const created = res && res.event
      if (ev.completed && created && created.id) {
        try { await completeCalendarEvent(created.id) } catch { /* статус не критичен */ }
      }
      seen.add(key)
      migrated += 1
    } catch {
      failed += 1
    }
  }

  if (failed === 0) setFlag(petId)
  return { migrated, skipped, failed }
  } finally {
    inFlight.delete(lockKey)
  }
}
