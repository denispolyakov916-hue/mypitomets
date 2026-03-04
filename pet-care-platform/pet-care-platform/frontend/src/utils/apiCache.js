/**
 * Глобальный кэш для API запросов
 *
 * Предотвращает дублирование одинаковых запросов в течение заданного времени.
 * Используется для кэширования GET запросов, которые не должны часто меняться.
 */

class ApiCache {
  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
  }

  /**
   * Получить данные из кэша или выполнить запрос
   *
   * @param {string} key - Уникальный ключ для кэширования
   * @param {Function} fetcher - Функция, выполняющая запрос
   * @param {number} ttl - Время жизни кэша в миллисекундах (по умолчанию 30 секунд)
   * @returns {Promise} Результат запроса
   */
  async get(key, fetcher, ttl = 30000) {
    // Если запрос уже выполняется, возвращаем существующий промис
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // Проверяем кэш
    const cached = this.cache.get(key)
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data
    }

    // Выполняем запрос
    const requestPromise = fetcher().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, requestPromise)

    try {
      const data = await requestPromise
      this.cache.set(key, { data, timestamp: Date.now() })
      return data
    } catch (error) {
      // В случае ошибки не кэшируем, но удаляем из pending
      this.pendingRequests.delete(key)
      throw error
    }
  }

  /**
   * Инвалидировать кэш по ключу
   *
   * @param {string} key - Ключ для инвалидации
   */
  invalidate(key) {
    this.cache.delete(key)
  }

  /**
   * Очистить весь кэш
   */
  clear() {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  /**
   * Очистить кэш по префиксу
   *
   * @param {string} prefix - Префикс ключа
   */
  clearByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Получить размер кэша
   *
   * @returns {Object} Статистика кэша
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequestsSize: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys())
    }
  }

  /**
   * Логирование статистики кэша (для отладки)
   */
  logStats() {
    const stats = this.getStats()
    console.log('[API Cache Stats]', stats)
    return stats
  }
}

export const apiCache = new ApiCache()

// Экспорт для использования в компонентах
export default apiCache