/**
 * Компонент страницы детального просмотра курса
 * 
 * Отображает полную информацию о курсе с адаптацией под тип животного:
 * - Обложка и заголовок
 * - Подробное описание
 * - Характеристики (длительность, формат, уровень)
 * - Чему вы научитесь
 * - Информация об инструкторе
 * - Возможность "попробовать бесплатно" для платных курсов
 * - Кнопка добавления в корзину
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { getCourse, enrollFreeCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { usePets } from '../../hooks/usePets'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import Rating from '../../components/Rating'
import ReviewsSection from '../../components/ReviewsSection'
import { CoursePersonalizationWidget } from '../../components/Learning'

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
  if (!minutes) return 'Не указано'
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

/**
 * Маппинг типов животных
 */
const petTypeInfo = {
  dog: {
    label: 'Для собак',
    icon: '🐕',
    description: 'Специально разработанные курсы для владельцев собак',
    color: 'from-blue-100 to-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  cat: {
    label: 'Для кошек',
    icon: '🐱',
    description: 'Специально разработанные курсы для владельцев кошек',
    color: 'from-purple-100 to-purple-200',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  all: {
    label: 'Для всех',
    icon: '🐾',
    description: 'Универсальные курсы для всех видов животных',
    color: 'from-green-100 to-green-200',
    badgeColor: 'bg-green-100 text-green-700'
  }
}

/**
 * Маппинг форматов обучения
 */
const formatLabels = {
  video: 'Видео-курс',
  text: 'Текстовый курс',
  interactive: 'Интерактивный курс',
  mixed: 'Смешанный формат',
  webinar: 'Вебинар',
  workshop: 'Мастер-класс',
}

/**
 * Маппинг уровней сложности
 */
const levelLabels = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
  expert: 'Эксперт',
}

/**
 * Маппинг категорий
 */
const categoryLabels = {
  basics: 'Основы',
  training: 'Дрессировка',
  care: 'Уход',
  health: 'Здоровье',
  nutrition: 'Питание',
  behavior: 'Поведение',
  specialized: 'Специализированные',
  entertainment: 'Развлечения',
}

/**
 * Компонент страницы CourseDetail
 */
function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const { addCourse, error: cartError } = useCartStore()
  const { success, error: showError } = useToastStore()
  const { pets } = usePets()
  
  const [course, setCourse] = useState(null)
  const [isOwned, setIsOwned] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTryingFree, setIsTryingFree] = useState(false)
  
  // Состояние модального окна для бесплатных курсов
  const [showFreeEnrollModal, setShowFreeEnrollModal] = useState(false)
  const [freeEnrollAccepted, setFreeEnrollAccepted] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [selectedPetForEnroll, setSelectedPetForEnroll] = useState(null)

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
   * Загрузка данных курса
   */
  useEffect(() => {
    fetchCourse()
  }, [id])

  /**
   * Автоматическое открытие модального окна записи для бесплатных курсов
   * при переходе с параметром ?enroll=free
   */
  useEffect(() => {
    const enrollParam = searchParams.get('enroll')
    if (enrollParam === 'free' && course && course.price === 0 && !isOwned) {
      if (isAuthenticated) {
        setShowFreeEnrollModal(true)
        // Удаляем параметр из URL
        searchParams.delete('enroll')
        setSearchParams(searchParams, { replace: true })
      } else {
        // Перенаправляем на логин с сохранением URL для возврата
        navigate('/login', { state: { from: `/courses/${id}?enroll=free` } })
      }
    }
  }, [course, isOwned, isAuthenticated, searchParams, setSearchParams, navigate, id])

  /**
   * Обработчик добавления курса в корзину
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
      const result = await addCourse(course.id, null, false)
      
      if (result) {
        success(
          `Курс "${course.title}" добавлен в корзину. Перейдите в корзину для оформления заказа.`,
          6000
        )
      } else {
        showError(cartError || 'Не удалось добавить курс в корзину')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Не удалось добавить курс в корзину'
      showError(errorMessage)
    } finally {
      setIsAddingToCart(false)
    }
  }
  
  /**
   * Обработчик "Попробовать бесплатно"
   * Для платных курсов добавляет в корзину (как веб-продукт)
   */
  const handleTryFree = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } })
      return
    }
    
    if (isOwned) {
      return
    }
    
    setIsTryingFree(true)
    try {
      // Для "попробовать бесплатно" также добавляем в корзину
      // В будущем можно добавить отдельную логику для пробного периода
      const result = await addCourse(course.id, null, false)
      
      if (result) {
        success(
          `Курс "${course.title}" добавлен в корзину. Вы можете оформить заказ и начать обучение.`,
          6000
        )
      } else {
        showError(cartError || 'Не удалось добавить курс в корзину')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Не удалось добавить курс в корзину'
      showError(errorMessage)
    } finally {
      setIsTryingFree(false)
    }
  }
  
  /**
   * Открыть модальное окно для записи на бесплатный курс
   */
  const handleOpenFreeEnrollModal = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } })
      return
    }
    
    if (isOwned) {
      return
    }
    
    setShowFreeEnrollModal(true)
    setFreeEnrollAccepted(false)
  }
  
  /**
   * Запись на бесплатный курс
   */
  const handleFreeEnroll = async () => {
    if (!freeEnrollAccepted) {
      showError('Необходимо согласиться с условиями использования')
      return
    }
    
    setIsEnrolling(true)
    try {
      const response = await enrollFreeCourse(course.id, true, selectedPetForEnroll)
      
      setIsOwned(true)
      setShowFreeEnrollModal(false)
      success(
        `Вы успешно записались на курс "${course.title}"!`,
        4000
      )
      // Автоматический переход к обучению через 2 секунды
      setTimeout(() => {
        navigate(`/training/courses/${course.id}/learn`)
      }, 2000)
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Не удалось записаться на курс'
      showError(errorMessage)
    } finally {
      setIsEnrolling(false)
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
  
  const petInfo = petTypeInfo[course.pet_type] || petTypeInfo.all
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Ссылка назад */}
      <Link 
        to="/courses" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
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
                className="w-full h-80 object-cover rounded-xl mb-4 shadow-lg"
              />
            ) : (
              <div className={`w-full h-80 bg-gradient-to-br ${petInfo.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                <span className="text-8xl opacity-50">
                  {petInfo.icon}
                </span>
              </div>
            )}
            
            {/* Бейджи */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className={`px-3 py-1 ${petInfo.badgeColor} text-sm rounded-full font-medium`}>
                {petInfo.label}
              </span>
              {course.category && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                  {categoryLabels[course.category] || course.category}
                </span>
              )}
              {course.level && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {levelLabels[course.level] || course.level}
                </span>
              )}
              {course.format_type && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                  {formatLabels[course.format_type] || course.format_type}
                </span>
              )}
              {course.is_free && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                  Бесплатно
                </span>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {course.title}
            </h1>
            
            {/* Рейтинг */}
            {(course.rating || course.reviews_count !== undefined) && (
              <div className="mb-4">
                <Rating
                  rating={course.rating || 0}
                  reviewsCount={course.reviews_count}
                  readonly={true}
                  size="md"
                />
              </div>
            )}
            
            {/* Адаптивное описание под тип животного */}
            <p className="text-lg text-gray-600 mb-4">
              {petInfo.description}
            </p>
          </div>
          
          {/* Описание курса */}
          {course.description && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">О курсе</h2>
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {course.description}
              </p>
            </div>
          )}
          
          {/* Подробное описание */}
          {course.detailed_description && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Подробное описание</h2>
              <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                {course.detailed_description}
              </div>
            </div>
          )}
          
          {/* Чему вы научитесь */}
          {course.what_you_will_learn && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Чему вы научитесь</h2>
              <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                {course.what_you_will_learn}
              </div>
            </div>
          )}
          
          {/* Характеристики курса */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Характеристики курса</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {course.duration && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Длительность</p>
                    <p className="text-sm text-gray-600">{formatDuration(course.duration)}</p>
                  </div>
                </div>
              )}
              
              {course.format_type && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Формат</p>
                    <p className="text-sm text-gray-600">{formatLabels[course.format_type] || course.format_type}</p>
                  </div>
                </div>
              )}
              
              {course.level && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Уровень</p>
                    <p className="text-sm text-gray-600">{levelLabels[course.level] || course.level}</p>
                  </div>
                </div>
              )}
              
              {course.completion_time && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Время прохождения</p>
                    <p className="text-sm text-gray-600">{course.completion_time}</p>
                  </div>
                </div>
              )}
              
              {course.lessons_count > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Уроков</p>
                    <p className="text-sm text-gray-600">{course.lessons_count}</p>
                  </div>
                </div>
              )}
              
              {course.videos_count > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Видео</p>
                    <p className="text-sm text-gray-600">{course.videos_count}</p>
                  </div>
                </div>
              )}
              
              {course.materials_count > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Материалов</p>
                    <p className="text-sm text-gray-600">{course.materials_count}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Детали формата */}
            {course.format_details && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">{course.format_details}</p>
              </div>
            )}
          </div>

          {/* Персонализированная информация */}
          {course.personalization && selectedPet && (
            <CoursePersonalizationWidget
              personalization={course.personalization}
              petInfo={selectedPet}
              className="mb-6"
            />
          )}

          {/* Требования */}
          {course.requirements && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Требования</h2>
              <div className="text-gray-600 whitespace-pre-line leading-relaxed">
                {course.requirements}
              </div>
            </div>
          )}
          
          {/* Информация об инструкторе */}
          {course.instructor_name && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Об инструкторе</h2>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{course.instructor_name}</h3>
                  {course.instructor_bio && (
                    <p className="text-gray-600 text-sm leading-relaxed">{course.instructor_bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Боковая панель с информацией и действиями */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4 space-y-6">
            {/* Цена */}
            <div>
              <div className={`text-4xl font-bold mb-2 ${
                course.price === 0 ? 'text-green-600' : 'text-gray-900'
              }`}>
                {formatPrice(course.price)}
              </div>
              {course.price > 0 && (
                <p className="text-sm text-gray-500">
                  Единоразовая оплата
                </p>
              )}
            </div>
            
            {/* Краткая информация */}
            <div className="space-y-3 pb-6 border-b border-gray-200">
              {course.duration && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Длительность</span>
                  <span className="text-gray-900 font-medium">
                    {formatDuration(course.duration)}
                  </span>
                </div>
              )}
              {course.format_type && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Формат</span>
                  <span className="text-gray-900 font-medium">
                    {formatLabels[course.format_type] || course.format_type}
                  </span>
                </div>
              )}
              {course.level && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Уровень</span>
                  <span className="text-gray-900 font-medium">
                    {levelLabels[course.level] || course.level}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Для кого</span>
                <span className="text-gray-900 font-medium">
                  {petInfo.label}
                </span>
              </div>
            </div>
            
            {/* Кнопки действий */}
            {isOwned ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium mb-1">
                    ✓ Курс уже приобретён
                  </p>
                  <p className="text-xs text-green-600">
                    Вы можете начать обучение прямо сейчас
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="block w-full btn-primary py-3 text-center"
                >
                  Перейти к курсу
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Кнопка "Попробовать бесплатно" для платных курсов */}
                {course.price > 0 && (
                  <button
                    onClick={handleTryFree}
                    disabled={isTryingFree || isAddingToCart}
                    className="w-full py-3 px-4 rounded-lg border-2 border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isTryingFree ? (
                      <>
                        <ButtonLoader />
                        Добавление...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Попробовать бесплатно
                      </>
                    )}
                  </button>
                )}
                
                {/* Основная кнопка покупки/записи */}
                {course.price > 0 ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || isTryingFree}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {isAddingToCart ? (
                      <>
                        <ButtonLoader />
                        Добавление...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        В корзину
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleOpenFreeEnrollModal}
                    disabled={isEnrolling}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isEnrolling ? (
                      <>
                        <ButtonLoader />
                        Запись...
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

                {/* Кнопка обучения для записанных пользователей */}
                {isOwned && (
                  <button
                    onClick={() => navigate(`/training/courses/${course.id}/learn`)}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    🎓 Начать обучение
                  </button>
                )}

                {/* Информация о гарантиях */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Доступ навсегда</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Все материалы включены</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Поддержка инструктора</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Модальное окно для записи на бесплатный курс */}
      {showFreeEnrollModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Оверлей */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowFreeEnrollModal(false)}
            />
            
            {/* Модальное окно */}
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fadeIn">
              {/* Заголовок */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Записаться на курс
                  </h3>
                  <p className="text-sm text-gray-500">
                    {course?.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowFreeEnrollModal(false)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Выбор питомца (если есть совместимые) */}
              {pets && pets.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Для какого питомца? (опционально)
                  </label>
                  <select
                    value={selectedPetForEnroll || ''}
                    onChange={(e) => setSelectedPetForEnroll(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Не выбран</option>
                    {pets
                      .filter(pet => course?.pet_type === 'all' || pet.species === course?.pet_type)
                      .map(pet => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species === 'dog' ? '🐕 Собака' : '🐱 Кошка'})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
              
              {/* Условия использования */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                <h4 className="font-medium text-amber-800 mb-2">Условия использования</h4>
                <p className="text-sm text-amber-700 mb-4">
                  Записываясь на курс, вы подтверждаете, что понимаете и соглашаетесь с тем, 
                  что мы не гарантируем стопроцентного результата. Результаты обучения зависят от 
                  индивидуальных особенностей питомца, усердия в выполнении рекомендаций и других факторов.
                  Курс предназначен для личного использования и не подлежит передаче третьим лицам.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeEnrollAccepted}
                    onChange={(e) => setFreeEnrollAccepted(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    Я принимаю условия использования и понимаю, что доступ предоставляется сразу после записи
                  </span>
                </label>
              </div>
              
              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFreeEnrollModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleFreeEnroll}
                  disabled={!freeEnrollAccepted || isEnrolling}
                  className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isEnrolling ? (
                    <>
                      <ButtonLoader />
                      Запись...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Записаться
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Секция отзывов */}
      <ReviewsSection 
        type="course" 
        itemId={course.id} 
        isPurchased={isOwned}
      />
    </div>
  )
}

export default CourseDetail
