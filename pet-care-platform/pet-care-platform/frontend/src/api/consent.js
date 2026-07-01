/**
 * Запись согласий в журнал сервера (доказуемость).
 * POST /api/consent/ — публичный (в т.ч. для анонимного cookie-баннера).
 */
import api from './client'

/**
 * @param {Object} p
 * @param {Array<{type: string, granted: boolean, meta?: object}>} p.events
 * @param {string} [p.source]
 * @param {string} [p.docVersion]
 */
export const recordConsent = async ({ events, source = 'web', docVersion = '' } = {}) => {
  try {
    return await api.post('/consent/', { events, source, doc_version: docVersion })
  } catch {
    // Запись согласий не должна ломать UX — тихо игнорируем сетевые ошибки.
    return null
  }
}
