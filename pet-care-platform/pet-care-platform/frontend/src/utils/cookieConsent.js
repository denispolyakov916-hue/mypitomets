/**
 * Хранение выбора пользователя по cookie (согласно документу «Cookie и веб-аналитика»).
 * Обязательные cookie работают всегда; функциональные / аналитические / рекламные —
 * только при согласии. Выбор хранится локально и дублируется в журнал сервера.
 */
export const COOKIE_CONSENT_KEY = 'cookie_consent_v1'
export const COOKIE_CONSENT_VERSION = 'cookie ред. 2026'

export function getCookieConsent() {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCookieConsent(choice) {
  const value = {
    functional: false,
    analytics: false,
    advertising: false,
    ...choice,
    essential: true, // обязательные — всегда
    ts: Date.now(),
    v: COOKIE_CONSENT_VERSION,
  }
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(value))
  } catch {
    /* переполнение/недоступность storage — игнорируем */
  }
  return value
}

/** Дал ли пользователь согласие на аналитические cookie (напр. Яндекс.Метрика). */
export function hasAnalyticsConsent() {
  const c = getCookieConsent()
  return !!(c && c.analytics)
}

/** Дал ли пользователь согласие на рекламные / ретаргетинговые cookie. */
export function hasAdvertisingConsent() {
  const c = getCookieConsent()
  return !!(c && c.advertising)
}
