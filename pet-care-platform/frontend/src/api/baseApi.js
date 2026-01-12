/**
 * Базовый API клиент для CRUD операций
 *
 * Предоставляет общие методы для типичных операций:
 * - getList: Получить список объектов с фильтрацией
 * - getById: Получить объект по ID
 * - create: Создать новый объект
 * - update: Обновить существующий объект
 * - delete: Удалить объект
 *
 * Использование:
 *   import { createCrudApi } from './baseApi'
 *   export const petsApi = createCrudApi('/pets/')
 *
 *   // Теперь можно использовать:
 *   const pets = await petsApi.getList({ animal: 'dog' })
 *   const pet = await petsApi.getById(1)
 *   const newPet = await petsApi.create(petData)
 *   const updatedPet = await petsApi.update(1, petData)
 *   await petsApi.delete(1)
 */

import api from './client'

/**
 * Создает CRUD API клиент для указанного эндпоинта
 *
 * @param {string} baseUrl - Базовый URL эндпоинта (например '/pets/')
 * @param {Object} options - Опции конфигурации
 * @param {string} options.idField - Поле ID для объектов (по умолчанию 'id')
 * @param {boolean} options.useAuth - Требуется ли аутентификация (по умолчанию true)
 * @returns {Object} Объект с CRUD методами
 */
export function createCrudApi(baseUrl, options = {}) {
  const {
    idField = 'id',
    useAuth = true
  } = options

  // Убираем trailing slash если есть
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    /**
     * Получить список объектов с фильтрацией
     *
     * @param {Object} filters - Фильтры для запроса
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Список объектов
     */
    async getList(filters = {}, options = {}) {
      const params = new URLSearchParams()

      // Добавляем фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v))
          } else {
            params.append(key, value)
          }
        }
      })

      const queryString = params.toString()
      const url = queryString ? `${cleanBaseUrl}/?${queryString}` : `${cleanBaseUrl}/`

      return await api.get(url, options)
    },

    /**
     * Получить объект по ID
     *
     * @param {string|number} id - ID объекта
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Объект
     */
    async getById(id, options = {}) {
      if (!id) {
        throw new Error('ID обязателен для получения объекта')
      }

      return await api.get(`${cleanBaseUrl}/${id}/`, options)
    },

    /**
     * Создать новый объект
     *
     * @param {Object} data - Данные для создания
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Созданный объект
     */
    async create(data, options = {}) {
      return await api.post(`${cleanBaseUrl}/`, data, options)
    },

    /**
     * Обновить существующий объект
     *
     * @param {string|number} id - ID объекта
     * @param {Object} data - Данные для обновления
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Обновленный объект
     */
    async update(id, data, options = {}) {
      if (!id) {
        throw new Error('ID обязателен для обновления объекта')
      }

      return await api.put(`${cleanBaseUrl}/${id}/`, data, options)
    },

    /**
     * Частично обновить объект
     *
     * @param {string|number} id - ID объекта
     * @param {Object} data - Данные для частичного обновления
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Обновленный объект
     */
    async patch(id, data, options = {}) {
      if (!id) {
        throw new Error('ID обязателен для обновления объекта')
      }

      return await api.patch(`${cleanBaseUrl}/${id}/`, data, options)
    },

    /**
     * Удалить объект
     *
     * @param {string|number} id - ID объекта
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Результат удаления
     */
    async delete(id, options = {}) {
      if (!id) {
        throw new Error('ID обязателен для удаления объекта')
      }

      return await api.delete(`${cleanBaseUrl}/${id}/`, options)
    },

    /**
     * Получить объект по slug или другому полю
     *
     * @param {string} slug - Slug или значение поля
     * @param {string} field - Поле для поиска (по умолчанию 'slug')
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Объект
     */
    async getByField(slug, field = 'slug', options = {}) {
      if (!slug) {
        throw new Error('Значение поля обязательно')
      }

      return await api.get(`${cleanBaseUrl}/by-${field}/${slug}/`, options)
    },

    /**
     * Выполнить кастомное действие с объектом
     *
     * @param {string|number} id - ID объекта
     * @param {string} action - Название действия
     * @param {Object} data - Данные для действия
     * @param {string} method - HTTP метод (по умолчанию 'post')
     * @param {Object} options - Опции запроса
     * @returns {Promise<Object>} Результат действия
     */
    async performAction(id, action, data = {}, method = 'post', options = {}) {
      const url = id ? `${cleanBaseUrl}/${id}/${action}/` : `${cleanBaseUrl}/${action}/`

      return await api[method.toLowerCase()](url, data, options)
    }
  }
}

/**
 * Создает API клиент только для чтения
 *
 * @param {string} baseUrl - Базовый URL эндпоинта
 * @param {Object} options - Опции конфигурации
 * @returns {Object} Объект с методами чтения
 */
export function createReadOnlyApi(baseUrl, options = {}) {
  const crudApi = createCrudApi(baseUrl, options)

  return {
    getList: crudApi.getList,
    getById: crudApi.getById,
    getByField: crudApi.getByField,
    performAction: crudApi.performAction
  }
}

/**
 * Создает API клиент с кэшированием
 *
 * @param {string} baseUrl - Базовый URL эндпоинта
 * @param {Object} options - Опции конфигурации
 * @param {number} cacheTime - Время кэширования в мс (по умолчанию 5 мин)
 * @returns {Object} Объект с CRUD методами и кэшированием
 */
export function createCachedApi(baseUrl, options = {}, cacheTime = 5 * 60 * 1000) {
  const crudApi = createCrudApi(baseUrl, options)
  const cache = new Map()

  // Очищаем кэш каждые cacheTime мс
  setInterval(() => {
    cache.clear()
  }, cacheTime)

  const cachedGetList = async (filters = {}, options = {}) => {
    const cacheKey = `list_${JSON.stringify(filters)}`

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    const result = await crudApi.getList(filters, options)
    cache.set(cacheKey, result)
    return result
  }

  const cachedGetById = async (id, options = {}) => {
    const cacheKey = `item_${id}`

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }

    const result = await crudApi.getById(id, options)
    cache.set(cacheKey, result)
    return result
  }

  // Очищаем кэш при изменениях
  const invalidateCache = () => {
    cache.clear()
  }

  return {
    getList: cachedGetList,
    getById: cachedGetById,
    getByField: crudApi.getByField,
    create: async (...args) => {
      invalidateCache()
      return crudApi.create(...args)
    },
    update: async (...args) => {
      invalidateCache()
      return crudApi.update(...args)
    },
    patch: async (...args) => {
      invalidateCache()
      return crudApi.patch(...args)
    },
    delete: async (...args) => {
      invalidateCache()
      return crudApi.delete(...args)
    },
    performAction: crudApi.performAction,
    invalidateCache
  }
}


