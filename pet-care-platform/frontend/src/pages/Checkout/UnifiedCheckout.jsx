/**
 * Единый Checkout - страница оформления заказа
 * 
 * Позволяет оформить товары и курсы из корзины одним заказом.
 * Включает резервирование товаров, выбор доставки и подтверждение условий.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getUnifiedCheckout, submitUnifiedCheckout, cancelReservation } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
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

// =============================================================================
// КОМПОНЕНТ: ReservationTimer
// =============================================================================

/**
 * Таймер резервирования товаров
 * 
 * Показывает обратный отсчёт времени на оформление заказа.
 * При истечении времени вызывает callback и редиректит в корзину.
 */
function ReservationTimer({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!expiresAt) return

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      return Math.max(0, Math.floor((expiry - now) / 1000))
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timer)
        onExpired?.()
        navigate('/cart', { 
          state: { message: 'Время на оформление истекло. Товары возвращены в корзину.' }
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, onExpired, navigate])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isWarning = timeLeft <= 60
  const isCritical = timeLeft <= 30

  return (
    <div className={`
      flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors
      ${isCritical 
        ? 'bg-red-100 text-red-700 border border-red-200' 
        : isWarning 
          ? 'bg-amber-100 text-amber-700 border border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      }
    `}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        Время на оплату: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {isWarning && <span className="ml-1">Поспешите!</span>}
    </div>
  )
}

// =============================================================================
// КОМПОНЕНТ: ProductsSection
// =============================================================================

/**
 * Секция товаров в checkout
 * 
 * Отображает товары из корзины, выбор типа доставки и адреса.
 */
function ProductsSection({ 
  products, 
  addresses, 
  deliveryOptions,
  formData, 
  onFormChange 
}) {
  if (!products?.items?.length) return null

  const handleDeliveryChange = (type) => {
    onFormChange({ delivery_type: type })
  }

  const handleAddressChange = (addressId) => {
    onFormChange({ 
      address_id: addressId,
      shipping_address: addressId ? '' : formData.shipping_address
    })
  }

  const handleShippingAddressChange = (value) => {
    onFormChange({ 
      shipping_address: value,
      address_id: value.trim() ? '' : formData.address_id
    })
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span className="text-xl">📦</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Товары</h2>
          <p className="text-sm text-gray-500">{products.items.length} позиций</p>
        </div>
      </div>

      {/* Список товаров */}
      <div className="divide-y divide-gray-100 mb-6">
        {products.items.map((item, idx) => (
          <div key={item.id || idx} className="py-4 first:pt-0 last:pb-0 flex gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.product?.main_image ? (
                <img src={item.product.main_image} alt={item.product?.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl opacity-50">
                  {item.product?.animal === 'dog' ? '🐕' : item.product?.animal === 'cat' ? '🐱' : '🐾'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{item.product?.name}</h3>
              <p className="text-sm text-gray-500">
                {formatPrice(item.price)} × {item.quantity}
              </p>
            </div>
            <div className="text-right font-semibold text-gray-900">
              {formatPrice(item.total)}
            </div>
          </div>
        ))}
      </div>

      {/* Выбор типа доставки */}
      {deliveryOptions?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Способ доставки</h3>
          <div className="space-y-2">
            {deliveryOptions.map(option => (
              <label 
                key={option.type}
                className={`
                  flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors
                  ${formData.delivery_type === option.type 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <input
                  type="radio"
                  name="delivery_type"
                  value={option.type}
                  checked={formData.delivery_type === option.type}
                  onChange={() => handleDeliveryChange(option.type)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{option.name}</p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                      {option.days && (
                        <p className="text-sm text-gray-500">Срок: {option.days}</p>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {option.cost === 0 ? 'Бесплатно' : formatPrice(option.cost)}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Выбор адреса */}
      {formData.delivery_type !== 'pickup' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Адрес доставки</h3>
          
          {/* Сохранённые адреса */}
          {addresses?.length > 0 && (
            <div className="space-y-2 mb-4">
              {addresses.map(addr => (
                <label 
                  key={addr.id}
                  className={`
                    flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                    ${formData.address_id === addr.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={formData.address_id === addr.id}
                    onChange={() => handleAddressChange(addr.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{addr.full_address}</p>
                    {addr.is_default && (
                      <span className="text-xs text-primary-600">По умолчанию</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Новый адрес */}
          <div>
            <label className="label">
              {addresses?.length > 0 ? 'Или введите новый адрес' : 'Введите адрес доставки'}
            </label>
            <textarea
              value={formData.shipping_address}
              onChange={(e) => handleShippingAddressChange(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Город, улица, дом, квартира"
              disabled={!!formData.address_id}
            />
          </div>
        </div>
      )}

      {/* Подытог товаров */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
        <span className="text-gray-600">Подытог товаров:</span>
        <span className="font-semibold text-gray-900">{formatPrice(products.subtotal)}</span>
      </div>
    </div>
  )
}

// =============================================================================
// КОМПОНЕНТ: CoursesSection
// =============================================================================

/**
 * Секция курсов в checkout
 * 
 * Отображает курсы из корзины и чекбокс согласия с условиями.
 */
function CoursesSection({ courses, formData, onFormChange }) {
  if (!courses?.items?.length) return null

  const handleDisclaimerChange = (accepted) => {
    onFormChange({ courses_disclaimer_accepted: accepted })
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-xl">📚</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Курсы</h2>
          <p className="text-sm text-gray-500">{courses.items.length} курсов</p>
        </div>
      </div>

      {/* Список курсов */}
      <div className="divide-y divide-gray-100 mb-6">
        {courses.items.map((item, idx) => (
          <div key={item.id || idx} className="py-4 first:pt-0 last:pb-0 flex gap-4">
            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">
                {item.course?.pet_type === 'dog' ? '🐕' : item.course?.pet_type === 'cat' ? '🐱' : '📖'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{item.course?.title}</h3>
              {item.pet?.name && (
                <p className="text-sm text-primary-600">🐾 Для: {item.pet.name}</p>
              )}
              {item.course?.level && (
                <p className="text-sm text-gray-500">Уровень: {item.course.level_display || item.course.level}</p>
              )}
            </div>
            <div className="text-right font-semibold text-gray-900">
              {item.price === 0 ? 'Бесплатно' : formatPrice(item.price)}
            </div>
          </div>
        ))}
      </div>

      {/* Условия использования курсов */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-medium text-amber-800 mb-2">Важное уведомление</h4>
        <p className="text-sm text-amber-700 mb-3">
          Онлайн-курсы являются цифровым контентом. После оплаты вы получите полный доступ 
          к материалам курса. Курсы предназначены для личного использования и не подлежат 
          передаче третьим лицам.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.courses_disclaimer_accepted}
            onChange={(e) => handleDisclaimerChange(e.target.checked)}
            className="mt-0.5 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            Я принимаю условия использования курсов и понимаю, что доступ предоставляется 
            сразу после оплаты
          </span>
        </label>
      </div>

      {/* Подытог курсов */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
        <span className="text-gray-600">Подытог курсов:</span>
        <span className="font-semibold text-gray-900">{formatPrice(courses.subtotal)}</span>
      </div>
    </div>
  )
}

// =============================================================================
// КОМПОНЕНТ: SummarySection
// =============================================================================

/**
 * Секция итогов и кнопка оплаты
 */
function SummarySection({ 
  totals, 
  deliveryCost, 
  hasProducts,
  hasCourses,
  canSubmit, 
  isSubmitting, 
  onSubmit 
}) {
  const grandTotal = (totals?.products || 0) + (totals?.courses || 0) + deliveryCost

  return (
    <div className="card sticky top-24">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Итого к оплате</h2>

      <div className="space-y-3 mb-6">
        {hasProducts && (
          <div className="flex justify-between text-gray-600">
            <span>Товары:</span>
            <span>{formatPrice(totals?.products || 0)}</span>
          </div>
        )}
        {hasProducts && deliveryCost > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Доставка:</span>
            <span>{formatPrice(deliveryCost)}</span>
          </div>
        )}
        {hasCourses && (
          <div className="flex justify-between text-gray-600">
            <span>Курсы:</span>
            <span>{formatPrice(totals?.courses || 0)}</span>
          </div>
        )}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Итого:</span>
            <span className="text-primary-600">{formatPrice(grandTotal)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <ButtonLoader />
            <span>Оформление...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Оплатить {formatPrice(grandTotal)}</span>
          </>
        )}
      </button>

      {!canSubmit && hasCourses && (
        <p className="text-sm text-amber-600 mt-3 text-center">
          Примите условия использования курсов для продолжения
        </p>
      )}

      <p className="text-xs text-gray-500 mt-4 text-center">
        Нажимая кнопку, вы соглашаетесь с условиями предоставления услуг
      </p>
    </div>
  )
}

// =============================================================================
// ГЛАВНЫЙ КОМПОНЕНТ: UnifiedCheckout
// =============================================================================

/**
 * Страница единого оформления заказа
 */
function UnifiedCheckout() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { clearCart } = useCartStore()
  
  const [checkoutData, setCheckoutData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  const reservationIdRef = useRef(null)

  // Форма checkout
  const [formData, setFormData] = useState({
    delivery_type: 'standard',
    address_id: '',
    shipping_address: '',
    courses_disclaimer_accepted: false
  })

  /**
   * Загрузка данных checkout
   */
  const loadCheckout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getUnifiedCheckout()
      setCheckoutData(response)
      reservationIdRef.current = response.reservation?.id

      // Устанавливаем адрес по умолчанию
      const defaultAddress = response.addresses?.find(addr => addr.is_default)
      if (defaultAddress) {
        setFormData(prev => ({ ...prev, address_id: defaultAddress.id }))
      }

      // Редирект если корзина пуста
      const hasProducts = response.products?.items?.length > 0
      const hasCourses = response.courses?.items?.length > 0
      
      if (!hasProducts && !hasCourses) {
        navigate('/cart', { 
          state: { message: 'Ваша корзина пуста' }
        })
        return
      }

      // Если нет товаров, сбрасываем тип доставки
      if (!hasProducts) {
        setFormData(prev => ({ ...prev, delivery_type: '' }))
      }

    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные для оформления')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  /**
   * Проверка авторизации и загрузка данных
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    loadCheckout()

    // Отмена резервирования при уходе со страницы
    return () => {
      if (reservationIdRef.current) {
        cancelReservation(reservationIdRef.current).catch(() => {})
      }
    }
  }, [isAuthenticated, loadCheckout, navigate])

  /**
   * Обновление формы
   */
  const handleFormChange = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  /**
   * Обработчик истечения резервирования
   */
  const handleReservationExpired = () => {
    reservationIdRef.current = null
  }

  /**
   * Отправка заказа
   */
  const handleSubmit = async () => {
    setError(null)
    
    const hasProducts = checkoutData?.products?.items?.length > 0
    const hasCourses = checkoutData?.courses?.items?.length > 0

    // Валидация
    if (hasProducts && formData.delivery_type !== 'pickup') {
      if (!formData.address_id && !formData.shipping_address.trim()) {
        setError('Выберите или введите адрес доставки')
        return
      }
    }

    if (hasCourses && !formData.courses_disclaimer_accepted) {
      setError('Примите условия использования курсов')
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = {}
      
      if (hasProducts) {
        submitData.delivery_type = formData.delivery_type
        if (formData.address_id) {
          submitData.address_id = formData.address_id
        } else if (formData.shipping_address.trim()) {
          submitData.shipping_address = formData.shipping_address.trim()
        }
        
        // Добавляем стоимость доставки
        const selectedDelivery = checkoutData.products?.delivery_options?.find(
          opt => opt.type === formData.delivery_type
        )
        if (selectedDelivery) {
          submitData.delivery_cost = selectedDelivery.cost
        }
      }

      if (hasCourses) {
        submitData.courses_disclaimer_accepted = formData.courses_disclaimer_accepted
      }

      const response = await submitUnifiedCheckout(submitData)
      
      // Очищаем корзину и резервирование
      reservationIdRef.current = null
      clearCart()

      // Переход на страницу оплаты
      if (response.payment?.url) {
        window.location.href = response.payment.url
      } else if (response.payment?.id) {
        navigate(`/payment?payment_id=${response.payment.id}&amount=${response.payment.amount}`)
      } else if (response.orders?.products_order?.id) {
        navigate(`/payment?order_id=${response.orders.products_order.id}&type=shop_order&amount=${response.orders.products_order.total_amount}`)
      } else {
        // Если нет платежа (бесплатные курсы)
        navigate('/profile', { 
          state: { message: 'Заказ успешно оформлен!' }
        })
      }

    } catch (err) {
      if (err.message?.includes('резерв') || err.message?.includes('истекло')) {
        navigate('/cart', { 
          state: { message: 'Время на оформление истекло. Попробуйте ещё раз.' }
        })
      } else {
        setError(err.message || 'Не удалось оформить заказ')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Загрузка
  if (isLoading) {
    return <PageLoader />
  }

  // Ошибка загрузки
  if (error && !checkoutData) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="card text-center py-12 max-w-lg mx-auto">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка загрузки</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={loadCheckout} className="btn-primary">
              Попробовать снова
            </button>
            <Link to="/cart" className="btn-secondary">
              Вернуться в корзину
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const hasProducts = checkoutData?.products?.items?.length > 0
  const hasCourses = checkoutData?.courses?.items?.length > 0
  
  // Расчёт стоимости доставки
  const selectedDelivery = checkoutData?.products?.delivery_options?.find(
    opt => opt.type === formData.delivery_type
  )
  const deliveryCost = hasProducts ? (selectedDelivery?.cost || 0) : 0

  // Проверка возможности отправки
  const canSubmit = (
    (!hasProducts || formData.delivery_type === 'pickup' || formData.address_id || formData.shipping_address.trim()) &&
    (!hasCourses || formData.courses_disclaimer_accepted)
  )

  return (
    <div className="page-container animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/cart" className="hover:text-primary-600">Корзина</Link>
        <span>/</span>
        <span className="text-gray-900">Оформление заказа</span>
      </nav>

      <h1 className="page-title">Оформление заказа</h1>

      {/* Таймер резервирования */}
      {checkoutData?.reservation?.expires_at && (
        <div className="mb-6">
          <ReservationTimer 
            expiresAt={checkoutData.reservation.expires_at}
            onExpired={handleReservationExpired}
          />
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Левая колонка: товары и курсы */}
        <div className="lg:col-span-2 space-y-6">
          {/* Секция товаров */}
          <ProductsSection
            products={checkoutData?.products}
            addresses={checkoutData?.addresses}
            deliveryOptions={checkoutData?.products?.delivery_options}
            formData={formData}
            onFormChange={handleFormChange}
          />

          {/* Секция курсов */}
          <CoursesSection
            courses={checkoutData?.courses}
            formData={formData}
            onFormChange={handleFormChange}
          />
        </div>

        {/* Правая колонка: итого */}
        <div className="lg:col-span-1">
          <SummarySection
            totals={checkoutData?.totals}
            deliveryCost={deliveryCost}
            hasProducts={hasProducts}
            hasCourses={hasCourses}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}

export default UnifiedCheckout

