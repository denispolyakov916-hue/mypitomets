/**
 * Страница магазина курсов
 *
 * Каталог обучающих курсов. Структура как у витрины магазина; courses-catalog-shell —
 * нейтральные рамки/тени карточек и сайдбара (без лаванды и янтаря витрины).
 * Бэкенд не изменяется.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { enrollFreeCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { usePets } from '../../hooks/usePets'
import { useCourses } from '../../hooks/useCourses'

import {
  FilterSidebar,
  MobileCourseFilterBottomSheet,
  CourseGrid,
  CourseHeader,
  CourseHero,
  CourseExperts,
  FreeEnrollModal,
} from './components'

function Courses() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const cartError = useCartStore(s => s.error)
  const { addCourse, getCourseInCart, loadCart } = useCartStore()
  const { success, error: showError } = useToastStore()
  const { pets } = usePets()
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const filters = useMemo(() => ({
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
  }), [searchParams])

  const {
    courses,
    ownedCourseIds,
    pagination,
    availableFilters,
    isLoading,
    error,
    fetchCourses,
    fetchUserCourses,
  } = useCourses(filters)

  useEffect(() => {
    if (isAuthenticated) loadCart()
  }, [isAuthenticated, loadCart])


  const [showFreeEnrollModal, setShowFreeEnrollModal] = useState(false)
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null)
  const [freeEnrollAccepted, setFreeEnrollAccepted] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [selectedPetForEnroll, setSelectedPetForEnroll] = useState(null)
  const [addingCourseId, setAddingCourseId] = useState(null)

  const handleFilterChange = useCallback((name, value) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) newParams.set(name, value)
    else newParams.delete(name)
    if (name !== 'page') newParams.set('page', '1')
    if (name === 'category') newParams.delete('subcategory')
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
      const prev = searchParams.get('pet_type') || ''
      if (value && prev !== value) {
        newParams.delete('category')
        newParams.delete('subcategory')
      }
      if (!value) {
        newParams.delete('category')
        newParams.delete('subcategory')
      }
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handlePriceApply = useCallback((min, max) => {
    const newParams = new URLSearchParams(searchParams)
    if (min) newParams.set('min_price', min)
    else newParams.delete('min_price')
    if (max) newParams.set('max_price', max)
    else newParams.delete('max_price')
    newParams.set('page', '1')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  const handleRemoveChip = useCallback((chipKey) => {
    const newParams = new URLSearchParams(searchParams)
    if (chipKey === 'price') {
      newParams.delete('min_price')
      newParams.delete('max_price')
    } else {
      newParams.delete(chipKey)
    }
    newParams.set('page', '1')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

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
      }
      showError(cartError || 'Не удалось добавить курс в корзину')
      return false
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Не удалось добавить курс в корзину'
      showError(msg)
      return false
    } finally {
      setAddingCourseId(null)
    }
  }

  const handleEnrollFree = (course) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/courses' } } })
      return
    }
    if (ownedCourseIds.has(course.id)) return
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

  const handleFreeEnroll = async () => {
    if (!freeEnrollAccepted) {
      showError('Необходимо согласиться с условиями использования')
      return
    }
    if (!selectedCourseForEnroll) return
    setIsEnrolling(true)
    try {
      await enrollFreeCourse(selectedCourseForEnroll.id, true, selectedPetForEnroll)
      fetchUserCourses()
      success(
        `Вы успешно записались на курс "${selectedCourseForEnroll.title}"! Перейдите в профиль для начала обучения.`,
        6000
      )
      closeFreeEnrollModal()
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Не удалось записаться на курс'
      showError(msg)
    } finally {
      setIsEnrolling(false)
    }
  }

  const courseCount = pagination?.total ?? courses.length
  const filtersWithPets = useMemo(() => {
    const userPets = availableFilters?.user_pets || []
    if (pets?.length > 0) return { ...availableFilters, user_pets: pets }
    return { ...availableFilters, user_pets: userPets }
  }, [availableFilters, pets])

  const selectedPet = useMemo(() => {
    if (filters.pet_id && filtersWithPets.user_pets) {
      return filtersWithPets.user_pets.find(p => String(p.id) === String(filters.pet_id))
    }
    return null
  }, [filters.pet_id, filtersWithPets.user_pets])

  return (
    <div className="animate-fadeIn page-container-with-sidebar courses-catalog-shell flex flex-col min-h-[calc(100vh-4rem)]">
      <CourseHero courseCount={courseCount} onSearch={(q) => handleFilterChange('search', q)} />
      <CourseExperts />
      <CourseHeader
        onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
        onCategoryChange={handleFilterChange}
        filters={filters}
        availableFilters={filtersWithPets}
        onRemoveChip={handleRemoveChip}
      />

      <div className="flex gap-6 flex-1 min-h-0">
        <aside className="w-72 xl:w-80 flex-shrink-0 hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] min-h-[320px]">
          <FilterSidebar
            filters={filters}
            availableFilters={filtersWithPets}
            onFilterChange={handleFilterChange}
            onPriceApply={handlePriceApply}
            onReset={handleReset}
            isLoading={isLoading}
            courseCount={courseCount}
            className="courses-filter-skin"
          />
        </aside>

        <main className="flex-1 min-w-0 animate-fadeIn">
          <MobileCourseFilterBottomSheet
            isOpen={isMobileFiltersOpen}
            onClose={() => setIsMobileFiltersOpen(false)}
            filters={filters}
            availableFilters={filtersWithPets}
            onFilterChange={handleFilterChange}
            onPriceApply={handlePriceApply}
            onReset={() => {
              handleReset()
              setIsMobileFiltersOpen(false)
            }}
            isLoading={isLoading}
            courseCount={courseCount}
          />

          {error && !isLoading && (
            <div className="card text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={() => fetchCourses()} className="btn-primary">
                Попробовать снова
              </button>
            </div>
          )}

          {(courses.length > 0 || isLoading) && !error && (
            <>
              {selectedPet && (
                <div className="mb-4 p-3 rounded-xl border border-stone-200 bg-stone-50 shadow-sm shadow-stone-200/40">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">⭐ Персональная подборка для {selectedPet.name}</span>
                    <span className="text-slate-600 ml-2">({selectedPet.species_label})</span>
                  </p>
                </div>
              )}

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
                onRetry={() => fetchCourses()}
              />
            </>
          )}
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
