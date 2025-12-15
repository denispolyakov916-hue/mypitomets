/**
 * Компонент страницы курсов
 * 
 * Каталог обучающих курсов с:
 * - Сеткой карточек курсов
 * - Бейджами Бесплатно/Платно
 * - Функцией покупки
 * - Фильтром по типу животного
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCourses, purchaseCourse, getUserCourses } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { PageLoader, ButtonLoader } from '../../components/Loader'

/**
 * Варианты фильтра по типу животного
 */
const PET_TYPE_OPTIONS = [
  { value: '', label: 'Все курсы' },
  { value: 'dog', label: 'Для собак' },
  { value: 'cat', label: 'Для кошек' },
]

/**
 * Форматирование цены для отображения
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
 * Форматирование продолжительности из минут
 */
const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

/**
 * Компонент CourseCard
 */
function CourseCard({ course, isOwned, onPurchase, isPurchasing }) {
  return (
    <div className="card hover:shadow-lg transition-shadow flex flex-col h-full">
      {/* Заглушка изображения курса */}
      <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-6xl">
          {course.pet_type === 'dog' ? '🐕' : course.pet_type === 'cat' ? '🐱' : '📚'}
        </span>
      </div>
      
      {/* Бейджи */}
      <div className="flex gap-2 mb-3">
        {course.is_free ? (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Бесплатно
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
            {formatPrice(course.price)}
          </span>
        )}
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
          {formatDuration(course.duration)}
        </span>
      </div>
      
      {/* Название и описание */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {course.title}
      </h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
        {course.description}
      </p>
      
      {/* Кнопка действия */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        {isOwned ? (
          <button
            className="w-full btn-secondary py-2.5 flex items-center justify-center gap-2"
            disabled
          >
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Уже приобретён
          </button>
        ) : (
          <button
            onClick={() => onPurchase(course)}
            disabled={isPurchasing}
            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            {isPurchasing ? (
              <>
                <ButtonLoader />
                Оформление...
              </>
            ) : course.is_free ? (
              'Начать бесплатно'
            ) : (
              `Купить за ${formatPrice(course.price)}`
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Компонент страницы курсов
 */
function Courses() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  
  // Состояние
  const [courses, setCourses] = useState([])
  const [ownedCourseIds, setOwnedCourseIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [petTypeFilter, setPetTypeFilter] = useState('')
  const [purchasingId, setPurchasingId] = useState(null)
  
  /**
   * Загрузка курсов при монтировании и изменении фильтра
   */
  useEffect(() => {
    fetchCourses()
  }, [petTypeFilter])
  
  /**
   * Загрузка курсов пользователя если авторизован
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserCourses()
    }
  }, [isAuthenticated])
  
  /**
   * Загрузка курсов из API
   */
  const fetchCourses = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const filters = petTypeFilter ? { pet_type: petTypeFilter } : {}
      const response = await getCourses(filters)
      setCourses(response.courses || [])
    } catch (err) {
      setError(err.message || 'Не удалось загрузить курсы')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Загрузка приобретённых курсов пользователя
   */
  const fetchUserCourses = async () => {
    try {
      const response = await getUserCourses()
      const ids = new Set((response.courses || []).map(c => c.course.id))
      setOwnedCourseIds(ids)
    } catch (err) {
      console.error('Не удалось загрузить курсы пользователя:', err)
    }
  }
  
  /**
   * Обработчик покупки курса
   */
  const handlePurchase = async (course) => {
    if (!isAuthenticated) {
      if (confirm('Для приобретения курса необходимо войти в аккаунт. Перейти на страницу входа?')) {
        navigate('/login', { state: { from: { pathname: '/courses' } } })
      }
      return
    }
    
    setPurchasingId(course.id)
    
    try {
      await purchaseCourse(course.id)
      setOwnedCourseIds(prev => new Set([...prev, course.id]))
      
      const action = course.is_free ? 'добавлен' : 'приобретён'
      alert(`Курс "${course.title}" успешно ${action}!`)
    } catch (err) {
      alert(err.message || 'Не удалось приобрести курс')
    } finally {
      setPurchasingId(null)
    }
  }
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="page-title">Обучающие курсы</h1>
        <p className="text-gray-600">
          Курсы по уходу, дрессировке и воспитанию от профессионалов
        </p>
      </div>
      
      {/* Фильтр */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 max-w-xs">
            <label htmlFor="pet_type" className="label">
              Фильтр по животному
            </label>
            <select
              id="pet_type"
              value={petTypeFilter}
              onChange={(e) => setPetTypeFilter(e.target.value)}
              className="input"
            >
              {PET_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {isAuthenticated && (
            <p className="text-sm text-gray-500">
              Приобретённых курсов: {ownedCourseIds.size}
            </p>
          )}
        </div>
      </div>
      
      {/* Состояние загрузки */}
      {isLoading && <PageLoader />}
      
      {/* Состояние ошибки */}
      {error && !isLoading && (
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchCourses} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      )}
      
      {/* Пустое состояние */}
      {!isLoading && !error && courses.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Курсы не найдены
          </h2>
          <p className="text-gray-600">
            Попробуйте изменить фильтр
          </p>
        </div>
      )}
      
      {/* Сетка курсов */}
      {!isLoading && !error && courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              isOwned={ownedCourseIds.has(course.id)}
              onPurchase={handlePurchase}
              isPurchasing={purchasingId === course.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Courses
