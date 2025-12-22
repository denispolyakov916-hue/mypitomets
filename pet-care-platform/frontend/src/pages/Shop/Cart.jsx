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
    clearError 
  } = useCartStore()
  
  // Состояние успешного заказа (оставлено для обратной совместимости, но не используется)
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
   * Проверка, является ли элемент курсом
   */
  const isCourse = (item) => {
    return item.course !== undefined && item.course !== null
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
                to="/shop/checkout"
                className="block w-full btn-primary py-3 text-center"
              >
                Оформить заказ
              </Link>
            </div>
            
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
