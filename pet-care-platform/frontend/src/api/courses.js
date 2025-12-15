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
 * Возвращает все доступные курсы.
 * Публичный эндпоинт - аутентификация не требуется.
 * 
 * @param {Object} [filters] - Опциональные фильтры
 * @param {string} [filters.pet_type] - Фильтр по типу животного
 * @returns {Promise<Object>} Массив курсов и количество
 */
export const getCourses = async (filters = {}) => {
  const params = new URLSearchParams()
  
  if (filters.pet_type) {
    params.append('pet_type', filters.pet_type)
  }
  
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
 * Покупка или запись на курс
 * 
 * Для бесплатных курсов: немедленная запись
 * Для платных курсов: имитация покупки (MVP)
 * 
 * @param {number} courseId - Курс для покупки
 * @returns {Promise<Object>} Сообщение об успехе и данные курса
 * @throws {Object} Ошибка если курс уже куплен
 */
export const purchaseCourse = async (courseId) => {
  return await api.post(`/courses/${courseId}/purchase/`)
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
