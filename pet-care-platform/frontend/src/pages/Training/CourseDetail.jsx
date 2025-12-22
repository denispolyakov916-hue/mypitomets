/**
 * Компонент страницы детального просмотра курса
 * 
 * Отображает полную информацию о курсе:
 * - Обложка
 * - Название и описание
 * - Длительность и цена
 * - Кнопка покупки/записи
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'

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
 * Компонент страницы CourseDetail
 */
function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { addCourse } = useCartStore()
  
  const [course, setCourse] = useState(null)
  const [isOwned, setIsOwned] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  
  /**
   * Загрузка данных курса
   */
  useEffect(() => {
    fetchCourse()
  }, [id])
  
  /**
   * Загрузка курса из API
   */
  const fetchCourse = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await getCourse(id)
      setCourse(response.course)
      setIsOwned(response.is_owned || false)
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные курса')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Обработчик добавления курса в корзину и перехода к checkout
   */
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } })
      return
    }
    
    if (isOwned) {
      return
    }
    
    setIsAddingToCart(true)
    try {
      // Добавляем курс в корзину
      const success = await addCourse(course.id, null, false)
      
      if (success) {
        // Переходим к единому checkout
        navigate('/checkout')
      } else {
        alert('Не удалось добавить курс в корзину')
      }
    } catch (err) {
      alert(err.message || 'Не удалось добавить курс в корзину')
    } finally {
      setIsAddingToCart(false)
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
      {/* Ссылка назад */}
      <Link 
        to="/courses" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад к курсам
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Обложка и заголовок */}
          <div>
            {course.image_url ? (
              <img 
                src={course.image_url} 
                alt={course.title}
                className="w-full h-64 object-cover rounded-xl mb-4"
              />
            ) : (
              <div className="w-full h-64 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-6xl">
                  {course.pet_type === 'dog' ? '🐕' : course.pet_type === 'cat' ? '🐱' : '📚'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                {course.pet_type === 'dog' ? 'Для собак' : course.pet_type === 'cat' ? 'Для кошек' : 'Для всех'}
              </span>
              {course.is_free && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  Бесплатно
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {course.title}
            </h1>
          </div>
          
          {/* Описание */}
          {course.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Описание курса</h2>
              <p className="text-gray-600 whitespace-pre-line">
                {course.description}
              </p>
            </div>
          )}
        </div>
        
        {/* Боковая панель с информацией и действиями */}
        <div className="space-y-6">
          <div className="card sticky top-4">
            {/* Цена */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPrice(course.price)}
              </div>
              {course.price > 0 && (
                <p className="text-sm text-gray-500">
                  Единоразовая оплата
                </p>
              )}
            </div>
            
            {/* Характеристики */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">Длительность</span>
                <span className="text-gray-900 font-medium">
                  {formatDuration(course.duration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Тип животного</span>
                <span className="text-gray-900 font-medium">
                  {course.pet_type === 'dog' ? 'Собаки' : course.pet_type === 'cat' ? 'Кошки' : 'Все'}
                </span>
              </div>
            </div>
            
            {/* Кнопка покупки */}
            {isOwned ? (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full btn-secondary py-3 opacity-50 cursor-not-allowed"
                >
                  Курс уже приобретён
                </button>
                <Link
                  to="/profile"
                  className="block w-full btn-primary py-3 text-center"
                >
                  Перейти к курсу
                </Link>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isAddingToCart ? (
                  <>
                    <ButtonLoader />
                    Добавление...
                  </>
                ) : course.price > 0 ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    В корзину
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Записаться бесплатно
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail

