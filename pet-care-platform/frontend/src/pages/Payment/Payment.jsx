/**
 * Компонент страницы оплаты
 * 
 * Отображает информацию о заказе/курсе и форму оплаты
 * После оплаты заказ/курс считается оплаченным
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { processPayment } from '../../api/payments'
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
 * Компонент страницы Payment
 */
function Payment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [error, setError] = useState(null)
  const [cardData, setCardData] = useState({
    card_number: '',
    cardholder_name: '',
    expiry_month: '',
    expiry_year: '',
    cvv: ''
  })
  
  const orderId = searchParams.get('order_id')
  const courseId = searchParams.get('course_id')
  const type = searchParams.get('type') // 'shop_order', 'course'
  const amount = parseFloat(searchParams.get('amount') || '0')
  const isFree = amount === 0
  
  /**
   * Проверка аутентификации
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated])
  
  /**
   * Обработчик оплаты
   */
  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)
    
    try {
      // Определяем тип платежа и ID объекта
      const paymentType = type === 'shop_order' ? 'shop_order' : 'course'
      const objectId = orderId || courseId
      
      if (!objectId) {
        throw new Error('Не указан ID заказа или курса')
      }
      
      // Для бесплатных заказов/курсов просто подтверждаем
      if (isFree) {
        setIsPaid(true)
        setIsProcessing(false)
        
        // Через 3 секунды перенаправляем
        setTimeout(() => {
          if (type === 'shop_order') {
            navigate('/profile?tab=orders')
          } else {
            navigate('/profile?tab=courses')
          }
        }, 3000)
        return
      }
      
      const paymentData = {
        payment_type: paymentType,
        object_id: objectId,
        ...cardData
      }
      
      const response = await processPayment(paymentData)
      
      if (response.success) {
        setIsPaid(true)
        // Перенаправление через 3 секунды
        setTimeout(() => {
          if (type === 'shop_order') {
            navigate('/profile?tab=orders')
          } else {
            navigate('/profile?tab=courses')
          }
        }, 3000)
      } else {
        setError('Платеж не прошел')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ошибка при обработке платежа')
    } finally {
      setIsProcessing(false)
    }
  }
  
  if (!isAuthenticated) {
    return null
  }
  
  return (
    <div className="page-container animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        {isPaid ? (
          /* Сообщение об успешной оплате */
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {isFree ? 'Курс успешно добавлен!' : 'Оплата успешно выполнена!'}
            </h1>
            <p className="text-gray-600 mb-6">
              {isFree 
                ? 'Курс добавлен в вашу библиотеку. Вы можете начать обучение прямо сейчас.'
                : 'Ваш заказ успешно оплачен. Мы отправим вам подтверждение на email.'}
            </p>
            <p className="text-sm text-gray-500">
              Перенаправление...
            </p>
          </div>
        ) : (
          <>
            {/* Заголовок */}
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              {isFree ? 'Подтверждение' : 'Оплата заказа'}
            </h1>
            
            {/* Информация о заказе */}
            <div className="card mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Информация о заказе
              </h2>
              
              <div className="space-y-3">
                {orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Номер заказа:</span>
                    <span className="text-gray-900 font-medium">#{orderId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Тип заказа:</span>
                  <span className="text-gray-900 font-medium">
                    {type === 'shop_order' ? 'Товары' : courseId ? 'Курс' : 'Заказ'}
                  </span>
                </div>
                {courseId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID курса:</span>
                    <span className="text-gray-900 font-medium">#{courseId}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Сумма к оплате:</span>
                  <span className="text-primary-600">
                    {isFree ? 'Бесплатно' : formatPrice(amount)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Форма оплаты */}
            {!isFree && (
              <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">Данные карты</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Номер карты</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="0000 0000 0000 0000"
                      value={cardData.card_number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '')
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                        setCardData({...cardData, card_number: formatted})
                      }}
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <label className="label">Имя держателя карты</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="IVAN IVANOV"
                      value={cardData.cardholder_name}
                      onChange={(e) => setCardData({...cardData, cardholder_name: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Месяц (MM)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="12"
                        value={cardData.expiry_month}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 2)
                          setCardData({...cardData, expiry_month: value})
                        }}
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="label">Год (YYYY)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="2025"
                        value={cardData.expiry_year}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setCardData({...cardData, expiry_year: value})
                        }}
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">CVV</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setCardData({...cardData, cvv: value})
                      }}
                      maxLength={4}
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💳 В демо-режиме любая карта принимается к оплате
                  </p>
                </div>
              </div>
            )}
            
            {/* Ошибка */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {error}
              </div>
            )}
            
            {/* Кнопка оплаты */}
            <button
              onClick={handlePayment}
              disabled={isProcessing || (!isFree && (!cardData.card_number || !cardData.cardholder_name || !cardData.expiry_month || !cardData.expiry_year || !cardData.cvv))}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <ButtonLoader />
                  {isFree ? 'Обработка...' : 'Обработка платежа...'}
                </>
              ) : isFree ? (
                'Подтвердить'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15l1-4 4 1M9 6l1 4 4-1" />
                  </svg>
                  Оплатить {formatPrice(amount)}
                </>
              )}
            </button>
            
            <Link
              to={type === 'shop_order' ? '/cart' : courseId ? `/courses/${courseId}` : '/courses'}
              className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
            >
              Отменить
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default Payment
