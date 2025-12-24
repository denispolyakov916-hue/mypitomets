/**
 * Компонент страницы оплаты
 *
 * Отображает информацию о заказе/курсе и форму оплаты
 * После оплаты заказ/курс считается оплаченным
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { processPayment, confirmPayment, getPayment, createPayment, getPaymentByOrder } from '../../api/payments'
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
  const [isLoading, setIsLoading] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [error, setError] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentCreating, setPaymentCreating] = useState(false)
  const [cardData, setCardData] = useState({
    card_number: '',
    cardholder_name: '',
    expiry_month: '',
    expiry_year: '',
    cvv: ''
  })

  const paymentId = searchParams.get('payment_id')
  const orderId = searchParams.get('order_id')
  const courseId = searchParams.get('course_id')
  const type = searchParams.get('type') // 'shop_order', 'course', 'unified_checkout'
  const amountParam = parseFloat(searchParams.get('amount') || '0')


  // Используем сумму из параметров или из загруженного платежа
  const amount = paymentInfo?.amount || amountParam
  const isFree = amount === 0

  /**
   * Загрузка информации о платеже
   */
  const loadPaymentInfo = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getPayment(paymentId)
      setPaymentInfo(response.payment)

      // Если платёж уже завершён, показываем успех
      if (response.payment?.status === 'completed') {
        setIsPaid(true)
      }
    } catch (err) {
      console.error('Payment loading error:', err)
      const status = err.response?.status
      let errorMessage = 'Не удалось загрузить информацию о платеже'

      if (status === 404) {
        errorMessage = 'Платеж не найден или недоступен'
      } else if (status === 403) {
        errorMessage = 'У вас нет доступа к этому платежу'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [paymentId])

  /**
   * Проверка существующего платежа для заказа
   */
  const checkExistingPaymentForOrder = useCallback(async () => {
    if (paymentCreating || paymentInfo) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Пытаемся найти существующий платеж для заказа
      const response = await getPaymentByOrder(orderId)

      if (response.payment) {
        // Найден существующий платеж - используем его
        setPaymentInfo(response.payment)
        // Обновляем URL, чтобы показывать payment_id с amount
        navigate(`/payment?payment_id=${response.payment.id}&amount=${response.payment.amount}`, { replace: true })
        setIsLoading(false)
        return
      }
    } catch (err) {
      // Платеж не найден - это нормально, создадим новый
      // Для просроченных заказов тоже создадим новый платеж
      console.log('Существующий платеж не найден, создаем новый')
    }

    // Если платеж не найден - создаем новый
    setIsLoading(false)
    handleCreatePayment()
  }, [orderId, paymentCreating, paymentInfo, navigate])

  /**
   * Создание платежа для заказа или курса
   */
  const handleCreatePayment = useCallback(async () => {
    if (paymentCreating || paymentInfo) {
      return // Уже создается или уже создан
    }

    setPaymentCreating(true)
    setIsLoading(true)
    setError(null)

    try {
      const paymentType = type === 'shop_order' ? 'shop_order' : 'course'
      const objectId = orderId || courseId

      if (!objectId) {
        setError('Не указан ID заказа или курса')
        setIsLoading(false)
        setPaymentCreating(false)
        return
      }

      const paymentData = {
        payment_type: paymentType,
        object_id: objectId,
        amount: amountParam
      }

      const response = await createPayment(paymentData)

      if (response.payment) {
        setPaymentInfo(response.payment)
        // Обновляем URL, чтобы показывать payment_id вместо order_id, включая amount
        navigate(`/payment?payment_id=${response.payment.id}&amount=${response.payment.amount}`, { replace: true })
      } else {
        setError('Не удалось создать платеж')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Не удалось создать платеж'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      setPaymentCreating(false)
    }
  }, [type, orderId, courseId, amountParam, navigate, paymentCreating, paymentInfo])

  /**
   * Обработчик оплаты
   */
  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Для бесплатных заказов/курсов просто подтверждаем
      if (isFree) {
        setIsPaid(true)
        setIsProcessing(false)

        // Через 3 секунды перенаправляем
        setTimeout(() => {
          navigateAfterPayment()
        }, 3000)
        return
      }

      // Если есть payment_id - подтверждаем существующий платёж
      if (paymentId || paymentInfo?.id) {
        const idToConfirm = paymentId || paymentInfo.id
        const response = await confirmPayment(idToConfirm)

        if (response.payment?.status === 'completed' || response.message) {
          setIsPaid(true)
          // Обновляем информацию о платеже
          if (response.payment) {
            setPaymentInfo(response.payment)
          }
          setTimeout(() => {
            navigateAfterPayment()
          }, 3000)
        } else {
          setError('Платеж не прошел')
        }
      } else {
        setError('Платеж не создан. Попробуйте обновить страницу.')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ошибка при обработке платежа')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Проверка аутентификации и загрузка информации о платеже
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    // Загружаем информацию о платеже, если передан payment_id
    if (paymentId) {
      loadPaymentInfo()
    }
    // Если передан order_id - сначала проверяем, есть ли уже платеж
    else if (orderId && !paymentInfo && !paymentCreating) {
      checkExistingPaymentForOrder()
    }
    // Если передан course_id, но нет payment_id и платеж еще не создается/не создан - создаем платеж
    else if (courseId && !paymentInfo && !paymentCreating) {
      handleCreatePayment()
    }
  }, [isAuthenticated, paymentId, orderId, courseId, paymentInfo, paymentCreating, loadPaymentInfo, checkExistingPaymentForOrder, handleCreatePayment])

  /**
   * Перенаправление после успешной оплаты
   */
  const navigateAfterPayment = () => {
    // Для unified_checkout или если есть payment_id - всегда в заказы
    if (paymentId || paymentInfo?.payment_type === 'unified_checkout') {
      navigate('/profile?tab=orders')
    } else if (type === 'shop_order') {
      navigate('/profile?tab=orders')
    } else {
      navigate('/profile?tab=courses')
    }
  }

  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login')
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">Необходимо войти в аккаунт для оплаты</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Войти
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error && !paymentInfo) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">💳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ошибка загрузки платежа
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Попробовать снова
            </button>
            <button onClick={() => navigate('/profile?tab=orders')} className="btn-secondary">
              К заказам
            </button>
          </div>
        </div>
      </div>
    )
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
                {(paymentId || paymentInfo?.id) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Номер платежа:</span>
                    <span className="text-gray-900 font-medium text-sm">#{(paymentId || paymentInfo.id).slice(0, 8)}...</span>
                  </div>
                )}
                {orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Номер заказа:</span>
                    <span className="text-gray-900 font-medium">#{orderId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Тип заказа:</span>
                  <span className="text-gray-900 font-medium">
                    {paymentInfo?.payment_type === 'unified_checkout'
                      ? 'Единый заказ'
                      : type === 'shop_order'
                        ? 'Товары'
                        : courseId
                          ? 'Курс'
                          : 'Заказ'}
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

            {/* Информация о демо-режиме */}
            {!isFree && (paymentId || paymentInfo) && (
              <div className="card mb-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💳 В демо-режиме платёж будет автоматически подтверждён
                  </p>
                </div>
              </div>
            )}

            {/* Форма оплаты с полями карты (скрыта в тестовом режиме) */}
            {!isFree && !paymentId && !paymentInfo && false && (
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
              disabled={isProcessing || (!isFree && !paymentId && !paymentInfo)}
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
              to={paymentId ? '/cart' : type === 'shop_order' ? '/cart' : courseId ? `/courses/${courseId}` : '/courses'}
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