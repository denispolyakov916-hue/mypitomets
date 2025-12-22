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
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const { 
    items, 
    total, 
    isLoading, 
    error, 
    loadCart, 
    updateQuantity, 
    removeItem,
    clearError 
  } = useCartStore()
  
  // Сообщение из редиректа (например, при истечении времени checkout)
  const [redirectMessage, setRedirectMessage] = useState(null)
  
  /**
   * Загрузка корзины при монтировании и обработка сообщений
   */
  useEffect(() => {
    loadCart()
    
    // Показываем сообщение из редиректа
    if (location.state?.message) {
      setRedirectMessage(location.state.message)
      // Очищаем state чтобы сообщение не показывалось повторно
      navigate(location.pathname, { replace: true, state: {} })
    }
    
    return () => clearError()
  }, [loadCart, clearError, location.state, navigate, location.pathname])
  
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
   * Проверка, является ли элемент курсом
   */
  const isCourse = (item) => {
    return item.course !== undefined && item.course !== null
  }
  
  
  // Состояние загрузки
  if (isLoading && items.length === 0) {
    return <PageLoader />
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
      
      {/* Сообщение из редиректа */}
      {redirectMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{redirectMessage}</span>
          <button 
            onClick={() => setRedirectMessage(null)}
            className="ml-auto text-amber-600 hover:text-amber-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm mb-6">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Товары в корзине */}
        <div className="lg:col-span-2">
          <div className="card divide-y divide-gray-100">
            {items.map(item => {
              // Безопасная проверка структуры данных
              if (!item) return null
              
              const isCourseItem = isCourse(item)
              
              // Если это не курс и нет product, пропускаем
              if (!isCourseItem && !item.product) {
                console.error('Cart item missing product:', item)
                return null
              }
              
              const itemId = isCourseItem 
                ? (item.course?.id || `course-${item.id}`) 
                : (item.product?.id || item.id)
              const itemName = isCourseItem 
                ? (item.course?.title || 'Курс') 
                : (item.product?.name || 'Товар')
              const itemDescription = isCourseItem 
                ? (item.course?.description || '') 
                : (item.product?.description || '')
              const itemPrice = isCourseItem 
                ? (item.course?.price || 0) 
                : (item.product?.price || 0)
              const itemQuantity = item.quantity || 1
              // Исправление: используем animal вместо pet_type для товаров
              const itemPetType = isCourseItem 
                ? (item.course?.pet_type || 'all') 
                : (item.product?.animal || 'all')
              
              return (
                <div key={itemId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    {/* Заглушка изображения товара/курса */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-3xl opacity-50">
                        {itemPetType === 'dog' ? '🐕' : itemPetType === 'cat' ? '🐱' : isCourseItem ? '📚' : '🐾'}
                      </span>
                    </div>
                    
                    {/* Информация о товаре/курсе */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {itemName}
                        </h3>
                        {isCourseItem && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                            Курс
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {itemDescription}
                      </p>
                      {/* Информация о питомце для курса */}
                      {isCourseItem && item.pet && (
                        <p className="text-xs text-primary-600 mt-1">
                          🐾 Для: {item.pet.name}
                        </p>
                      )}
                      <p className="font-medium text-gray-900 mt-1">
                        {formatPrice(itemPrice)}
                      </p>
                    </div>
                    
                    {/* Управление количеством (только для товаров) */}
                    {!isCourseItem && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.product.id, itemQuantity - 1)}
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          disabled={isLoading}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {itemQuantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.product.id, itemQuantity + 1)}
                          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                          disabled={isLoading}
                        >
                          +
                        </button>
                      </div>
                    )}
                    
                    {/* Сумма и удаление */}
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(itemPrice * itemQuantity)}
                      </p>
                      <button
                        onClick={() => handleRemove(itemId)}
                        className="text-sm text-red-600 hover:text-red-700 mt-1"
                        disabled={isLoading}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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
                <span>Позиций:</span>
                <span>{items.length} шт.</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900">
                <span>Итого:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            
            {/* Кнопка оформления заказа */}
            <div className="pt-4">
              <Link
                to="/checkout"
                className="block w-full btn-primary py-3 text-center"
              >
                Оформить заказ
              </Link>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Товары и курсы будут оформлены в одном заказе
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
