/**
 * Компонент страницы оформления заказа курса
 * 
 * Отображает информацию о курсе, детали курса и дисклеймер
 * После нажатия переходит на страницу оплаты
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourseCheckout, purchaseCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { PageLoader } from '../../components/Loader'

/**
 * Форматирование цены
 */
const formatPrice = (price) => {
  if (price === 0) return 'Бесплатно'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Форматирование продолжительности
 */
const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

/**
 * Компонент страницы CourseCheckout
 */
function CourseCheckout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  
  const [checkoutData, setCheckoutData] = useState(null)
  const [course, setCourse] = useState(null)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка данных курса для checkout
   */
  const fetchCourseCheckout = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getCourseCheckout(id)
      setCheckoutData(response)
      setCourse(response.course)
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
    fetchCourseCheckout()
  }, [id, isAuthenticated])
  
  /**
   * Обработчик покупки курса
   */
  const handlePurchase = async () => {
    if (checkoutData?.course.price > 0 && !disclaimerAccepted) {
      alert('Необходимо согласиться с условиями использования')
      return
    }
    
    try {
      await purchaseCourse(id, disclaimerAccepted)
      navigate(`/payment?course_id=${id}&type=course&amount=${checkoutData.course.price}`)
    } catch (err) {
      setError(err.message || 'Не удалось оформить заказ')
    }
  }
  
  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !course) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Курс не найден'}</p>
          <Link to="/courses" className="btn-primary">
            Вернуться к курсам
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="page-container animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        {/* Ссылка назад */}
        <Link 
          to={`/courses/${id}`} 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к курсу
        </Link>
        
        {/* Заголовок */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Оформление заказа
        </h1>
        
        {/* Информация о курсе */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Информация о курсе
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {course.title}
              </h3>
              {course.description && (
                <p className="text-gray-600">
                  {course.description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Детальная информация о курсе из checkoutData.summary */}
        {checkoutData && (
          <>
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Детали курса</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Формат</span>
                  <p className="font-medium">{checkoutData.summary?.format || 'Не указан'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Уровень</span>
                  <p className="font-medium">{checkoutData.summary?.level || 'Не указан'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Время прохождения</span>
                  <p className="font-medium">{checkoutData.summary?.completion_time || formatDuration(course.duration)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Уроков</span>
                  <p className="font-medium">{checkoutData.summary?.lessons_count || 'Не указано'}</p>
                </div>
              </div>
              
              {course.what_you_will_learn && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-2">Чему вы научитесь:</h3>
                  <p className="text-gray-600">{course.what_you_will_learn}</p>
                </div>
              )}
            </div>
            
            {/* Дисклеймер для платных курсов */}
            {checkoutData.course.price > 0 && checkoutData.disclaimer && (
              <div className="card mb-6 border-yellow-200 bg-yellow-50">
                <h2 className="text-lg font-semibold mb-3">Важное уведомление</h2>
                <p className="text-sm text-gray-700 mb-4">{checkoutData.disclaimer.text}</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">Я понимаю и согласен с условиями</span>
                </label>
              </div>
            )}
          </>
        )}
        
        {/* Итоговая сумма */}
        <div className="card mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">Итого к оплате:</span>
            <span className="text-3xl font-bold text-primary-600">
              {formatPrice(course.price)}
            </span>
          </div>
          {course.price === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Курс предоставляется бесплатно
            </p>
          )}
        </div>
        
        {/* Ошибка */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}
        
        {/* Кнопка приобретения */}
        <button
          onClick={handlePurchase}
          disabled={checkoutData?.course.price > 0 && !disclaimerAccepted}
          className="w-full btn-primary py-4 text-lg"
        >
          {course.price === 0 ? 'Получить бесплатно' : 'Перейти к оплате'}
        </button>
        
        <p className="text-sm text-gray-500 text-center mt-4">
          Нажимая кнопку, вы соглашаетесь с условиями предоставления услуг
        </p>
      </div>
    </div>
  )
}

export default CourseCheckout
