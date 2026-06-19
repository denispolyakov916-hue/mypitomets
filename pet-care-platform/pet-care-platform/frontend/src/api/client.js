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
import { refreshToken } from './auth'

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
    // Логирование запросов для отладки
    if (config.url && config.url.includes('/auth/login')) {
      console.log('[API Request] Login request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      })
    }
    
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
    // Логирование ответов для отладки
    if (response.config.url && response.config.url.includes('/auth/login')) {
      console.log('[API Response] Login response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      })
    }
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
    
    // Логирование ошибок для отладки
    if (error.config.url && error.config.url.includes('/auth/login')) {
      console.error('[API Error] Login error:', {
        status: status,
        data: data,
        config: error.config,
        message: error.message
      })
    }
    
    // Обработка 401 Unauthorized - токен истёк или невалиден
    if (status === 401) {
      // Анонимный пользователь (токенов нет) на публичной странице дёрнул защищённый
      // эндпоинт — НЕ редиректим на /login. Отдаём ошибку вызвавшему компоненту,
      // он покажет гостевое состояние. Редирект — только при истёкшей сессии (ниже).
      const hasTokens =
        typeof window !== 'undefined' &&
        !!(localStorage.getItem('access_token') || localStorage.getItem('refresh_token'))
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
          window.location.href = '/login'
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
        const newTokens = await refreshToken()
        
        if (newTokens && newTokens.accessToken) {
          // Обновляем токен в заголовке и повторяем запрос
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Если refresh не удался, очищаем токены и редиректим
        localStorage.removeItem('access_token')
        
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
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
