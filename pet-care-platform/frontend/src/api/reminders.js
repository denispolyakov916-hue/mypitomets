/**
 * API для работы с напоминаниями
 */

import { createCrudApi } from './baseApi'

const remindersApi = createCrudApi('/pets/reminders/')

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
  return await remindersApi.getList(params)
}

/**
 * Создать новое напоминание
 * 
 * @param {Object} data - Данные напоминания
 * @returns {Promise<Object>} Созданное напоминание
 */
export const createReminder = async (data) => {
  return await remindersApi.create(data)
}

/**
 * Получить детали напоминания
 * 
 * @param {string} reminderId - ID напоминания
 * @returns {Promise<Object>} Напоминание
 */
export const getReminder = async (reminderId) => {
  return await remindersApi.getById(reminderId)
}

/**
 * Обновить напоминание
 * 
 * @param {string} reminderId - ID напоминания
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>} Обновлённое напоминание
 */
export const updateReminder = async (reminderId, data) => {
  return await remindersApi.update(reminderId, data)
}

/**
 * Удалить напоминание
 * 
 * @param {string} reminderId - ID напоминания
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteReminder = async (reminderId) => {
  return await remindersApi.delete(reminderId)
}

/**
 * Отметить напоминание как выполненное
 * 
 * @param {string} reminderId - ID напоминания
 * @returns {Promise<Object>} Обновлённое напоминание
 */
export const completeReminder = async (reminderId) => {
  return await remindersApi.performAction(reminderId, 'complete')
}

/**
 * Получить категории и частоты напоминаний
 * 
 * @returns {Promise<Object>} Объект с категориями и частотами
 */
export const getReminderCategories = async () => {
  return await remindersApi.performAction(null, 'categories', {}, 'get')
}

/**
 * Получить предстоящие напоминания (для виджета)
 * 
 * @param {number} [limit=5] - Количество напоминаний
 * @returns {Promise<Object>} Предстоящие напоминания
 */
export const getUpcomingReminders = async (limit = 5) => {
  return await remindersApi.performAction(null, 'upcoming', { params: { limit } }, 'get')
}
