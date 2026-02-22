/**
 * Хук для работы с каталогом курсов
 * 
 * Предоставляет удобный интерфейс для получения списка курсов
 * с фильтрацией, пагинацией и управлением состоянием загрузки.
 * 
 * @example
 *   const { courses, pagination, availableFilters, isLoading, error, fetchCourses, refetch } = useCourses(filters)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getCourses, getUserCourses } from '../api/courses'
import { apiCache } from '../utils/apiCache'
import { useAuthStore } from '../store/authStore'

const COURSES_CACHE_TTL = 60 * 1000 // 1 минута
const USER_COURSES_CACHE_TTL = 2 * 60 * 1000 // 2 минуты

/**
 * Генерация ключа кэша из фильтров
 */
const getCacheKey = (filters) => {
  const sorted = Object.entries(filters)
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `courses:${sorted || 'default'}`
}

/**
 * Сериализация фильтров для стабильного сравнения в useEffect
 */
const serializeFilters = (filters) => getCacheKey(filters)

/**
 * Хук для работы с каталогом курсов
 * 
 * @param {Object} filters - Фильтры каталога (pet_type, category, level, etc.)
 * @param {Object} options - Настройки
 * @param {boolean} options.autoFetch - Загружать автоматически при изменении фильтров (по умолчанию true)
 * @param {boolean} options.loadUserCourses - Загружать курсы пользователя (по умолчанию true)
 * @returns {Object} Состояние и методы для работы с каталогом
 */
export function useCourses(filters = {}, options = {}) {
  const { autoFetch = true, loadUserCourses = true } = options
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const [courses, setCourses] = useState([])
  const [pagination, setPagination] = useState(null)
  const [availableFilters, setAvailableFilters] = useState({})
  const [userCourses, setUserCourses] = useState([])
  const [ownedCourseIds, setOwnedCourseIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const abortControllerRef = useRef(null)
  const filtersKey = useMemo(() => serializeFilters(filters), [filters])

  /**
   * Загрузка каталога курсов
   */
  const fetchCourses = useCallback(async (overrideFilters) => {
    const activeFilters = overrideFilters || filters

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const cacheKey = getCacheKey(activeFilters)
      const response = await apiCache.get(
        cacheKey,
        () => getCourses(activeFilters),
        COURSES_CACHE_TTL
      )

      if (controller.signal.aborted) return null

      setCourses(response.courses || [])
      setPagination(response.pagination || null)
      setAvailableFilters(response.filters || {})
      return response
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return null
      setError(err.message || 'Не удалось загрузить курсы')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  /**
   * Загрузка курсов пользователя (приобретённых)
   */
  const fetchUserCourses = useCallback(async () => {
    if (!isAuthenticated) {
      setUserCourses([])
      setOwnedCourseIds(new Set())
      return
    }

    try {
      const response = await apiCache.get(
        'user-courses',
        () => getUserCourses(),
        USER_COURSES_CACHE_TTL
      )
      const coursesData = response.courses || []
      setUserCourses(coursesData)
      setOwnedCourseIds(new Set(coursesData.map(c => c.course.id)))
    } catch (err) {
      console.error('Не удалось загрузить курсы пользователя:', err)
    }
  }, [isAuthenticated])

  /**
   * Принудительная перезагрузка (с инвалидацией кэша)
   */
  const refetch = useCallback(() => {
    const cacheKey = getCacheKey(filters)
    apiCache.invalidate(cacheKey)
    apiCache.invalidate('user-courses')
    return Promise.all([
      fetchCourses(),
      loadUserCourses ? fetchUserCourses() : Promise.resolve(),
    ])
  }, [filters, fetchCourses, fetchUserCourses, loadUserCourses])

  useEffect(() => {
    if (autoFetch) {
      fetchCourses()
    }
  }, [filtersKey, autoFetch])

  useEffect(() => {
    if (loadUserCourses) {
      fetchUserCourses()
    }
  }, [isAuthenticated, loadUserCourses])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const totalPages = pagination?.total_pages || 1
  const currentPage = pagination?.current_page || 1

  return {
    courses,
    userCourses,
    ownedCourseIds,
    pagination,
    availableFilters,
    isLoading,
    error,
    totalPages,
    currentPage,
    fetchCourses,
    fetchUserCourses,
    refetch,
  }
}

export default useCourses
