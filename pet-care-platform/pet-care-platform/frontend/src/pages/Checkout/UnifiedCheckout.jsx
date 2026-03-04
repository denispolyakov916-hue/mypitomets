/**
 * Единый Checkout - страница оформления заказа
 * 
 * Позволяет оформить товары и курсы из корзины одним заказом.
 * Поддерживает выборочное оформление через selected_items.
 * Включает резервирование товаров, выбор доставки и подтверждение условий.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { getUnifiedCheckout, submitUnifiedCheckout, cancelReservation } from '../../api/shop'
import { createPayment } from '../../api/payments'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Alert } from '../../components/ui/Alert'
import AuthGuard from '../../components/AuthGuard'
import { formatPrice } from '../../utils/format'

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
          ? 'bg-secondary-100 text-secondary-700 border border-secondary-200'
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
function ProductsSection({ products }) {
  if (!products?.items?.length) return null

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <span className="text-xl">📦</span>
        </div>
        <div>
          <h2 className="section-title mb-0">Товары</h2>
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
              <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">{item.product?.name}</h3>
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
          <h2 className="section-title mb-0">Курсы</h2>
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
              <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">{item.course?.title}</h3>
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
      <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-lg">
        <h4 className="font-medium text-secondary-800 mb-2">Важное уведомление</h4>
        <p className="text-sm text-secondary-700 mb-3">
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
// КОМПОНЕНТ: AddressSection
// =============================================================================

/**
 * Секция адреса доставки
 */
function AddressSection({ addresses, formData, onFormChange }) {
  // Не показываем секцию при самовывозе
  if (formData.delivery_type === 'pickup') return null

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
    <div className="card mb-6">
      <h2 className="section-title flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Адрес доставки
      </h2>

      {/* Сохранённые адреса */}
      {addresses?.length > 0 && (
        <div className="space-y-3 mb-4">
          {addresses.map(addr => (
            <label
              key={addr.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.address_id === addr.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="address"
                value={addr.id}
                checked={formData.address_id === addr.id}
                onChange={() => handleAddressChange(addr.id)}
                className="sr-only"
              />
              <div className={`p-2 rounded-lg ${
                formData.address_id === addr.id
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{addr.full_address}</div>
                {addr.is_default && (
                  <span className="text-xs text-primary-600 font-medium">По умолчанию</span>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                formData.address_id === addr.id
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300'
              }`}>
                {formData.address_id === addr.id && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Новый адрес */}
      <div>
        <label className="label flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {addresses?.length > 0 ? 'Или введите новый адрес' : 'Введите адрес доставки'}
        </label>
        <textarea
          value={formData.shipping_address}
          onChange={(e) => handleShippingAddressChange(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Город, улица, дом, квартира, подъезд, этаж, домофон..."
          disabled={!!formData.address_id}
        />
        {formData.address_id && (
          <button
            type="button"
            onClick={() => handleAddressChange('')}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Ввести другой адрес
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// КОМПОНЕНТ: DeliverySection
// =============================================================================

/**
 * Секция выбора способа доставки
 * 
 * TODO: Пункты самовывоза - заглушка
 * В будущем заменить pickupLocations на реальные данные из API:
 * - GET /api/shop/pickup-locations/ - список пунктов самовывоза
 * - Поля: id, name, address, working_hours, phone, coordinates
 * - Добавить карту с отображением пунктов
 * - Добавить фильтрацию по городу/району
 */
function DeliverySection({ deliveryOptions, formData, onFormChange }) {
  if (!deliveryOptions?.length) return null

  const handleDeliveryChange = (type) => {
    onFormChange({ delivery_type: type })
  }

  const handlePickupLocationChange = (locationId) => {
    onFormChange({ pickup_location_id: locationId })
  }

  // TODO: Заглушка - заменить на реальные данные из API
  // GET /api/shop/pickup-locations/
  const pickupLocations = [
    {
      id: 'loc_1',
      name: 'ПетКаре - ТЦ "Европейский"',
      address: 'г. Москва, пл. Киевского Вокзала, 2, ТЦ "Европейский", 1 этаж',
      workingHours: 'Пн-Вс: 10:00 - 22:00',
      phone: '+7 (495) 123-45-67'
    },
    {
      id: 'loc_2',
      name: 'ПетКаре - ТЦ "Авиапарк"',
      address: 'г. Москва, Ходынский бульвар, 4, ТЦ "Авиапарк", 2 этаж',
      workingHours: 'Пн-Вс: 10:00 - 22:00',
      phone: '+7 (495) 234-56-78'
    },
    {
      id: 'loc_3',
      name: 'ПетКаре - ТЦ "Метрополис"',
      address: 'г. Москва, Ленинградское ш., 16А, стр. 4, ТЦ "Метрополис", 1 этаж',
      workingHours: 'Пн-Вс: 10:00 - 22:00',
      phone: '+7 (495) 345-67-89'
    }
  ]

  return (
    <div className="card mb-6">
      <h2 className="section-title flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
        </svg>
        Способ доставки
      </h2>

      <div className="space-y-3">
        {deliveryOptions.map(option => (
          <label
            key={option.type}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.delivery_type === option.type
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="delivery_type"
              value={option.type}
              checked={formData.delivery_type === option.type}
              onChange={() => handleDeliveryChange(option.type)}
              className="sr-only"
            />
            <div className={`p-2 rounded-lg ${
              formData.delivery_type === option.type
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {option.type === 'pickup' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ) : option.type === 'express' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{option.name}</div>
              <div className="text-sm text-gray-500">{option.description}</div>
              {option.days && (
                <div className="text-xs text-gray-400 mt-1">Срок: {option.days}</div>
              )}
            </div>
            <div className="text-right">
              <span className={`font-semibold ${option.cost === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {option.cost === 0 ? 'Бесплатно' : formatPrice(option.cost)}
              </span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              formData.delivery_type === option.type
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-300'
            }`}>
              {formData.delivery_type === option.type && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Пункты самовывоза - показываем при выборе самовывоза */}
      {formData.delivery_type === 'pickup' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Выберите пункт самовывоза
          </h3>

          <div className="space-y-3">
            {pickupLocations.map(location => (
              <label
                key={location.id}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.pickup_location_id === location.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="pickup_location"
                  value={location.id}
                  checked={formData.pickup_location_id === location.id}
                  onChange={() => handlePickupLocationChange(location.id)}
                  className="sr-only"
                />
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  formData.pickup_location_id === location.id
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{location.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{location.address}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {location.workingHours}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {location.phone}
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                  formData.pickup_location_id === location.id
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                }`}>
                  {formData.pickup_location_id === location.id && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Информация о заглушке - убрать в продакшене */}
          <div className="mt-4 p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
            <p className="text-xs text-secondary-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Демо-режим: пункты самовывоза являются заглушкой. В будущем будут загружаться из API.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

// =============================================================================
// КОМПОНЕНТ: PaymentMethodSection
// =============================================================================

/**
 * Секция выбора способа оплаты
 */
function PaymentMethodSection({ paymentMethod, onPaymentMethodChange }) {
  const paymentMethods = [
    {
      id: 'card',
      title: 'Банковская карта',
      description: 'Visa, Mastercard, Мир',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'sbp',
      title: 'Система Быстрых Платежей (СПБ)',
      description: 'Оплата по QR-коду через приложение банка',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 18h4.01M12 21h4.01M8 7v4m0 0h.01M8 15h4.01M8 18h4.01M8 21h4.01M2 7h4m0 0v4m0 0h.01M4 15h4.01M4 18h4.01M4 21h4.01" />
        </svg>
      )
    }
  ]

  return (
    <div className="card mb-6">
      <h2 className="section-title flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Способ оплаты
      </h2>

      <div className="space-y-3">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            onClick={() => onPaymentMethodChange(method.id)}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              paymentMethod === method.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              value={method.id}
              checked={paymentMethod === method.id}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="sr-only"
              readOnly
            />
            <div className={`p-2 rounded-lg ${
              paymentMethod === method.id
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {method.icon}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{method.title}</div>
              <div className="text-sm text-gray-500">{method.description}</div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              paymentMethod === method.id
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-300'
            }`}>
              {paymentMethod === method.id && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-green-700">Безопасная оплата с шифрованием данных</span>
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
  onSubmit,
  paymentMethod,
  formData
}) {
  const grandTotal = (totals?.products || 0) + (totals?.courses || 0) + deliveryCost

  return (
    <div className="card sticky top-24">
      <h2 className="section-title mb-6">Итого к оплате</h2>

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

        {/* Выбранный способ оплаты */}
        <div className="flex justify-between text-gray-600">
          <span>Оплата:</span>
          <span className="font-medium text-gray-900">
            {paymentMethod === 'card' ? '💳 Картой' : '📱 СПБ'}
          </span>
        </div>

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
        title={!canSubmit ? getDisabledReason(formData, hasProducts, hasCourses) : ''}
      >
        {isSubmitting ? (
          <>
            <ButtonLoader />
            <span>Оформление...</span>
          </>
        ) : (
          <>
            {paymentMethod === 'card' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 18h4.01M12 21h4.01M8 7v4m0 0h.01M8 15h4.01M8 18h4.01M8 21h4.01M2 7h4m0 0v4m0 0h.01M4 15h4.01M4 18h4.01M4 21h4.01" />
              </svg>
            )}
            <span>Оплатить {formatPrice(grandTotal)}</span>
          </>
        )}
      </button>

      {!canSubmit && (
        <div className="mt-3 text-center">
          <p className="text-sm text-secondary-600">
            {getDisabledReason(formData, hasProducts, hasCourses)}
          </p>
        </div>
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
 * Получить причину отключения кнопки оплаты
 */
const getDisabledReason = (formData, hasProducts, hasCourses) => {
  const hasAddress = formData.address_id || formData.shipping_address.trim()

  if (hasProducts && formData.delivery_type !== 'pickup' && !hasAddress) {
    return 'Выберите адрес доставки'
  }

  if (hasCourses && !formData.courses_disclaimer_accepted) {
    return 'Примите условия использования курсов'
  }

  return 'Заполните все необходимые поля'
}

/**
 * Страница единого оформления заказа
 */
function UnifiedCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { clearCart, loadCart } = useCartStore()
  
  // Получаем выбранные элементы из state (переданы из Cart)
  const selectedItemsFromCart = location.state?.selectedItems || []

  console.log('=== UnifiedCheckout INIT ===')
  console.log('location.state:', location.state)
  console.log('selectedItemsFromCart:', selectedItemsFromCart)

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
    pickup_location_id: '', // ID пункта самовывоза
    courses_disclaimer_accepted: false,
    payment_method: 'card' // 'card' или 'sbp'
  })

  /**
   * Загрузка данных checkout
   */
  const loadCheckout = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    console.log('=== LOAD CHECKOUT STARTED ===')
    console.log('selectedItemsFromCart:', selectedItemsFromCart)

    try {
      // Передаём выбранные элементы в API
      const response = await getUnifiedCheckout(selectedItemsFromCart)
      console.log('getUnifiedCheckout response:', response)

      setCheckoutData(response)
      reservationIdRef.current = response.reservation?.id

      // Устанавливаем адрес по умолчанию
      const defaultAddress = response.addresses?.find(addr => addr.is_default)
      if (defaultAddress) {
        setFormData(prev => ({ ...prev, address_id: defaultAddress.id }))
        console.log('Set default address:', defaultAddress.id)
      }

      // Редирект если нет выбранных элементов
      const hasProducts = response.products?.items?.length > 0
      const hasCourses = response.courses?.items?.length > 0

      console.log('hasProducts:', hasProducts, 'hasCourses:', hasCourses)

      if (!hasProducts && !hasCourses) {
        console.log('No items to checkout, redirecting to cart')
        navigate('/cart', {
          state: { message: 'Не выбрано ни одного товара или курса для оформления' }
        })
        return
      }

      // Если нет товаров, сбрасываем тип доставки
      if (!hasProducts) {
        setFormData(prev => ({ ...prev, delivery_type: '' }))
        console.log('No products, reset delivery_type to empty')
      }

      console.log('=== LOAD CHECKOUT COMPLETED ===')

    } catch (err) {
      console.error('loadCheckout error:', err)
      setError(err.message || 'Не удалось загрузить данные для оформления')
    } finally {
      setIsLoading(false)
    }
  }, [navigate, selectedItemsFromCart])

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
    console.log('=== handleSubmit STARTED ===')
    setError(null)

    const hasProducts = checkoutData?.products?.items?.length > 0
    const hasCourses = checkoutData?.courses?.items?.length > 0
    console.log('hasProducts:', hasProducts, 'hasCourses:', hasCourses)

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

      // Добавляем выбранные элементы
      if (selectedItemsFromCart.length > 0) {
        submitData.selected_items = selectedItemsFromCart
      }

      // Сценарий 1: Только товары
      if (hasProducts && !hasCourses) {
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

      // Сценарий 2: Только курсы
      if (!hasProducts && hasCourses) {
        submitData.courses_disclaimer_accepted = formData.courses_disclaimer_accepted
      }

      // Сценарий 3: Товары и курсы
      if (hasProducts && hasCourses) {
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

        submitData.courses_disclaimer_accepted = formData.courses_disclaimer_accepted
      }

      const response = await submitUnifiedCheckout(submitData)
      console.log('submitUnifiedCheckout response:', response)

      // Очищаем резервирование и обновляем корзину
      reservationIdRef.current = null
      // Перезагружаем корзину (удалены только выбранные элементы)
      await loadCart()

      // Определяем параметры для оплаты из ответа
      const orders = response.orders || {}
      const productsOrder = orders.products_order
      const courses = orders.courses || []

      // Определяем тип заказа и параметры для оплаты
      let orderId = null
      let amount = 0
      let orderType = null

      const hasProductsResponse = !!productsOrder
      const hasCoursesResponse = courses.length > 0

      if (hasProductsResponse && hasCoursesResponse) {
        // Сценарий 3: Заказ с товарами и курсами (unified_checkout)
        orderId = productsOrder.id
        amount = parseFloat(productsOrder.total_amount || 0)
        // Суммируем стоимость курсов
        for (const course of courses) {
          amount += parseFloat(course.amount || 0)
        }
        orderType = 'unified_checkout'
      } else if (hasProductsResponse) {
        // Сценарий 1: Заказ только с товарами
        orderId = productsOrder.id
        amount = parseFloat(productsOrder.total_amount || 0)
        orderType = 'shop_order'
      } else if (hasCoursesResponse) {
        // Сценарий 2: Заказ только с курсами
        orderId = courses[0].user_course_id
        amount = parseFloat(courses[0].amount || 0)
        orderType = 'course'
      }

      if (!orderId || !orderType) {
        setError('Не удалось создать заказ')
        setIsSubmitting(false)
        return
      }

      // Перенаправляем на страницу оплаты с правильными параметрами
      const paymentMethod = formData.payment_method || 'card'
      console.log('Payment method from formData:', formData.payment_method, 'Using:', paymentMethod)

      const params = new URLSearchParams({
        order_id: orderId,
        type: orderType,
        amount: amount.toString(),
        method: paymentMethod
      })

      const paymentUrl = `/payment?${params.toString()}`
      console.log('Redirecting to payment page:', paymentUrl)
      navigate(paymentUrl)

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
        <div className="card max-w-lg mx-auto">
          <EmptyState
            icon="😕"
            title="Ошибка загрузки"
            description={error}
            action={
              <button onClick={loadCheckout} className="btn-primary">
                Попробовать снова
              </button>
            }
            secondaryAction={
              <Link to="/cart" className="btn-secondary">
                Вернуться в корзину
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  // Нет данных для оформления
  if (!checkoutData) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="card max-w-lg mx-auto">
          <EmptyState
            icon="📦"
            title="Нет данных для оформления"
            description={
              selectedItemsFromCart.length === 0
                ? 'Не выбраны товары для оформления. Вернитесь в корзину и выберите товары.'
                : 'Данные загружаются...'
            }
            action={
              selectedItemsFromCart.length === 0 ? (
                <Link to="/cart" className="btn-primary">
                  К корзине
                </Link>
              ) : (
                <button onClick={loadCheckout} className="btn-primary">
                  Загрузить данные
                </button>
              )
            }
            secondaryAction={
              selectedItemsFromCart.length > 0 ? (
                <Link to="/cart" className="btn-secondary">
                  К корзине
                </Link>
              ) : undefined
            }
          />
        </div>
      </div>
    )
  }

  const hasProducts = checkoutData?.products?.items?.length > 0
  const hasCourses = checkoutData?.courses?.items?.length > 0

  console.log('=== CHECKOUT DATA DEBUG ===')
  console.log('checkoutData:', checkoutData)
  console.log('checkoutData?.products:', checkoutData?.products)
  console.log('checkoutData?.courses:', checkoutData?.courses)
  console.log('hasProducts:', hasProducts, 'hasCourses:', hasCourses)

  // Расчёт стоимости доставки
  const selectedDelivery = checkoutData?.products?.delivery_options?.find(
    opt => opt.type === formData.delivery_type
  )
  const deliveryCost = hasProducts ? (selectedDelivery?.cost || 0) : 0

  console.log('selectedDelivery:', selectedDelivery, 'deliveryCost:', deliveryCost)

  // Проверка возможности отправки формы
  const hasAddress = formData.address_id || formData.shipping_address.trim()
  const deliveryCondition = !hasProducts || formData.delivery_type === 'pickup' || hasAddress
  const coursesCondition = !hasCourses || formData.courses_disclaimer_accepted
  const canSubmit = deliveryCondition && coursesCondition

  // Отладка блокировки кнопки
  console.log('=== CAN SUBMIT DEBUG ===')
  console.log('hasProducts:', hasProducts, 'hasCourses:', hasCourses)
  console.log('formData.delivery_type:', formData.delivery_type)
  console.log('formData.address_id:', formData.address_id)
  console.log('formData.shipping_address:', `'${formData.shipping_address}'`)
  console.log('formData.courses_disclaimer_accepted:', formData.courses_disclaimer_accepted)
  console.log('hasAddress:', hasAddress)
  console.log('deliveryCondition:', deliveryCondition, '(товары проверены)')
  console.log('coursesCondition:', coursesCondition, '(курсы проверены)')
  console.log('canSubmit:', canSubmit, canSubmit ? '✅ Кнопка активна' : '❌ Кнопка заблокирована')
  console.log('========================')

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
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка: товары и курсы */}
          <div className="lg:col-span-2 space-y-6">
            {/* Секция выбора способа оплаты */}
            <PaymentMethodSection
              paymentMethod={formData.payment_method}
              onPaymentMethodChange={(method) => {
                console.log('Payment method changed to:', method)
                handleFormChange({ payment_method: method })
              }}
            />

            {/* Секция выбора способа доставки */}
            {hasProducts && (
              <DeliverySection
                deliveryOptions={checkoutData?.products?.delivery_options}
                formData={formData}
                onFormChange={handleFormChange}
              />
            )}

            {/* Секция адреса доставки */}
            {hasProducts && formData.delivery_type !== 'pickup' && (
              <AddressSection
                addresses={checkoutData?.addresses}
                formData={formData}
                onFormChange={handleFormChange}
              />
            )}

            {/* Секция товаров */}
            <ProductsSection products={checkoutData?.products} />

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
              paymentMethod={formData.payment_method}
              formData={formData}
            />
          </div>
        </div>
      </div>
  )
}

export default UnifiedCheckout

