/**
 * Компонент страницы оплаты
 *
 * Отображает информацию о заказе/курсе и форму оплаты
 * После оплаты заказ/курс считается оплаченным
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { confirmPayment, getPayment, createPayment, getPaymentByOrder } from '../../api/payments'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import AuthGuard from '../../components/AuthGuard'
import { formatPrice } from '../../utils/format'

/**
 * Компонент страницы Payment
 */
function Payment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // Ref для предотвращения множественных вызовов
  const initRef = useRef(false)

  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [error, setError] = useState(null)
  const [paymentInfo, setPaymentInfo] = useState(null)
  const [paymentCreating, setPaymentCreating] = useState(false)
  const [cardData, setCardData] = useState({
    card_number: '0000 0000 0000 0000',
    cardholder_name: 'IVAN IVANOV',
    expiry_month: '12',
    expiry_year: '2025',
    cvv: '123'
  })
  const [qrCode, setQrCode] = useState(null)
  const [sbpProcessing, setSbpProcessing] = useState(false)

  const paymentId = searchParams.get('payment_id')
  const orderId = searchParams.get('order_id')
  const courseId = searchParams.get('course_id')
  const type = searchParams.get('type') // 'shop_order', 'course', 'unified_checkout'
  const method = searchParams.get('method') || 'card' // 'card', 'sbp' - по умолчанию карта
  const amountParam = parseFloat(searchParams.get('amount') || '0')
  
  // Используем сумму из параметров или из загруженного платежа
  const amount = paymentInfo?.amount || amountParam
  const isFree = amount === 0

  // Отладка метода оплаты
  useEffect(() => {
    console.log('Payment method from URL:', method)
  }, [method])

  /**
   * Принудительная прокрутка наверх при загрузке страницы оплаты
   */
  useEffect(() => {
    console.log('💳 Payment page: Forcing scroll to top')

    const scrollToTop = () => {
      console.log('📍 Current scroll position before:', window.scrollY)
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      document.documentElement.scrollLeft = 0
      document.body.scrollLeft = 0
      console.log('📍 Scroll position after:', window.scrollY)
    }

    // Немедленная прокрутка
    scrollToTop()

    // Множественные попытки прокрутки
    setTimeout(scrollToTop, 10)
    setTimeout(scrollToTop, 50)
    setTimeout(scrollToTop, 100)
    setTimeout(scrollToTop, 200)

    // Дополнительная прокрутка при изменении контента
    const handleContentChange = () => {
      setTimeout(scrollToTop, 50)
    }

    window.addEventListener('load', handleContentChange)
    window.addEventListener('resize', handleContentChange)

    return () => {
      window.removeEventListener('load', handleContentChange)
      window.removeEventListener('resize', handleContentChange)
    }
  }, [])

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

      // Если метод оплаты не указан в URL, но есть в payment metadata, обновляем URL
      if (response.payment) {
        let currentMethod = method || 'card'

        // Проверяем metadata для метода оплаты 'sbp'
        if (response.payment.metadata && response.payment.metadata.payment_method === 'sbp') {
          currentMethod = 'sbp'
        }

        // Если метод в URL отличается от метода в payment, обновляем URL
        if (currentMethod !== method) {
          const params = new URLSearchParams(window.location.search)
          params.set('method', currentMethod)
          navigate(`/payment?${params.toString()}`, { replace: true })
        }
      }

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
  }, [method, navigate])

  /**
   * Создание платежа для заказа или курса
   */
  const createPaymentForOrder = useCallback(async (objectId, paymentType, amount) => {
    if (paymentCreating || paymentInfo || !objectId) {
      return // Уже создается или уже создан, или нет ID
    }

    setPaymentCreating(true)
    setIsLoading(true)
    setError(null)

    try {
      // Для 'sbp' сохраняем в metadata, так как в модели Payment нет 'sbp' в choices
      const paymentMethod = method === 'sbp' ? 'card' : (method || 'card')
      const paymentMetadata = method === 'sbp' ? { payment_method: 'sbp' } : {}

      const paymentData = {
        payment_type: paymentType,
        object_id: objectId,
        amount: amount,
        payment_method: paymentMethod,
        metadata: paymentMetadata
      }

      const response = await createPayment(paymentData)

      if (response.payment) {
        setPaymentInfo(response.payment)
        // Обновляем URL, чтобы показывать payment_id вместо order_id, включая amount и method
        const params = new URLSearchParams({
          payment_id: response.payment.id,
          amount: response.payment.amount.toString(),
          method: method || 'card'
        })
        navigate(`/payment?${params.toString()}`, { replace: true })
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
  }, [paymentCreating, paymentInfo, navigate, method])

  /**
   * Проверка существующего платежа для заказа
   */
  const checkExistingPaymentForOrder = useCallback(async (orderIdParam) => {
    if (!orderIdParam || paymentInfo) {
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
        // Обновляем URL, чтобы показывать payment_id с amount и method
        const params = new URLSearchParams({
          payment_id: response.payment.id,
          amount: response.payment.amount.toString(),
          method: method || 'card'
        })
        navigate(`/payment?${params.toString()}`, { replace: true })
        setIsLoading(false)
        return
      }
    } catch (err) {
      // Платеж не найден - это нормально, будем создавать при оплате
      console.log('Существующий платеж не найден, будет создан при оплате')
    }

    // Платеж не найден - просто завершаем загрузку, платеж будет создан при нажатии кнопки
    setIsLoading(false)
  }, [paymentInfo, navigate, method])

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

    // Загружаем информацию о платеже, если передан payment_id
    if (paymentId && !paymentInfo && !isLoading) {
      loadPaymentInfo(paymentId)
    }
    // Если передан order_id - сначала проверяем, есть ли уже платеж
    else if (orderId && !paymentInfo && !isLoading) {
      checkExistingPaymentForOrder(orderId)
    }
    // Если передан course_id, но нет payment_id - создаем платеж
    else if (courseId && !paymentInfo && !isLoading) {
      const paymentType = type === 'shop_order' ? 'shop_order' : 'course'
      createPaymentForOrder(courseId, paymentType, amountParam)
    }
  }, [isAuthenticated, paymentId, orderId, courseId, paymentInfo, isLoading, loadPaymentInfo, checkExistingPaymentForOrder, createPaymentForOrder, type, amountParam, navigate])

  // Устанавливаем атрибут для отключения scroll-behavior
  useEffect(() => {
    document.body.setAttribute('data-page', 'payment')
    return () => {
      document.body.removeAttribute('data-page')
    }
  }, [])

  /**
   * Обработчик оплаты
   * В демо-режиме всегда автоматически подтверждает платеж
   */
  const handlePayment = async () => {
    setIsProcessing(true)
    setSbpProcessing(method === 'sbp')
    setError(null)

    try {
      // Для бесплатных заказов/курсов просто подтверждаем
      if (isFree) {
        setIsPaid(true)
        setIsProcessing(false)
        setTimeout(() => {
          navigateAfterPayment()
        }, 3000)
        return
      }

      // Имитация обработки платежа (1 секунда)
      await new Promise(resolve => setTimeout(resolve, 1000))

      let paymentIdToConfirm = paymentId || paymentInfo?.id

      // Если платеж еще не создан, создаем его
      if (!paymentIdToConfirm) {
        if (!orderId) {
          setError('ID заказа не найден')
          setIsProcessing(false)
          return
        }

        // Для 'sbp' сохраняем в metadata, так как в модели Payment нет 'sbp' в choices
        const paymentMethodForBackend = method === 'sbp' ? 'card' : (method || 'card')
        const paymentMetadata = method === 'sbp' ? { payment_method: 'sbp' } : {}

        const createResponse = await createPayment({
          payment_type: type,
          object_id: orderId,
          amount: amount,
          payment_method: paymentMethodForBackend,
          metadata: paymentMetadata
        })

        if (createResponse.payment) {
          setPaymentInfo(createResponse.payment)
          paymentIdToConfirm = createResponse.payment.id
        } else {
          setError('Не удалось создать платеж')
          setIsProcessing(false)
          return
        }
      }

      // Подтверждаем платеж
      const confirmResponse = await confirmPayment(paymentIdToConfirm)

      if (confirmResponse.payment?.status === 'completed' || confirmResponse.message) {
        setIsPaid(true)
        // Обновляем информацию о платеже
        if (confirmResponse.payment) {
          setPaymentInfo(confirmResponse.payment)
        }
        setTimeout(() => {
          navigateAfterPayment()
        }, 3000)
      } else {
        // В демо-режиме считаем оплату успешной даже при проблемах
        setIsPaid(true)
        setTimeout(() => {
          navigateAfterPayment()
        }, 3000)
      }

    } catch (err) {
      // Оплата не прошла: заказ НЕ теряется — он сохраняется на бэкенде со статусом
      // "Ожидает оплаты". Ведём пользователя на страницу заказа, где он может
      // повторить оплату, отменить заказ или вернуться в магазин.
      console.error('Ошибка при обработке платежа:', err)
      handlePaymentFailure(err)
    } finally {
      setIsProcessing(false)
      setSbpProcessing(false)
    }
  }


  /**
   * Обработка неуспешной оплаты.
   *
   * Заказ сохраняется на бэкенде со статусом "Ожидает оплаты". Для заказов
   * товаров ведём на страницу заказа, иначе показываем ошибку на месте.
   */
  const handlePaymentFailure = (err) => {
    const targetOrderId = orderId || paymentInfo?.object_id
    const isShopOrder = type === 'shop_order' || type === 'unified_checkout'

    if (isShopOrder && targetOrderId) {
      navigate(`/orders/${targetOrderId}`, {
        state: { message: 'Оплата не завершена. Заказ ожидает оплаты — вы можете оплатить его позже или отменить.' }
      })
    } else {
      setError(err?.message || 'Не удалось завершить оплату. Попробуйте ещё раз.')
    }
  }

  /**
   * Отмена оплаты пользователем.
   *
   * Заказ НЕ удаляется и корзина НЕ очищается. Для заказов товаров ведём на
   * страницу заказа (статус "Ожидает оплаты"), для курсов — обратно к курсу.
   */
  const handleCancelPayment = () => {
    const targetOrderId = orderId || paymentInfo?.object_id
    const isShopOrder = type === 'shop_order' || type === 'unified_checkout'

    if (isShopOrder && targetOrderId) {
      navigate(`/orders/${targetOrderId}`)
    } else if (courseId) {
      navigate(`/courses/${courseId}`)
    } else {
      navigate('/courses')
    }
  }

  /**
   * Перенаправление после успешной оплаты
   */
  const navigateAfterPayment = () => {
    const paymentType = paymentInfo?.payment_type || type

    // Для unified_checkout - всегда в заказы
    if (paymentType === 'unified_checkout') {
      navigate('/profile?tab=orders')
    }
    // Для заказов товаров - в заказы
    else if (paymentType === 'shop_order') {
      navigate('/profile?tab=orders')
    }
    // Для курсов - сразу переход к обучению
    else if (paymentType === 'course' && (courseId || orderId)) {
      const courseIdToUse = courseId || orderId
      setTimeout(() => {
        navigate(`/training/courses/${courseIdToUse}/learn`)
      }, 1000)
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

  return (
    <AuthGuard>
      <div className="page-container animate-fadeIn">
        <div className="max-w-2xl mx-auto">
          {isPaid ? (
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
                      ? 'Единый заказ (товары + курсы)'
                      : paymentInfo?.payment_type === 'shop_order' || type === 'shop_order'
                        ? 'Товары'
                        : paymentInfo?.payment_type === 'course' || type === 'course'
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

            {/* Форма оплаты - показываем для карты или СБП, если не бесплатно */}
            {!isFree && (
              <>
                {/* Форма оплаты картой */}
                {(method === 'card' || !method) && (
                  <div className="card mb-6">
                    <h2 className="text-xl font-semibold mb-4">💳 Данные банковской карты</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="label">Номер карты</label>
                        <input
                          type="text"
                          className="input bg-gray-50 cursor-not-allowed"
                          placeholder="0000 0000 0000 0000"
                          value={cardData.card_number}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="label">Имя держателя карты</label>
                        <input
                          type="text"
                          className="input bg-gray-50 cursor-not-allowed"
                          placeholder="IVAN IVANOV"
                          value={cardData.cardholder_name}
                          readOnly
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="label">Месяц (MM)</label>
                          <input
                            type="text"
                            className="input bg-gray-50 cursor-not-allowed"
                            placeholder="12"
                            value={cardData.expiry_month}
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="label">Год (YYYY)</label>
                          <input
                            type="text"
                            className="input bg-gray-50 cursor-not-allowed"
                            placeholder="2025"
                            value={cardData.expiry_year}
                            readOnly
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">CVV</label>
                        <input
                          type="text"
                          className="input bg-gray-50 cursor-not-allowed"
                          placeholder="123"
                          value={cardData.cvv}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💳 В демо-режиме оплата будет автоматически подтверждена после нажатия кнопки "Оплатить"
                      </p>
                    </div>
                  </div>
                )}

                {/* Форма оплаты через СБП с QR-кодом */}
                {method === 'sbp' && (
                  <div className="card mb-6">
                    <h2 className="text-xl font-semibold mb-4">📱 Система Быстрых Платежей</h2>

                    <div className="text-center py-8">
                      <div className="mb-6">
                        {/* Заглушка для QR-кода */}
                        <div className="w-64 h-64 mx-auto bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center shadow-sm">
                          <div className="text-center">
                            <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 18h4.01M12 21h4.01M8 7v4m0 0h.01M8 15h4.01M8 18h4.01M8 21h4.01M2 7h4m0 0v4m0 0h.01M4 15h4.01M4 18h4.01M4 21h4.01" />
                            </svg>
                            <p className="text-sm font-medium text-gray-600">Здесь будет QR-код</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Сумма: {formatPrice(amount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 mb-2 font-medium">
                          📱 Отсканируйте QR-код в приложении вашего банка
                        </p>
                        <p className="text-xs text-green-600">
                          Поддерживаются: СберБанк, Тинькофф, Альфа-Банк, ВТБ и другие
                        </p>
                      </div>
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
              disabled={isProcessing || (!isFree && !paymentInfo && !paymentId && !orderId && !courseId)}
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

            {/*
              Отмена оплаты НЕ очищает корзину и НЕ удаляет заказ.
              Для заказов товаров ведём пользователя на страницу заказа со статусом
              "Ожидает оплаты", где доступны действия: Оплатить / Отменить заказ /
              Вернуться в магазин. Заказ сохраняется на бэкенде.
            */}
            <button
              type="button"
              onClick={handleCancelPayment}
              className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
            >
              Отменить
            </button>
          </>
        )}
        </div>
      </div>
    </AuthGuard>
  )
}

export default Payment