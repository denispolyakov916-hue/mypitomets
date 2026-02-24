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
  // Проверяем, есть ли файл для загрузки
  const hasFile = petData.photo instanceof File

  if (hasFile) {
    // С файлом используем FormData
    const formData = new FormData()

    Object.keys(petData).forEach(key => {
      const value = petData[key]
      if (value === null || value === undefined) return

      if (key === 'photo' && value instanceof File) {
        formData.append('photo', value)
        return
      }

      // Boolean значения нужно явно преобразовать в строку
      if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false')
        return
      }

      // Числа преобразуем в строку
      if (typeof value === 'number') {
        formData.append(key, String(value))
        return
      }

      if (Array.isArray(value) || typeof value === 'object') {
        formData.append(key, JSON.stringify(value))
        return
      }

      formData.append(key, value)
    })

    return await api.post('/pets/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  } else {
    // Без файла отправляем JSON (лучше типизация)
    const jsonData = {}
    Object.keys(petData).forEach(key => {
      const value = petData[key]
      if (value === null || value === undefined) return
      if (key === 'photo') return // Пропускаем пустое фото
      jsonData[key] = value
    })

    return await api.post('/pets/', jsonData)
  }
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
 * Частичное обновление профиля питомца
 *
 * Используется для сохранения прогресса без потери уже заполненных данных.
 *
 * @param {number|string} petId
 * @param {Object} petData
 * @returns {Promise<Object>}
 */
export const updatePetPartial = async (petId, petData) => {
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
 * По документации Integration_PetID: только dog и cat
 */
export const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Собака', icon: '🐕' },
  { value: 'cat', label: 'Кошка', icon: '🐈' },
]

/**
 * Варианты пола питомца (обязательное поле)
 */
export const SEX_OPTIONS = [
  { value: 'male', label: 'Самец', icon: '♂️' },
  { value: 'female', label: 'Самка', icon: '♀️' },
]

// =============================================================================
// КОНСТАНТЫ ПО ДОКУМЕНТАЦИИ Integration_PetID_Breeds_Calculator.md
// =============================================================================

/**
 * Варианты темперамента (заменяет behavior_type)
 */
export const TEMPERAMENT_OPTIONS = [
  { value: 'calm', label: 'Спокойный' },
  { value: 'balanced', label: 'Уравновешенный' },
  { value: 'active', label: 'Активный' },
  { value: 'hyperactive', label: 'Гиперактивный' },
]

/**
 * Варианты уровней социализации (обновлено по документации)
 */
export const SOCIAL_LEVEL_OPTIONS = [
  { value: 'antisocial', label: 'Избегает контактов' },
  { value: 'reserved', label: 'Сдержанный' },
  { value: 'friendly', label: 'Дружелюбный' },
  { value: 'very_social', label: 'Очень общительный' },
]

/**
 * Варианты уровней активности (5 значений по документации)
 */
export const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'very_low', label: 'Очень низкая', description: 'Минимум движения' },
  { value: 'low', label: 'Низкая', description: 'Короткие прогулки' },
  { value: 'moderate', label: 'Умеренная', description: 'Стандартные прогулки' },
  { value: 'high', label: 'Высокая', description: 'Активные игры, бег' },
  { value: 'very_high', label: 'Очень высокая', description: 'Спорт, охота' },
]

// ===== API ДЛЯ РАБОТЫ С ПОРОДАМИ =====

/**
 * Получение списка пород с фильтрацией
 * 
 * @param {Object} params - Параметры фильтрации
 * @param {string} [params.species] - Вид животного (dog/cat)
 * @param {string} [params.search] - Поиск по названию
 * @param {string} [params.size] - Размер (tiny/small/medium/large/giant)
 * @param {string} [params.order_by] - Сортировка (name, -name, popularity_rank)
 * @param {number} [params.limit] - Лимит результатов (по умолчанию 50)
 * @returns {Promise<Object>} Объект с массивом пород и количеством
 */
export const getBreeds = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.species) queryParams.append('species', params.species)
  if (params.search) queryParams.append('search', params.search)
  if (params.size) queryParams.append('size', params.size)
  if (params.order_by) queryParams.append('order_by', params.order_by)
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.popular_only) queryParams.append('popular_only', 'true')
  if (params.age_months) queryParams.append('age_months', params.age_months)
  
  const queryString = queryParams.toString()
  return await api.get(`/pets/breeds/${queryString ? '?' + queryString : ''}`)
}

/**
 * Получение информации о породе по slug
 * 
 * @param {string} slug - URL-имя породы
 * @returns {Promise<Object>} Детальная информация о породе
 */
export const getBreedBySlug = async (slug) => {
  return await api.get(`/pets/breeds/${slug}/`)
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
 * Получение сравнения параметров питомца с эталоном породы
 * 
 * @param {string} petId - ID питомца
 * @returns {Promise<Object>} Анализ параметров и рекомендации
 */
export const getPetBreedComparison = async (petId) => {
  return await api.get(`/pets/${petId}/breed-comparison/`)
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

// ===== СПРАВОЧНИКИ ЗДОРОВЬЯ (v1) =====

export const getHealthConditions = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.species) queryParams.append('species', params.species)
  if (params.category) queryParams.append('category', params.category)
  if (params.priority) queryParams.append('priority', params.priority)
  const queryString = queryParams.toString()
  return await api.get(`/v1/nutrition/conditions/${queryString ? '?' + queryString : ''}`)
}

export const getAllergies = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.animal_type) queryParams.append('animal_type', params.animal_type)
  if (params.allergen_type) queryParams.append('allergen_type', params.allergen_type)
  if (params.search) queryParams.append('search', params.search)
  const queryString = queryParams.toString()
  return await api.get(`/v1/nutrition/allergies/${queryString ? '?' + queryString : ''}`)
}

export const getVaccines = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.species) queryParams.append('species', params.species)
  const queryString = queryParams.toString()
  return await api.get(`/pets/vaccines/${queryString ? '?' + queryString : ''}`)
}

export const getMedications = async (params = {}) => {
  const queryParams = new URLSearchParams()
  if (params.species) queryParams.append('species', params.species)
  if (params.category) queryParams.append('category', params.category)
  if (params.search) queryParams.append('search', params.search)
  const queryString = queryParams.toString()
  return await api.get(`/pets/medications/${queryString ? '?' + queryString : ''}`)
}

export const getMedicationCategories = async () => {
  return await api.get('/pets/medications/categories/')
}

// ===== ПРИВЯЗКА К ПИТОМЦУ (M2M) =====

export const getPetHealthConditions = async (petId) => {
  return await api.get(`/pets/${petId}/health-conditions/`)
}

export const addPetHealthCondition = async (petId, payload) => {
  return await api.post(`/pets/${petId}/health-conditions/`, payload)
}

export const deletePetHealthCondition = async (petId, recordId) => {
  return await api.delete(`/pets/${petId}/health-conditions/${recordId}/`)
}

export const getPetAllergies = async (petId) => {
  return await api.get(`/pets/${petId}/allergies/`)
}

export const addPetAllergy = async (petId, payload) => {
  return await api.post(`/pets/${petId}/allergies/`, payload)
}

export const deletePetAllergy = async (petId, recordId) => {
  return await api.delete(`/pets/${petId}/allergies/${recordId}/`)
}

export const getPetVaccinations = async (petId) => {
  return await api.get(`/pets/${petId}/vaccinations/`)
}

export const addPetVaccination = async (petId, payload) => {
  return await api.post(`/pets/${petId}/vaccinations/`, payload)
}

export const deletePetVaccination = async (petId, recordId) => {
  return await api.delete(`/pets/${petId}/vaccinations/${recordId}/`)
}

export const getPetMedications = async (petId) => {
  return await api.get(`/pets/${petId}/medications/`)
}

export const addPetMedication = async (petId, payload) => {
  return await api.post(`/pets/${petId}/medications/`, payload)
}

export const deletePetMedication = async (petId, recordId) => {
  return await api.delete(`/pets/${petId}/medications/${recordId}/`)
}

// ===== ДОПОЛНИТЕЛЬНЫЕ КОНСТАНТЫ =====

/**
 * Варианты типа питания
 */
export const DIET_TYPE_OPTIONS = [
  { value: 'dry', label: 'Сухой корм' },
  { value: 'wet', label: 'Влажный корм' },
  { value: 'mixed', label: 'Смешанное питание' },
  { value: 'raw', label: 'Натуральное (BARF)' },
  { value: 'homemade', label: 'Домашняя еда' },
]

/**
 * Варианты частоты кормления
 */
export const FEEDING_FREQUENCY_OPTIONS = [
  { value: 1, label: '1 раз в день' },
  { value: 2, label: '2 раза в день' },
  { value: 3, label: '3 раза в день' },
  { value: 4, label: '4 раза в день' },
  { value: 5, label: '5 раз в день' },
  { value: 6, label: '6 раз в день' },
]

/**
 * Категория размера (5 значений по документации)
 */
export const SIZE_CATEGORY_OPTIONS = [
  { value: 'toy', label: 'Той', description: 'до 5 кг' },
  { value: 'small', label: 'Маленький', description: '5-10 кг' },
  { value: 'medium', label: 'Средний', description: '10-25 кг' },
  { value: 'large', label: 'Крупный', description: '25-45 кг' },
  { value: 'giant', label: 'Гигантский', description: 'более 45 кг' },
]

/**
 * Оценка упитанности (BCS - Body Condition Score)
 * Шкала 1-9 по международному стандарту
 */
export const BODY_CONDITION_SCORE_OPTIONS = [
  { value: '1', label: '1 - Истощение', category: 'underweight' },
  { value: '2', label: '2 - Очень худой', category: 'underweight' },
  { value: '3', label: '3 - Худой', category: 'underweight' },
  { value: '4', label: '4 - Недостаток веса', category: 'normal' },
  { value: '5', label: '5 - Идеальный вес', category: 'normal' },
  { value: '6', label: '6 - Избыток веса', category: 'normal' },
  { value: '7', label: '7 - Полнота', category: 'overweight' },
  { value: '8', label: '8 - Ожирение', category: 'overweight' },
  { value: '9', label: '9 - Тяжёлое ожирение', category: 'overweight' },
]

/**
 * Варианты типа жилья (обновлено по документации)
 */
export const HOUSING_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'house', label: 'Частный дом' },
  { value: 'farm', label: 'Ферма/сельская местность' },
  { value: 'outdoor', label: 'Вольерное содержание' },
]

/**
 * Размер двора (отображается если has_yard=true)
 */
export const YARD_SIZE_OPTIONS = [
  { value: 'small', label: 'Маленький (до 100 м²)' },
  { value: 'medium', label: 'Средний (100-500 м²)' },
  { value: 'large', label: 'Большой (более 500 м²)' },
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
 * Поведенческие проблемы (enum по документации)
 */
export const BEHAVIORAL_PROBLEMS_OPTIONS = [
  { value: 'aggression_dogs', label: 'Агрессия к собакам' },
  { value: 'aggression_people', label: 'Агрессия к людям' },
  { value: 'aggression_cats', label: 'Агрессия к кошкам' },
  { value: 'separation_anxiety', label: 'Тревога разлуки' },
  { value: 'excessive_barking', label: 'Чрезмерный лай' },
  { value: 'destructive_behavior', label: 'Деструктивное поведение' },
  { value: 'fear_phobias', label: 'Страхи/фобии' },
  { value: 'marking_territory', label: 'Метки территории' },
  { value: 'excessive_licking', label: 'Чрезмерное вылизывание' },
  { value: 'food_aggression', label: 'Агрессия за еду' },
  { value: 'leash_pulling', label: 'Тянет поводок' },
  { value: 'jumping_on_people', label: 'Прыгает на людей' },
  { value: 'none', label: 'Нет проблем' },
]

/**
 * Тип шерсти (7 значений по документации)
 */
export const COAT_TYPE_OPTIONS = [
  { value: 'hairless', label: 'Бесшёрстный' },
  { value: 'short', label: 'Короткая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'long', label: 'Длинная' },
  { value: 'double', label: 'Двойная (с подшёрстком)' },
  { value: 'wire', label: 'Жёсткая' },
  { value: 'curly', label: 'Курчавая' },
]

/**
 * Репродуктивное состояние (для некастрированных самок)
 */
export const REPRODUCTIVE_STATE_OPTIONS = [
  { value: 'none', label: 'Обычное состояние' },
  { value: 'heat', label: 'Течка' },
  { value: 'pregnant', label: 'Беременность' },
  { value: 'lactating', label: 'Лактация' },
]

/**
 * Климат проживания
 */
export const CLIMATE_OPTIONS = [
  { value: 'hot', label: 'Жаркий' },
  { value: 'warm', label: 'Тёплый' },
  { value: 'cool', label: 'Прохладный' },
  { value: 'cold', label: 'Холодный' },
  { value: 'very_cold', label: 'Очень холодный' },
]

/**
 * Тип поведения
 */
export const BEHAVIOR_TYPE_OPTIONS = [
  { value: 'calm', label: 'Спокойный' },
  { value: 'playful', label: 'Игривый' },
  { value: 'energetic', label: 'Энергичный' },
  { value: 'nervous', label: 'Нервный' },
  { value: 'aggressive', label: 'Агрессивный' },
  { value: 'friendly', label: 'Дружелюбный' },
  { value: 'independent', label: 'Независимый' },
]

/**
 * Опыт дрессировки
 */
export const TRAINING_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'Без опыта' },
  { value: 'basic', label: 'Базовые команды' },
  { value: 'intermediate', label: 'Средний уровень' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'professional', label: 'Профессиональный' },
]

/**
 * Размер питомца (алиас для SIZE_CATEGORY_OPTIONS)
 */
export const SIZE_OPTIONS = [
  { value: 'toy', label: 'Той (до 3 кг)' },
  { value: 'small', label: 'Маленький (3-10 кг)' },
  { value: 'medium', label: 'Средний (10-25 кг)' },
  { value: 'large', label: 'Крупный (25-45 кг)' },
  { value: 'giant', label: 'Гигантский (45+ кг)' },
]

// =============================================================================
// API ФУНКЦИИ ДЛЯ КАЛЬКУЛЯТОРА КАЛОРИЙ И АВТОЗАПОЛНЕНИЯ
// =============================================================================

/**
 * Расчёт дневной нормы калорий для питомца
 * 
 * @param {string} petId - UUID питомца
 * @returns {Promise<Object>} Результат расчёта (RER, MER, рекомендации)
 */
export const calculatePetCalories = async (petId) => {
  return await api.get(`/pets/${petId}/calculate-calories/`)
}

/**
 * Расчёт плана кормления с указанной калорийностью корма
 * 
 * @param {string} petId - UUID питомца
 * @param {number} foodCalorieDensity - Калорийность корма (ккал/кг)
 * @param {number} days - Количество дней для плана (по умолчанию 7)
 * @returns {Promise<Object>} План кормления с порциями
 */
export const calculateFeedingPlan = async (petId, foodCalorieDensity, days = 7) => {
  return await api.post(`/pets/${petId}/calculate-calories/`, {
    food_calorie_density: foodCalorieDensity,
    days: days
  })
}

/**
 * Получение предложений автозаполнения из породы
 * 
 * @param {string} petId - UUID питомца
 * @returns {Promise<Object>} Предложенные значения (size_category, coat_type, activity_level, ideal_weight_kg)
 */
export const getAutofillSuggestions = async (petId) => {
  return await api.get(`/pets/${petId}/autofill-suggestions/`)
}

// =============================================================================
// API ФУНКЦИИ ДЛЯ ПОДБОРА КОРМА
// =============================================================================

/**
 * Типы кормов для фильтрации
 */
export const FOOD_TYPE_OPTIONS = [
  { value: 'dry', label: 'Сухой корм' },
  { value: 'wet', label: 'Влажный корм' },
  { value: 'canned', label: 'Консервы' },
  { value: 'pouch', label: 'Паучи' },
  { value: 'pate', label: 'Паштет' },
  { value: 'holistic', label: 'Холистик' },
  { value: 'diet', label: 'Диетический' },
  { value: 'hypoallergenic', label: 'Гипоаллергенный' },
]

/**
 * Получение рекомендаций кормов для питомца
 * 
 * @param {string} petId - UUID питомца
 * @param {Object} filters - Фильтры для поиска
 * @param {string} [filters.food_type] - Тип корма (dry, wet, etc.)
 * @param {number} [filters.min_price] - Минимальная цена
 * @param {number} [filters.max_price] - Максимальная цена
 * @param {string} [filters.brands] - Бренды через запятую
 * @param {number} [filters.limit=20] - Количество результатов
 * @param {number} [filters.offset=0] - Смещение для пагинации
 * @returns {Promise<Object>} Рекомендации с оценками совместимости
 */
export const getFoodRecommendations = async (petId, filters = {}) => {
  const params = new URLSearchParams()
  
  if (filters.food_type) params.append('food_type', filters.food_type)
  if (filters.min_price) params.append('min_price', filters.min_price)
  if (filters.max_price) params.append('max_price', filters.max_price)
  if (filters.brands) params.append('brands', filters.brands)
  if (filters.limit) params.append('limit', filters.limit)
  if (filters.offset) params.append('offset', filters.offset)
  
  const queryString = params.toString()
  const url = `/pets/${petId}/food-recommendations/${queryString ? `?${queryString}` : ''}`
  
  return await api.get(url)
}

/**
 * Получение расчёта рациона для питомца
 * 
 * @param {string} petId - UUID питомца
 * @returns {Promise<Object>} Расчёт калорий, БЖУ, порций
 */
export const getDietCalculation = async (petId) => {
  return await api.get(`/pets/${petId}/diet-calculation/`)
}

/**
 * Получение статистики по доступным кормам
 * 
 * @param {string} species - Вид животного (dog | cat)
 * @returns {Promise<Object>} Статистика: бренды, типы, ценовые диапазоны
 */
export const getFoodStatistics = async (species = 'dog') => {
  return await api.get(`/pets/food-statistics/?species=${species}`)
}

/**
 * Соотношение сухой/влажный при мультипитании (по видам).
 * Активно только при food_type === 'multi'.
 */
export const MULTI_RATIO_PRESET_OPTIONS = {
  dog: [
    { value: 'more_dry', label: '70% сухой, 30% влажный' },
    { value: 'balanced', label: '60% сухой, 40% влажный' },
    { value: 'more_wet', label: '50% сухой, 50% влажный' },
  ],
  cat: [
    { value: 'more_wet', label: '40% сухой, 60% влажный' },
    { value: 'balanced', label: '50% сухой, 50% влажный' },
    { value: 'more_dry', label: '60% сухой, 40% влажный' },
  ],
}

/**
 * Опции соотношения для выбранного вида питомца
 * @param {string} species - 'dog' | 'cat'
 * @returns {Array<{value: string, label: string}>}
 */
export const getMultiRatioPresetOptions = (species) => {
  const key = (species || 'dog').toLowerCase()
  return MULTI_RATIO_PRESET_OPTIONS[key] || MULTI_RATIO_PRESET_OPTIONS.dog
}

/**
 * Получение полного плана питания для питомца
 * 
 * @param {string} petId - UUID питомца
 * @param {Object} params - Параметры плана
 * @param {string} [params.food_type='multi'] - Тип питания (dry, wet, multi)
 * @param {string} [params.multi_ratio_preset] - При multi: more_dry, balanced, more_wet
 * @param {string} [params.variant='basic'] - Вариант набора (basic, advanced)
 * @param {number} [params.period_days=30] - Период подбора в днях
 * @param {Array} [params.preferred_brands] - Предпочтительные бренды
 * @param {number} [params.min_price] - Минимальная цена
 * @param {number} [params.max_price] - Максимальная цена
 * @returns {Promise<Object>} Полный план питания с компонентами и стоимостью
 */
export const getFeedingPlan = async (petId, params = {}) => {
  if (Object.keys(params).length === 0) {
    // GET запрос с параметрами по умолчанию
    return await api.get(`/pets/${petId}/feeding-plan/`)
  }
  // POST запрос с конкретными параметрами
  return await api.post(`/pets/${petId}/feeding-plan/`, params)
}

/**
 * Получение альтернативных продуктов для компонента рациона
 * 
 * @param {string} petId - UUID питомца
 * @param {number} productId - ID текущего продукта
 * @param {string} componentType - Тип компонента (dry_food, wet_food, treat, supplement)
 * @param {number} [limit=10] - Количество альтернатив
 * @returns {Promise<Object>} Список альтернативных продуктов с оценками
 */
export const getFoodAlternatives = async (petId, productId, componentType, options = {}) => {
  const { limit = 10, period_days = 30, food_type = 'multi' } = options
  const params = new URLSearchParams({
    component_type: componentType,
    limit: limit.toString(),
    period_days: period_days.toString(),
    food_type: food_type
  })
  return await api.get(`/pets/${petId}/food-alternatives/${productId}/?${params}`)
}

/**
 * Расчёт калорий для активного дня
 * 
 * @param {string} petId - UUID питомца
 * @param {Array} activities - Список активностей
 * @param {string} activities[].type - Тип активности (running, playing, training, etc.)
 * @param {number} activities[].duration_minutes - Длительность в минутах
 * @returns {Promise<Object>} Расчёт с увеличенной калорийностью
 */
export const calculateActiveDayCalories = async (petId, activities) => {
  return await api.post(`/pets/${petId}/active-day-calories/`, { activities })
}

/**
 * Типы питания для конструктора рациона
 */
export const FEEDING_TYPE_OPTIONS = [
  { value: 'dry', label: 'Сухой', description: 'Только сухой корм', icon: '🥫' },
  { value: 'wet', label: 'Влажный', description: 'Только влажный корм', icon: '🍖' },
  { value: 'multi', label: 'Мультипитание', description: 'Сухой + влажный корм (соотношение настраивается)', icon: '🍽️' },
]

/**
 * Варианты набора для конструктора рациона
 */
export const PLAN_VARIANT_OPTIONS = [
  { value: 'basic', label: 'Базовый', description: 'Корм + лакомства' },
  { value: 'advanced', label: 'Продвинутый', description: 'Корм + лакомства + добавки' },
]

/**
 * Периоды подбора корма
 */
export const FEEDING_PERIOD_OPTIONS = [
  { value: 7, label: '7 дней', shortLabel: '1 нед' },
  { value: 14, label: '14 дней', shortLabel: '2 нед' },
  { value: 30, label: '30 дней', shortLabel: '1 мес' },
  { value: 60, label: '60 дней', shortLabel: '2 мес' },
  { value: 90, label: '90 дней', shortLabel: '3 мес' },
]
