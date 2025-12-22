/**
 * Компонент страницы оформления заказа курса
 * 
 * Отображает информацию о курсе, детали курса и дисклеймер
 * После нажатия переходит на страницу оплаты
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourseCheckout } from '../../api/courses'
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
 * Компонент страницы CourseCheckout
 */
function CourseCheckout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { addCourse } = useCartStore()
  
  const [checkoutData, setCheckoutData] = useState(null)
  const [course, setCourse] = useState(null)
  const [userPets, setUserPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
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
      
      // Загружаем список питомцев из ответа checkout
      if (response.user_pets && Array.isArray(response.user_pets)) {
        setUserPets(response.user_pets)
      }
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
   * Обработчик добавления курса в корзину
   */
  const handleAddToCart = async () => {
    // Для платных курсов требуется согласие с условиями
    if (checkoutData?.course.price > 0 && !disclaimerAccepted) {
      setError('Необходимо согласиться с условиями использования')
      return
    }
    
    setIsAddingToCart(true)
    setError(null)
    
    try {
      const petId = selectedPetId || null
      const success = await addCourse(id, petId, disclaimerAccepted)
      
      if (success) {
        // Переходим в корзину
        navigate('/shop/cart')
      } else {
        setError('Не удалось добавить курс в корзину')
      }
    } catch (err) {
      // Обработка ошибок валидации типа курса/питомца
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Не удалось добавить курс в корзину'
      setError(errorMessage)
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
        
        {/* Выбор питомца (если есть доступные питомцы и курс не для всех) */}
        {userPets.length > 0 && course.pet_type !== 'all' && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Выберите питомца (опционально)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Вы можете привязать этот курс к конкретному питомцу. Если не выберете питомца, курс будет доступен для всех ваших питомцев.
            </p>
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Не привязывать к питомцу</option>
              {userPets
                .filter(pet => {
                  // Фильтруем питомцев по типу курса
                  if (course.pet_type === 'dog' && pet.species !== 'dog') return false
                  if (course.pet_type === 'cat' && pet.species !== 'cat') return false
                  return true
                })
                .map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species_label})
                  </option>
                ))}
            </select>
            {selectedPetId && (
              <p className="text-sm text-primary-600 mt-2">
                Курс будет привязан к выбранному питомцу
              </p>
            )}
          </div>
        )}
        
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
        
        {/* Кнопка добавления в корзину */}
        <button
          onClick={handleAddToCart}
          disabled={(checkoutData?.course.price > 0 && !disclaimerAccepted) || isAddingToCart}
          className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAddingToCart ? (
            <>
              <ButtonLoader />
              <span className="ml-2">Добавление в корзину...</span>
            </>
          ) : course.price === 0 ? (
            'Добавить в корзину'
          ) : (
            'Добавить в корзину'
          )}
        </button>
        
        <p className="text-sm text-gray-500 text-center mt-4">
          {course.price === 0 
            ? 'Курс будет добавлен в корзину. После оформления заказа вы получите доступ к курсу.'
            : 'Нажимая кнопку, вы соглашаетесь с условиями предоставления услуг. Курс будет добавлен в корзину для оформления заказа.'}
        </p>
      </div>
    </div>
  )
}

export default CourseCheckout
