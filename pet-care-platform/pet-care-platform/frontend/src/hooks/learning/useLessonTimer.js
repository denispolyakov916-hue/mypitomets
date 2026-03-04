import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Хук для отслеживания времени просмотра урока
 *
 * Автоматически отсчитывает время и предоставляет функции
 * для паузы, продолжения и сброса таймера.
 *
 * @param {number} lessonId - ID урока
 * @param {Function} onTimeUpdate - Callback при обновлении времени
 * @param {boolean} autoStart - Автоматический запуск таймера
 * @returns {Object} Объект с состоянием и методами таймера
 */
export const useLessonTimer = (lessonId, onTimeUpdate, autoStart = false) => {
  const [timeSpent, setTimeSpent] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const intervalRef = useRef(null)

  // Запуск таймера при изменении lessonId
  useEffect(() => {
    if (lessonId) {
      reset()
      if (autoStart) {
        start()
      }
    } else {
      stop()
      reset()
    }
  }, [lessonId, autoStart])

  // Очистка интервала при размонтировании
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  /**
   * Запуск таймера
   */
  const start = useCallback(() => {
    if (isRunning) return

    setIsRunning(true)
    setStartTime(Date.now())

    intervalRef.current = setInterval(() => {
      setTimeSpent(prev => {
        const newTime = prev + 1

        // Вызываем callback каждые 10 секунд
        if (newTime % 10 === 0 && onTimeUpdate) {
          onTimeUpdate(lessonId, newTime)
        }

        return newTime
      })
    }, 1000)
  }, [isRunning, lessonId, onTimeUpdate])

  /**
   * Остановка таймера
   */
  const stop = useCallback(() => {
    if (!isRunning) return

    setIsRunning(false)
    setStartTime(null)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isRunning])

  /**
   * Пауза таймера
   */
  const pause = useCallback(() => {
    stop()
  }, [stop])

  /**
   * Продолжение таймера
   */
  const resume = useCallback(() => {
    start()
  }, [start])

  /**
   * Сброс таймера
   */
  const reset = useCallback(() => {
    stop()
    setTimeSpent(0)
    setStartTime(null)
  }, [stop])

  /**
   * Установка времени (при загрузке существующего прогресса)
   */
  const setTime = useCallback((seconds) => {
    setTimeSpent(seconds)
  }, [])

  /**
   * Получение текущего времени в человекочитаемом формате
   */
  const getFormattedTime = useCallback(() => {
    const minutes = Math.floor(timeSpent / 60)
    const seconds = timeSpent % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [timeSpent])

  /**
   * Получение времени в часах:минутах:секундах
   */
  const getFullFormattedTime = useCallback(() => {
    const hours = Math.floor(timeSpent / 3600)
    const minutes = Math.floor((timeSpent % 3600) / 60)
    const seconds = timeSpent % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [timeSpent])

  return {
    // Состояние
    timeSpent,
    isRunning,
    startTime,

    // Методы управления
    start,
    stop,
    pause,
    resume,
    reset,
    setTime,

    // Форматирование
    getFormattedTime,
    getFullFormattedTime
  }
}

export default useLessonTimer
