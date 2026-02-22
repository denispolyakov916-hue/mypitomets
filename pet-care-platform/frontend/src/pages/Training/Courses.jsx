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
import { useNavigate, useSearchParams } from 'react-router-dom'
import { enrollFreeCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { usePets } from '../../hooks/usePets'
import { useCourses } from '../../hooks/useCourses'

import {
  FilterSidebar,
  MobileFilters,
  CourseGrid,
  CourseHeader,
  FreeEnrollModal,
} from './components'

/**
 * Главный компонент страницы курсов
 */
function Courses() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const cartError = useCartStore(s => s.error)
  const { addCourse, getCourseInCart, loadCart } = useCartStore()
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

  // Данные каталога из хука
  const {
    courses,
    ownedCourseIds,
    pagination,
    availableFilters,
    isLoading,
    error,
    fetchUserCourses,
  } = useCourses(filters)

  // Загрузка корзины при авторизации
  useEffect(() => {
    if (isAuthenticated) {
      loadCart()
    }
  }, [isAuthenticated])

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  
  // Состояние модального окна для бесплатных курсов
  const [showFreeEnrollModal, setShowFreeEnrollModal] = useState(false)
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null)
  const [freeEnrollAccepted, setFreeEnrollAccepted] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [selectedPetForEnroll, setSelectedPetForEnroll] = useState(null)
  const [addingCourseId, setAddingCourseId] = useState(null)
  
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
    
    if (name !== 'page') {
      newParams.set('page', '1')
    }
    
    if (name === 'category') {
      newParams.delete('subcategory')
    }
    
    if (name === 'pet_id') {
      newParams.delete('pet_type')
      newParams.delete('personal')
    }
    
    if (name === 'personal' && value === 'true') {
      newParams.delete('pet_type')
      newParams.delete('pet_id')
    }
    
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
      const result = await addCourse(course.id, null, false)

      if (result) {
        success('Курс добавлен в корзину', 3000)
        return true
      } else {
        showError(cartError || 'Не удалось добавить курс в корзину')
        return false
      }
    } catch (err) {
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

  const closeFreeEnrollModal = () => {
    setShowFreeEnrollModal(false)
    setSelectedCourseForEnroll(null)
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
      await enrollFreeCourse(
        selectedCourseForEnroll.id, 
        true, 
        selectedPetForEnroll
      )
      
      fetchUserCourses()
      
      success(
        `Вы успешно записались на курс "${selectedCourseForEnroll.title}"! Перейдите в профиль для начала обучения.`,
        6000
      )

      closeFreeEnrollModal()
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
    <div className="animate-fadeIn page-container-with-sidebar">
      <div className="flex gap-6">
        {/* Боковая панель с фильтрами */}
        <aside className="w-60 flex-shrink-0 hidden lg:block sticky top-24 self-start">
          <FilterSidebar
            filters={filters}
            availableFilters={availableFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </aside>
        
        {/* Основной контент */}
        <main className="flex-1 min-w-0">
          <CourseHeader
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            filters={filters}
            pets={pets}
          />

          <MobileFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            pets={pets}
          />

          <CourseGrid
            courses={courses}
            isLoading={isLoading}
            error={error}
            pagination={pagination}
            ownedCourseIds={ownedCourseIds}
            getCourseInCart={getCourseInCart}
            onAddToCart={handleAddToCart}
            onEnrollFree={handleEnrollFree}
            addingCourseId={addingCourseId}
            onPageChange={(page) => handleFilterChange('page', String(page))}
            onReset={handleReset}
          />
        </main>
      </div>
      
      {showFreeEnrollModal && (
        <FreeEnrollModal
          course={selectedCourseForEnroll}
          pets={pets}
          selectedPet={selectedPetForEnroll}
          onSelectedPetChange={setSelectedPetForEnroll}
          accepted={freeEnrollAccepted}
          onAcceptedChange={setFreeEnrollAccepted}
          isEnrolling={isEnrolling}
          onEnroll={handleFreeEnroll}
          onClose={closeFreeEnrollModal}
        />
      )}
    </div>
  )
}

export default Courses
