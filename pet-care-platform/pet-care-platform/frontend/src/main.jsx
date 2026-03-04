/**
 * Точка входа приложения
 * 
 * Этот файл инициализирует React-приложение:
 * - Импортирует глобальные стили
 * - Загружает профиль пользователя при наличии токена
 * - Рендерит корневой компонент App
 * - Оборачивает приложение в BrowserRouter для маршрутизации
 */

import React, { useEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import { useAuthStore } from './store/authStore'
import { apiCache } from './utils/apiCache'
import './index.css'

// Глобальная функция для отладки кэша (можно вызвать в консоли браузера)
if (typeof window !== 'undefined') {
  window.apiCacheStats = () => apiCache.logStats()
  window.apiCacheClear = () => apiCache.clear()
}

/**
 * Компонент инициализации приложения
 * 
 * Загружает профиль пользователя при старте если есть токен.
 * Это необходимо для корректной проверки прав (is_staff) в AdminRoute.
 */
function AppInitializer({ children }) {
  const [isInitializing, setIsInitializing] = useState(true)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
  const { validateToken, startTokenValidation } = useAuthStore()
  const hasInitialized = React.useRef(false)

  useEffect(() => {
    // Защита от повторного вызова
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initializeApp = async () => {
      // Проверяем наличие токена в localStorage (для случая refresh страницы)
      const hasToken = typeof window !== 'undefined' && 
        (localStorage.getItem('access_token') || localStorage.getItem('refresh_token'))
      
      // Если есть токен, но нет данных пользователя - валидируем токен (он загрузит профиль)
      if (hasToken && !user) {
        try {
          // Валидируем токен (он загрузит профиль)
          const isValid = await validateToken()
          
          if (isValid) {
            // Запускаем периодическую проверку токена
            startTokenValidation()
          }
        } catch (error) {
          console.warn('Failed to initialize auth:', error)
          // Ошибка не критична - пользователь просто будет не авторизован
        }
      } else if (isAuthenticated && user) {
        // Если уже есть и токен и пользователь - запускаем проверку
        startTokenValidation()
      }
      
      setIsInitializing(false)
    }

    initializeApp()
  }, []) // Запускаем только один раз при монтировании

  // Показываем минимальный загрузчик при инициализации
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Загрузка...</p>
        </div>
      </div>
    )
  }

  return children
}

/**
 * Компонент-обёртка для инициализации приложения
 */
function AppWrapper() {
  return (
    <AppInitializer>
      <App />
    </AppInitializer>
  )
}

// Создание корня и рендеринг приложения
// StrictMode отключаем в dev режиме для предотвращения двойного рендера
const isProduction = import.meta.env.PROD

ReactDOM.createRoot(document.getElementById('root')).render(
  isProduction ? (
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <MotionConfig reducedMotion="user">
            <ScrollToTop />
            <AppWrapper />
          </MotionConfig>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  ) : (
    <ErrorBoundary>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <ScrollToTop />
          <AppWrapper />
        </MotionConfig>
      </BrowserRouter>
    </ErrorBoundary>
  )
)
