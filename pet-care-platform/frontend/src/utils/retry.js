/**
 * Утилиты для повторных попыток (retry) запросов
 * 
 * Предоставляет функции для автоматического повторения запросов
 * при сетевых ошибках или временных сбоях сервера.
 */

/**
 * Выполняет функцию с повторными попытками при ошибках
 * 
 * @param {Function} fn - Функция для выполнения
 * @param {Object} options - Опции retry
 * @param {number} options.maxRetries - Максимальное количество попыток (по умолчанию 3)
 * @param {number} options.delay - Задержка между попытками в мс (по умолчанию 1000)
 * @param {Function} options.shouldRetry - Функция для определения, нужно ли повторять (по умолчанию для сетевых ошибок)
 * @param {Function} options.onRetry - Callback при каждой попытке
 * @returns {Promise} Результат выполнения функции
 */
export const retry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = (error) => {
      // Повторяем для сетевых ошибок и 5xx ошибок
      if (!error?.response) return true // Сетевая ошибка
      const status = error.response.status
      return status >= 500 && status < 600 // Серверные ошибки
    },
    onRetry = null,
  } = options

  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Если это последняя попытка или не нужно повторять
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      // Вызываем callback перед повторной попыткой
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, error)
      }

      // Вычисляем задержку с экспоненциальным backoff
      const currentDelay = delay * Math.pow(2, attempt)

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, currentDelay))
    }
  }

  throw lastError
}

/**
 * Создает обертку для axios запросов с retry логикой
 * 
 * @param {Function} axiosRequest - Функция axios запроса
 * @param {Object} retryOptions - Опции retry
 * @returns {Promise} Результат запроса
 */
export const retryRequest = (axiosRequest, retryOptions = {}) => {
  return retry(() => axiosRequest(), retryOptions)
}

/**
 * Проверяет, нужно ли повторять запрос для данной ошибки
 * 
 * @param {Error} error - Ошибка
 * @returns {boolean} True если нужно повторять
 */
export const shouldRetryRequest = (error) => {
  // Сетевые ошибки
  if (!error?.response) {
    return true
  }

  const status = error.response.status

  // Серверные ошибки (5xx)
  if (status >= 500 && status < 600) {
    return true
  }

  // 429 Too Many Requests
  if (status === 429) {
    return true
  }

  // 408 Request Timeout
  if (status === 408) {
    return true
  }

  return false
}

