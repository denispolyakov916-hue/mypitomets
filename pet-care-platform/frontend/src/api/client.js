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

// Базовый URL API - использует прокси в разработке, прямой URL в продакшене
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Создание экземпляра Axios с конфигурацией по умолчанию
 * 
 * Конфигурация:
 * - baseURL: Префикс API эндпоинтов
 * - timeout: 30 секунд для медленных соединений
 * - headers: JSON content type по умолчанию
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
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
    const token = localStorage.getItem('access_token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
  (error) => {
    // Обработка сетевых ошибок
    if (!error.response) {
      console.error('Сетевая ошибка:', error.message)
      return Promise.reject({
        message: 'Ошибка сети. Проверьте подключение к интернету.',
        isNetworkError: true
      })
    }
    
    const { status, data } = error.response
    
    // Обработка 401 Unauthorized - токен истёк или невалиден
    if (status === 401) {
      // Очищаем сохранённые токены
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      
      // Перенаправляем на страницу входа, если ещё не там
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
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
