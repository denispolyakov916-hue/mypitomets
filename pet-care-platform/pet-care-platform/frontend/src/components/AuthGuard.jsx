/**
 * Компонент защиты аутентификации
 *
 * Проверяет валидность токена и перенаправляет на страницу входа
 * если пользователь не аутентифицирован или токен невалиден.
 */

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Компонент защиты аутентификации
 *
 * Автоматически проверяет валидность токена и перенаправляет на страницу входа
 * если пользователь не аутентифицирован или токен невалиден.
 */

/**
 * Компонент AuthGuard
 *
 * Обеспечивает проверку аутентификации для компонентов,
 * которые не защищены PrivateRoute но требуют входа в систему.
 */
function AuthGuard({ children, redirectTo = '/login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const validateToken = useAuthStore(s => s.validateToken)

  useEffect(() => {
    const checkAuth = async () => {
      // Если не аутентифицирован - перенаправляем
      if (!isAuthenticated) {
        navigate(redirectTo, {
          state: { from: location.pathname + location.search },
          replace: true
        })
        return
      }

      // Проверяем валидность токена
      const isValid = await validateToken()
      if (!isValid) {
        navigate(redirectTo, {
          state: { from: location.pathname + location.search },
          replace: true
        })
      }
    }

    checkAuth()
  }, [isAuthenticated, navigate, validateToken, redirectTo, location])

  // Показываем children только если пользователь аутентифицирован
  return isAuthenticated ? children : null
}

export default AuthGuard
