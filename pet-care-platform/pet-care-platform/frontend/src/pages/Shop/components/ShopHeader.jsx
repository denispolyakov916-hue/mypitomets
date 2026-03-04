import { memo, useState } from 'react'

/**
 * Чипы активных фильтров (витрина)
 */
const ActiveFilterChips = memo(function ActiveFilterChips({ filters, availableFilters, onRemove }) {
  const chips = []

  if (filters.search) chips.push({ key: 'search', label: `Поиск: ${filters.search}` })

  if (filters.animal) {
    const animalLabel = availableFilters.animals?.find(a => a.value === filters.animal)?.label
    chips.push({ key: 'animal', label: animalLabel ? `Для: ${animalLabel}` : `Для: ${filters.animal}` })
  }

  if (filters.pet_id) {
    const petLabel = availableFilters.user_pets?.find(p => String(p.id) === String(filters.pet_id))?.name
    chips.push({ key: 'pet_id', label: petLabel ? `Питомец: ${petLabel}` : 'Питомец' })
  }

  if (filters.category_code || filters.category_slug) {
    const flat = (availableFilters.hierarchical_categories || [])
      .flatMap(c => [c, ...(c.children || [])])
    const catLabel = flat.find(c => c.code === filters.category_code || c.slug === filters.category_slug)?.name
    chips.push({ key: 'category_code', label: catLabel ? `Категория: ${catLabel}` : 'Категория' })
  }

  if (filters.brand_id) {
    const brandLabel = availableFilters.brands?.find(b => String(b.id) === String(filters.brand_id))?.name
    chips.push({ key: 'brand_id', label: brandLabel ? `Бренд: ${brandLabel}` : 'Бренд' })
  }

  const brandClassLabels = {
    holistic: 'Холистик',
    super_premium: 'Супер-премиум',
    premium: 'Премиум',
    economy: 'Эконом',
  }
  if (filters.brand_class && brandClassLabels[filters.brand_class]) {
    chips.push({ key: 'brand_class', label: `Класс: ${brandClassLabels[filters.brand_class]}` })
  }

  const ageLabels = { puppy: 'Щенок', kitten: 'Котёнок', adult: 'Взрослый', senior: 'Пожилой' }
  if (filters.age_group && ageLabels[filters.age_group]) {
    chips.push({ key: 'age_group', label: `Возраст: ${ageLabels[filters.age_group]}` })
  }

  if (filters.min_price || filters.max_price) {
    const from = filters.min_price ? `от ${filters.min_price}` : 'от …'
    const to = filters.max_price ? `до ${filters.max_price}` : 'до …'
    chips.push({ key: 'price', label: `Цена: ${from} ${to}` })
  }

  if (filters.is_grain_free === 'true') chips.push({ key: 'is_grain_free', label: '🌾 Беззерновой' })
  if (filters.is_hypoallergenic === 'true') chips.push({ key: 'is_hypoallergenic', label: '🛡️ Гипоаллергенный' })
  if (filters.is_veterinary === 'true') chips.push({ key: 'is_veterinary', label: '⚕️ Ветеринарный' })

  if (filters.in_stock === 'true') chips.push({ key: 'in_stock', label: 'В наличии' })
  if (filters.has_discount === 'true') chips.push({ key: 'has_discount', label: '🔥 Со скидкой' })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <button
          key={chip.key}
          onClick={() => onRemove(chip.key)}
          className="
            group inline-flex items-center gap-2
            px-3 py-1.5 rounded-full
            bg-white border border-primary-200
            text-sm text-gray-700
            hover:bg-primary-50 hover:border-primary-300
            transition-colors
          "
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

/** Определить, принадлежит ли выбранная категория к данному родителю */
const isCategoryUnderParent = (parent, selectedCode, selectedSlug) => {
  if (!selectedCode && !selectedSlug) return false
  const parentCode = parent.code || parent.slug
  const parentSlug = parent.slug
  if (selectedCode === parentCode || selectedSlug === parentSlug) return true
  const childSlugs = (parent.children || []).map(c => c.slug || c.code).filter(Boolean)
  return childSlugs.some(s => s === selectedCode || s === selectedSlug)
}

/**
 * Заголовок страницы магазина по референсу:
 * табы категорий, поиск + счётчик + кнопка Найти, чипы фильтров
 */
const ShopHeader = memo(function ShopHeader({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onOpenMobileFilters,
  onCategoryChange,
  filters,
  availableFilters,
  onRemoveChip,
  onReset,
  isLoading,
  error,
  productCount,
}) {
  const categories = availableFilters?.hierarchical_categories || []
  const topCategories = categories
  const currentCategoryCode = filters.category_code || ''
  const currentCategorySlug = filters.category_slug || ''

  const allTabs = [
    { type: 'all', id: 'all', name: 'Все' },
    ...(topCategories.map(cat => ({ type: 'category', ...cat, id: cat.id || cat.code || cat.slug }))),
  ]
  const half = Math.ceil(allTabs.length / 2)
  const row1 = allTabs.slice(0, half)
  const row2 = allTabs.slice(half)
  const [hoveredId, setHoveredId] = useState(null)

  /** Пузырь категории в стиле жидкого стекла: полупрозрачность, размытие, блики */
  const renderBubbleTab = (item) => {
    const isAll = item.type === 'all'
    const isActive = isAll
      ? !currentCategoryCode && !currentCategorySlug
      : isCategoryUnderParent(item, currentCategoryCode, currentCategorySlug) ||
        currentCategoryCode === (item.code || item.slug) || currentCategorySlug === item.slug
    const isHovered = hoveredId === item.id
    return (
      <button
        key={item.id}
        type="button"
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => onCategoryChange && onCategoryChange('category_code', isAll ? '' : (item.code || item.slug))}
        style={{
          background: 'linear-gradient(135deg, rgba(251,186,45,0.75) 0%, rgba(245,215,96,0.78) 50%, rgba(240,235,147,0.75) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.5)',
          color: '#2a2a2a',
          boxShadow: isHovered
            ? 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(229,164,30,0.3), 0 8px 24px rgba(251,186,45,0.35)'
            : 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(229,164,30,0.25), 0 4px 12px rgba(251,186,45,0.2)',
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
      {/* Пузыри категорий в два ряда, увеличенный размер */}
      {allTabs.length > 0 && (
        <nav className="flex flex-col gap-3 py-2 w-full overflow-hidden">
          <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
            {row1.map(renderBubbleTab)}
          </div>
          {row2.length > 0 && (
            <div className="flex flex-nowrap items-center gap-2 w-full min-w-0">
              {row2.map(renderBubbleTab)}
            </div>
          )}
        </nav>
      )}
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

export { ShopHeader, ActiveFilterChips }
