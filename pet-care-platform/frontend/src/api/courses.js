/**
 * Модуль API курсов
 * 
 * Предоставляет функции для работы с курсами:
 * - Каталог курсов
 * - Детали курса
 * - Покупка/запись на курс
 * - Курсы пользователя
 * 
 * Каталог публичный, покупки требуют аутентификации.
 */

import api from './client'

/**
 * Получение каталога курсов
 * 
 * Возвращает все доступные курсы с опциональной фильтрацией.
 * Публичный эндпоинт - аутентификация не требуется.
 * 
 * @param {Object} [filters] - Опциональные фильтры
 * @param {string} [filters.pet_type] - Фильтр по типу животного ('dog', 'cat', 'all')
 * @param {string} [filters.category] - Фильтр по категории
 * @param {string} [filters.subcategory] - Фильтр по подкатегории
 * @param {string} [filters.level] - Фильтр по уровню сложности
 * @param {string} [filters.format_type] - Фильтр по формату обучения
 * @param {string} [filters.personal] - Персональная подборка ('true')
 * @param {string} [filters.min_price] - Минимальная цена
 * @param {string} [filters.max_price] - Максимальная цена
 * @returns {Promise<Object>} Массив курсов и количество
 */
export const getCourses = async (filters = {}) => {
  const params = new URLSearchParams()
  
  // Добавляем только непустые фильтры
  const filterKeys = ['pet_type', 'pet_id', 'category', 'subcategory', 'level', 'format_type', 'personal', 'price_type', 'min_price', 'max_price', 'search', 'page', 'per_page']
  
  filterKeys.forEach(key => {
    if (filters[key]) {
      params.append(key, filters[key])
    }
  })
  
  const queryString = params.toString()
  const url = queryString ? `/courses/?${queryString}` : '/courses/'
  
  return await api.get(url)
}

/**
 * Получение деталей одного курса
 * 
 * Если пользователь авторизован, также возвращает статус владения.
 * 
 * @param {number} courseId - Уникальный идентификатор курса
 * @returns {Promise<Object>} Данные курса и флаг is_owned
 */
export const getCourse = async (courseId) => {
  return await api.get(`/courses/${courseId}/`)
}

/**
 * Получение информации для оформления курса
 * 
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Детальная информация о курсе для checkout
 */
export const getCourseCheckout = async (courseId) => {
  return await api.get(`/courses/${courseId}/checkout/`)
}

/**
 * Покупка курса с согласием с дисклеймером
 * 
 * Для бесплатных курсов: немедленная запись
 * Для платных курсов: имитация покупки (MVP)
 * 
 * @param {number} courseId - Курс для покупки
 * @param {boolean} disclaimerAccepted - Согласие с дисклеймером
 * @returns {Promise<Object>} Сообщение об успехе и данные курса
 * @throws {Object} Ошибка если курс уже куплен
 */
export const purchaseCourse = async (courseId, disclaimerAccepted = false) => {
  return await api.post(`/courses/${courseId}/purchase/`, {
    disclaimer_accepted: disclaimerAccepted
  })
}

/**
 * Получение курсов пользователя
 * 
 * Возвращает все курсы, к которым пользователь имеет доступ.
 * Требует аутентификации.
 * 
 * @returns {Promise<Object>} Массив курсов с информацией о прогрессе
 */
export const getUserCourses = async () => {
  return await api.get('/courses/my/')
}
