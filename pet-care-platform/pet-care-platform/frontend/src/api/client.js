/**
 * Конфигурация HTTP клиента Axios
 * 
 * Централизованный API клиент с:
 * - Конфигурацией базового URL
 * - Инъекцией JWT токена через интерцепторы
 * - Обработкой ошибок и трансформацией ответов
 * - Обновлением токена при 401 ошибках
 * 
 * Использование:
 *   import api from './api/client'
 *   const response = await api.get('/pets/')
 *   const data = await api.post('/auth/login/', { email, password })
 */

import axios from 'axios'
// Refresh делаем ИНЛАЙНОМ через локальный api-инстанс (ниже), чтобы не импортировать
// ./auth и не создавать циклическую зависимость client.js ↔ auth.js.

// Базовый URL API - использует прокси из vite.config.js
// Все запросы на /api/* проксируются на localhost:8077
const API_BASE_URL = '/api'

/**
 * Создание экземпляра Axios с конфигурацией по умолчанию
 * 
 * Конфигурация:
 * - baseURL: Префикс API эндпоинтов
 * - timeout: 30 секунд для медленных соединений
 * - headers: JSON content type по умолчанию
 * - withCredentials: true для работы с httpOnly cookie (refresh токен)
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Важно для работы с httpOnly cookie
})

/**
 * Интерцептор запросов
 * 
 * Автоматически добавляет JWT токен в заголовок Authorization
 * для всех исходящих запросов, если токен существует в localStorage.
 * 
 * Формат токена: Bearer <access_token>
 */
api.interceptors.request.use(
  (config) => {
    // Проверяем, что мы в браузере
    if (typeof window !== 'undefined') {
      try {
    const token = localStorage.getItem('access_token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.warn('Ошибка чтения токена из localStorage:', error)
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Интерцептор ответов
 *
 * Обрабатывает:
 * - Успешные ответы: возвращает данные напрямую
 * - 401 ошибки: очищает состояние авторизации и перенаправляет на страницу входа
 * - Другие ошибки: извлекает сообщение об ошибке для отображения
 */
api.interceptors.response.use(
  (response) => {
    // Возвращаем данные напрямую для удобства
    return response.data
  },
  async (error) => {
    // Обработка сетевых ошибок
    if (!error.response) {
      console.error('Сетевая ошибка:', error.message)
      return Promise.reject({
        message: 'Ошибка сети. Проверьте подключение к интернету.',
        isNetworkError: true
      })
    }
    
    const { status, data } = error.response

    // Запрос к интерактивному эндпоинту аутентификации (логин/регистрация/
    // активация/повторная отправка/телефон). Для них 401 — это «неверные данные»,
    // а НЕ «истёкшая сессия»: нельзя ни обновлять токен, ни редиректить/
    // перезагружать страницу, иначе простой неправильный логин уводит в
    // reload-петлю. Исключение — /auth/refresh/: это и есть механизм проверки
    // сессии, его 401 обрабатывается ниже (clear + redirect).
    const requestUrl = error.config?.url || ''
    const isRefreshEndpoint = /(^|\/)auth\/refresh\//.test(requestUrl)
    const isAuthEndpoint = /(^|\/)auth\//.test(requestUrl) && !isRefreshEndpoint

    // Обработка 401 Unauthorized - токен истёк или невалиден
    if (status === 401) {
      // Для эндпоинтов /api/auth/* отдаём inline-ошибку без редиректа и без
      // попытки refresh — пусть форма входа покажет её на месте.
      if (isAuthEndpoint) {
        const authErrorMessage = data?.error
          || data?.message
          || data?.detail
          || 'Неверные данные. Проверьте и попробуйте снова.'
        return Promise.reject({
          status,
          message: authErrorMessage,
          errors: data?.errors || null,
          isNetworkError: false,
        })
      }

      // Анонимный пользователь (токенов нет) на публичной странице дёрнул защищённый
      // эндпоинт — НЕ редиректим на /login. Отдаём ошибку вызвавшему компоненту,
      // он покажет гостевое состояние. Редирект — только при истёкшей сессии (ниже).
      const hasTokens =
        typeof window !== 'undefined' &&
        !!localStorage.getItem('access_token')
      if (!hasTokens) {
        return Promise.reject({
          status,
          message: data?.detail || data?.message || 'Требуется авторизация.',
          isAuthRequired: true,
          isNetworkError: false,
        })
      }

      // Пытаемся обновить токен через refresh
      const originalRequest = error.config
      
      // Избегаем бесконечного цикла при ошибке refresh
      if (originalRequest.url === '/auth/refresh/' || originalRequest._retry) {
        // Очищаем сохранённые токены
        localStorage.removeItem('access_token')
        
        // Перенаправляем на страницу входа, если ещё не там
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?redirect=${redirect}`
        }
        
        return Promise.reject({
          status,
          message: 'Сессия истекла. Пожалуйста, войдите снова.',
          isNetworkError: false
        })
      }
      
      // Пытаемся обновить токен
      originalRequest._retry = true
      
      try {
        // Инлайн refresh через локальный api — refresh-токен берётся из httpOnly-cookie.
        const newTokens = await api.get('/auth/refresh/', { withCredentials: true })

        if (newTokens && newTokens.accessToken) {
          localStorage.setItem('access_token', newTokens.accessToken)
          // Обновляем токен в заголовке и повторяем запрос
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Если refresh не удался, очищаем токены и редиректим
        localStorage.removeItem('access_token')
        
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search)
          window.location.href = `/login?redirect=${redirect}`
        }
        
        return Promise.reject({
          status,
          message: 'Сессия истекла. Пожалуйста, войдите снова.',
          isNetworkError: false
        })
      }
    }
    
    // Извлекаем сообщение об ошибке из ответа
    const errorMessage = data?.error
      || data?.message
      || data?.detail
      || 'Произошла ошибка. Попробуйте позже.'

    return Promise.reject({
      status,
      message: errorMessage,
      errors: data?.errors || null
    })
  }
)

export default api
