/**
 * Компонент защищённого маршрута
 * 
 * Защищает маршруты, требующие аутентификации.
 * Перенаправляет неаутентифицированных пользователей на страницу входа.
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
 * Сохраняет запрошенный URL для перенаправления после входа.
 * 
 * @returns {JSX.Element} Дочерние маршруты или редирект на страницу входа
 */
function PrivateRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()
  
  // Если не аутентифицирован, перенаправляем на вход
  // Сохраняем текущий location для редиректа после входа
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  // Рендерим дочерние маршруты
  return <Outlet />
}

export default PrivateRoute
