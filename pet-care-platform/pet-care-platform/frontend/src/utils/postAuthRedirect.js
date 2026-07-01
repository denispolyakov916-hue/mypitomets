/**
 * resolvePostAuthRedirect — куда вести пользователя после успешной авторизации.
 *
 * Приоритет:
 *  1. валидный returnTo из pendingFunnelAction (строгий allowlist — анти-open-redirect);
 *  2. ?redirect=<внутренний путь> из query (единый параметр, который ставят
 *     ProtectedRoute/PrivateRoute и остальные части приложения);
 *  3. location.state.from.pathname (внутренний путь, обратная совместимость);
 *  4. дефолт /pet-id.
 *
 * Это сохраняет обычный сценарий входа (без воронки → /pet-id) и возвращает
 * пользователя на защищённую страницу, с которой его «отбросило» на логин.
 */
import { loadPendingFunnelAction } from './pendingFunnelAction'

// Куда воронка имеет право вернуть пользователя после логина.
const ALLOWED_RETURN_TO = ['/recommendations', '/pet-id', '/shop', '/cart', '/start']

function isInternalPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

// returnTo из хранилища — строгий allowlist (его значение могло быть подменено).
function isAllowedReturnTo(path) {
  if (!isInternalPath(path)) return false
  return ALLOWED_RETURN_TO.includes(path.split(/[?#]/)[0])
}

// Извлекаем ?redirect=<path> из строки query и валидируем как внутренний путь
// (анти-open-redirect: не пускаем абсолютные и протокол-относительные URL).
function readRedirectParam(search) {
  if (typeof search !== 'string' || !search) return null
  try {
    const raw = new URLSearchParams(search).get('redirect')
    if (!raw) return null
    const decoded = decodeURIComponent(raw)
    return isInternalPath(decoded) ? decoded : null
  } catch {
    return null
  }
}

export function resolvePostAuthRedirect({ location } = {}) {
  const pending = loadPendingFunnelAction()
  if (pending && isAllowedReturnTo(pending.returnTo)) return pending.returnTo

  const redirectParam = readRedirectParam(location?.search)
  if (redirectParam) return redirectParam

  const from = location?.state?.from?.pathname
  if (isInternalPath(from)) return from

  return '/pet-id'
}
