/**
 * Компонент защищённого маршрута
 *
 * Защищает маршруты, требующие аутентификации
 * (например, /pet-id, /cart, /orders, /health-diary).
 * Неаутентифицированных пользователей перенаправляет на страницу входа,
 * объясняя, зачем нужен вход, и сохраняя путь для возврата.
 *
 * Использование в Router:
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/protected" element={<ProtectedPage />} />
 *   </Route>
 *
 * Использует Outlet для рендеринга вложенных маршрутов.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Компонент PrivateRoute для защищённых страниц
 *
 * Проверяет статус аутентификации из authStore.
 * При отсутствии входа уводит на /login?redirect=<запрошенный путь>
 * (единый query-параметр `redirect`, который читают остальные части приложения)
 * и передаёт через state короткое объяснение для страницы входа.
 *
 * @returns {JSX.Element} Дочерние маршруты или редирект на страницу входа
 */
function PrivateRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    // Сохраняем полный запрошенный путь (с query) для возврата после входа.
    const requestedPath = location.pathname + location.search
    const reason = 'Войдите, чтобы открыть этот раздел.'

    // Единый query-параметр `redirect` (его читают остальные части приложения
    // и resolvePostAuthRedirect) + authMessage — короткое объяснение, которое
    // страница входа уже умеет показывать (state имеет приоритет, query —
    // запасной канал на случай полной перезагрузки).
    const target =
      `/login?redirect=${encodeURIComponent(requestedPath)}` +
      `&authMessage=${encodeURIComponent(reason)}`

    return (
      <Navigate
        to={target}
        state={{
          from: location,
          authMessage: reason,
        }}
        replace
      />
    )
  }

  // Рендерим дочерние маршруты
  return <Outlet />
}

export default PrivateRoute
