/**
 * Компонент страницы курсов
 * 
 * Каталог обучающих курсов с расширенной фильтрацией.
 * Функции:
 * - Сетка отображения курсов
 * - Боковая панель с фильтрами
 * - Фильтр по животному, категории, подкатегории
 * - Фильтр по уровню, формату, цене
 * - Персональные подборки по питомцам
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { getCourses, getUserCourses, enrollFreeCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { usePets } from '../../hooks/usePets'
import CourseCard from '../../components/CourseCard'
import { PageLoader, ButtonLoader } from '../../components/Loader'

/**
 * Варианты фильтра по типу животного
 */
const PET_TYPE_OPTIONS = [
  { value: '', label: 'Все курсы' },
  { value: 'dog', label: 'Для собак' },
  { value: 'cat', label: 'Для кошек' },
  { value: 'all', label: 'Для всех' },
]

/**
 * Варианты категорий курсов
 */
const CATEGORY_OPTIONS = [
  { value: '', label: 'Все категории' },
  { value: 'basics', label: 'Основы' },
  { value: 'training', label: 'Дрессировка' },
  { value: 'care', label: 'Уход' },
  { value: 'health', label: 'Здоровье' },
  { value: 'nutrition', label: 'Питание' },
  { value: 'behavior', label: 'Поведение' },
  { value: 'specialized', label: 'Специализированные' },
  { value: 'entertainment', label: 'Развлечения' },
]

/**
 * Варианты уровней сложности
 */
const LEVEL_OPTIONS = [
  { value: '', label: 'Все уровни' },
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' },
]

/**
 * Варианты форматов обучения
 */
const FORMAT_OPTIONS = [
  { value: '', label: 'Все форматы' },
  { value: 'video', label: 'Видео' },
  { value: 'text', label: 'Текст' },
  { value: 'interactive', label: 'Интерактивный' },
  { value: 'mixed', label: 'Смешанный' },
  { value: 'webinar', label: 'Вебинар' },
  { value: 'workshop', label: 'Мастер-класс' },
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
 * Компонент боковой панели фильтров
 */
function FilterSidebar({ filters, availableFilters, onFilterChange, onReset }) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || '',
    max: filters.max_price || ''
  })
  
  const handlePriceApply = () => {
    onFilterChange('min_price', priceRange.min)
    onFilterChange('max_price', priceRange.max)
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Фильтры</h3>
        {(filters.pet_type || filters.personal || filters.category || filters.subcategory || filters.level || filters.format_type || filters.min_price || filters.max_price) && (
          <button
            onClick={onReset}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Сбросить
          </button>
        )}
      </div>
      
      {/* Персональные подборки для питомцев */}
      {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
        <div className="mb-5 pb-5 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-primary-600">⭐</span>
            Персональные подборки
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Курсы специально для ваших питомцев
          </p>
          <div className="space-y-2">
            {availableFilters.user_pets.map(pet => {
              const hasCourses = ['dog', 'cat'].includes(pet.species)
              if (!hasCourses) return null
              
              const isSelected = filters.pet_id === pet.id
              
              return (
                <label 
                  key={pet.id} 
                  className={`flex items-center cursor-pointer group p-2 rounded-lg transition-colors ${
                    isSelected 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="pet_id"
                    value={pet.id}
                    checked={isSelected}
                    onChange={(e) => onFilterChange('pet_id', e.target.value)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`ml-2 text-sm ${
                    isSelected 
                      ? 'text-primary-700 font-medium' 
                      : 'text-gray-700 group-hover:text-primary-600'
                  }`}>
                    {pet.name} <span className="text-gray-500">({pet.species_label})</span>
                  </span>
                </label>
              )
            })}
            {filters.pet_id && (
              <button
                onClick={() => onFilterChange('pet_id', '')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
              >
                Показать все курсы
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Тип животного */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Для кого
        </label>
        <div className="space-y-2">
          {availableFilters.pet_types?.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="pet_type"
                value={opt.value}
                checked={filters.pet_type === opt.value}
                onChange={(e) => onFilterChange('pet_type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">{opt.label}</span>
            </label>
          )) || PET_TYPE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="pet_type"
                value={opt.value}
                checked={filters.pet_type === opt.value}
                onChange={(e) => onFilterChange('pet_type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">{opt.label}</span>
            </label>
          ))}
          {filters.pet_type && (
            <button
              onClick={() => onFilterChange('pet_type', '')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Показать всех
            </button>
          )}
        </div>
      </div>
      
      {/* Категория */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Категория
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Все категории</option>
          {(availableFilters.categories || CATEGORY_OPTIONS.filter(o => o.value)).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Подкатегория (пока оставляем пустым, так как на бекенде нет списка доступных подкатегорий) */}
      {/* Можно добавить позже, когда бекенд будет возвращать доступные подкатегории */}
      
      {/* Уровень сложности */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Уровень сложности
        </label>
        <select
          value={filters.level || ''}
          onChange={(e) => onFilterChange('level', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Все уровни</option>
          {(availableFilters.levels || LEVEL_OPTIONS.filter(o => o.value)).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Формат обучения */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Формат обучения
        </label>
        <select
          value={filters.format_type || ''}
          onChange={(e) => onFilterChange('format_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Все форматы</option>
          {(availableFilters.formats || FORMAT_OPTIONS.filter(o => o.value)).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      
      {/* Тип цены */}
      {availableFilters.price_types && availableFilters.price_types.length > 0 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип цены
          </label>
          <div className="space-y-2">
            {availableFilters.price_types.map(opt => (
              <label key={opt.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="price_type"
                  value={opt.value}
                  checked={filters.price_type === opt.value}
                  onChange={(e) => onFilterChange('price_type', e.target.value)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {/* Цена */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Цена, ₽
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="от"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={handlePriceApply}
          className="mt-2 w-full py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Применить
        </button>
        {availableFilters.price_range && (
          <p className="mt-1 text-xs text-gray-500">
            {Math.floor(availableFilters.price_range.min)} — {Math.ceil(availableFilters.price_range.max)} ₽
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Компонент пагинации
 */
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.total_pages <= 1) return null
  
  const { page, total_pages } = pagination
  
  // Генерация номеров страниц
  const getPageNumbers = () => {
    const pages = []
    const showPages = 5
    let start = Math.max(1, page - Math.floor(showPages / 2))
    let end = Math.min(total_pages, start + showPages - 1)
    
    if (end - start < showPages - 1) {
      start = Math.max(1, end - showPages + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }
  
  return (
    <div className="flex justify-center items-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ←
      </button>
      
      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={`px-3 py-2 rounded-lg ${
            num === page
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {num}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        →
      </button>
    </div>
  )
}

/**
 * Главный компонент страницы курсов
 */
function Courses() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const { addCourse, error: cartError, getCourseInCart, loadCart } = useCartStore()
  const { success, error: showError } = useToastStore()
  const { pets } = usePets()

  // Фильтры из URL
  const filters = {
    pet_type: searchParams.get('pet_type') || '',
    pet_id: searchParams.get('pet_id') || '',
    personal: searchParams.get('personal') || '',
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || '',
    level: searchParams.get('level') || '',
    format_type: searchParams.get('format_type') || '',
    price_type: searchParams.get('price_type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    search: searchParams.get('search') || '',
    page: searchParams.get('page') || '1',
  }

  // Состояние
  const [courses, setCourses] = useState([])
  const [pagination, setPagination] = useState(null)
  const [availableFilters, setAvailableFilters] = useState({})
  const [ownedCourseIds, setOwnedCourseIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  
  // Состояние модального окна для бесплатных курсов
  const [showFreeEnrollModal, setShowFreeEnrollModal] = useState(false)
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null)
  const [freeEnrollAccepted, setFreeEnrollAccepted] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [selectedPetForEnroll, setSelectedPetForEnroll] = useState(null)
  
  /**
   * Обновление фильтра
   */
  const handleFilterChange = useCallback((name, value) => {
    const newParams = new URLSearchParams(searchParams)
    
    if (value) {
      newParams.set(name, value)
    } else {
      newParams.delete(name)
    }
    
    // Сбрасываем страницу при изменении фильтров
    if (name !== 'page') {
      newParams.set('page', '1')
    }
    
    // Сбрасываем подкатегорию при смене категории
    if (name === 'category') {
      newParams.delete('subcategory')
    }
    
    // При выборе питомца сбрасываем фильтр по типу животного (будет установлен автоматически)
    if (name === 'pet_id') {
      newParams.delete('pet_type')
      newParams.delete('personal')
    }
    
    // При выборе персональной подборки сбрасываем фильтр по типу животного
    if (name === 'personal' && value === 'true') {
      newParams.delete('pet_type')
      newParams.delete('pet_id')
    }
    
    // При выборе типа животного сбрасываем персональную подборку
    if (name === 'pet_type') {
      newParams.delete('personal')
      newParams.delete('pet_id')
    }
    
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  /**
   * Сброс всех фильтров
   */
  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams())
    setSearchQuery('')
  }, [setSearchParams])
  
  /**
   * Поиск
   */
  const handleSearch = useCallback((e) => {
    e.preventDefault()
    handleFilterChange('search', searchQuery)
  }, [searchQuery, handleFilterChange])
  
  /**
   * Загрузка курсов
   */
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await getCourses(filters)
        setCourses(response.courses || [])
        setPagination(response.pagination)
        setAvailableFilters(response.filters || {})
      } catch (err) {
        setError(err.message || 'Не удалось загрузить курсы')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [searchParams])
  
  /**
   * Загрузка курсов пользователя если авторизован
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserCourses()
      // Загружаем корзину для определения состояния курсов (с защитой от дублирования)
      loadCart()
    }
  }, [isAuthenticated])
  
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
  
  const [addingCourseId, setAddingCourseId] = useState(null)

  /**
   * Обработчик добавления курса в корзину
   */
  const handleAddToCart = async (course) => {
    if (!isAuthenticated) {
      if (confirm('Для добавления курса в корзину необходимо войти в аккаунт. Перейти на страницу входа?')) {
        navigate('/login', { state: { from: { pathname: '/courses' } } })
      }
      return false
    }

    setAddingCourseId(course.id)
    try {
      // Добавляем курс в корзину
      const result = await addCourse(course.id, null, false)

      if (result) {
        // Показываем уведомление об успешном добавлении
        success(
          `Курс "${course.title}" добавлен в корзину. Перейдите в корзину для оформления заказа.`,
          6000
        )
        return true
      } else {
        // Ошибка уже установлена в cartStore
        showError(cartError || 'Не удалось добавить курс в корзину')
        return false
      }
    } catch (err) {
      // Обработка неожиданных ошибок
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.message ||
                          err.message ||
                          'Не удалось добавить курс в корзину'
      showError(errorMessage)
      return false
    } finally {
      setAddingCourseId(null)
    }
  }
  
  /**
   * Обработчик открытия модального окна для записи на бесплатный курс
   */
  const handleEnrollFree = (course) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/courses' } } })
      return
    }
    
    if (ownedCourseIds.has(course.id)) {
      return
    }
    
    setSelectedCourseForEnroll(course)
    setShowFreeEnrollModal(true)
    setFreeEnrollAccepted(false)
    setSelectedPetForEnroll(null)
  }
  
  /**
   * Запись на бесплатный курс
   */
  const handleFreeEnroll = async () => {
    if (!freeEnrollAccepted) {
      showError('Необходимо согласиться с условиями использования')
      return
    }
    
    if (!selectedCourseForEnroll) return
    
    setIsEnrolling(true)
    try {
      const response = await enrollFreeCourse(
        selectedCourseForEnroll.id, 
        true, 
        selectedPetForEnroll
      )
      
      // Обновляем список приобретённых курсов
      setOwnedCourseIds(prev => new Set([...prev, selectedCourseForEnroll.id]))
      
      setShowFreeEnrollModal(false)
      setSelectedCourseForEnroll(null)
      setFreeEnrollAccepted(false)
      setSelectedPetForEnroll(null)
      
      success(
        `Вы успешно записались на курс "${selectedCourseForEnroll.title}"! Перейдите в профиль для начала обучения.`,
        6000
      )
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
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок и поиск */}
      <div className="mb-6">
        <h1 className="page-title mb-4">Обучающие курсы</h1>
        
        {/* Поиск */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию курса..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
          <button type="submit" className="btn-primary px-6">
            Найти
          </button>
        </form>
      </div>
      
      <div className="flex gap-6">
        {/* Боковая панель с фильтрами */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <FilterSidebar
            filters={filters}
            availableFilters={availableFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </aside>
        
        {/* Основной контент */}
        <main className="flex-1 min-w-0">
          {/* Мобильные фильтры */}
          <div className="lg:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pets && pets.length > 0 && (
                <label className="flex items-center cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.personal === 'true'}
                    onChange={(e) => handleFilterChange('personal', e.target.checked ? 'true' : '')}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded mr-2"
                  />
                  <span>Для моих питомцев</span>
                </label>
              )}
              <select
                value={filters.pet_type}
                onChange={(e) => handleFilterChange('pet_type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {PET_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {LEVEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filters.format_type}
                onChange={(e) => handleFilterChange('format_type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Информация о персональной подборке */}
          {filters.personal === 'true' && pets && pets.length > 0 && (
            <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                <span className="font-medium">⭐ Персональная подборка</span>
                <span className="text-primary-600 ml-2">
                  для ваших питомцев: {pets.map(p => p.name).join(', ')}
                </span>
              </p>
            </div>
          )}
          
          {/* Состояние загрузки */}
          {isLoading && <PageLoader />}
          
          {/* Состояние ошибки */}
          {error && !isLoading && (
            <div className="card text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="btn-primary">
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
              <p className="text-gray-600 mb-4">
                Попробуйте изменить параметры фильтра
              </p>
              <button onClick={handleReset} className="btn-primary">
                Сбросить фильтры
              </button>
            </div>
          )}
          
          {/* Результаты */}
          {!isLoading && !error && courses.length > 0 && (
            <>
              <p className="text-gray-600 mb-4">
                Найдено курсов: {pagination?.total || courses.length}
              </p>
              
              {/* Сетка курсов */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {courses.map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    isOwned={ownedCourseIds.has(course.id)}
                    isInCart={!!getCourseInCart(course.id)}
                    onAddToCart={handleAddToCart}
                    onEnrollFree={handleEnrollFree}
                    isLoading={addingCourseId === course.id}
                  />
                ))}
              </div>
              
              {/* Пагинация */}
              <Pagination
                pagination={pagination}
                onPageChange={(page) => handleFilterChange('page', String(page))}
              />
            </>
          )}
        </main>
      </div>
      
      {/* Модальное окно для записи на бесплатный курс */}
      {showFreeEnrollModal && selectedCourseForEnroll && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Оверлей */}
            <div 
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => {
                setShowFreeEnrollModal(false)
                setSelectedCourseForEnroll(null)
                setFreeEnrollAccepted(false)
                setSelectedPetForEnroll(null)
              }}
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
                    {selectedCourseForEnroll.title}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFreeEnrollModal(false)
                    setSelectedCourseForEnroll(null)
                    setFreeEnrollAccepted(false)
                    setSelectedPetForEnroll(null)
                  }}
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
                      .filter(pet => selectedCourseForEnroll.pet_type === 'all' || pet.species === selectedCourseForEnroll.pet_type)
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
                  onClick={() => {
                    setShowFreeEnrollModal(false)
                    setSelectedCourseForEnroll(null)
                    setFreeEnrollAccepted(false)
                    setSelectedPetForEnroll(null)
                  }}
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
    </div>
  )
}

export default Courses
