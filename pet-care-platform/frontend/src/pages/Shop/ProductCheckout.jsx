/**
 * Компонент страницы оформления заказа товаров
 * 
 * Отображает товары из корзины, выбор адреса доставки и способа доставки
 * После нажатия "Оформить заказ" переходит на страницу оплаты
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCheckoutInfo, createOrder, getAddresses, searchAddresses, createAddress } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
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
  
  const [checkoutData, setCheckoutData] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [deliveryType, setDeliveryType] = useState('standard')
  const [shippingAddress, setShippingAddress] = useState('')
  const [addressSearchQuery, setAddressSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка информации для оформления заказа
   */
  const fetchCheckoutInfo = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getCheckoutInfo()
      setCheckoutData(response)
      setAddresses(response.addresses || [])
      
      // Выбираем адрес по умолчанию
      const defaultAddress = response.addresses?.find(addr => addr.is_default)
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
      }
      
      if (response.items.length === 0) {
        navigate('/cart')
        return
      }
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Проверка аутентификации и загрузка данных
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchCheckoutInfo()
  }, [isAuthenticated])
  
  /**
   * Обработчик оформления заказа
   */
  const handleCreateOrder = async (e) => {
    e.preventDefault()
    
    const selectedAddress = addresses.find(a => a.id === selectedAddressId)
    const deliveryOption = checkoutData.delivery_options.find(opt => opt.type === deliveryType)
    
    if (!selectedAddress && !shippingAddress.trim()) {
      alert('Выберите или введите адрес доставки')
      return
    }
    
    setIsCreatingOrder(true)
    setError(null)
    
    try {
      const orderData = {
        address_id: selectedAddressId || undefined,
        shipping_address: selectedAddress ? selectedAddress.full_address : shippingAddress.trim(),
        delivery_type: deliveryType,
        delivery_cost: deliveryOption?.cost || 0,
        recipient_name: checkoutData.recipient_name,
        recipient_phone: checkoutData.recipient_phone,
      }
      
      const response = await createOrder(orderData)
      
      // Переходим на страницу оплаты
      navigate(`/payment?order_id=${response.order.id}&type=shop_order&amount=${response.order.total_amount}`)
    } catch (err) {
      setError(err.response?.data?.errors || err.message || 'Не удалось оформить заказ')
    } finally {
      setIsCreatingOrder(false)
    }
  }
  
  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !checkoutData || checkoutData.items.length === 0) {
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
              Товары в заказе ({checkoutData.items.length})
            </h2>
            
            <div className="space-y-4">
              {checkoutData.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <img 
                    src={item.product_image || '/placeholder-product.png'} 
                    alt={item.product_name} 
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {item.product_name}
                    </h3>
                    <p className="text-sm text-gray-500">Бренд: {item.vendor || 'Не указан'}</p>
                    <p className="text-sm text-gray-500">Количество: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.item_total)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Адрес доставки */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Адрес доставки</h2>
            
            {/* Список сохраненных адресов */}
            {addresses.length > 0 && (
              <div className="space-y-2 mb-4">
                {addresses.map(addr => (
                  <label 
                    key={addr.id} 
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => {
                        setSelectedAddressId(addr.id)
                        setShippingAddress('')
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{addr.full_address}</p>
                      {addr.is_default && (
                        <span className="text-xs text-primary-600">По умолчанию</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {/* Поиск нового адреса */}
            <div>
              <label className="label">Или введите новый адрес</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => {
                  setShippingAddress(e.target.value)
                  if (e.target.value.trim()) {
                    setSelectedAddressId(null)
                  }
                }}
                className="input min-h-[100px]"
                placeholder="Введите полный адрес доставки"
                disabled={!!selectedAddressId}
              />
            </div>
          </div>
          
          {/* Выбор типа доставки */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Способ доставки</h2>
            <div className="space-y-2">
              {checkoutData.delivery_options.map(option => (
                <label 
                  key={option.type} 
                  className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={option.type}
                    checked={deliveryType === option.type}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{option.name}</p>
                        <p className="text-sm text-gray-500">{option.description}</p>
                        <p className="text-sm text-gray-500">Срок: {option.days}</p>
                      </div>
                      <p className="font-semibold">{formatPrice(option.cost)}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* Итоговая сумма */}
          <div className="card">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Товары:</span>
                <span>{formatPrice(checkoutData.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Доставка:</span>
                <span>
                  {formatPrice(
                    checkoutData.delivery_options.find(opt => opt.type === deliveryType)?.cost || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t">
                <span>Итого:</span>
                <span className="text-primary-600">
                  {formatPrice(
                    (checkoutData.subtotal || 0) + 
                    (checkoutData.delivery_options.find(opt => opt.type === deliveryType)?.cost || 0)
                  )}
                </span>
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
