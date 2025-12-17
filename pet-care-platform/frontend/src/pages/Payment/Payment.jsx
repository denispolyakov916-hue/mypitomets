/**
 * Компонент страницы оплаты (заглушка)
 * 
 * Отображает информацию о заказе и имитирует процесс оплаты
 * После "оплаты" заказ считается оплаченным
 */

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
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
 * Компонент страницы Payment
 */
function Payment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  
  const orderId = searchParams.get('order_id')
  const courseId = searchParams.get('course_id')
  const type = searchParams.get('type') // 'product', 'paid' или 'free'
  const amount = parseFloat(searchParams.get('amount') || '0')
  const isFree = type === 'free' || amount === 0
  
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
    
    // Имитация процесса оплаты
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsPaid(true)
    setIsProcessing(false)
    
    // Если это курс, нужно его добавить в библиотеку
    if (courseId && isFree) {
      // Для бесплатных курсов вызываем API для добавления
      import('../../api/courses').then(({ purchaseCourse }) => {
        purchaseCourse(courseId).catch(console.error)
      })
    }
    
    // Через 3 секунды перенаправляем
    setTimeout(() => {
      if (type === 'product') {
        navigate('/profile?tab=orders')
      } else {
        navigate('/profile?tab=courses')
      }
    }, 3000)
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
                    {type === 'product' ? 'Товары' : courseId ? 'Курс' : 'Заказ'}
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
            
            {/* Форма оплаты (заглушка) */}
            {!isFree && (
              <div className="card mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Данные для оплаты
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Номер карты</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="0000 0000 0000 0000"
                      disabled
                      value="**** **** **** ****"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Срок действия</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="MM/YY"
                        disabled
                        value="**/**"
                      />
                    </div>
                    <div>
                      <label className="label">CVV</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="***"
                        disabled
                        value="***"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Это демонстрационная страница оплаты. В реальном приложении здесь будет интеграция с платёжной системой.
                  </p>
                </div>
              </div>
            )}
            
            {/* Кнопка оплаты */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
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
              to={type === 'product' ? '/cart' : courseId ? `/courses/${courseId}` : '/courses'}
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

