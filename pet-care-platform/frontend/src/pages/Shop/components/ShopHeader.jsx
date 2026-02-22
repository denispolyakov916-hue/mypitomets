import { memo } from 'react'

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
            bg-white/80 backdrop-blur-sm
            border border-primary-100
            text-sm text-gray-700
            hover:bg-primary-50 hover:border-primary-200
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
 * Заголовок страницы магазина: название, поиск, счётчик, чипы фильтров
 */
const ShopHeader = memo(function ShopHeader({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onOpenMobileFilters,
  filters,
  availableFilters,
  onRemoveChip,
  onReset,
  isLoading,
  error,
  productCount,
}) {
  return (
    <div className="mb-6">
      <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="page-title mb-0 leading-tight">
                Магазин товаров для питомцев
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Подбор по питомцу, бренду и цене. Сохраняйте избранное и собирайте корзину в пару кликов.
              </p>
            </div>

            <button
              onClick={onOpenMobileFilters}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-primary-200 text-primary-700 hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17V12.414L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Фильтры
            </button>
          </div>

          {/* Поиск + счётчик */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <form onSubmit={onSearch} className="flex gap-2 flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Поиск по названию..."
                className="flex-1 px-4 py-2.5 border border-primary-200 rounded-xl focus:ring-primary-500 focus:border-primary-500 bg-white/90 backdrop-blur-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50"
              >
                Найти
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 hidden sm:block">
                {!isLoading && !error && (
                  <span>
                    Найдено: <span className="font-semibold text-gray-900">{productCount}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Активные фильтры */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <ActiveFilterChips
              filters={filters}
              availableFilters={availableFilters}
              onRemove={onRemoveChip}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onReset}
                disabled={isLoading}
                className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4 disabled:opacity-50"
              >
                Очистить всё
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export { ShopHeader, ActiveFilterChips }
