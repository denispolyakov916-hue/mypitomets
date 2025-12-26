import { useState, useEffect, useCallback, useRef } from 'react'
import { getCourseProgress, updateLessonProgress } from '../../api/courses'

/**
 * Хук для управления прогрессом обучения
 *
 * Предоставляет функции для:
 * - Загрузки прогресса по курсу
 * - Обновления прогресса по урокам
 * - Автоматического сохранения
 * - Синхронизации между устройствами
 *
 * @param {number} courseId - ID курса
 * @param {string} petId - ID питомца
 * @returns {Object} Объект с состоянием и методами прогресса
 */
export const useProgress = (courseId, petId) => {
  const [courseProgress, setCourseProgress] = useState(null)
  const [lessonProgress, setLessonProgress] = useState(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Refs для управления таймерами
  const saveTimeoutRef = useRef(null)
  const pendingUpdatesRef = useRef(new Map())

  // Отслеживание статуса сети
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Загрузка прогресса при изменении courseId или petId
  useEffect(() => {
    if (courseId && petId) {
      loadProgress()
    } else {
      setCourseProgress(null)
      setLessonProgress(new Map())
    }
  }, [courseId, petId])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Загрузка прогресса по курсу
   */
  const loadProgress = useCallback(async () => {
    if (!courseId || !petId) return

    try {
      setLoading(true)
      setError(null)

      const response = await getCourseProgress(courseId, petId)
      const progress = response.data.progress

      setCourseProgress(progress)

      // Преобразование массива уроков в Map для быстрого доступа
      const lessonMap = new Map()
      progress.lessons_progress.forEach(lesson => {
        lessonMap.set(lesson.lesson_id, lesson)
      })
      setLessonProgress(lessonMap)

    } catch (err) {
      console.error('Error loading progress:', err)
      setError('Не удалось загрузить прогресс')

      // Если прогресс не найден, создаем пустой
      if (err.response?.status === 404) {
        setCourseProgress(null)
        setLessonProgress(new Map())
      }
    } finally {
      setLoading(false)
    }
  }, [courseId, petId])

  /**
   * Получение прогресса по уроку
   */
  const getLessonProgress = useCallback((lessonId) => {
    return lessonProgress.get(lessonId) || null
  }, [lessonProgress])

  /**
   * Обновление прогресса по уроку
   */
  const updateLessonProgressData = useCallback(async (lessonId, updates) => {
    if (!isOnline) {
      // Сохраняем обновления для синхронизации при восстановлении связи
      pendingUpdatesRef.current.set(lessonId, {
        ...pendingUpdatesRef.current.get(lessonId),
        ...updates,
        timestamp: Date.now()
      })
      return
    }

    try {
      const response = await updateLessonProgress(lessonId, petId, updates)

      // Обновляем локальное состояние
      setLessonProgress(prev => {
        const newMap = new Map(prev)
        const currentProgress = newMap.get(lessonId) || {
          lesson_id: lessonId,
          status: 'not_started',
          time_spent: 0,
          attempts_count: 0,
          success_rate: 0
        }

        newMap.set(lessonId, {
          ...currentProgress,
          ...updates,
          updated_at: new Date().toISOString()
        })

        return newMap
      })

      // Обновляем общий прогресс курса
      if (updates.status === 'completed' || updates.time_spent) {
        loadProgress()
      }

      return response.data
    } catch (err) {
      console.error('Error updating lesson progress:', err)
      setError('Не удалось сохранить прогресс')
      throw err
    }
  }, [petId, isOnline, loadProgress])

  /**
   * Отложенное сохранение прогресса (автосохранение)
   */
  const debouncedSave = useCallback((lessonId, updates) => {
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Устанавливаем новый таймер на 2 секунды
    saveTimeoutRef.current = setTimeout(() => {
      updateLessonProgressData(lessonId, updates)
    }, 2000)
  }, [updateLessonProgressData])

  /**
   * Мгновенное сохранение прогресса
   */
  const saveProgressImmediately = useCallback((lessonId, updates) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    return updateLessonProgressData(lessonId, updates)
  }, [updateLessonProgressData])

  /**
   * Синхронизация отложенных обновлений при восстановлении связи
   */
  useEffect(() => {
    if (isOnline && pendingUpdatesRef.current.size > 0) {
      // Синхронизируем отложенные обновления
      pendingUpdatesRef.current.forEach((updates, lessonId) => {
        updateLessonProgressData(lessonId, updates)
      })
      pendingUpdatesRef.current.clear()
    }
  }, [isOnline, updateLessonProgressData])

  /**
   * Проверка, завершен ли урок
   */
  const isLessonCompleted = useCallback((lessonId) => {
    const progress = getLessonProgress(lessonId)
    return progress?.status === 'completed'
  }, [getLessonProgress])

  /**
   * Получение следующего урока для изучения
   */
  const getNextLesson = useCallback(() => {
    if (!courseProgress) return null

    // Находим первый незавершенный урок
    for (const lesson of courseProgress.lessons_progress) {
      if (lesson.progress?.status !== 'completed') {
        return lesson.lesson_id
      }
    }

    return null // Все уроки завершены
  }, [courseProgress])

  /**
   * Получение статистики прогресса
   */
  const getProgressStats = useCallback(() => {
    if (!courseProgress) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        progressPercent: 0,
        totalTimeSpent: 0
      }
    }

    const completedLessons = courseProgress.lessons_progress.filter(
      lesson => lesson.progress?.status === 'completed'
    ).length

    return {
      totalLessons: courseProgress.lessons_progress.length,
      completedLessons,
      progressPercent: courseProgress.progress_percent,
      totalTimeSpent: courseProgress.total_time_spent
    }
  }, [courseProgress])

  /**
   * Сброс прогресса (для отладки)
   */
  const resetProgress = useCallback(() => {
    setCourseProgress(null)
    setLessonProgress(new Map())
    setError(null)
  }, [])

  return {
    // Состояние
    courseProgress,
    lessonProgress,
    loading,
    error,
    isOnline,

    // Методы
    loadProgress,
    getLessonProgress,
    updateLessonProgressData,
    debouncedSave,
    saveProgressImmediately,
    isLessonCompleted,
    getNextLesson,
    getProgressStats,
    resetProgress
  }
}

export default useProgress
