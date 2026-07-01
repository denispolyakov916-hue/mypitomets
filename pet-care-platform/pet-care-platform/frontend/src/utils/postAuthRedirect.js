/**
 * resolvePostAuthRedirect — куда вести пользователя после успешной авторизации.
 *
 * Приоритет:
 *  1. валидный returnTo из pendingFunnelAction (строгий allowlist — анти-open-redirect);
 *  2. ?redirect=<внутренний путь> из query (единый параметр, который ставят
 *     ProtectedRoute/PrivateRoute и остальные части приложения);
 *  3. location.state.from.pathname (внутренний путь, обратная совместимость);
 *  4. ролевой дефолт по `user` (кабинет специалиста/маркетолога/админа), иначе /pet-id.
 *
 * Это сохраняет обычный сценарий входа (без воронки → /pet-id), возвращает
 * пользователя на защищённую страницу, с которой его «отбросило» на логин, и
 * ведёт специалиста/маркетолога/админа сразу в его панель.
 *
 * `user` необязателен — без него поведение прежнее (дефолт /pet-id). Права
 * поставщика приходят из SupplierUserAccess (сервер), а не из User.role, поэтому
 * supplier-редирект живёт в SupplierRoute, а не здесь.
 */
import { loadPendingFunnelAction } from './pendingFunnelAction'

// Домашняя панель по роли — куда вести, когда явного пути возврата нет.
function roleHome(user) {
  const role = user?.role
  if (role === 'course_creator') return '/specialist-panel/courses'
  if (role === 'marketing_manager') return '/marketing-panel/content'
  if (user?.is_staff || user?.is_superuser) return '/admin-panel/dashboard'
  return '/pet-id'
}

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

export function resolvePostAuthRedirect({ location, user } = {}) {
  const pending = loadPendingFunnelAction()
  if (pending && isAllowedReturnTo(pending.returnTo)) return pending.returnTo

  const redirectParam = readRedirectParam(location?.search)
  const from = location?.state?.from?.pathname
  const requested = redirectParam || (isInternalPath(from) ? from : null)

  if (requested) {
    // Специалиста/маркетолога не заводим в админ-панель — уводим в их кабинет.
    const role = user?.role
    if (role === 'course_creator' && requested.startsWith('/admin-panel')) {
      return '/specialist-panel/courses'
    }
    if (role === 'marketing_manager' && requested.startsWith('/admin-panel')) {
      return '/marketing-panel/content'
    }
    return requested
  }

  return roleHome(user)
}
