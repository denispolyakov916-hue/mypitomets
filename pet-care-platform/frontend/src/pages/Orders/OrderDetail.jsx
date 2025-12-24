/**
 * Страница деталей заказа
 * 
 * Отображает полную информацию о заказе:
 * - Номер заказа, статус, дата
 * - Состав заказа (товары и курсы)
 * - Цены, скидки, доставка
 * - Адрес доставки
 * - Информация об оплате
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getOrders, createReturn } from '../../api/shop'
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
  if (!dateString) return '—'
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
 * Названия и стили статусов заказов
 */
const statusConfig = {
  pending: {
    label: 'Ожидает оплаты',
    class: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  expired: {
    label: 'Истёк срок оплаты',
    class: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  processing: {
    label: 'В обработке',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  },
  shipped: {
    label: 'Отправлен',
    class: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  delivered: {
    label: 'Доставлен',
    class: 'bg-green-100 text-green-800 border-green-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  cancelled: {
    label: 'Отменён',
    class: 'bg-red-100 text-red-800 border-red-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
}

/**
 * Названия типов доставки
 */
const deliveryTypeLabels = {
  standard: 'Стандартная доставка',
  express: 'Экспресс доставка',
  pickup: 'Самовывоз'
}

/**
 * Компонент деталей заказа
 */
function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { error: showError, success } = useToastStore()

  // Модальное окно возврата
  const [returnModal, setReturnModal] = useState({
    isOpen: false,
    orderItem: null,
    maxQuantity: 0
  })
  const [returnForm, setReturnForm] = useState({
    quantity: 1,
    reason: 'not_satisfied',
    description: ''
  })
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)

  const fetchOrder = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getOrders()
      const foundOrder = response.orders?.find(o => o.id === id)

      if (!foundOrder) {
        setError('Заказ не найден')
        showError('Заказ не найден')
      } else {
        setOrder(foundOrder)
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Не удалось загрузить заказ'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Открыть модальное окно возврата
   */
  const openReturnModal = (orderItem) => {
    setReturnModal({
      isOpen: true,
      orderItem,
      maxQuantity: orderItem.quantity
    })
    setReturnForm({
      quantity: orderItem.quantity,
      reason: 'not_satisfied',
      description: ''
    })
  }

  /**
   * Закрыть модальное окно возврата
   */
  const closeReturnModal = () => {
    setReturnModal({
      isOpen: false,
      orderItem: null,
      maxQuantity: 0
    })
    setReturnForm({
      quantity: 1,
      reason: 'not_satisfied',
      description: ''
    })
  }

  /**
   * Создать запрос на возврат
   */
  const submitReturn = async () => {
    if (!returnModal.orderItem) return

    setIsSubmittingReturn(true)
    try {
      await createReturn({
        order_item_id: returnModal.orderItem.id,
        quantity: returnForm.quantity,
        reason: returnForm.reason,
        description: returnForm.description.trim() || undefined
      })

      success('Запрос на возврат успешно создан. Мы рассмотрим его в ближайшее время.')
      closeReturnModal()
      // Обновляем заказ, чтобы показать изменения
      fetchOrder()
    } catch (err) {
      showError(err.message || 'Не удалось создать запрос на возврат')
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [id])

  // Автообновление заказа каждую минуту, если он в статусе pending
  useEffect(() => {
    if (!order || order.status !== 'pending') {
      return
    }

    const interval = setInterval(() => {
      fetchOrder()
    }, 60000) // Каждую минуту

    return () => clearInterval(interval)
  }, [order?.status, order?.id])

  if (isLoading) {
    return <PageLoader />
  }
  
  if (error || !order) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Заказ не найден'}
          </h2>
          <p className="text-gray-600 mb-6">
            Не удалось загрузить информацию о заказе
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={fetchOrder} className="btn-primary">
              Попробовать снова
            </button>
            <Link to="/orders" className="btn-secondary">
              Вернуться к заказам
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  const status = statusConfig[order.status] || statusConfig.pending
  const products = order.items.filter(item => item.product_id)
  const courses = order.items.filter(item => item.course_id)
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Кнопка назад */}
      <button
        onClick={() => navigate('/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="font-medium">Вернуться к заказам</span>
      </button>
      
      {/* Сообщение об истечении срока оплаты */}
      {order.status === 'expired' && (
        <div className="card mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">
                Истёк срок оплаты
              </h3>
              <p className="text-red-700">
                К сожалению, оплата не была произведена в течение отведённого времени. 
                Товары возвращены на склад. Вы можете попробовать оплатить заказ снова.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Заголовок заказа */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Заказ #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-gray-600">
              Оформлен {formatDate(order.created_at)}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${status.class}`}>
                {status.icon}
                {status.label}
              </span>
              
              {order.status === 'pending' && order.expires_at && (
                <OrderTimer
                  expiresAt={order.expires_at}
                  onExpired={() => {
                    // Обновляем статус заказа при истечении времени
                    setOrder(prevOrder => prevOrder ? { ...prevOrder, status: 'expired' } : null)
                  }}
                />
              )}
            </div>
            
            {order.status === 'pending' && (
              <Link
                to={`/payment?order_id=${order.id}&type=shop_order&amount=${order.total_amount}`}
                className="btn-primary"
              >
                Оплатить заказ
              </Link>
            )}
            
            {order.status === 'expired' && (
              <Link
                to={`/payment?order_id=${order.id}&type=shop_order&amount=${order.total_amount}`}
                className="btn-primary"
              >
                Попробовать оплатить снова
              </Link>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Товары */}
          {products.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Товары ({products.length})
              </h2>
              
              <div className="space-y-4">
                {products.map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <Link
                        to={`/shop/products/${item.product_id}`}
                        className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {item.product_name}
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Количество: {item.quantity}</span>
                        <span>Цена: {formatPrice(item.price)}</span>
                      </div>
                      {/* Кнопка возврата для доставленных товаров */}
                      {order.status === 'delivered' && item.product_id && (
                        <button
                          onClick={() => openReturnModal(item)}
                          className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Оформить возврат
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatPrice(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Курсы */}
          {courses.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Курсы ({courses.length})
              </h2>
              
              <div className="space-y-4">
                {courses.map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <Link
                        to={`/courses/${item.course_id}`}
                        className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {item.course_name}
                      </Link>
                      {item.pet && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                            <span>🐾</span>
                            Для: {item.pet.name}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 text-sm text-gray-600">
                        Цена: {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatPrice(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Боковая панель с информацией */}
        <div className="space-y-6">
          {/* Итоговая информация */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Итого
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Товары</span>
                <span>{formatPrice(order.subtotal_amount)}</span>
              </div>
              
              {order.delivery_cost > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Доставка</span>
                  <span>{formatPrice(order.delivery_cost)}</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">К оплате</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Информация о доставке */}
          {products.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Доставка
              </h2>
              
              <div className="space-y-3">
                {order.delivery_type && (
                  <div>
                    <span className="text-sm text-gray-500">Тип доставки</span>
                    <p className="text-gray-900 font-medium">
                      {deliveryTypeLabels[order.delivery_type] || order.delivery_type}
                    </p>
                  </div>
                )}
                
                {order.delivery_date && (
                  <div>
                    <span className="text-sm text-gray-500">Дата доставки</span>
                    <p className="text-gray-900 font-medium">
                      {formatDate(order.delivery_date)}
                    </p>
                  </div>
                )}
                
                {order.shipping_address && (
                  <div>
                    <span className="text-sm text-gray-500">Адрес доставки</span>
                    <p className="text-gray-900 font-medium">
                      {order.shipping_address}
                    </p>
                  </div>
                )}
                
                {order.recipient_name && (
                  <div>
                    <span className="text-sm text-gray-500">Получатель</span>
                    <p className="text-gray-900 font-medium">
                      {order.recipient_name}
                    </p>
                  </div>
                )}
                
                {order.recipient_phone && (
                  <div>
                    <span className="text-sm text-gray-500">Телефон</span>
                    <p className="text-gray-900 font-medium">
                      {order.recipient_phone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Информация о заказе */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Информация
            </h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Номер заказа</span>
                <p className="text-gray-900 font-mono font-medium">
                  {order.id.toUpperCase()}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Дата оформления</span>
                <p className="text-gray-900 font-medium">
                  {formatDate(order.created_at)}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Статус</span>
                <p className="text-gray-900 font-medium">
                  {status.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно возврата */}
      {returnModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Оформить возврат</h3>
              <button
                onClick={closeReturnModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {returnModal.orderItem && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Товар:</p>
                <p className="font-medium text-gray-900">{returnModal.orderItem.product_name}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submitReturn(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество для возврата
                </label>
                <input
                  type="number"
                  min="1"
                  max={returnModal.maxQuantity}
                  value={returnForm.quantity}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Максимум: {returnModal.maxQuantity} шт.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Причина возврата
                </label>
                <select
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="not_satisfied">Не подошел</option>
                  <option value="defective">Брак/Повреждение</option>
                  <option value="wrong_item">Не тот товар</option>
                  <option value="changed_mind">Передумал</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание (опционально)
                </label>
                <textarea
                  value={returnForm.description}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Опишите причину возврата подробнее..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeReturnModal}
                  className="flex-1 btn-secondary"
                  disabled={isSubmittingReturn}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="flex-1 btn-primary"
                >
                  {isSubmittingReturn ? 'Отправка...' : 'Отправить запрос'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail

