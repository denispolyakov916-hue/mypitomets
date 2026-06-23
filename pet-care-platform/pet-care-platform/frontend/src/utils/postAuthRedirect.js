/**
 * resolvePostAuthRedirect — куда вести пользователя после успешной авторизации.
 *
 * Приоритет:
 *  1. валидный returnTo из pendingFunnelAction (строгий allowlist — анти-open-redirect);
 *  2. location.state.from.pathname (внутренний путь, выставляется PrivateRoute);
 *  3. дефолт /pet-id.
 *
 * Это сохраняет обычный сценарий входа (без воронки → /pet-id) и не ломает
 * возврат на защищённую страницу, с которой пользователя «отбросило».
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

export function resolvePostAuthRedirect({ location } = {}) {
  const pending = loadPendingFunnelAction()
  if (pending && isAllowedReturnTo(pending.returnTo)) return pending.returnTo

  const from = location?.state?.from?.pathname
  if (isInternalPath(from)) return from

  return '/pet-id'
}
