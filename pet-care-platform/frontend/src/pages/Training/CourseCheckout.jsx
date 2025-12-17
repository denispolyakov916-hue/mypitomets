/**
 * Компонент страницы оформления заказа курса
 * 
 * Отображает информацию о курсе и кнопку "Приобрести"
 * После нажатия переходит на страницу оплаты
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourse } from '../../api/courses'
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
  
  const [course, setCourse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка данных курса
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchCourse()
  }, [id, isAuthenticated])
  
  /**
   * Загрузка курса из API
   */
  const fetchCourse = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getCourse(id)
      setCourse(response.course)
      if (response.is_owned) {
        navigate(`/courses/${id}`)
      }
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные курса')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик перехода к оплате
   */
  const handlePurchase = () => {
    if (course.price === 0) {
      // Для бесплатных курсов сразу переходим на оплату (которая подтвердит)
      navigate(`/payment?course_id=${id}&type=free`)
    } else {
      // Для платных курсов переходим на оплату
      navigate(`/payment?course_id=${id}&type=paid&amount=${course.price}`)
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
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <span className="text-sm text-gray-500">Длительность</span>
                <p className="text-gray-900 font-medium">
                  {formatDuration(course.duration)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Тип животного</span>
                <p className="text-gray-900 font-medium">
                  {course.pet_type === 'dog' ? 'Собаки' : course.pet_type === 'cat' ? 'Кошки' : 'Все'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
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
        
        {/* Кнопка приобретения */}
        <button
          onClick={handlePurchase}
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

