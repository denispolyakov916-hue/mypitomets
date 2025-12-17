/**
 * Компонент выпадающего меню заказов
 * 
 * Отображает список неоплаченных заказов пользователя
 * с возможностью перехода к оплате
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getOrders } from '../api/shop'

/**
 * Форматирование цены
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Форматирование даты
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Компонент OrdersDropdown
 */
function OrdersDropdown() {
  const [orders, setOrders] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef(null)
  
  /**
   * Загрузка заказов
   */
  useEffect(() => {
    if (isOpen) {
      fetchOrders()
    }
  }, [isOpen])
  
  /**
   * Закрытие при клике вне компонента
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  /**
   * Загрузка заказов из API
   */
  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const response = await getOrders()
      // Фильтруем только неоплаченные заказы (pending)
      const pendingOrders = (response.orders || []).filter(
        order => order.status === 'pending'
      )
      setOrders(pendingOrders)
    } catch (err) {
      console.error('Не удалось загрузить заказы:', err)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Подсчет неоплаченных заказов
   */
  const pendingCount = orders.filter(order => order.status === 'pending').length
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Кнопка открытия */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
      
      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Мои заказы</h3>
            <p className="text-xs text-gray-500 mt-1">
              Неоплаченные заказы
            </p>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Загрузка...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">Нет неоплаченных заказов</p>
                <Link
                  to="/profile?tab=orders"
                  className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
                  onClick={() => setIsOpen(false)}
                >
                  Посмотреть все заказы
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map(order => (
                  <Link
                    key={order.id}
                    to={`/payment?order_id=${order.id}&type=product&amount=${order.total_amount}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          Заказ #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary-600">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.items.length} товар(ов)
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Требуется оплата
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <Link
              to="/profile?tab=orders"
              className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Посмотреть все заказы
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersDropdown

