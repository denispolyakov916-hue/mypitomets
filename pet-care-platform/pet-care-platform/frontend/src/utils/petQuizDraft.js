/**
 * Черновик анкеты подбора (локальное состояние воронки до сохранения питомца).
 * Хранится в localStorage, чтобы пройти / → /start → /pet-quiz → /recommendations
 * без авторизации. Сохранение реального питомца — отдельный шаг после результата.
 */
const KEY = 'petQuizDraft'

export function loadQuizDraft() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export function saveQuizDraft(patch) {
  try {
    const next = { ...loadQuizDraft(), ...patch }
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return patch
  }
}

export function clearQuizDraft() {
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}
