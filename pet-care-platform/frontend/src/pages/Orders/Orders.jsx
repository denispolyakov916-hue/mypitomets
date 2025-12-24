/**
 * Страница списка заказов
 * 
 * Отображает все заказы пользователя с современным UX/UI для e-commerce.
 * Позволяет перейти к деталям каждого заказа.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getOrders } from '../../api/shop'
import { createPayment } from '../../api/payments'
import { PageLoader } from '../../components/Loader'
import { useToastStore } from '../../store/toastStore'
import OrderTimer from '../../components/OrderTimer'

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
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Форматирование короткой даты
 */
const formatShortDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера'
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    })
  }
}

/**
 * Названия и стили статусов заказов
 */
const statusConfig = {
  pending: {
    label: 'Ожидает оплаты',
    class: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  expired: {
    label: 'Истёк срок оплаты',
    class: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  processing: {
    label: 'В обработке',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  },
  shipped: {
    label: 'Отправлен',
    class: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  delivered: {
    label: 'Доставлен',
    class: 'bg-green-100 text-green-800 border-green-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  cancelled: {
    label: 'Отменён',
    class: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
}

/**
 * Компонент карточки заказа
 */
function OrderCard({ order, onOrderExpired }) {
  const navigate = useNavigate()
  const status = statusConfig[order.status] || statusConfig.pending

  // Подсчет товаров и курсов
  const productsCount = order.items.filter(item => item.product_id).length
  const coursesCount = order.items.filter(item => item.course_id).length
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
  
  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <div className="p-6">
        {/* Заголовок заказа */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Заказ #{order.id.slice(0, 8).toUpperCase()}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${status.class}`}>
                {status.icon}
                {status.label}
              </span>
              {order.status === 'pending' && order.expires_at && (
                <OrderTimer
                  expiresAt={order.expires_at}
                  onExpired={() => {
                    // Заказ истек, обновим конкретный заказ
                    if (onOrderExpired) {
                      onOrderExpired(order.id)
                    }
                  }}
                />
              )}
            </div>
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(order.total_amount)}
            </span>
          </div>
        </div>
        
        {/* Информация о товарах */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {productsCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {productsCount} {productsCount === 1 ? 'товар' : productsCount < 5 ? 'товара' : 'товаров'}
                </span>
              )}
              {coursesCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {coursesCount} {coursesCount === 1 ? 'курс' : coursesCount < 5 ? 'курса' : 'курсов'}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {totalItems} {totalItems === 1 ? 'позиция' : totalItems < 5 ? 'позиции' : 'позиций'}
            </span>
          </div>
          
          {/* Превью товаров */}
          <div className="flex flex-wrap gap-2 mb-3">
            {order.items.slice(0, 3).map((item, idx) => (
              <div 
                key={idx}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-700"
              >
                {item.product_id ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="font-medium">{item.product_name}</span>
                    {item.quantity > 1 && (
                      <span className="text-gray-500">× {item.quantity}</span>
                    )}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium">{item.course_name}</span>
                  </>
                )}
              </div>
            ))}
            {order.items.length > 3 && (
              <div className="inline-flex items-center px-2.5 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-500">
                +{order.items.length - 3} ещё
              </div>
            )}
          </div>
          
          {/* Адрес доставки (если есть товары) */}
          {productsCount > 0 && order.shipping_address && (
            <div className="flex items-start gap-2 text-sm text-gray-600 pt-3 border-t border-gray-100">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1">{order.shipping_address}</span>
            </div>
          )}
        </div>
        
        {/* Кнопка действий */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          {(order.status === 'pending' || order.status === 'expired') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePayOrder(order.id, order.total_amount)
              }}
              className="btn-primary text-sm"
            >
              {order.status === 'pending' ? 'Оплатить заказ' : 'Попробовать оплатить снова'}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/orders/${order.id}`)
            }}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1.5"
          >
            Подробнее
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Обработчик оплаты заказа
 */
const handlePayOrder = async (orderId, amount) => {
  try {
    // Создаем платеж для существующего заказа
    const response = await createPayment({
      payment_type: 'shop_order',
      object_id: orderId,
      amount: amount
    })

    if (response.payment) {
      // Перенаправляем на страницу оплаты с payment_id
      window.location.href = `/payment?payment_id=${response.payment.id}&amount=${response.payment.amount}`
    } else {
      throw new Error('Не удалось создать платеж')
    }
  } catch (error) {
    console.error('Ошибка создания платежа:', error)
    // Показываем ошибку пользователю
    alert('Не удалось создать платеж. Попробуйте позже.')
  }
}

/**
 * Компонент страницы заказов
 */
function Orders() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { error: showError } = useToastStore()

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getOrders()
      setOrders(response.orders || [])
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Не удалось загрузить заказы'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOrderExpired = (orderId) => {
    // Обновляем статус заказа на 'expired' локально
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: 'expired' }
          : order
      )
    )
  }

  useEffect(() => {
    fetchOrders()

    // Автообновление заказов каждые 5 минут (уменьшено для снижения нагрузки)
    const interval = setInterval(() => {
      fetchOrders()
    }, 300000) // Каждые 5 минут

    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return <PageLoader />
  }
  
  if (error && orders.length === 0) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Не удалось загрузить заказы
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={fetchOrders} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }
  
  // Группировка заказов по дате
  const groupedOrders = orders.reduce((acc, order) => {
    const dateKey = formatShortDate(order.created_at)
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(order)
    return acc
  }, {})
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="page-title mb-2">Мои заказы</h1>
        <p className="text-gray-600">
          История всех ваших заказов
        </p>
      </div>
      
      {/* Список заказов */}
      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-6">📦</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            У вас пока нет заказов
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Сделайте первый заказ в нашем магазине или приобретите обучающий курс
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/shop" className="btn-primary">
              Перейти в магазин
            </Link>
            <Link to="/courses" className="btn-secondary">
              Смотреть курсы
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedOrders).map(([dateKey, dateOrders]) => (
            <div key={dateKey}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary-600 rounded-full"></span>
                {dateKey}
              </h2>
              <div className="space-y-4">
                {dateOrders.map(order => (
                  <OrderCard key={order.id} order={order} onOrderExpired={handleOrderExpired} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders

