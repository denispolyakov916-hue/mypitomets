/**
 * Заглушка для кэширования (пока нет Redis)
 *
 * В будущем заменить на Redis или другой persistent cache
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300000; // 5 минут в миллисекундах
  }

  /**
   * Получить значение из кэша
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Проверяем срок годности
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Установить значение в кэш
   */
  set(key, value, ttl = this.defaultTTL) {
    const expires = Date.now() + ttl;

    this.cache.set(key, {
      value,
      expires,
      created: Date.now()
    });

    // Очистка устаревших записей (простая реализация)
    this.cleanup();

    return true;
  }

  /**
   * Удалить значение из кэша
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Очистить кэш по паттерну
   */
  deletePattern(pattern) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  /**
   * Очистить весь кэш
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Получить статистику кэша
   */
  getStats() {
    const now = Date.now();
    let total = 0;
    let expired = 0;

    for (const [key, item] of this.cache.entries()) {
      total++;
      if (now > item.expires) {
        expired++;
      }
    }

    return {
      total,
      expired,
      active: total - expired,
      size: JSON.stringify([...this.cache.entries()]).length
    };
  }

  /**
   * Очистка устаревших записей
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Инициализация автоматической очистки
   */
  startCleanup(interval = 60000) { // Каждую минуту
    setInterval(() => {
      this.cleanup();
    }, interval);
  }
}

// Создаем глобальный экземпляр кэша
const cache = new MemoryCache();

// Запускаем автоматическую очистку
cache.startCleanup();

// Экспортируем функции для совместимости с Django cache API
export const get = (key) => cache.get(key);
export const set = (key, value, ttl) => cache.set(key, value, ttl);
export const deleteKey = (key) => cache.delete(key);
export const clear = () => cache.clear();
export const getStats = () => cache.getStats();

// Для совместимости с admin_cache.py
export { cache as default };
