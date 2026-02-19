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
  const filterKeys = ['pet_type', 'pet_id', 'category', 'subcategory', 'level', 'format_type', 'personal', 'price_type', 'min_price', 'max_price', 'search', 'page', 'per_page', 'ids']

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
  const url = `/courses/lessons/${lessonId}/${params}`
  const response = await api.get(url)
  return response
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

  return await api.post(`/courses/lessons/${lessonId}/complete/`, body)
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

  return await api.put(`/courses/lessons/${lessonId}/progress/`, body)
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

// ===== НОВЫЕ ФУНКЦИИ ДЛЯ КОНСТРУКТОРА КУРСОВ =====

/**
 * Получение структуры курса для конструктора
 *
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Полная структура курса с страницами и блоками
 */
export const getCourseBuilder = async (courseId) => {
  return await api.get(`/courses/${courseId}/builder/`)
}

/**
 * Создание новой страницы курса
 *
 * @param {number} courseId - ID курса
 * @param {Object} pageData - Данные страницы
 * @returns {Promise<Object>} Созданная страница
 */
export const createCoursePage = async (courseId, pageData) => {
  return await api.post(`/courses/${courseId}/builder/pages/`, pageData)
}

/**
 * Обновление страницы курса
 *
 * @param {number} courseId - ID курса
 * @param {number} pageId - ID страницы
 * @param {Object} pageData - Данные страницы
 * @returns {Promise<Object>} Обновленная страница
 */
export const updateCoursePage = async (courseId, pageId, pageData) => {
  return await api.put(`/courses/pages/${pageId}/`, pageData)
}

/**
 * Удаление страницы курса
 *
 * @param {number} courseId - ID курса
 * @param {number} pageId - ID страницы
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteCoursePage = async (courseId, pageId) => {
  return await api.delete(`/courses/pages/${pageId}/`)
}

/**
 * Создание блока на странице
 *
 * @param {number} pageId - ID страницы
 * @param {Object} blockData - Данные блока
 * @returns {Promise<Object>} Созданный блок
 */
export const createContentBlock = async (pageId, blockData) => {
  return await api.post(`/courses/pages/${pageId}/blocks/`, blockData)
}

/**
 * Обновление блока
 *
 * @param {number} blockId - ID блока
 * @param {Object} blockData - Данные блока
 * @returns {Promise<Object>} Обновленный блок
 */
export const updateContentBlock = async (blockId, blockData) => {
  return await api.put(`/courses/blocks/${blockId}/`, blockData)
}

/**
 * Удаление блока
 *
 * @param {number} blockId - ID блока
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteContentBlock = async (blockId) => {
  return await api.delete(`/courses/blocks/${blockId}/`)
}

/**
 * Дублирование блока
 *
 * @param {number} blockId - ID блока для дублирования
 * @returns {Promise<Object>} Созданный дубликат блока
 */
export const duplicateContentBlock = async (blockId) => {
  return await api.post(`/courses/blocks/${blockId}/duplicate/`)
}

/**
 * Получение списка шаблонов блоков
 *
 * @param {Object} [filters] - Фильтры для шаблонов
 * @returns {Promise<Object>} Список шаблонов
 */
export const getBlockTemplates = async (filters = {}) => {
  const params = new URLSearchParams()

  if (filters.block_type) params.append('block_type', filters.block_type)
  if (filters.category) params.append('category', filters.category)

  const queryString = params.toString()
  const url = queryString ? `/courses/block-templates/?${queryString}` : '/courses/block-templates/'

  return await api.get(url)
}

/**
 * Создание шаблона блока
 *
 * @param {Object} templateData - Данные шаблона
 * @returns {Promise<Object>} Созданный шаблон
 */
export const createBlockTemplate = async (templateData) => {
  return await api.post('/courses/block-templates/', templateData)
}

/**
 * Использование шаблона для создания блока
 *
 * @param {number} templateId - ID шаблона
 * @param {number} pageId - ID страницы для создания блока
 * @returns {Promise<Object>} Созданный блок
 */
export const useBlockTemplate = async (templateId, pageId) => {
  return await api.post(`/courses/block-templates/${templateId}/use/`, { page_id: pageId })
}

/**
 * Добавление комментария к курсу
 *
 * @param {number} courseId - ID курса
 * @param {string} content - Текст комментария
 * @param {string} [parentId] - ID родительского комментария
 * @param {Array} [attachments] - Массив вложений
 * @returns {Promise<Object>} Созданный комментарий
 */
export const addCourseComment = async (courseId, content, parentId = null, attachments = []) => {
  const body = {
    content: content,
    attachments: attachments
  }

  if (parentId) {
    body.parent = parentId
  }

  return await api.post(`/courses/${courseId}/comments/create/`, body)
}

/**
 * Получение шаблонов страниц
 *
 * @returns {Promise<Array>} Список шаблонов страниц
 */
export const getPageTemplates = async () => {
  return await api.get('/courses/page-templates/')
}

/**
 * Создание шаблона страницы
 *
 * @param {Object} templateData - Данные шаблона
 * @returns {Promise<Object>} Созданный шаблон
 */
export const createPageTemplate = async (templateData) => {
  return await api.post('/courses/page-templates/', templateData)
}

/**
 * Использование шаблона страницы
 *
 * @param {number} templateId - ID шаблона
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Созданная страница
 */
export const usePageTemplate = async (templateId, courseId) => {
  return await api.post(`/courses/page-templates/${templateId}/use/`, { course_id: courseId })
}

/**
 * Сохранение курса через конструктор
 *
 * @param {number} courseId - ID курса
 * @param {Object} courseData - Полная структура курса
 * @returns {Promise<Object>} Результат сохранения
 */
export const saveCourseBuilder = async (courseId, courseData) => {
  return await api.put(`/courses/${courseId}/builder/`, courseData)
}

/**
 * Публикация курса
 *
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Результат публикации
 */
export const publishCourse = async (courseId) => {
  return await api.post(`/courses/${courseId}/publish/`)
}

/**
 * Предпросмотр курса
 *
 * @param {number} courseId - ID курса
 * @returns {Promise<Object>} Данные для предпросмотра
 */
export const previewCourse = async (courseId) => {
  return await api.get(`/courses/${courseId}/preview/`)
}

// ===== ФУНКЦИИ ДЛЯ МОДУЛЕЙ И СТРУКТУРЫ КУРСА =====

/**
 * Получение полной структуры курса с прогрессом (Stepik-стиль)
 *
 * @param {number} courseId - ID курса
 * @param {string} [petId] - ID питомца для прогресса
 * @returns {Promise<Object>} Структура курса: модули -> страницы с прогрессом
 */
export const getCourseStructure = async (courseId, petId = null) => {
  const params = petId ? `?pet_id=${petId}` : ''
  return await api.get(`/courses/${courseId}/structure/${params}`)
}

/**
 * Получение модулей курса
 *
 * @param {number} courseId - ID курса
 * @returns {Promise<Array>} Список модулей
 */
export const getCourseModules = async (courseId) => {
  return await api.get(`/courses/${courseId}/modules/`)
}

/**
 * Создание модуля курса
 *
 * @param {number} courseId - ID курса
 * @param {Object} moduleData - Данные модуля { title, description }
 * @returns {Promise<Object>} Созданный модуль
 */
export const createCourseModule = async (courseId, moduleData) => {
  return await api.post(`/courses/${courseId}/modules/`, moduleData)
}

/**
 * Обновление модуля курса
 *
 * @param {number} moduleId - ID модуля
 * @param {Object} moduleData - Данные модуля
 * @returns {Promise<Object>} Обновленный модуль
 */
export const updateCourseModule = async (moduleId, moduleData) => {
  return await api.put(`/courses/modules/${moduleId}/`, moduleData)
}

/**
 * Удаление модуля курса
 *
 * @param {number} moduleId - ID модуля
 * @returns {Promise<Object>} Результат удаления
 */
export const deleteCourseModule = async (moduleId) => {
  return await api.delete(`/courses/modules/${moduleId}/`)
}

// ===== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ КОНСТРУКТОРА =====

/**
 * Завершение страницы курса
 *
 * @param {number} pageId - ID страницы
 * @param {string} petId - ID питомца
 * @param {Object} [progressData] - Дополнительные данные прогресса
 * @returns {Promise<Object>} Результат завершения
 */
export const completeCoursePage = async (pageId, petId, progressData = {}) => {
  return await api.post(`/courses/pages/${pageId}/complete/`, {
    pet_id: petId,
    ...progressData
  })
}

// Примечание: шаблоны страниц (page-templates) не реализованы на бекенде.
// При необходимости они могут быть добавлены аналогично block-templates.

/**
 * Получение страниц курса
 *
 * @param {number} courseId - ID курса
 * @param {number|null} petId - ID питомца (опционально)
 * @returns {Promise<Array>} Список страниц курса
 */
export const getCoursePages = async (courseId, petId = null) => {
  const params = new URLSearchParams()
  if (petId) params.append('pet_id', petId)

  const queryString = params.toString()
  const url = queryString
    ? `/courses/${courseId}/pages/?${queryString}`
    : `/courses/${courseId}/pages/`

  return await api.get(url)
}

/**
 * Получение страницы курса
 *
 * @param {number} courseId - ID курса
 * @param {number} pageId - ID страницы
 * @param {number|null} petId - ID питомца (опционально)
 * @returns {Promise<Object>} Данные страницы
 */
export const getCoursePage = async (courseId, pageId, petId = null) => {
  const params = new URLSearchParams()
  if (petId) params.append('pet_id', petId)

  const queryString = params.toString()
  const url = queryString
    ? `/courses/${courseId}/pages/${pageId}/?${queryString}`
    : `/courses/${courseId}/pages/${pageId}/`

  return await api.get(url)
}