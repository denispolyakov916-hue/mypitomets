import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { PageLoader } from '../../components/Loader'
import { useCartStore } from '../../store/cartStore'
import { formatPrice } from '../../utils/format'

/**
 * Компонент выбора способа оплаты
 */
function PaymentMethodSelection() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const itemsCount = useCartStore(s => s.itemsCount)
  const totalPrice = useCartStore(s => s.totalPrice)

  const [selectedMethod, setSelectedMethod] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Получаем данные из параметров URL или localStorage
  const orderId = searchParams.get('order_id')
  const amount = searchParams.get('amount') || totalPrice
  const type = searchParams.get('type') || 'order'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    // Если нет данных о заказе, перенаправляем обратно
    if (!orderId && !amount) {
      navigate('/checkout')
      return
    }
  }, [isAuthenticated, orderId, amount, navigate])

  /**
   * Обработка выбора способа оплаты
   */
  const handlePaymentMethodSelect = async (method) => {
    setSelectedMethod(method)
    setIsProcessing(true)

    try {
      // Имитация обработки (в реальности здесь будет API вызов)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Перенаправление на соответствующую страницу оплаты
      if (method === 'card') {
        // Оплата картой - переходим на страницу ввода данных карты
        navigate(`/payment?order_id=${orderId}&amount=${amount}&method=card&type=${type}`)
      } else if (method === 'sbp') {
        // Система Быстрых Платежей - переходим на страницу сканирования QR
        navigate(`/payment?order_id=${orderId}&amount=${amount}&method=sbp&type=${type}`)
      }
    } catch (error) {
      console.error('Ошибка при выборе способа оплаты:', error)
      setIsProcessing(false)
    }
  }

  /**
   * Способы оплаты
   */
  const paymentMethods = [
    {
      id: 'card',
      title: 'Банковская карта',
      description: 'Visa, Mastercard, Мир',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      features: ['Мгновенная оплата', 'Безопасная транзакция', 'Поддержка всех карт'],
      color: 'blue'
    },
    {
      id: 'sbp',
      title: 'Система Быстрых Платежей',
      description: 'Оплата по QR-коду',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 18h4.01M12 21h4.01M8 7v4m0 0h.01M8 15h4.01M8 18h4.01M8 21h4.01M2 7h4m0 0v4m0 0h.01M4 15h4.01M4 18h4.01M4 21h4.01" />
        </svg>
      ),
      features: ['Оплата через мобильное приложение', 'Без комиссии', 'Мгновенное зачисление'],
      color: 'green'
    }
  ]

  if (!isAuthenticated) {
    return <PageLoader />
  }

  return (
    <div className="page-container animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Выберите способ оплаты
          </h1>
          <p className="text-gray-600">
            Сумма к оплате: <span className="font-semibold text-primary-600">{formatPrice(amount)}</span>
          </p>
        </div>

        {/* Способы оплаты */}
        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`card cursor-pointer transition-all duration-200 border-2 ${
                selectedMethod === method.id
                  ? `border-${method.color}-500 bg-${method.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePaymentMethodSelect(method.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  selectedMethod === method.id
                    ? `bg-${method.color}-100 text-${method.color}-600`
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {method.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {method.title}
                    </h3>
                    {selectedMethod === method.id && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${method.color}-100 text-${method.color}-800`}>
                        Выбран
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-3">{method.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {method.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        ✓ {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    selectedMethod === method.id
                      ? `border-${method.color}-500 bg-${method.color}-500`
                      : 'border-gray-300'
                  }`}>
                    {selectedMethod === method.id && (
                      <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Информация о заказе */}
        <div className="card bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">Информация о заказе</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Номер заказа:</span>
              <span className="font-medium">#{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Тип:</span>
              <span className="font-medium">
                {type === 'order' ? 'Заказ товаров' :
                 type === 'course' ? 'Покупка курса' : 'Оплата'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-900 font-medium">Итого:</span>
              <span className="text-lg font-bold text-primary-600">{formatPrice(amount)}</span>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-4 mt-6">
          <Link
            to="/checkout"
            className="flex-1 btn-secondary text-center"
            disabled={isProcessing}
          >
            ← Назад к оформлению
          </Link>

          <button
            onClick={() => selectedMethod && handlePaymentMethodSelect(selectedMethod)}
            disabled={!selectedMethod || isProcessing}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span>Обработка...</span>
            ) : (
              <span>Продолжить оплату</span>
            )}
          </button>
        </div>

        {/* Гарантия безопасности */}
        <div className="text-center mt-8 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-green-700 mb-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Безопасная оплата</span>
          </div>
          <p className="text-sm text-green-600">
            Ваши данные защищены современными методами шифрования
          </p>
        </div>
      </div>
    </div>
  )
}

export default PaymentMethodSelection
