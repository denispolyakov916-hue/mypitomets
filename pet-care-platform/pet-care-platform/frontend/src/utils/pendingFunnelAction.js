/**
 * pendingFunnelAction — безопасный мост анонимной воронки и авторизации (этап 1A).
 *
 * На /recommendations при клике по CTA (без авторизации) сохраняем НАМЕРЕНИЕ
 * пользователя + снапшот анкеты и выбранного рациона, чтобы после логина ничего
 * не потерять. Это ТОЛЬКО хранилище: ничего не создаёт (ни питомца, ни корзину) —
 * реальное исполнение действия будет на следующих этапах.
 *
 * Хранится в localStorage (переживает активацию по коду из письма / новую вкладку),
 * с TTL 24 часа и версией схемы.
 */
const KEY = 'pendingFunnelAction'
const VERSION = 1
const TTL_MS = 24 * 60 * 60 * 1000 // 24 часа
const ALLOWED_TYPES = ['save_ration', 'create_pet_profile', 'add_ration_to_cart']

/**
 * Сохранить намерение воронки. Возвращает записанный объект или null.
 * @param {{type: string, returnTo?: string, draft?: object, selectedRation?: object}} action
 */
export function savePendingFunnelAction(action) {
  try {
    if (!action || !ALLOWED_TYPES.includes(action.type)) return null
    const record = { ...action, v: VERSION, createdAt: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify(record))
    return record
  } catch {
    return null
  }
}

/**
 * Прочитать намерение. Невалидное / другой версии / протухшее по TTL — чистится
 * и возвращается null. Защищено от битого JSON.
 */
export function loadPendingFunnelAction() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const rec = JSON.parse(raw)
    if (!rec || rec.v !== VERSION || !ALLOWED_TYPES.includes(rec.type)) {
      clearPendingFunnelAction()
      return null
    }
    const ts = Date.parse(rec.createdAt)
    if (!Number.isFinite(ts) || Date.now() - ts > TTL_MS) {
      clearPendingFunnelAction()
      return null
    }
    return rec
  } catch {
    clearPendingFunnelAction()
    return null
  }
}

/**
 * Дописать поля в уже сохранённое намерение (этап 1B), сохранив v/createdAt/type.
 * Используется для идемпотентности: записываем createdPetId, чтобы повторный
 * запуск не создал второго питомца. Возвращает обновлённый объект или null.
 * @param {object} patch
 */
export function updatePendingFunnelAction(patch) {
  try {
    const rec = loadPendingFunnelAction()
    if (!rec) return null
    const next = { ...rec, ...patch }
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return null
  }
}

export function clearPendingFunnelAction() {
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}
