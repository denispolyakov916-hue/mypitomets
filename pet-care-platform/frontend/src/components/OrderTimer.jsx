/**
 * Компонент таймера для заказа со статусом "ожидает оплаты"
 * 
 * Отображает обратный отсчет времени до истечения срока оплаты
 */

import { useState, useEffect } from 'react'

/**
 * Форматирование времени для таймера
 */
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Компонент таймера заказа
 * 
 * @param {string} expiresAt - ISO строка времени истечения
 * @param {function} onExpired - Callback при истечении времени
 */
function OrderTimer({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) {
      return
    }

    const updateTimer = () => {
      const now = new Date().getTime()
      const expires = new Date(expiresAt).getTime()
      const diff = Math.floor((expires - now) / 1000)

      if (diff <= 0) {
        if (!isExpired) {
          setIsExpired(true)
          setTimeLeft(0)
          if (onExpired) {
            onExpired()
          }
        }
      } else {
        setIsExpired(false)
        setTimeLeft(diff)
      }
    }

    // Обновляем сразу
    updateTimer()

    // Обновляем каждую секунду
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpired, isExpired])

  if (!expiresAt || isExpired) {
    return null
  }

  if (timeLeft === null) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Загрузка...
      </span>
    )
  }

  // Цвет меняется в зависимости от оставшегося времени
  const isUrgent = timeLeft < 60 // Меньше минуты
  const isWarning = timeLeft < 300 // Меньше 5 минут

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
      isUrgent 
        ? 'text-red-600' 
        : isWarning 
          ? 'text-amber-600' 
          : 'text-gray-700'
    }`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Осталось: {formatTime(timeLeft)}
    </span>
  )
}

export default OrderTimer

