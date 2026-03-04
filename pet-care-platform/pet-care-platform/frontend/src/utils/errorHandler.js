/**
 * Утилиты для обработки ошибок
 * 
 * Предоставляет стандартизированные функции для обработки ошибок:
 * - Извлечение сообщений об ошибках из разных форматов
 * - Логирование ошибок
 * - Отображение уведомлений пользователю
 */

import { useToastStore } from '../store/toastStore'

/**
 * Извлекает сообщение об ошибке из разных форматов ответа API
 * 
 * @param {Error|Object} error - Ошибка из API или другого источника
 * @returns {string} Сообщение об ошибке
 */
export const getErrorMessage = (error) => {
  // Если это строка, возвращаем её
  if (typeof error === 'string') {
    return error
  }

  // Если это объект с message
  if (error?.message) {
    return error.message
  }

  // Если это ответ от API
  if (error?.response?.data) {
    const data = error.response.data

    // Формат: { error: "message" }
    if (data.error) {
      return data.error
    }

    // Формат: { message: "message" }
    if (data.message) {
      return data.message
    }

    // Формат: { detail: "message" }
    if (data.detail) {
      return data.detail
    }

    // Формат: { errors: { field: ["message"] } }
    if (data.errors) {
      const errorMessages = Object.values(data.errors).flat()
      return errorMessages.join(', ') || 'Произошла ошибка валидации'
    }
  }

  // Сетевые ошибки
  if (error?.isNetworkError) {
    return 'Ошибка сети. Проверьте подключение к интернету.'
  }

  // Статус код ошибки
  if (error?.status) {
    const statusMessages = {
      400: 'Некорректный запрос',
      401: 'Требуется авторизация',
      403: 'Доступ запрещен',
      404: 'Ресурс не найден',
      500: 'Внутренняя ошибка сервера',
      502: 'Сервер временно недоступен',
      503: 'Сервис временно недоступен',
    }
    return statusMessages[error.status] || `Ошибка ${error.status}`
  }

  // Сообщение по умолчанию
  return 'Произошла ошибка. Попробуйте позже.'
}

/**
 * Логирует ошибку в консоль (только в dev режиме)
 * 
 * @param {Error|Object} error - Ошибка
 * @param {string} context - Контекст, где произошла ошибка
 */
export const logError = (error, context = '') => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error${context ? ` in ${context}` : ''}]:`, error)
    
    // Логируем детали ошибки
    if (error?.response) {
      console.error('Response:', error.response)
    }
    if (error?.stack) {
      console.error('Stack:', error.stack)
    }
  }
}

/**
 * Обрабатывает ошибку: логирует и показывает уведомление
 * 
 * @param {Error|Object} error - Ошибка
 * @param {string} context - Контекст, где произошла ошибка
 * @param {boolean} showToast - Показывать ли уведомление (по умолчанию true)
 * @returns {string} Сообщение об ошибке
 */
export const handleError = (error, context = '', showToast = true) => {
  const message = getErrorMessage(error)
  
  // Логируем ошибку
  logError(error, context)
  
  // Показываем уведомление
  if (showToast) {
    const { error: showErrorToast } = useToastStore.getState()
    showErrorToast(message)
  }
  
  return message
}

/**
 * Проверяет, является ли ошибка сетевой
 * 
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} True если это сетевая ошибка
 */
export const isNetworkError = (error) => {
  return (
    error?.isNetworkError ||
    !error?.response ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ERR_NETWORK' ||
    error?.message?.includes('Network Error')
  )
}

/**
 * Проверяет, является ли ошибка ошибкой авторизации
 * 
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} True если это ошибка авторизации
 */
export const isAuthError = (error) => {
  return error?.status === 401 || error?.response?.status === 401
}

/**
 * Проверяет, является ли ошибка ошибкой доступа
 * 
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} True если это ошибка доступа
 */
export const isForbiddenError = (error) => {
  return error?.status === 403 || error?.response?.status === 403
}

/**
 * Проверяет, является ли ошибка ошибкой валидации
 * 
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} True если это ошибка валидации
 */
export const isValidationError = (error) => {
  return (
    error?.status === 400 ||
    error?.response?.status === 400 ||
    !!error?.response?.data?.errors
  )
}

