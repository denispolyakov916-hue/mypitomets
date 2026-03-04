/**
 * Заголовок страницы курсов
 *
 * Табы категорий (как в магазине), поиск, чипы активных фильтров, кнопка «Фильтры» на мобильных.
 */

import { memo, useState } from 'react'

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
    const labels = { dog: 'Для собак', cat: 'Для кошек', all: 'Для всех' }
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
  const [hoveredId, setHoveredId] = useState(null)
  const currentCategory = filters.category || ''

  /** Пузырь категории: тот же градиент и стекло, но в сиреневой гамме */
  const renderTab = (item) => {
    const isAll = item.type === 'all'
    const itemId = item.id || item.value
    const isActive = isAll ? !currentCategory : currentCategory === itemId
    const isHovered = hoveredId === itemId
    return (
      <button
        key={itemId}
        type="button"
        onMouseEnter={() => setHoveredId(itemId)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => onCategoryChange && onCategoryChange('category', isAll ? '' : itemId)}
        style={{
          background: 'linear-gradient(135deg, rgba(237,224,255,0.9) 0%, rgba(217,191,255,0.92) 50%, rgba(200,170,240,0.9) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.55)',
          color: '#3e2362',
          boxShadow: isHovered
            ? 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(82,47,129,0.25), 0 8px 24px rgba(82,47,129,0.28)'
            : 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(82,47,129,0.2), 0 4px 12px rgba(82,47,129,0.18)',
        }}
        className={`
          relative flex-1 min-w-0 rounded-full py-4 px-6 text-base font-medium whitespace-nowrap
          transition-all duration-200 ease-out
          ${isActive ? 'z-10 ring-1 ring-white/60' : 'z-0'}
          ${isHovered ? 'z-20 scale-[1.02]' : ''}
        `}
      >
        {item.name}
      </button>
    )
  }

  return (
    <div className="mb-6">
      {allTabs.length > 0 && (
        <nav className="flex flex-col gap-3 py-2 w-full overflow-hidden">
          <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
            {row1.map(renderTab)}
          </div>
          {row2.length > 0 && (
            <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
              {row2.map(renderTab)}
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
