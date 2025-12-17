/**
 * Компонент страницы оформления заказа товаров
 * 
 * Отображает товары из корзины и форму для ввода адреса доставки
 * После нажатия "Оформить заказ" переходит на страницу оплаты
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCart, createOrder } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'

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
 * Компонент страницы ProductCheckout
 */
function ProductCheckout() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { refreshCart } = useCartStore()
  
  const [cart, setCart] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [error, setError] = useState(null)
  const [shippingAddress, setShippingAddress] = useState('')
  
  /**
   * Проверка аутентификации и загрузка корзины
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchCart()
  }, [isAuthenticated])
  
  /**
   * Загрузка корзины
   */
  const fetchCart = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getCart()
      if (response.cart.length === 0) {
        navigate('/cart')
        return
      }
      setCart(response)
    } catch (err) {
      setError(err.message || 'Не удалось загрузить корзину')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик оформления заказа
   */
  const handleCreateOrder = async (e) => {
    e.preventDefault()
    
    if (!shippingAddress.trim()) {
      alert('Введите адрес доставки')
      return
    }
    
    setIsCreatingOrder(true)
    setError(null)
    
    try {
      const response = await createOrder(shippingAddress.trim())
      await refreshCart()
      // Переходим на страницу оплаты
      navigate(`/payment?order_id=${response.order.id}&type=product&amount=${response.order.total_amount}`)
    } catch (err) {
      setError(err.message || 'Не удалось оформить заказ')
    } finally {
      setIsCreatingOrder(false)
    }
  }
  
  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !cart || cart.cart.length === 0) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Корзина пуста'}</p>
          <Link to="/cart" className="btn-primary">
            Вернуться в корзину
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="page-container animate-fadeIn">
      <div className="max-w-3xl mx-auto">
        {/* Ссылка назад */}
        <Link 
          to="/cart" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад в корзину
        </Link>
        
        {/* Заголовок */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Оформление заказа
        </h1>
        
        <form onSubmit={handleCreateOrder} className="space-y-6">
          {/* Товары в заказе */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Товары в заказе ({cart.cart.length})
            </h2>
            
            <div className="space-y-4">
              {cart.cart.map((item, idx) => (
                <div key={idx} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.product.main_image ? (
                      <img 
                        src={item.product.main_image} 
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Количество: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.product.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Адрес доставки */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Адрес доставки
            </h2>
            
            <div>
              <label htmlFor="shipping_address" className="label">
                Адрес доставки <span className="text-red-500">*</span>
              </label>
              <textarea
                id="shipping_address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Введите полный адрес доставки"
                required
                disabled={isCreatingOrder}
              />
            </div>
          </div>
          
          {/* Итоговая сумма */}
          <div className="card">
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Товары ({cart.items_count}):</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Доставка:</span>
                <span>Бесплатно</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                <span>Итого к оплате:</span>
                <span className="text-primary-600">{formatPrice(cart.total)}</span>
              </div>
            </div>
          </div>
          
          {/* Ошибка */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {error}
            </div>
          )}
          
          {/* Кнопка оформления заказа */}
          <button
            type="submit"
            disabled={isCreatingOrder}
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
          >
            {isCreatingOrder ? (
              <>
                <ButtonLoader />
                Оформление заказа...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15l1-4 4 1M9 6l1 4 4-1" />
                </svg>
                Оформить заказ
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500 text-center">
            Нажимая кнопку, вы соглашаетесь с условиями предоставления услуг
          </p>
        </form>
      </div>
    </div>
  )
}

export default ProductCheckout

