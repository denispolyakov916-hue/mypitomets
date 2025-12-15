/**
 * Модуль API питомцев
 * 
 * Предоставляет функции для управления питомцами (PetID):
 * - Получение всех питомцев пользователя
 * - Получение деталей одного питомца
 * - Создание нового питомца
 * - Обновление питомца
 * - Удаление питомца
 * 
 * Все функции требуют аутентификации.
 */

import api from './client'

/**
 * Получение всех питомцев текущего пользователя
 * 
 * @returns {Promise<Object>} Объект с массивом питомцев и количеством
 * 
 * @example
 *   const { pets, count } = await getPets()
 */
export const getPets = async () => {
  return await api.get('/pets/')
}

/**
 * Получение одного питомца по ID
 * 
 * @param {number} petId - Уникальный идентификатор питомца
 * @returns {Promise<Object>} Данные питомца
 * @throws {Object} 404 если питомец не найден, 403 если не владелец
 */
export const getPet = async (petId) => {
  return await api.get(`/pets/${petId}/`)
}

/**
 * Создание нового профиля питомца
 * 
 * @param {Object} petData - Информация о питомце
 * @param {string} petData.name - Кличка питомца (обязательно)
 * @param {string} petData.species - Вид животного (обязательно)
 * @param {string} [petData.breed] - Порода
 * @param {string} [petData.date_of_birth] - Дата рождения (YYYY-MM-DD)
 * @param {number} [petData.weight] - Вес в кг
 * @returns {Promise<Object>} Данные созданного питомца
 * 
 * @example
 *   const { pet } = await createPet({
 *     name: 'Барсик',
 *     species: 'cat',
 *     breed: 'Персидская',
 *     weight: 5.2
 *   })
 */
export const createPet = async (petData) => {
  return await api.post('/pets/', petData)
}

/**
 * Обновление существующего питомца
 * 
 * Поддерживает частичное обновление - изменяются только предоставленные поля.
 * 
 * @param {number} petId - Уникальный идентификатор питомца
 * @param {Object} petData - Поля для обновления
 * @returns {Promise<Object>} Данные обновлённого питомца
 * @throws {Object} 403 если не владелец, 404 если не найден
 * 
 * @example
 *   const { pet } = await updatePet(1, { weight: 5.5 })
 */
export const updatePet = async (petId, petData) => {
  return await api.put(`/pets/${petId}/`, petData)
}

/**
 * Удаление профиля питомца
 * 
 * Необратимо удаляет питомца. Действие нельзя отменить.
 * 
 * @param {number} petId - Уникальный идентификатор питомца
 * @returns {Promise<Object>} Сообщение об успехе
 * @throws {Object} 403 если не владелец, 404 если не найден
 */
export const deletePet = async (petId) => {
  return await api.delete(`/pets/${petId}/`)
}

/**
 * Доступные варианты видов животных для формы создания питомца
 * 
 * Соответствует SPECIES_CHOICES на бэкенде для консистентности.
 */
export const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Собака' },
  { value: 'cat', label: 'Кошка' },
  { value: 'bird', label: 'Птица' },
  { value: 'rodent', label: 'Грызун' },
  { value: 'fish', label: 'Рыбка' },
  { value: 'reptile', label: 'Рептилия' },
  { value: 'other', label: 'Другое' },
]
