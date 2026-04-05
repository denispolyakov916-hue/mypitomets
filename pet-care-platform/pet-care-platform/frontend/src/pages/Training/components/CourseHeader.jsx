/**
 * Заголовок страницы курсов
 *
 * Десктоп-табы — .course-header-nav в CSS; мобильный блок — палитра сайта (primary / лёгкий violet).
 */

import { memo } from 'react'
import {
  GraduationCap,
  Cat,
  Dog,
  BookOpen,
  Dumbbell,
  UtensilsCrossed,
  Brain,
} from 'lucide-react'

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
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-primary-200/90 text-sm text-primary-900 hover:bg-primary-50/90 hover:border-primary-300 transition-colors"
          title="Убрать фильтр"
        >
          <span className="truncate max-w-[16rem]">{chip.label}</span>
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-primary-400 group-hover:text-primary-700">
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
/** Быстрые темы курсов (нижний ряд), по смыслу как «Корм / Лакомства / …» в магазине */
const MOBILE_QUICK_CATEGORIES = [
  { value: 'basics', label: 'Основы', Icon: BookOpen },
  { value: 'training', label: 'Дрессировка', Icon: Dumbbell },
  { value: 'nutrition', label: 'Питание', Icon: UtensilsCrossed },
  { value: 'behavior', label: 'Поведение', Icon: Brain },
]

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

  const allowedCategoryKeys = new Set(
    allTabs.filter(t => t.type !== 'all').map(t => t.id || t.value).filter(Boolean)
  )
  const mobileQuickItems = MOBILE_QUICK_CATEGORIES.filter(item =>
    allowedCategoryKeys.has(item.value)
  )

  /** Вид питомца для иерархии: из URL или из выбранного питомца (pet_id) */
  let impliedPetType = ''
  if (filters.pet_type === 'cat' || filters.pet_type === 'dog') {
    impliedPetType = filters.pet_type
  } else if (filters.pet_id && availableFilters?.user_pets?.length) {
    const pet = availableFilters.user_pets.find(p => String(p.id) === String(filters.pet_id))
    if (pet?.species === 'cat' || pet?.species === 'dog') impliedPetType = pet.species
  }
  const canPickQuickCategory = Boolean(impliedPetType)

  const petType = filters.pet_type || ''
  const mobileCatActive = petType === 'cat' && !filters.pet_id && filters.personal !== 'true'
  const mobileDogActive = petType === 'dog' && !filters.pet_id && filters.personal !== 'true'

  const handleMobilePet = (type) => {
    if (!onCategoryChange) return
    onCategoryChange('pet_type', type)
  }

  const handleQuickCategory = (value) => {
    if (!onCategoryChange || !value || !canPickQuickCategory) return
    onCategoryChange('category', value)
  }

  /** Кнопка категории: тот же btn-slide, что в каталоге магазина; стили — .course-header-nav в index.css */
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
      <div
        className="lg:hidden mb-3 rounded-2xl border border-primary-200/90 bg-gradient-to-b from-primary-50/80 via-violet-50/30 to-white shadow-md shadow-primary-900/10 overflow-hidden"
        aria-label="Быстрый выбор курсов"
        aria-describedby={!canPickQuickCategory && mobileQuickItems.length > 0 ? 'course-mobile-pet-first' : undefined}
      >
        <div className="flex min-h-[52px]">
          <button
            type="button"
            onClick={() => handleMobilePet('cat')}
            className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-3 border-r border-primary-200/70 transition-colors ${
              mobileCatActive
                ? 'bg-primary-100/95 text-primary-950 font-semibold'
                : 'bg-primary-50/60 text-primary-900 font-medium'
            }`}
            aria-pressed={mobileCatActive}
          >
            <Cat className={`w-6 h-6 shrink-0 ${mobileCatActive ? 'text-primary-800' : 'text-primary-700'}`} strokeWidth={2} aria-hidden />
            <span className="text-sm sm:text-base truncate">Кошка</span>
          </button>
          <button
            type="button"
            onClick={() => handleMobilePet('dog')}
            className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-3 transition-colors ${
              mobileDogActive
                ? 'bg-primary-100/95 text-primary-950 font-semibold'
                : 'bg-primary-50/60 text-primary-900 font-medium'
            }`}
            aria-pressed={mobileDogActive}
          >
            <Dog className={`w-6 h-6 shrink-0 ${mobileDogActive ? 'text-primary-800' : 'text-primary-700'}`} strokeWidth={2} aria-hidden />
            <span className="text-sm sm:text-base truncate">Собака</span>
          </button>
        </div>
        {mobileQuickItems.length > 0 && (
          <>
            {!canPickQuickCategory && (
              <p id="course-mobile-pet-first" className="sr-only">
                Сначала выберите кошку или собаку — темы ниже фильтруют курсы только для этого вида.
              </p>
            )}
            <div className="flex bg-white/95 border-t border-primary-100">
              {mobileQuickItems.map((item, idx) => {
                const active = canPickQuickCategory && currentCategory === item.value
                const { Icon } = item
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={!canPickQuickCategory}
                    onClick={() => handleQuickCategory(item.value)}
                    className={`flex flex-1 min-w-0 flex-col items-center justify-center gap-1 min-h-[56px] px-0.5 py-2 text-center transition-colors ${
                      idx < mobileQuickItems.length - 1 ? 'border-r border-primary-100' : ''
                    } ${!canPickQuickCategory ? 'opacity-45 cursor-not-allowed' : 'active:bg-primary-50/80'} ${
                      active ? 'bg-violet-50/90 shadow-[inset_0_0_0_2px_rgb(109,40,217)]' : ''
                    }`}
                    aria-pressed={active}
                  >
                    <Icon
                      className={`w-[22px] h-[22px] shrink-0 ${active ? 'text-primary-900' : 'text-primary-600'}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span
                      className={`text-[11px] leading-tight font-semibold max-w-full px-0.5 line-clamp-2 ${
                        active ? 'text-primary-950' : 'text-primary-800'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {allTabs.length > 0 && (
        <nav className="hidden lg:flex course-header-nav flex-col gap-3 py-2 w-full overflow-hidden">
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
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-200 bg-white text-primary-800 hover:bg-primary-50/90 hover:border-primary-300 transition-colors"
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
