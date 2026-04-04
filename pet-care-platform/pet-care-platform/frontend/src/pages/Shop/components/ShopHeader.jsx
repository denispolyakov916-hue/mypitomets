import { memo, useMemo } from 'react'
import {
  LayoutGrid,
  UtensilsCrossed,
  Pill,
  Bath,
  Utensils,
  Gamepad2,
  Footprints,
  Shirt,
  Sparkles,
  Home,
  Brain,
  Tag,
  Cat,
  Dog,
  Fish,
} from 'lucide-react'

const ICON_SIZE = 19
const ICON_STROKE = 2

function flattenShopCategories(hierarchical) {
  const out = []
  for (const c of hierarchical || []) {
    out.push(c)
    for (const ch of c.children || []) out.push(ch)
  }
  return out
}

function scoreQuickCategory(item, kind) {
  const code = (item.code || '').toLowerCase()
  const name = (item.name || '').toLowerCase()
  switch (kind) {
    case 'food':
      if (code === 'food') return 100
      if (code.startsWith('food.') && !code.includes('treat')) return 45
      if (name.includes('питан') || (name.includes('корм') && !name.includes('лакомств'))) return 28
      return 0
    case 'treats':
      if (code.includes('treat')) return 100
      if (name.includes('лакомств')) return 65
      return 0
    case 'toys':
      if (code === 'toys') return 100
      if (code.startsWith('toys.')) return 55
      if (name.includes('игруш')) return 42
      return 0
    case 'litter':
      if (code.includes('litter')) return 100
      if (name.includes('наполнител')) return 78
      if (code === 'toilet') return 35
      if (code.startsWith('toilet.')) return 28
      return 0
    default:
      return 0
  }
}

function pickQuickCategoryCode(flat, kind) {
  let best = null
  let bestScore = 0
  for (const item of flat) {
    const sc = scoreQuickCategory(item, kind)
    if (sc > bestScore) {
      bestScore = sc
      best = item
    }
  }
  if (!best || bestScore < 12) return ''
  return best.code || best.slug || ''
}

function isQuickKindActive(categoryCode, kind) {
  const code = (categoryCode || '').toLowerCase()
  if (!code) return false
  switch (kind) {
    case 'food':
      return code === 'food' || (code.startsWith('food.') && !code.includes('treat'))
    case 'treats':
      return code.includes('treat')
    case 'toys':
      return code === 'toys' || code.startsWith('toys.')
    case 'litter':
      return code.includes('litter') || code.startsWith('toilet.')
    default:
      return false
  }
}

/** Подбор минималистичной иконки под текст/код категории */
function getCategoryIcon(item) {
  if (item.type === 'all') return LayoutGrid
  const name = (item.name || '').toLowerCase()
  const code = (item.code || item.slug || '').toLowerCase()
  const combined = `${name} ${code}`

  if (combined.includes('питание') || combined.includes('корм') || combined.includes('food')) return UtensilsCrossed
  if (combined.includes('ветаптека') || combined.includes('вет') || combined.includes('pharm')) return Pill
  if (combined.includes('туалет')) return Bath
  if (combined.includes('миск') || combined.includes('поил') || combined.includes('bowl')) return Utensils
  if (combined.includes('игруш') || combined.includes('развлечен')) return Gamepad2
  if (combined.includes('амуниция') || combined.includes('выгул') || combined.includes('поводок')) return Footprints
  if (combined.includes('одежда') || combined.includes('обувь')) return Shirt
  if (combined.includes('уход') || (combined.includes('гигиена') && !combined.includes('туалет'))) return Sparkles
  if (combined.includes('дом') || combined.includes('транспорт')) return Home
  if (combined.includes('контроль') || combined.includes('поведен')) return Brain

  return Tag
}

/**
 * Чипы активных фильтров (витрина)
 */
const ActiveFilterChips = memo(function ActiveFilterChips({ filters, availableFilters, onRemove }) {
  const chips = []

  if (filters.search) chips.push({ key: 'search', label: `Поиск: ${filters.search}` })

  if (filters.animal) {
    const animalLabel = availableFilters.animals?.find(a => a.value === filters.animal)?.label
    chips.push({ key: 'animal', label: animalLabel || filters.animal })
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
  onShopNavUpdate,
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

  const quickCodes = useMemo(() => {
    const flat = flattenShopCategories(categories)
    return {
      food: pickQuickCategoryCode(flat, 'food'),
      treats: pickQuickCategoryCode(flat, 'treats'),
      toys: pickQuickCategoryCode(flat, 'toys'),
      litter: pickQuickCategoryCode(flat, 'litter'),
    }
  }, [categories])

  const currentCategoryCode = filters.category_code || ''

  const allTabs = [
    { type: 'all', id: 'all', name: 'Все' },
    ...(topCategories.map(cat => ({ type: 'category', ...cat, id: cat.id || cat.code || cat.slug }))),
  ]
  const half = Math.ceil(allTabs.length / 2)
  const row1 = allTabs.slice(0, half)
  const row2 = allTabs.slice(half)

  /**
   * Кнопка категории в стиле btn-slide; выбранный раздел — с контрастной окантовкой.
   */
  const renderSlideButton = (item) => {
    const isAll = item.type === 'all'
    const currentCode = filters.category_code || ''
    const currentSlug = filters.category_slug || ''
    const itemCode = item.code || item.slug || ''
    const itemSlug = item.slug || item.code || ''
    const isActive = isAll
      ? !currentCode && !currentSlug
      : (currentCode && (currentCode === itemCode || currentCode === itemSlug)) ||
        (currentSlug && (currentSlug === itemSlug || currentSlug === itemCode))
    const handleClick = () => {
      if (onCategoryChange) onCategoryChange('category_code', isAll ? '' : (item.code || item.slug))
    }
    const Icon = getCategoryIcon(item)
    return (
      <button
        key={item.id}
        type="button"
        className={`btn-slide flex-1 min-w-0 ${isActive ? 'btn-slide-active' : ''}`}
        onClick={handleClick}
        aria-current={isActive ? 'true' : undefined}
      >
        <span className="circle">
          <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
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

  const animal = filters.animal || ''
  const mobileTopLeftActive = animal === 'cat'
  const mobileTopRightActive = animal === 'dog'

  const handleMobileTopLeft = () => {
    if (!onShopNavUpdate) return
    onShopNavUpdate({ pet_id: '', animal: 'cat', age_group: '' })
  }

  const handleMobileTopRight = () => {
    if (!onShopNavUpdate) return
    onShopNavUpdate({ pet_id: '', animal: 'dog', age_group: '' })
  }

  const handleQuickCategory = (code) => {
    if (!onShopNavUpdate || !code) return
    onShopNavUpdate({ pet_id: '', category_code: code })
  }

  const mobileQuickItems = [
    { kind: 'food', code: quickCodes.food, label: 'Корм', Icon: UtensilsCrossed },
    { kind: 'treats', code: quickCodes.treats, label: 'Лакомства', Icon: Fish },
    { kind: 'toys', code: quickCodes.toys, label: 'Игрушки', Icon: Gamepad2 },
    { kind: 'litter', code: quickCodes.litter, label: 'Туалет', Icon: Bath },
  ]

  return (
    <div className="mb-6">
      {onShopNavUpdate && (
        <div
          className="lg:hidden mb-3 rounded-2xl border border-primary-200/90 bg-white shadow-md shadow-primary-900/5 overflow-hidden"
          aria-label="Быстрый выбор в каталоге"
        >
          <div className="flex min-h-[52px]">
            <button
              type="button"
              onClick={handleMobileTopLeft}
              className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-3 border-r border-primary-200/80 transition-colors ${
                mobileTopLeftActive
                  ? 'bg-accent-400 text-gray-900 font-semibold'
                  : 'bg-primary-50 text-primary-800 font-medium'
              }`}
              aria-pressed={mobileTopLeftActive}
            >
              <Cat className="w-6 h-6 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              <span className="text-sm sm:text-base truncate">Кошка</span>
            </button>
            <button
              type="button"
              onClick={handleMobileTopRight}
              className={`flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-3 transition-colors ${
                mobileTopRightActive
                  ? 'bg-accent-400 text-gray-900 font-semibold'
                  : 'bg-primary-50 text-primary-800 font-medium'
              }`}
              aria-pressed={mobileTopRightActive}
            >
              <Dog className="w-6 h-6 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
              <span className="text-sm sm:text-base truncate">Собака</span>
            </button>
          </div>
          <div className="flex bg-white border-t border-gray-100">
            {mobileQuickItems.map((item, idx) => {
              const disabled = !item.code
              const active = isQuickKindActive(currentCategoryCode, item.kind)
              const { Icon } = item
              return (
                <button
                  key={item.kind}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleQuickCategory(item.code)}
                  className={`flex flex-1 min-w-0 flex-col items-center justify-center gap-1 min-h-[56px] px-0.5 py-2 text-center transition-colors ${
                    idx < mobileQuickItems.length - 1 ? 'border-r border-gray-200' : ''
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:bg-primary-50/80'} ${
                    active ? 'bg-primary-50/90' : ''
                  }`}
                  aria-pressed={active}
                >
                  <Icon
                    className={`w-[22px] h-[22px] shrink-0 ${active ? 'text-primary-700' : 'text-accent-500'}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span
                    className={`text-[11px] leading-tight font-semibold text-gray-900 max-w-full px-0.5 line-clamp-2 ${
                      active ? 'text-primary-800' : ''
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {allTabs.length > 0 && (
        <nav className="hidden lg:flex shop-header-nav flex-col gap-3 py-2 w-full overflow-hidden">
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
