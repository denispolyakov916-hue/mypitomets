/**
 * Хук для работы с заказами пользователя
 * 
 * Предоставляет удобный интерфейс для получения списка заказов
 * с автообновлением и управлением состоянием загрузки.
 * 
 * @example
 *   const { orders, isLoading, error, refetch, handleOrderExpired } = useOrders()
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getOrders } from '../api/shop'

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 минут

/**
 * Хук для работы с заказами пользователя
 * 
 * @param {Object} options - Настройки
 * @param {boolean} options.autoRefresh - Автообновление каждые 5 минут (по умолчанию true)
 * @returns {Object} Состояние и методы для работы с заказами
 */
export function useOrders(options = {}) {
  const { autoRefresh = true } = options

  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const intervalRef = useRef(null)

  /**
   * Загрузка заказов
   */
  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getOrders()
      setOrders(response.orders || [])
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Не удалось загрузить заказы'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Обновление статуса истёкшего заказа (локально)
   */
  const handleOrderExpired = useCallback((orderId) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: 'expired' }
          : order
      )
    )
  }, [])

  /**
   * Принудительная перезагрузка
   */
  const refetch = useCallback(() => {
    return fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    fetchOrders()

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchOrders, AUTO_REFRESH_INTERVAL)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchOrders, autoRefresh])

  return {
    orders,
    isLoading,
    error,
    refetch,
    handleOrderExpired,
  }
}

export default useOrders
