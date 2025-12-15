/**
 * Компонент страницы корзины
 * 
 * Корзина покупок с:
 * - Списком товаров в корзине
 * - Редактированием количества
 * - Удалением товаров
 * - Расчётом итого
 * - Формой оформления заказа
 * - Оформлением заказа
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'

/**
 * Форматирование цены с символом рубля
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Компонент страницы корзины
 * 
 * Отображает содержимое корзины и форму оформления заказа.
 */
function Cart() {
  const navigate = useNavigate()
  const { 
    items, 
    total, 
    isLoading, 
    error, 
    loadCart, 
    updateQuantity, 
    removeItem,
    checkout,
    clearError 
  } = useCartStore()
  
  // Состояние формы оформления
  const [shippingAddress, setShippingAddress] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState(null)
  const [orderSuccess, setOrderSuccess] = useState(null)
  
  /**
   * Загрузка корзины при монтировании
   */
  useEffect(() => {
    loadCart()
    return () => clearError()
  }, [loadCart, clearError])
  
  /**
   * Обработчик изменения количества
   */
  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 0) return
    await updateQuantity(productId, newQuantity)
  }
  
  /**
   * Обработчик удаления товара
   */
  const handleRemove = async (productId) => {
    await removeItem(productId)
  }
  
  /**
   * Обработчик оформления заказа
   */
  const handleCheckout = async (e) => {
    e.preventDefault()
    
    if (!shippingAddress.trim()) {
      setCheckoutError('Введите адрес доставки')
      return
    }
    
    setIsCheckingOut(true)
    setCheckoutError(null)
    
    const order = await checkout(shippingAddress)
    
    setIsCheckingOut(false)
    
    if (order) {
      setOrderSuccess(order)
    } else {
      setCheckoutError('Не удалось оформить заказ. Попробуйте ещё раз.')
    }
  }
  
  // Состояние загрузки
  if (isLoading && items.length === 0) {
    return <PageLoader />
  }
  
  // Состояние успешного заказа
  if (orderSuccess) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="card text-center py-12 max-w-lg mx-auto">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Заказ оформлен!
          </h1>
          <p className="text-gray-600 mb-2">
            Номер заказа: <span className="font-semibold">#{orderSuccess.id}</span>
          </p>
          <p className="text-gray-600 mb-6">
            Сумма: <span className="font-semibold">{formatPrice(orderSuccess.total_amount)}</span>
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Детали заказа отправлены на вашу почту. 
            Мы свяжемся с вами для подтверждения доставки.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/shop" className="btn-primary">
              Продолжить покупки
            </Link>
            <Link to="/profile" className="btn-secondary">
              История заказов
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  // Состояние пустой корзины
  if (items.length === 0) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="card text-center py-12 max-w-lg mx-auto">
          <div className="text-6xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Корзина пуста
          </h1>
          <p className="text-gray-600 mb-6">
            Добавьте товары из каталога, чтобы оформить заказ
          </p>
          <Link to="/shop" className="btn-primary">
            Перейти в магазин
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="page-container animate-fadeIn">
      <h1 className="page-title">Корзина</h1>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-6">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Товары в корзине */}
        <div className="lg:col-span-2">
          <div className="card divide-y divide-gray-100">
            {items.map(item => (
              <div key={item.product.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex gap-4">
                  {/* Заглушка изображения товара */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl opacity-50">
                      {item.product.pet_type === 'dog' ? '🐕' : item.product.pet_type === 'cat' ? '🐱' : '🐾'}
                    </span>
                  </div>
                  
                  {/* Информация о товаре */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {item.product.description}
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {formatPrice(item.product.price)}
                    </p>
                  </div>
                  
                  {/* Управление количеством */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      disabled={isLoading}
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      disabled={isLoading}
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Сумма и удаление */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => handleRemove(item.product.id)}
                      className="text-sm text-red-600 hover:text-red-700 mt-1"
                      disabled={isLoading}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Итог и оформление заказа */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Оформление заказа
            </h2>
            
            {/* Итог заказа */}
            <div className="space-y-2 pb-4 border-b border-gray-100">
              <div className="flex justify-between text-gray-600">
                <span>Товаров:</span>
                <span>{items.reduce((sum, i) => sum + i.quantity, 0)} шт.</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Итого:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            
            {/* Форма оформления */}
            <form onSubmit={handleCheckout} className="pt-4 space-y-4">
              {checkoutError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {checkoutError}
                </div>
              )}
              
              <div>
                <label htmlFor="address" className="label">
                  Адрес доставки
                </label>
                <textarea
                  id="address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Город, улица, дом, квартира"
                  disabled={isCheckingOut}
                />
              </div>
              
              <button
                type="submit"
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                disabled={isCheckingOut || isLoading}
              >
                {isCheckingOut ? (
                  <>
                    <ButtonLoader />
                    Оформление...
                  </>
                ) : (
                  'Оформить заказ'
                )}
              </button>
            </form>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Нажимая кнопку, вы соглашаетесь с условиями доставки
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
