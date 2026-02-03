/**
 * Оптимизированный хук для работы с каталогом товаров
 * 
 * Функции:
 * - Кэширование данных в памяти (SWR-like подход)
 * - Debouncing запросов при изменении фильтров
 * - Prefetching следующей страницы
 * - Оптимистичные обновления
 * - Stale-while-revalidate стратегия
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getProducts } from '../api/shop'

// Глобальный кэш для продуктов (SWR-like)
const productsCache = new Map()
const filtersCache = new Map()
const CACHE_TTL = 60 * 1000 // 1 минута для товаров
const FILTERS_CACHE_TTL = 5 * 60 * 1000 // 5 минут для фильтров

/**
 * Генерация ключа кэша из фильтров
 */
const getCacheKey = (filters) => {
  const sortedParams = Object.entries(filters)
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return sortedParams || 'default'
}

/**
 * Генерация ключа кэша для фильтров
 */
const getFiltersCacheKey = (filters) => {
  return `filters:${getCacheKey(filters)}`
}

/**
 * Проверка валидности кэша
 */
const isCacheValid = (cacheEntry, ttl) => {
  if (!cacheEntry) return false
  return Date.now() - cacheEntry.timestamp < ttl
}

/**
 * Хук для работы с каталогом товаров
 * 
 * @param {Object} initialFilters - Начальные фильтры
 * @returns {Object} Состояние и методы для работы с каталогом
 */
export function useProducts(initialFilters = {}) {
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [availableFilters, setAvailableFilters] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState(null)
  
  // Refs для отмены запросов и debouncing
  const abortControllerRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const currentFiltersRef = useRef(initialFilters)
  const prefetchedPagesRef = useRef(new Set())
  
  /**
   * Основная функция загрузки данных
   */
  const fetchProducts = useCallback(async (filters, options = {}) => {
    const { 
      skipCache = false, 
      isPrefetch = false,
      showLoading = true 
    } = options
    
    const cacheKey = getCacheKey(filters)
    const filtersCacheKey = getFiltersCacheKey(filters)
    
    // Проверяем кэш товаров
    const cachedProducts = productsCache.get(cacheKey)
    const cachedFilters = filtersCache.get(filtersCacheKey)
    
    // Если есть валидный кэш - возвращаем его (stale-while-revalidate)
    if (!skipCache && isCacheValid(cachedProducts, CACHE_TTL)) {
      if (!isPrefetch) {
        setProducts(cachedProducts.data.products)
        setPagination(cachedProducts.data.pagination)
        
        // Фильтры из кэша или из ответа
        if (isCacheValid(cachedFilters, FILTERS_CACHE_TTL)) {
          setAvailableFilters(prev => ({
            ...cachedFilters.data,
            user_pets: prev.user_pets || cachedFilters.data.user_pets
          }))
        }
        
        setIsLoading(false)
      }
      
      // Фоновое обновление если кэш старше половины TTL
      const cacheAge = Date.now() - cachedProducts.timestamp
      if (cacheAge > CACHE_TTL / 2 && !isPrefetch) {
        setIsRefetching(true)
        // Продолжаем загрузку в фоне
      } else {
        return cachedProducts.data
      }
    }
    
    // Отменяем предыдущий запрос
    if (abortControllerRef.current && !isPrefetch) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    if (!isPrefetch) {
      abortControllerRef.current = controller
    }
    
    if (showLoading && !isPrefetch && !isRefetching) {
      setIsLoading(true)
    }
    setError(null)
    
    try {
      const response = await getProducts(filters)
      
      // Проверяем, не был ли запрос отменён
      if (controller.signal.aborted) {
        return null
      }
      
      // Сохраняем в кэш
      productsCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      })
      
      // Кэшируем фильтры отдельно
      if (response.filters) {
        const filtersWithoutPets = { ...response.filters }
        delete filtersWithoutPets.user_pets // Питомцы кэшируются отдельно
        
        filtersCache.set(filtersCacheKey, {
          data: filtersWithoutPets,
          timestamp: Date.now()
        })
      }
      
      if (!isPrefetch) {
        setProducts(response.products || [])
        setPagination(response.pagination)
        setAvailableFilters(response.filters || {})
      }
      
      return response
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return null
      }
      
      if (!isPrefetch) {
        setError(err.message || 'Не удалось загрузить товары')
      }
      throw err
    } finally {
      if (!isPrefetch) {
        setIsLoading(false)
        setIsRefetching(false)
      }
    }
  }, [])
  
  /**
   * Prefetch следующей страницы
   * ВАЖНО: Не зависит от pagination напрямую, чтобы избежать пересоздания
   */
  const prefetchNextPage = useCallback((currentFilters, currentPagination) => {
    const currentPage = parseInt(currentFilters.page || '1', 10)
    const totalPages = currentPagination?.total_pages || 1
    
    if (currentPage < totalPages) {
      const nextPageFilters = { ...currentFilters, page: String(currentPage + 1) }
      const nextCacheKey = getCacheKey(nextPageFilters)
      
      // Prefetch только если не в кэше
      if (!prefetchedPagesRef.current.has(nextCacheKey) && !productsCache.has(nextCacheKey)) {
        prefetchedPagesRef.current.add(nextCacheKey)
        
        // Загружаем в фоне с низким приоритетом
        requestIdleCallback?.(() => {
          fetchProducts(nextPageFilters, { isPrefetch: true, showLoading: false })
        }) || setTimeout(() => {
          fetchProducts(nextPageFilters, { isPrefetch: true, showLoading: false })
        }, 100)
      }
    }
  }, [fetchProducts]) // Убрали pagination из зависимостей
  
  /**
   * Загрузка с debouncing
   * ВАЖНО: Не зависит от prefetchNextPage напрямую через замыкание
   */
  const debouncedFetch = useCallback((filters, delay = 300) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Показываем состояние загрузки сразу для лучшего UX
    setIsLoading(true)
    
    debounceTimerRef.current = setTimeout(() => {
      currentFiltersRef.current = filters
      fetchProducts(filters).then((response) => {
        // После загрузки prefetch следующую страницу (передаём pagination из ответа)
        if (response?.pagination) {
          prefetchNextPage(filters, response.pagination)
        }
      })
    }, delay)
  }, [fetchProducts, prefetchNextPage])
  
  /**
   * Мгновенная загрузка (без debounce, для пагинации)
   */
  const fetchImmediate = useCallback((filters) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    currentFiltersRef.current = filters
    return fetchProducts(filters).then((result) => {
      if (result?.pagination) {
        prefetchNextPage(filters, result.pagination)
      }
      return result
    })
  }, [fetchProducts, prefetchNextPage])
  
  /**
   * Инвалидация кэша
   */
  const invalidateCache = useCallback((filters = null) => {
    if (filters) {
      const cacheKey = getCacheKey(filters)
      productsCache.delete(cacheKey)
    } else {
      productsCache.clear()
      filtersCache.clear()
    }
    prefetchedPagesRef.current.clear()
  }, [])
  
  /**
   * Очистка при размонтировании
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])
  
  return {
    // Данные
    products,
    pagination,
    availableFilters,
    
    // Состояние загрузки
    isLoading,
    isRefetching,
    error,
    
    // Методы
    fetchProducts: debouncedFetch,
    fetchImmediate,
    prefetchNextPage,
    invalidateCache,
    
    // Утилиты
    isCached: (filters) => {
      const cacheKey = getCacheKey(filters)
      return isCacheValid(productsCache.get(cacheKey), CACHE_TTL)
    }
  }
}

/**
 * Хук для prefetch товаров при hover
 */
export function usePrefetchProduct(productId) {
  const prefetch = useCallback(() => {
    // Можно добавить prefetch деталей товара
    // getProduct(productId)
  }, [productId])
  
  return prefetch
}

export default useProducts
