/**
 * Хук для загрузки данных одного курса
 * 
 * Предоставляет удобный интерфейс для получения детальной информации
 * о курсе по его ID с кэшированием и управлением состоянием.
 * 
 * @example
 *   const { course, isOwned, isLoading, error, refetch } = useCourse(courseId)
 */

import { useState, useEffect, useCallback } from 'react'
import { getCourse } from '../api/courses'
import { apiCache } from '../utils/apiCache'

const COURSE_CACHE_TTL = 2 * 60 * 1000 // 2 минуты

/**
 * Хук для загрузки данных одного курса
 * 
 * @param {string|number} courseId - ID курса
 * @returns {Object} Данные курса, состояние загрузки и методы
 */
export function useCourse(courseId) {
  const [course, setCourse] = useState(null)
  const [isOwned, setIsOwned] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Загрузка данных курса
   */
  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const cacheKey = `course:${courseId}`
      const response = await apiCache.get(
        cacheKey,
        () => getCourse(courseId),
        COURSE_CACHE_TTL
      )
      setCourse(response.course)
      setIsOwned(response.is_owned || false)
      return response
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные курса')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  /**
   * Принудительная перезагрузка (с инвалидацией кэша)
   */
  const refetch = useCallback(() => {
    apiCache.invalidate(`course:${courseId}`)
    return fetchCourse()
  }, [courseId, fetchCourse])

  /**
   * Обновить статус владения (для оптимистичных обновлений)
   */
  const setOwned = useCallback((owned) => {
    setIsOwned(owned)
  }, [])

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  return {
    course,
    isOwned,
    isLoading,
    error,
    refetch,
    setOwned,
  }
}

export default useCourse
