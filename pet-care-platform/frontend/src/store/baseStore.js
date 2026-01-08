/**
 * Базовые утилиты для Zustand stores
 * 
 * Предоставляет общие паттерны и функции для всех stores:
 * - Обработка ошибок
 * - Состояния загрузки
 * - Логирование
 */

/**
 * Создает стандартную структуру состояния для store с загрузкой и ошибками
 * 
 * @param {Object} initialState - Начальное состояние store
 * @returns {Object} Расширенное состояние с isLoading и error
 */
export const createBaseState = (initialState = {}) => ({
  isLoading: false,
  error: null,
  ...initialState,
})

/**
 * Обработчик ошибок для async действий в stores
 * 
 * @param {Error} error - Ошибка из API или другого источника
 * @param {Function} setState - Функция set из Zustand store
 * @param {string} defaultMessage - Сообщение по умолчанию
 * @returns {string} Сообщение об ошибке
 */
export const handleStoreError = (error, setState, defaultMessage = 'Произошла ошибка') => {
  console.error('Store error:', error)
  
  // Извлекаем сообщение об ошибке из разных форматов ответа API
  let errorMessage = defaultMessage
  
  if (error.response?.data) {
    const data = error.response.data
    
    // Формат: { error: "message" }
    if (data.error) {
      errorMessage = data.error
    }
    // Формат: { message: "message" }
    else if (data.message) {
      errorMessage = data.message
    }
    // Формат: { errors: { field: ["message"] } }
    else if (data.errors) {
      const errorMessages = Object.values(data.errors).flat()
      errorMessage = errorMessages.join(', ') || defaultMessage
    }
    // Формат: { detail: "message" }
    else if (data.detail) {
      errorMessage = data.detail
    }
  } else if (error.message) {
    errorMessage = error.message
  }
  
  setState({
    isLoading: false,
    error: errorMessage,
  })
  
  return errorMessage
}

/**
 * Создает обертку для async действий с обработкой загрузки и ошибок
 * 
 * @param {Function} asyncAction - Асинхронное действие
 * @param {Function} setState - Функция set из Zustand store
 * @param {string} errorMessage - Сообщение об ошибке по умолчанию
 * @returns {Function} Обернутое действие
 */
export const createAsyncAction = (asyncAction, setState, errorMessage = 'Произошла ошибка') => {
  return async (...args) => {
    setState({ isLoading: true, error: null })
    
    try {
      const result = await asyncAction(...args)
      setState({ isLoading: false, error: null })
      return result
    } catch (error) {
      handleStoreError(error, setState, errorMessage)
      throw error
    }
  }
}

/**
 * Очистка состояния ошибки
 * 
 * @param {Function} setState - Функция set из Zustand store
 */
export const clearError = (setState) => {
  setState({ error: null })
}

/**
 * Селекторы для получения состояния загрузки и ошибок
 */
export const createBaseSelectors = (store) => ({
  isLoading: () => store.getState().isLoading,
  getError: () => store.getState().error,
  hasError: () => !!store.getState().error,
})

