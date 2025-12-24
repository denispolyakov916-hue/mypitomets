/**
 * API для работы с напоминаниями
 */

import api from './client'

/**
 * Получить список напоминаний пользователя
 * 
 * @param {Object} params - Параметры фильтрации
 * @param {string} [params.pet_id] - ID питомца для фильтрации
 * @param {string} [params.category] - Категория напоминаний
 * @param {boolean} [params.show_completed] - Показывать выполненные
 * @param {boolean} [params.upcoming_only] - Только предстоящие
 * @returns {Promise<Object>} Объект с напоминаниями по группам
 */
export const getReminders = async (params = {}) => {
  const queryParams = new URLSearchParams()
  
  if (params.pet_id) queryParams.append('pet_id', params.pet_id)
  if (params.category) queryParams.append('category', params.category)
  if (params.show_completed) queryParams.append('show_completed', 'true')
  if (params.upcoming_only) queryParams.append('upcoming_only', 'true')
  
  const queryString = queryParams.toString()
  const url = `/pets/reminders/${queryString ? `?${queryString}` : ''}`
  
  return await api.get(url)
}

/**
 * Создать новое напоминание
 * 
 * @param {Object} data - Данные напоминания
 * @returns {Promise<Object>} Созданное напоминание
 */
export const createReminder = async (data) => {
  return await api.post('/pets/reminders/', data)
}

/**
 * Получить детали напоминания
 * 
 * @param {string} reminderId - ID напоминания
 * @returns {Promise<Object>} Напоминание
 */
export const getReminder = async (reminderId) => {
  return await api.get(`/pets/reminders/${reminderId}/`)
}

/**
 * Обновить напоминание
 * 
 * @param {string} reminderId - ID напоминания
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>} Обновлённое напоминание
 */
export const updateReminder = async (reminderId, data) => {
  return await api.put(`/pets/reminders/${reminderId}/`, data)
}

/**
 * Удалить напоминание
 * 
 * @param {string} reminderId - ID напоминания
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteReminder = async (reminderId) => {
  return await api.delete(`/pets/reminders/${reminderId}/`)
}

/**
 * Отметить напоминание как выполненное
 * 
 * @param {string} reminderId - ID напоминания
 * @returns {Promise<Object>} Обновлённое напоминание
 */
export const completeReminder = async (reminderId) => {
  return await api.post(`/pets/reminders/${reminderId}/complete/`)
}

/**
 * Получить категории и частоты напоминаний
 * 
 * @returns {Promise<Object>} Объект с категориями и частотами
 */
export const getReminderCategories = async () => {
  return await api.get('/pets/reminders/categories/')
}

/**
 * Получить предстоящие напоминания (для виджета)
 * 
 * @param {number} [limit=5] - Количество напоминаний
 * @returns {Promise<Object>} Предстоящие напоминания
 */
export const getUpcomingReminders = async (limit = 5) => {
  return await api.get(`/pets/reminders/upcoming/?limit=${limit}`)
}

