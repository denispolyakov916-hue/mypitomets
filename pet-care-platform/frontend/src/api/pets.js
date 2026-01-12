/**
 * Модуль API питомцев
 *
 * Предоставляет функции для управления питомцами (PetID):
 * - CRUD операции с питомцами
 * - Управление черновиками
 * - Справочник пород
 * - Анализ профилей питомцев
 *
 * Все функции требуют аутентификации кроме справочника пород.
 */

import api from './client'
import { createCrudApi, createReadOnlyApi } from './baseApi'

// Создаем CRUD API клиент для питомцев
const petsApi = createCrudApi('/pets/')

// Создаем клиент для справочника пород (только чтение)
const breedsApi = createReadOnlyApi('/pets/breeds/')

// ===== CRUD ОПЕРАЦИИ С ПИТОМЦАМИ =====

/**
 * Получение всех питомцев текущего пользователя
 *
 * @param {Object} filters - Фильтры для запроса
 * @returns {Promise<Object>} Объект с массивом питомцев и количеством
 *
 * @example
 *   const { data: pets, count } = await getPets({ is_draft: 'false' })
 */
export const getPets = async (filters = {}) => {
  return await petsApi.getList(filters)
}

/**
 * Получение одного питомца по ID
 *
 * @param {number} petId - Уникальный идентификатор питомца
 * @returns {Promise<Object>} Данные питомца
 * @throws {Object} 404 если питомец не найден, 403 если не владелец
 */
export const getPet = async (petId) => {
  return await petsApi.getById(petId)
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
 * @param {string} [petData.behavior_type] - Тип поведения (для персонализации курсов)
 * @param {string} [petData.social_level] - Уровень социализации
 * @param {string} [petData.training_experience] - Опыт дрессировки
 * @param {Array} [petData.special_needs] - Особые потребности
 * @param {Array} [petData.preferred_activities] - Предпочитаемые активности
 * @param {Array} [petData.behavioral_problems] - Поведенческие проблемы
 * @returns {Promise<Object>} Данные созданного питомца
 *
 * @example
 *   const { data } = await createPet({
 *     name: 'Барсик',
 *     species: 'cat',
 *     breed: 'Персидская',
 *     weight: 5.2,
 *     behavior_type: 'calm',
 *     social_level: 'home_only'
 *   })
 */
export const createPet = async (petData) => {
  return await petsApi.create(petData)
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
 *   const { data } = await updatePet(1, { weight: 5.5 })
 */
export const updatePet = async (petId, petData) => {
  return await petsApi.update(petId, petData)
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
  return await petsApi.delete(petId)
}

/**
 * Сохранение черновика питомца
 * 
 * Создаёт или обновляет черновик профиля питомца.
 * Черновики отображаются отдельно от готовых профилей.
 * 
 * @param {Object} draftData - Данные черновика
 * @param {string} [draftId] - ID существующего черновика для обновления
 * @returns {Promise<Object>} Данные сохранённого черновика
 */
export const savePetDraft = async (draftData, draftId = null) => {
  const formData = new FormData()
  
  // Добавляем все поля в FormData
  Object.keys(draftData).forEach(key => {
    if (key === 'photo' && draftData[key] instanceof File) {
      formData.append('photo', draftData[key])
    } else if (key === 'photoPreview') {
      // Пропускаем preview URL
    } else if (Array.isArray(draftData[key])) {
      formData.append(key, JSON.stringify(draftData[key]))
    } else if (draftData[key] !== null && draftData[key] !== undefined) {
      formData.append(key, draftData[key])
    }
  })
  
  // Помечаем как черновик
  formData.append('is_draft', 'true')
  
  if (draftId) {
    return await api.put(`/pets/${draftId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
  return await api.post('/pets/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * Получение черновиков питомцев пользователя
 * 
 * @returns {Promise<Object>} Объект с массивом черновиков
 */
export const getPetDrafts = async () => {
  return await api.get('/pets/?is_draft=true')
}

/**
 * Удаление черновика питомца
 * 
 * @param {string} draftId - ID черновика
 * @returns {Promise<Object>} Сообщение об успехе
 */
export const deletePetDraft = async (draftId) => {
  return await api.delete(`/pets/${draftId}/`)
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

// ===== НОВЫЕ КОНСТАНТЫ ДЛЯ ПЕРСОНАЛИЗАЦИИ КУРСОВ =====

/**
 * Варианты типов поведения для персонализации курсов
 */
export const BEHAVIOR_TYPE_OPTIONS = [
  { value: 'calm', label: 'Спокойный' },
  { value: 'active', label: 'Активный' },
  { value: 'aggressive', label: 'Агрессивный' },
  { value: 'shy', label: 'Трусливый' },
  { value: 'playful', label: 'Игривый' },
]

/**
 * Варианты уровней социализации
 */
export const SOCIAL_LEVEL_OPTIONS = [
  { value: 'home_only', label: 'Только домашний' },
  { value: 'street', label: 'Уличный' },
  { value: 'social', label: 'Социальный' },
  { value: 'mixed', label: 'Смешанный' },
]

/**
 * Варианты опыта дрессировки
 */
export const TRAINING_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'Без опыта' },
  { value: 'basic', label: 'Базовый' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'professional', label: 'Профессиональный' },
]

/**
 * Варианты уровней активности
 */
export const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
]

// ===== API СПРАВОЧНИКА ПОРОД =====

/**
 * Получение списка пород с фильтрацией
 * 
 * @param {Object} params - Параметры фильтрации
 * @param {string} [params.species] - Вид животного (dog, cat)
 * @param {string} [params.search] - Поиск по названию
 * @param {string} [params.order_by] - Сортировка (name, -name, popularity_rank)
 * @param {number} [params.limit] - Лимит результатов (по умолчанию 50)
 * @returns {Promise<Object>} Объект с массивом пород и количеством
 */
export const getBreeds = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.species) queryParams.append('species', params.species)
  if (params.search) queryParams.append('search', params.search)
  if (params.order_by) queryParams.append('order_by', params.order_by)
  if (params.limit) queryParams.append('limit', params.limit)
  
  const queryString = queryParams.toString()
  return await api.get(`/pets/breeds/${queryString ? `?${queryString}` : ''}`)
}

/**
 * Получение детальной информации о породе
 * 
 * @param {string} breedId - UUID породы
 * @returns {Promise<Object>} Полные данные породы
 */
export const getBreed = async (breedId) => {
  return await api.get(`/pets/breeds/${breedId}/`)
}

/**
 * Получение подсказок для автозаполнения PetID на основе породы
 * 
 * @param {string} breedId - UUID породы
 * @returns {Promise<Object>} Подсказки для заполнения профиля
 */
export const getBreedSuggestions = async (breedId) => {
  return await api.get(`/pets/breeds/${breedId}/suggestions/`)
}

/**
 * Получение анализа профиля питомца
 * 
 * @param {string} petId - UUID питомца
 * @returns {Promise<Object>} Анализ здоровья и рекомендации
 */
export const getPetAnalysis = async (petId) => {
  return await api.get(`/pets/${petId}/analysis/`)
}

// ===== ДОПОЛНИТЕЛЬНЫЕ КОНСТАНТЫ =====

/**
 * Варианты размера питомца
 */
export const SIZE_OPTIONS = [
  { value: 'small', label: 'Маленький (до 10 кг)' },
  { value: 'medium', label: 'Средний (10-25 кг)' },
  { value: 'large', label: 'Крупный (более 25 кг)' },
]

/**
 * Варианты типа телосложения
 */
export const BODY_TYPE_OPTIONS = [
  { value: 'slim', label: 'Худой' },
  { value: 'normal', label: 'Нормальный' },
  { value: 'overweight', label: 'Полный' },
  { value: 'obese', label: 'Ожирение' },
]

/**
 * Варианты типа питания
 */
export const DIET_TYPE_OPTIONS = [
  { value: 'dry', label: 'Сухой корм' },
  { value: 'wet', label: 'Влажный корм' },
  { value: 'mixed', label: 'Смешанное' },
  { value: 'raw', label: 'Натуральное (BARF)' },
  { value: 'home', label: 'Домашняя еда' },
]

/**
 * Варианты частоты кормления
 */
export const FEEDING_FREQUENCY_OPTIONS = [
  { value: '1', label: '1 раз в день' },
  { value: '2', label: '2 раза в день' },
  { value: '3', label: '3 раза в день' },
  { value: 'free', label: 'Свободный доступ' },
]

/**
 * Варианты типа жилья
 */
export const HOUSING_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'house', label: 'Частный дом' },
  { value: 'cottage', label: 'Дача/Коттедж' },
  { value: 'other', label: 'Другое' },
]

/**
 * Варианты состояния зубов
 */
export const DENTAL_HEALTH_OPTIONS = [
  { value: 'excellent', label: 'Отличное' },
  { value: 'good', label: 'Хорошее' },
  { value: 'fair', label: 'Удовлетворительное' },
  { value: 'needs_attention', label: 'Требует лечения' },
]

/**
 * Стандартные черты характера
 */
export const CHARACTER_TRAITS = [
  'Дружелюбный', 'Активный', 'Спокойный', 'Игривый', 
  'Застенчивый', 'Любопытный', 'Независимый', 'Ласковый',
  'Упрямый', 'Умный', 'Преданный', 'Общительный'
]

/**
 * Стандартные проблемы здоровья
 */
export const HEALTH_ISSUES_OPTIONS = [
  { value: 'overweight', label: 'Избыточный вес' },
  { value: 'underweight', label: 'Недостаточный вес' },
  { value: 'skin_problems', label: 'Проблемы с кожей/шерстью' },
  { value: 'digestive_issues', label: 'Проблемы с пищеварением' },
  { value: 'joint_problems', label: 'Проблемы с суставами' },
  { value: 'dental_problems', label: 'Проблемы с зубами' },
  { value: 'urinary_problems', label: 'Проблемы с мочеиспусканием' },
  { value: 'allergies', label: 'Аллергия' },
  { value: 'chronic_disease', label: 'Хроническое заболевание' },
  { value: 'none', label: 'Нет проблем со здоровьем' }
]

/**
 * Стандартные аллергии/исключаемые ингредиенты
 */
export const EXCLUDED_INGREDIENTS_OPTIONS = [
  { value: 'chicken', label: 'Курица' },
  { value: 'beef', label: 'Говядина' },
  { value: 'fish', label: 'Рыба' },
  { value: 'lamb', label: 'Баранина' },
  { value: 'pork', label: 'Свинина' },
  { value: 'eggs', label: 'Яйца' },
  { value: 'dairy', label: 'Молочные продукты' },
  { value: 'wheat', label: 'Пшеница/злаки' },
  { value: 'corn', label: 'Кукуруза' },
  { value: 'soy', label: 'Соя' },
  { value: 'artificial_colors', label: 'Искусственные красители' },
  { value: 'artificial_preservatives', label: 'Искусственные консерванты' },
  { value: 'none', label: 'Нет аллергий' }
]

/**
 * Стандартные поведенческие проблемы
 */
export const BEHAVIORAL_PROBLEMS = [
  'Лает/мяукает без причины', 'Грызёт вещи', 'Агрессия к другим животным',
  'Агрессия к людям', 'Страх громких звуков', 'Боязнь одиночества',
  'Метит территорию', 'Не приучен к туалету', 'Тянет поводок',
  'Не слушается команд', 'Прыгает на людей', 'Царапает мебель'
]