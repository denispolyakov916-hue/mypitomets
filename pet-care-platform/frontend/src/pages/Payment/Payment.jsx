/**
 * Компонент страницы оплаты
 *
 * Отображает информацию о заказе/курсе и форму оплаты
 * После оплаты заказ/курс считается оплаченным
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { processPayment, confirmPayment, getPayment, createPayment, getPaymentByOrder } from '../../api/payments'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import AuthGuard from '../../components/AuthGuard'

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
  console.log('=== PAYMENT COMPONENT MOUNTED ===')
  console.log('Current URL:', window.location.href)

  // TEMP: Простая заглушка для тестирования
  return (
    <div className="page-container">
      <div className="card text-center py-12 max-w-lg mx-auto">
        <div className="text-6xl mb-4">💳</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Страница оплаты работает!
        </h1>
        <p className="text-gray-600 mb-6">
          Маршрут /payment функционирует корректно.
        </p>
        <div className="space-y-2 text-left bg-gray-50 p-4 rounded-lg mb-6">
          <p><strong>URL:</strong> {window.location.href}</p>
          <p><strong>Search:</strong> {window.location.search}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="btn-primary"
        >
          Назад
        </button>
      </div>
    </div>
  )

  // Оставшийся код закомментирован для тестирования
  /*
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  console.log('isAuthenticated:', isAuthenticated)

  // Ref для предотвращения множественных вызовов
  const initRef = useRef(false)

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
  const [qrCode, setQrCode] = useState(null)
  const [sbpProcessing, setSbpProcessing] = useState(false)

  const paymentId = searchParams.get('payment_id')
  const orderId = searchParams.get('order_id')
  const courseId = searchParams.get('course_id')
  const type = searchParams.get('type') // 'shop_order', 'course', 'unified_checkout'
  const method = searchParams.get('method') // 'card', 'sbp'
  const amountParam = parseFloat(searchParams.get('amount') || '0')

  // Отладка параметров
  console.log('Payment page loaded with params:', {
    paymentId,
    orderId,
    courseId,
    type,
    method,
    amountParam
  })

  // Используем сумму из параметров или из загруженного платежа
  const amount = paymentInfo?.amount || amountParam
  const isFree = amount === 0

  /**
   * Загрузка информации о платеже
   */
  const loadPaymentInfo = useCallback(async (id) => {
    if (!id) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await getPayment(id)
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
  }, [])

  /**
   * Проверка существующего платежа для заказа
   */
  const checkExistingPaymentForOrder = useCallback(async (orderIdParam) => {
    if (!orderIdParam || paymentCreating || paymentInfo) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Пытаемся найти существующий платеж для заказа
      const response = await getPaymentByOrder(orderIdParam)

      if (response.payment) {
        // Найден существующий платеж - используем его
        setPaymentInfo(response.payment)
        // Обновляем URL, чтобы показывать payment_id с amount
        navigate(`/payment?payment_id=${response.payment.id}&amount=${response.payment.amount}`, { replace: true })
        return
      }
    } catch (err) {
      // Платеж не найден - это нормально, создадим новый
      console.log('Существующий платеж не найден, создаем новый')
    }

    // Если платеж не найден - создаем новый
    setIsLoading(false)
    const paymentType = type === 'shop_order' ? 'shop_order' : type === 'course' ? 'course' : 'unified_checkout'
    createPaymentForOrder(orderIdParam, null, paymentType, amountParam)
  }, [paymentCreating, paymentInfo, navigate])

  /**
   * Создание платежа для заказа или курса
   */
  const createPaymentForOrder = useCallback(async (orderIdParam, courseIdParam, paymentType, amount) => {
    if (paymentCreating || paymentInfo) {
      return // Уже создается или уже создан
    }

    setPaymentCreating(true)
    setIsLoading(true)
    setError(null)

    try {
      const objectId = orderIdParam || courseIdParam

      if (!objectId) {
        setError('Не указан ID заказа или курса')
        setIsLoading(false)
        setPaymentCreating(false)
        return
      }

      const paymentData = {
        payment_type: paymentType,
        object_id: objectId,
        amount: amount
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
  }, [paymentCreating, paymentInfo, navigate])

  /**
   * Обработчик оплаты
   */
  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Специальная обработка для Системы Быстрых Платежей
      if (method === 'sbp') {
        setSbpProcessing(true)

        // Имитация сканирования QR-кода и оплаты
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Для демо-режима автоматически подтверждаем платеж
        if (paymentId || paymentInfo?.id) {
          const idToConfirm = paymentId || paymentInfo.id
          const response = await confirmPayment(idToConfirm)

          if (response.payment?.status === 'completed' || response.message) {
            setIsPaid(true)
            setSbpProcessing(false)
            setTimeout(() => {
              navigateAfterPayment()
            }, 3000)
            return
          }
        }

        setIsPaid(true)
        setSbpProcessing(false)
        setTimeout(() => {
          navigateAfterPayment()
        }, 3000)
        return
      }

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

      // Обработка платежа картой
      if (method === 'card') {
        // Базовая валидация данных карты для демо
        if (!cardData.card_number || cardData.card_number.replace(/\s/g, '').length < 16) {
          setError('Введите корректный номер карты')
          setIsProcessing(false)
          return
        }
        if (!cardData.cardholder_name || cardData.cardholder_name.length < 2) {
          setError('Введите имя держателя карты')
          setIsProcessing(false)
          return
        }
        if (!cardData.expiry_month || !cardData.expiry_year || !cardData.cvv) {
          setError('Заполните все поля данных карты')
          setIsProcessing(false)
          return
        }

        // Имитация обработки платежа картой
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Подтверждаем платеж
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
      } else {
        // Для других методов (если будут) - подтверждаем существующий платёж
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

    // Предотвращаем множественные инициализации
    if (initRef.current) {
      return
    }
    initRef.current = true

    console.log('useEffect triggered with:', {
      paymentId,
      orderId,
      courseId,
      paymentInfo: !!paymentInfo,
      paymentCreating,
      isLoading
    })

    // Загружаем информацию о платеже, если передан payment_id
    if (paymentId && !paymentInfo && !isLoading) {
      console.log('Loading payment info for paymentId:', paymentId)
      loadPaymentInfo(paymentId)
    }
    // Если передан order_id - сначала проверяем, есть ли уже платеж
    else if (orderId && !paymentInfo && !paymentCreating && !isLoading) {
      console.log('Checking existing payment for orderId:', orderId)
      checkExistingPaymentForOrder(orderId)
    }
    // Если передан course_id, но нет payment_id и платеж еще не создается/не создан - создаем платеж
    else if (courseId && !paymentInfo && !paymentCreating && !isLoading) {
      const paymentType = type === 'shop_order' ? 'shop_order' : 'course'
      console.log('Creating payment for courseId:', courseId, 'paymentType:', paymentType)
      createPaymentForOrder(orderId, courseId, paymentType, amountParam)
    } else {
      console.log('No action taken in useEffect')
    }
  }, [isAuthenticated, paymentId, orderId, courseId, paymentInfo, paymentCreating, isLoading, loadPaymentInfo, checkExistingPaymentForOrder, createPaymentForOrder, type, amountParam, navigate])

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

  if (isLoading || paymentCreating) {
    return <PageLoader />
  }

  // Если нет параметров платежа, показываем ошибку
  if (!paymentId && !orderId && !courseId) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Параметры платежа отсутствуют
          </h2>
          <p className="text-gray-600 mb-6">
            Не указаны параметры платежа. Вернитесь к оформлению заказа.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/cart')} className="btn-primary">
              К корзине
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              На главную
            </button>
          </div>
        </div>
      </div>
    )
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

  // ВРЕМЕННАЯ ЗАГЛУШКА: если нет параметров платежа, показываем демо-страницу
  if (!orderId && !courseId && !paymentId) {
    console.log('TEMP: No payment params, showing demo payment page')
    return (
      <div className="page-container animate-fadeIn">
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Оплата заказа</h1>

            <div className="card mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Информация о заказе</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Номер заказа:</span>
                  <span className="text-gray-900 font-medium">#DEMO-ORDER</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Тип заказа:</span>
                  <span className="text-gray-900 font-medium">Демо-заказ</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                  <span>Сумма к оплате:</span>
                  <span className="text-primary-600">2 480 ₽</span>
                </div>
              </div>
            </div>

            <div className="card mb-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💳 В демо-режиме любая карта принимается к оплате
                </p>
              </div>
            </div>

            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">💳 Данные банковской карты</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Номер карты</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="0000 0000 0000 0000"
                    value="4111 1111 1111 1111"
                    readOnly
                  />
                </div>
                <div>
                  <label className="label">Имя держателя карты</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="IVAN IVANOV"
                    value="DEMO USER"
                    readOnly
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Месяц (MM)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="12"
                      value="12"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="label">Год (YYYY)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="2025"
                      value="2025"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="label">CVV</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="123"
                    value="123"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/profile?tab=orders')}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Оплатить 2 480 ₽
            </button>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/cart')}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Вернуться в корзину
              </button>
            </div>
          </div>
        </div>
    )
  }

  console.log('Payment component rendering, isAuthenticated:', isAuthenticated)

  // TEMP: Убрал AuthGuard для тестирования
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

            {/* Форма оплаты */}
            {!isFree && !paymentId && !paymentInfo && (
              <>
                {method === 'card' && (
                  <div className="card mb-6">
                    <h2 className="text-xl font-semibold mb-4">💳 Данные банковской карты</h2>

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

                {method === 'sbp' && (
                  <div className="card mb-6">
                    <h2 className="text-xl font-semibold mb-4">📱 Система Быстрых Платежей</h2>

                    <div className="text-center py-8">
                      <div className="mb-6">
                        <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 18h4.01M12 21h4.01M8 7v4m0 0h.01M8 15h4.01M8 18h4.01M8 21h4.01M2 7h4m0 0v4m0 0h.01M4 15h4.01M4 18h4.01M4 21h4.01" />
                            </svg>
                            <p className="text-gray-500">QR-код для оплаты</p>
                            <p className="text-xs text-gray-400 mt-2">В демо-режиме оплата будет автоматически подтверждена</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 mb-2">
                          📱 Отсканируйте QR-код в приложении вашего банка
                        </p>
                        <p className="text-xs text-green-600">
                          Поддерживаются: СберБанк, Тинькофф, Альфа-Банк, ВТБ и другие
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!method && (
                  <div className="card mb-6">
                    <h2 className="text-xl font-semibold mb-4">💳 Данные банковской карты</h2>

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
              </>
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
              disabled={isProcessing || (!isFree && !paymentInfo)}
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <ButtonLoader />
                  {isFree ? 'Обработка...' :
                   sbpProcessing ? 'Обработка платежа СПБ...' :
                   'Обработка платежа...'}
                </>
              ) : isFree ? (
                'Подтвердить'
              ) : (
                <>
                  {method === 'sbp' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 18h4.01M12 21h4.01M8 7v4m0 0h.01M8 15h4.01M8 18h4.01M8 21h4.01M2 7h4m0 0v4m0 0h.01M4 15h4.01M4 18h4.01M4 21h4.01" />
                      </svg>
                      Оплатить через СПБ
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15l1-4 4 1M9 6l1 4 4-1" />
                      </svg>
                      Оплатить картой
                    </>
                  )}
                  <span className="ml-2">{formatPrice(amount)}</span>
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
  */

  return null // Не используется
}

export default Payment