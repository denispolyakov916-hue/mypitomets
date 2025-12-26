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
 * Получить персонализированные курсы для питомца
 * @param {string} petId - ID питомца
 * @param {Object} additionalFilters - Дополнительные фильтры
 * @returns {Promise} Персонализированный список курсов
 */
export const getPersonalizedCourses = async (petId, additionalFilters = {}) => {
  return getCourses({
    personal: 'true',
    pet_id: petId,
    ...additionalFilters
  })
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
 * @param {string} [petId] - ID питомца для привязки курса (опционально)
 * @returns {Promise<Object>} Сообщение об успехе и данные курса
 * @throws {Object} Ошибка если курс уже куплен или несоответствие типа курса/питомца
 */
export const purchaseCourse = async (courseId, disclaimerAccepted = false, petId = null) => {
  const body = {
    disclaimer_accepted: Boolean(disclaimerAccepted)  // Гарантируем булево значение
  }
  
  if (petId) {
    body.pet_id = petId
  }
  
  return await api.post(`/courses/${courseId}/purchase/`, body)
}

/**
 * Получение курсов пользователя
 * 
 * Возвращает все курсы, к которым пользователь имеет доступ.
 * Требует аутентификации.
 * 
 * @param {string} [petId] - Опциональный фильтр по ID питомца
 * @returns {Promise<Object>} Массив курсов с информацией о прогрессе
 */
export const getUserCourses = async (petId = null) => {
  const url = petId ? `/courses/my/?pet_id=${petId}` : '/courses/my/'
  return await api.get(url)
}

/**
 * Прямая запись на бесплатный курс (без добавления в корзину)
 * 
 * Работает только для бесплатных курсов (price=0).
 * Требует согласия с условиями использования.
 * 
 * @param {number} courseId - ID курса для записи
 * @param {boolean} disclaimerAccepted - Согласие с условиями (обязательно true)
 * @param {string} [petId] - ID питомца для привязки курса (опционально)
 * @returns {Promise<Object>} Данные о записи
 * @throws {Object} Ошибка если курс платный или условия не приняты
 */
export const enrollFreeCourse = async (courseId, disclaimerAccepted = false, petId = null) => {
  const body = {
    disclaimer_accepted: Boolean(disclaimerAccepted)
  }

  if (petId) {
    body.pet_id = petId
  }

  return await api.post(`/courses/${courseId}/enroll/`, body)
}

// ===== НОВЫЕ ФУНКЦИИ ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ =====

/**
 * Получение уроков курса
 *
 * @param {number} courseId - ID курса
 * @param {string} [petId] - ID питомца для персонализированного прогресса
 * @returns {Promise<Object>} Список уроков с прогрессом
 */
export const getCourseLessons = async (courseId, petId = null) => {
  const params = petId ? `?pet_id=${petId}` : ''
  return await api.get(`/courses/${courseId}/lessons/${params}`)
}

/**
 * Получение деталей урока
 *
 * @param {number} lessonId - ID урока
 * @param {string} [petId] - ID питомца для прогресса
 * @returns {Promise<Object>} Детали урока с прогрессом
 */
export const getLesson = async (lessonId, petId = null) => {
  const params = petId ? `?pet_id=${petId}` : ''
  return await api.get(`/lessons/${lessonId}/${params}`)
}

/**
 * Завершение урока
 *
 * @param {number} lessonId - ID урока
 * @param {string} [petId] - ID питомца
 * @param {number} [timeSpent] - Время просмотра в секундах
 * @returns {Promise<Object>} Результат завершения урока
 */
export const completeLesson = async (lessonId, petId = null, timeSpent = 0) => {
  const body = {
    pet_id: petId,
    time_spent: timeSpent
  }

  return await api.post(`/lessons/${lessonId}/complete/`, body)
}

/**
 * Получение прогресса пользователя по курсу
 *
 * @param {number} courseId - ID курса
 * @param {string} petId - ID питомца (обязательно)
 * @returns {Promise<Object>} Детальный прогресс по курсу
 */
export const getCourseProgress = async (courseId, petId) => {
  if (!petId) {
    throw new Error('petId обязателен для получения прогресса')
  }

  return await api.get(`/courses/${courseId}/progress/?pet_id=${petId}`)
}

/**
 * Обновление прогресса по уроку
 *
 * @param {number} lessonId - ID урока
 * @param {string} petId - ID питомца
 * @param {Object} progressData - Данные прогресса
 * @param {string} [progressData.status] - Статус ('in_progress', 'viewed', 'completed')
 * @param {number} [progressData.time_spent] - Время просмотра в секундах
 * @param {number} [progressData.attempts_count] - Количество попыток
 * @param {number} [progressData.success_rate] - Процент успешности
 * @param {string} [progressData.notes] - Заметки пользователя
 * @returns {Promise<Object>} Обновленный прогресс
 */
export const updateLessonProgress = async (lessonId, petId, progressData) => {
  const body = {
    pet_id: petId,
    ...progressData
  }

  return await api.put(`/lessons/${lessonId}/progress/`, body)
}

/**
 * Получение комментариев к курсу
 *
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Список комментариев
 */
export const getCourseComments = async (courseId) => {
  return await api.get(`/courses/${courseId}/comments/`)
}

/**
 * Получение оценок курса
 *
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Список оценок и статистика
 */
export const getCourseRatings = async (courseId) => {
  return await api.get(`/courses/${courseId}/ratings/`)
}

/**
 * Поставить оценку курсу
 *
 * @param {number} courseId - ID курса
 * @param {number} rating - Оценка (1-5)
 * @param {string} [review] - Текст отзыва
 * @param {string} [petId] - ID питомца
 * @returns {Promise<Object>} Результат создания оценки
 */
export const rateCourse = async (courseId, rating, review = '', petId = null) => {
  const body = {
    rating: rating,
    review: review
  }

  if (petId) {
    body.pet_id = petId
  }

  return await api.post(`/courses/${courseId}/ratings/`, body)
}