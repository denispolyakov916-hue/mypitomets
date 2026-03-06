/**
 * Заголовок страницы курсов
 *
 * Табы категорий в том же стиле, что и в магазине питания (pill + круг с иконкой + градиент), в фиолетовой палитре.
 */

import { memo } from 'react'
import { GraduationCap } from 'lucide-react'

const CATEGORY_TABS = [
  { type: 'all', id: 'all', name: 'Все' },
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
 * Чипы активных фильтров курсов
 */
const ActiveFilterChips = memo(function ActiveFilterChips({ filters, availableFilters, onRemove }) {
  const chips = []

  if (filters.search) chips.push({ key: 'search', label: `Поиск: ${filters.search}` })
  if (filters.pet_type) {
    const labels = { dog: 'Собак', cat: 'Кошек', all: 'Все' }
    chips.push({ key: 'pet_type', label: labels[filters.pet_type] || filters.pet_type })
  }
  if (filters.pet_id) {
    const pet = availableFilters.user_pets?.find(p => String(p.id) === String(filters.pet_id))
    chips.push({ key: 'pet_id', label: pet ? `Питомец: ${pet.name}` : 'Питомец' })
  }
  if (filters.category) {
    const cat = (availableFilters.categories || CATEGORY_TABS).find(
      c => (c.value || c.id) === filters.category
    )
    chips.push({
      key: 'category',
      label: cat ? (cat.label || cat.name) : `Категория: ${filters.category}`,
    })
  }
  if (filters.level) {
    const labels = { beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый', expert: 'Эксперт' }
    chips.push({ key: 'level', label: labels[filters.level] || filters.level })
  }
  if (filters.format_type) {
    const labels = { video: 'Видео', text: 'Текст', interactive: 'Интерактивный', mixed: 'Смешанный', webinar: 'Вебинар', workshop: 'Мастер-класс' }
    chips.push({ key: 'format_type', label: labels[filters.format_type] || filters.format_type })
  }
  if (filters.min_price || filters.max_price) {
    const from = filters.min_price ? `от ${filters.min_price}` : 'от …'
    const to = filters.max_price ? `до ${filters.max_price}` : 'до …'
    chips.push({ key: 'price', label: `Цена: ${from} ${to}` })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-primary-200 text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 transition-colors"
          title="Убрать фильтр"
        >
          <span className="truncate max-w-[16rem]">{chip.label}</span>
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 group-hover:text-primary-700">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        </button>
      ))}
    </div>
  )
})

/**
 * Заголовок с табами категорий, поиском и кнопкой «Фильтры»
 */
const CourseHeader = memo(function CourseHeader({
  onOpenMobileFilters,
  onCategoryChange,
  filters,
  availableFilters,
  onRemoveChip,
}) {
  const categories = (availableFilters?.categories?.length && availableFilters.categories) || CATEGORY_TABS.filter(c => c.value)
  const allTabs = [
    { type: 'all', id: 'all', name: 'Все' },
    ...categories.map(c => ({
      id: c.value || c.id,
      name: c.label || c.name,
      value: c.value || c.id,
    })),
  ]
  const half = Math.ceil(allTabs.length / 2)
  const row1 = allTabs.slice(0, half)
  const row2 = allTabs.slice(half)
  const currentCategory = filters.category || ''

  /** Кнопка категории в стиле магазина питания: pill, круг с иконкой (уезжает вправо при hover), градиент в фиолетовой палитре */
  const renderSlideButton = (item) => {
    const isAll = item.type === 'all'
    const itemId = item.id || item.value
    const handleClick = () => {
      if (onCategoryChange) onCategoryChange('category', isAll ? '' : itemId)
    }
    const isActive = isAll ? !currentCategory : currentCategory === itemId
    return (
      <button
        key={itemId}
        type="button"
        className={`btn-slide flex-1 min-w-0 ${isActive ? 'btn-slide-active' : ''}`}
        onClick={handleClick}
      >
        <span className="circle">
          <GraduationCap size={19} strokeWidth={2} />
        </span>
        <span className="title">
          <span className="btn-slide-text">{item.name}</span>
        </span>
        <span className="title title-hover">
          <span className="btn-slide-text">{item.name}</span>
        </span>
      </button>
    )
  }

  return (
    <div className="mb-6">
      {allTabs.length > 0 && (
        <nav className="course-header-nav flex flex-col gap-3 py-2 w-full overflow-hidden">
          <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
            {row1.map(renderSlideButton)}
          </div>
          {row2.length > 0 && (
            <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
              {row2.map(renderSlideButton)}
            </div>
          )}
        </nav>
      )}

      <ActiveFilterChips
        filters={filters}
        availableFilters={availableFilters}
        onRemove={onRemoveChip}
      />

      <div className="lg:hidden pt-2">
        <button
          onClick={onOpenMobileFilters}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17V12.414L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Фильтры
        </button>
      </div>
    </div>
  )
})

export { CourseHeader, ActiveFilterChips }
