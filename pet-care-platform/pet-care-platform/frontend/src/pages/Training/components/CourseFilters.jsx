/**
 * Компоненты фильтрации курсов
 *
 * Боковая панель в стиле ShopFilters и модальное окно для мобильных.
 */

import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../../components/ui/Modal'

const PET_TYPE_OPTIONS = [
  { value: '', label: 'Все курсы' },
  { value: 'dog', label: 'Собак' },
  { value: 'cat', label: 'Кошек' },
  { value: 'all', label: 'Все' },
]

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

const LEVEL_OPTIONS = [
  { value: '', label: 'Все уровни' },
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' },
]

const FORMAT_OPTIONS = [
  { value: '', label: 'Все форматы' },
  { value: 'video', label: 'Видео' },
  { value: 'text', label: 'Текст' },
  { value: 'interactive', label: 'Интерактивный' },
  { value: 'mixed', label: 'Смешанный' },
  { value: 'webinar', label: 'Вебинар' },
  { value: 'workshop', label: 'Мастер-класс' },
]

const tagBase = (large) =>
  large
    ? 'px-4 py-4 rounded-full text-sm font-medium transition-colors border-2 '
    : 'px-3 py-2.5 rounded-full text-sm font-medium transition-colors border-2 '
const tagInactive = 'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100 hover:border-primary-300 '
const tagActive = 'border-primary-600 bg-primary-600 text-white '

/**
 * Боковая панель фильтров (десктоп) — в стиле ShopFilters
 */
const FilterSidebar = memo(function FilterSidebar({
  filters,
  availableFilters,
  onFilterChange,
  onReset,
  onPriceApply,
  isLoading = false,
  courseCount = 0,
  largeButtons = false,
  className = '',
}) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || '',
    max: filters.max_price || '',
  })
  const sidebarRef = useRef(null)

  useEffect(() => {
    setPriceRange({ min: filters.min_price || '', max: filters.max_price || '' })
  }, [filters.min_price, filters.max_price])

  useEffect(() => {
    const handleWheel = (e) => {
      if (sidebarRef.current?.contains(e.target)) {
        const sidebar = sidebarRef.current
        const isAtTop = sidebar.scrollTop === 0
        const isAtBottom = sidebar.scrollTop + sidebar.clientHeight >= sidebar.scrollHeight
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) return
        e.stopPropagation()
      }
    }
    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [])

  const handlePriceApply = () => {
    if (onPriceApply) {
      onPriceApply(priceRange.min, priceRange.max)
    } else {
      onFilterChange('min_price', priceRange.min)
      onFilterChange('max_price', priceRange.max)
    }
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.pet_type) count++
    if (filters.pet_id) count++
    if (filters.personal === 'true') count++
    if (filters.category || filters.subcategory) count++
    if (filters.level) count++
    if (filters.format_type) count++
    if (filters.price_type) count++
    if (filters.min_price || filters.max_price) count++
    return count
  }, [filters])

  const base = tagBase(largeButtons)
  const pets = availableFilters?.user_pets || []

  const [openDropdown, setOpenDropdown] = useState(null)
  const dropdownRef = useRef(null)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const btnClass = `w-full flex items-center justify-between bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-xl text-sm ${largeButtons ? 'px-4 py-4' : 'px-3 py-3'}`
  const panelClass = 'absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto'

  const categoryOptions = availableFilters?.categories?.length
    ? [{ value: '', id: '', label: 'Все категории', name: 'Все категории' }, ...availableFilters.categories]
    : CATEGORY_OPTIONS
  const levelOptions = availableFilters?.levels?.length
    ? [{ value: '', id: '', label: 'Все уровни', name: 'Все уровни' }, ...availableFilters.levels]
    : LEVEL_OPTIONS
  const formatOptions = availableFilters?.formats?.length
    ? [{ value: '', id: '', label: 'Все форматы', name: 'Все форматы' }, ...availableFilters.formats]
    : FORMAT_OPTIONS

  const getLabel = (options, value) => options.find(o => (o.value || o.id) === value)?.label || options.find(o => (o.value || o.id) === value)?.name || ''

  return (
    <div
      ref={sidebarRef}
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full min-h-0 ${className} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
    >
      <div className={`flex items-center justify-between border-b border-gray-200 bg-white flex-shrink-0 ${largeButtons ? 'p-4' : 'p-2.5'}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={activeFilterCount === 0}
            className={`rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${largeButtons ? 'p-2' : 'p-1'}`}
            title="Сбросить фильтры"
            aria-label="Сбросить фильтры"
          >
            <svg className={largeButtons ? 'w-5 h-5' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <h3 className={`font-semibold text-gray-800 ${largeButtons ? 'text-lg' : 'text-sm'}`}>Фильтры</h3>
          {activeFilterCount > 0 && (
            <span className={`font-medium bg-primary-600 text-white rounded-full ${largeButtons ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]'}`}>
              {activeFilterCount}
            </span>
          )}
        </div>
      </div>

      <div className={`course-filter-sidebar flex-1 min-h-0 overflow-y-auto flex flex-col ${largeButtons ? 'p-4 space-y-4 min-h-full' : 'p-2.5 space-y-2'}`}>
        {/* Окно питомцев — как в магазине питания: заголовок с иконкой, горизонтальная полоса карточек, кнопка «Добавить питомца» */}
        <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`font-semibold text-gray-800 flex items-center gap-2 ${largeButtons ? 'text-base' : 'text-xs'}`}>
              <span className="text-primary-600" aria-hidden>🐾</span>
              Мои питомцы
            </h3>
          </div>
          {pets.length > 0 ? (
            <>
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-0.5 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
                {pets.map(pet => {
                  if (!['dog', 'cat'].includes(pet.species)) return null
                  const isSelected = String(filters.pet_id) === String(pet.id)
                  const photoUrl = pet.photo || null
                  const placeholderEmoji = pet.species === 'cat' ? '🐈' : pet.species === 'dog' ? '🐕' : '🐾'
                  const cardBg = pet.species === 'dog' ? 'bg-blue-50' : 'bg-amber-50/80'
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => onFilterChange('pet_id', isSelected ? '' : pet.id)}
                      className={`flex-shrink-0 w-[100px] ${largeButtons ? 'w-[110px]' : ''} rounded-xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${
                        isSelected
                          ? 'border-accent-400 bg-accent-400/20 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`aspect-square flex items-center justify-center overflow-hidden ${!isSelected ? cardBg : ''}`}>
                        {photoUrl ? (
                          <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl" aria-hidden>{placeholderEmoji}</span>
                        )}
                      </div>
                      <div className="p-2 text-center bg-white border-t border-gray-100">
                        <span className={`block font-medium truncate text-gray-800 ${largeButtons ? 'text-sm' : 'text-xs'}`}>{pet.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <p className={`text-gray-500 ${largeButtons ? 'text-sm' : 'text-xs'} mb-2`}>
                Добавьте питомца в профиле — подборка курсов будет персональной
              </p>
              <Link
                to="/profile"
                className={`inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-medium ${largeButtons ? 'text-sm' : 'text-xs'}`}
              >
                Перейти в профиль
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}
        </div>

        <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className={`font-medium text-gray-800 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Тип питомца</div>
          <div className="flex flex-wrap gap-2">
            {(availableFilters?.pet_types || PET_TYPE_OPTIONS).map(opt => {
              const val = opt.value ?? opt.id
              const label = opt.label ?? opt.name
              const isSelected = filters.pet_type === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onFilterChange('pet_type', isSelected ? '' : val)}
                  className={`flex-1 min-w-0 rounded-full text-sm font-medium transition-all ${largeButtons ? 'px-4 py-4' : 'px-3 py-2.5'} ${isSelected ? 'filter-pill-active' : 'filter-pill'}`}
                >
                  <span className="relative z-[1]">{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div ref={dropdownRef}>
        <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <label className={`block font-medium text-gray-900 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1.5'}`}>
            Категория
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
              className={btnClass}
            >
              <span className={filters.category ? 'text-gray-900' : 'text-gray-500'}>
                {getLabel(categoryOptions, filters.category) || 'Все категории'}
              </span>
              <svg className={`${largeButtons ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'category' && (
              <div className={panelClass}>
                {categoryOptions.map(opt => {
                  const val = opt.value ?? opt.id ?? ''
                  const label = opt.label ?? opt.name ?? val
                  const isSelected = (filters.category || '') === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { onFilterChange('category', val); setOpenDropdown(null) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${isSelected ? 'bg-primary-50 text-gray-900 font-medium' : 'text-gray-700'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <label className={`block font-medium text-gray-900 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1.5'}`}>
            Уровень сложности
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'level' ? null : 'level')}
              className={btnClass}
            >
              <span className={filters.level ? 'text-gray-900' : 'text-gray-500'}>
                {getLabel(levelOptions, filters.level) || 'Все уровни'}
              </span>
              <svg className={`${largeButtons ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'level' && (
              <div className={panelClass}>
                {levelOptions.map(opt => {
                  const val = opt.value ?? opt.id ?? ''
                  const label = opt.label ?? opt.name ?? val
                  const isSelected = (filters.level || '') === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { onFilterChange('level', val); setOpenDropdown(null) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${isSelected ? 'bg-primary-50 text-gray-900 font-medium' : 'text-gray-700'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <label className={`block font-medium text-gray-900 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1.5'}`}>
            Формат обучения
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'format' ? null : 'format')}
              className={btnClass}
            >
              <span className={filters.format_type ? 'text-gray-900' : 'text-gray-500'}>
                {getLabel(formatOptions, filters.format_type) || 'Все форматы'}
              </span>
              <svg className={`${largeButtons ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown === 'format' && (
              <div className={panelClass}>
                {formatOptions.map(opt => {
                  const val = opt.value ?? opt.id ?? ''
                  const label = opt.label ?? opt.name ?? val
                  const isSelected = (filters.format_type || '') === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { onFilterChange('format_type', val); setOpenDropdown(null) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${isSelected ? 'bg-primary-50 text-gray-900 font-medium' : 'text-gray-700'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        </div>

        {availableFilters?.price_types?.length > 0 && (
          <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
            <div className={`font-medium text-gray-800 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Тип цены</div>
            <div className="space-y-2">
              {availableFilters.price_types.map(opt => (
                <label key={opt.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="price_type"
                    value={opt.value}
                    checked={filters.price_type === opt.value}
                    onChange={e => onFilterChange('price_type', e.target.value)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className={`border-b border-gray-200 ${largeButtons ? 'pb-4' : 'pb-2'}`}>
          <div className={`font-medium text-gray-800 ${largeButtons ? 'text-sm mb-2' : 'text-xs mb-1'}`}>Цена, ₽</div>
          <div className={`flex gap-2 items-center ${largeButtons ? 'gap-2' : 'gap-1.5'}`}>
            <input
              type="number"
              placeholder={availableFilters?.price_range ? `от ${Math.floor(availableFilters.price_range.min)}` : 'от'}
              value={priceRange.min}
              onChange={e => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              className={`w-full border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white ${largeButtons ? 'px-3 py-2.5 text-sm rounded-xl' : 'px-2 py-1.5 text-xs'}`}
            />
            <span className={`text-gray-400 ${largeButtons ? 'text-sm' : 'text-xs'}`}>—</span>
            <input
              type="number"
              placeholder={availableFilters?.price_range ? `до ${Math.ceil(availableFilters.price_range.max)}` : 'до'}
              value={priceRange.max}
              onChange={e => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              className={`w-full border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white ${largeButtons ? 'px-3 py-2.5 text-sm rounded-xl' : 'px-2 py-1.5 text-xs'}`}
            />
          </div>
          <button
            type="button"
            onClick={handlePriceApply}
            className={`w-full font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors mt-2 ${largeButtons ? 'py-4 text-sm rounded-xl' : 'py-2.5 text-sm rounded-xl'}`}
          >
            Применить
          </button>
        </div>
      </div>

      <div className={`pt-0 flex flex-col border-t border-gray-200 bg-gray-50 flex-shrink-0 ${largeButtons ? 'p-4 gap-3' : 'p-2.5 gap-1.5'}`}>
        <button
          type="button"
          className={`w-full rounded-xl bg-primary-700 hover:bg-primary-800 text-white font-medium flex items-center justify-center transition-colors ${largeButtons ? 'py-5 px-4 text-base' : 'py-3.5 px-4 text-sm'}`}
          aria-label={`Показать ${courseCount.toLocaleString('ru-RU')} курсов`}
        >
          Показать {courseCount.toLocaleString('ru-RU')} курсов
        </button>
        <button
          type="button"
          onClick={onReset}
          className={`w-full rounded-xl border-2 border-gray-300 text-gray-800 font-medium hover:bg-gray-100 transition-colors ${largeButtons ? 'py-5 text-base' : 'py-3 text-sm'}`}
        >
          Сбросить
        </button>
      </div>
    </div>
  )
})

/**
 * Мобильные фильтры в модальном окне
 */
const MobileFiltersModal = memo(function MobileFiltersModal({
  isOpen,
  onClose,
  filters,
  availableFilters,
  onFilterChange,
  onPriceApply,
  onReset,
  isLoading,
  courseCount = 0,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Фильтры"
      size="full"
      centered={false}
      className="rounded-2xl overflow-hidden"
    >
      <div className="min-h-[calc(100vh-12rem)] flex flex-col">
        <FilterSidebar
          filters={filters}
          availableFilters={availableFilters}
          onFilterChange={onFilterChange}
          onPriceApply={onPriceApply}
          onReset={onReset}
          isLoading={isLoading}
          courseCount={courseCount}
          largeButtons
          className="border-0 shadow-none flex-1 min-h-0"
        />
      </div>
    </Modal>
  )
})

export { FilterSidebar, MobileFiltersModal }
