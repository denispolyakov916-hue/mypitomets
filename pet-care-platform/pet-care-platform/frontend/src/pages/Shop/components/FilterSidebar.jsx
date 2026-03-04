import { useState, useEffect, useRef, memo } from 'react'
import Modal from '../../../components/ui/Modal'
import ShopFilters from '../../../components/Shop/ShopFilters'

/**
 * Компонент боковой панели фильтров (мемоизированный)
 *
 * Содержит собственную реализацию фильтров: животные, категории,
 * цена, наличие, скидки, рейтинг, популярность, сортировка.
 * Может использоваться как альтернатива ShopFilters.
 */
const FilterSidebar = memo(function FilterSidebar({
  filters,
  availableFilters,
  onFilterChange,
  onReset,
  isLoading,
  disableInternalScroll = false,
  hideHeader = false,
}) {
  const sidebarRef = useRef(null)

  useEffect(() => {
    const handleWheel = (e) => {
      if (sidebarRef.current && sidebarRef.current.contains(e.target)) {
        const sidebar = sidebarRef.current
        const isAtTop = sidebar.scrollTop === 0
        const isAtBottom = sidebar.scrollTop + sidebar.clientHeight >= sidebar.scrollHeight

        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
          return
        }
        e.stopPropagation()
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [])

  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || '',
    max: filters.max_price || ''
  })
  
  const [expandedCategories, setExpandedCategories] = useState(new Set())
  
  useEffect(() => {
    setPriceRange({
      min: filters.min_price || '',
      max: filters.max_price || ''
    })
  }, [filters.min_price, filters.max_price])
  
  const handlePriceApply = () => {
    onFilterChange('min_price', priceRange.min)
    onFilterChange('max_price', priceRange.max)
  }

  const hasActiveFilters = filters.animal || filters.pet_id || filters.category_slug || 
    filters.min_price || 
    filters.max_price || filters.in_stock || filters.has_discount || filters.search ||
    filters.min_rating || filters.min_orders || filters.sort_by
  
  return (
    <div
      ref={sidebarRef}
      className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 transition-opacity duration-200 ${
        disableInternalScroll ? '' : 'overflow-y-auto'
      } ${isLoading ? 'opacity-70' : 'opacity-100'}`}
      style={disableInternalScroll ? undefined : {
        overscrollBehavior: 'contain',
        maxHeight: 'calc(100vh - 8rem)',
      }}
    >
      {!hideHeader && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Фильтры</h3>
          <button
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={`text-sm transition-colors ${
              hasActiveFilters
                ? 'text-primary-600 hover:text-primary-700'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            Очистить фильтры
          </button>
        </div>
      )}
      
      {/* Персональные подборки для питомцев */}
      {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
        <div className="mb-5 pb-5 border-b border-primary-100">
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-primary-600">⭐</span>
            Персональные подборки
          </label>
          <p className="text-xs text-primary-400 mb-3">
            Товары специально для ваших питомцев
          </p>
          <div className="space-y-2">
            {availableFilters.user_pets.map(pet => {
              const hasProducts = ['dog', 'cat'].includes(pet.species)
              if (!hasProducts) return null
              
              const isSelected = filters.pet_id === pet.id
              
              return (
                <label
                  key={pet.id}
                  className={`flex items-center cursor-pointer group p-2 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-primary-50'
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
                    {pet.name} <span className="text-primary-400">({pet.species_label})</span>
                  </span>
                </label>
              )
            })}
            {filters.pet_id && (
              <button
                onClick={() => onFilterChange('pet_id', '')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-2 transition-colors"
              >
                Показать все товары
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Животное */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Для кого
        </label>
        <div className="space-y-2">
          {availableFilters.animals?.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="animal"
                value={opt.value}
                checked={filters.animal === opt.value}
                onChange={(e) => onFilterChange('animal', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">{opt.label}</span>
            </label>
          ))}
          {filters.animal && (
            <button
              onClick={() => onFilterChange('animal', '')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Показать всех
            </button>
          )}
        </div>
      </div>
      
      {/* Категория (иерархическая структура) */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Категория
        </label>
        <div className="space-y-0.5">
          {(() => {
            const categories = availableFilters.hierarchical_categories || []
            const treatsCategory = categories.find(c => c.slug === 'treats' || c.name?.includes('Лакомства'))
            const vitaminsCategory = categories.find(c => c.slug === 'vitamins' || c.name?.includes('Витамины'))
            
            const modifiedCategories = categories
              .filter(c => {
                const isTreats = c.slug === 'treats' || c.name?.includes('Лакомства')
                const isVitamins = c.slug === 'vitamins' || c.name?.includes('Витамины')
                return !isTreats && !isVitamins
              })
              .map(category => {
                const isFoodCategory = category.slug === 'food' || category.name?.includes('Корм')
                if (isFoodCategory) {
                  const additionalChildren = []
                  if (treatsCategory) {
                    additionalChildren.push({
                      ...treatsCategory,
                      id: treatsCategory.id || 'treats-sub',
                      name: '🦴 Лакомства',
                      icon: '🦴'
                    })
                  }
                  if (vitaminsCategory) {
                    additionalChildren.push({
                      ...vitaminsCategory,
                      id: vitaminsCategory.id || 'vitamins-sub',
                      name: '💪 Витамины и добавки',
                      icon: '💪'
                    })
                  }
                  return {
                    ...category,
                    children: [...(category.children || []), ...additionalChildren]
                  }
                }
                return category
              })
            
            return modifiedCategories
          })().map(category => {
            const isExpanded = expandedCategories.has(category.id)
            const hasChildren = category.children && category.children.length > 0
            const isParentSelected = filters.category_slug === category.slug
            const isChildSelected = hasChildren && category.children.some(c => c.slug === filters.category_slug)
            const isActive = isParentSelected || isChildSelected
            
            return (
              <div key={category.id}>
                <div
                  className={`flex items-center gap-2 p-2 cursor-pointer rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-100 text-primary-800'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  onClick={() => {
                    if (hasChildren) {
                      setExpandedCategories(prev => {
                        const next = new Set(prev)
                        if (next.has(category.id)) {
                          next.delete(category.id)
                        } else {
                          next.add(category.id)
                        }
                        return next
                      })
                    } else {
                      onFilterChange('category_slug', isParentSelected ? '' : category.slug)
                    }
                  }}
                >
                  <span className="text-lg w-6 text-center">{category.icon || '📦'}</span>
                  <span className="flex-1 text-sm font-medium">{category.name}</span>
                  {hasChildren && (
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-8 pl-2 border-l-2 border-primary-200 space-y-0.5 py-1 mt-1">
                    <button
                      onClick={() => onFilterChange('category_slug', isParentSelected ? '' : category.slug)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-all ${
                        isParentSelected
                          ? 'bg-primary-600 text-white font-medium'
                          : 'text-primary-600 hover:bg-primary-50 font-medium'
                      }`}
                    >
                      Все ({category.product_count})
                    </button>
                    {category.children.map(sub => {
                      const isSubSelected = filters.category_slug === sub.slug
                      return (
                        <button
                          key={sub.id}
                          onClick={() => onFilterChange('category_slug', isSubSelected ? '' : sub.slug)}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-all ${
                            isSubSelected
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                          }`}
                        >
                          {sub.name}
                          <span className={`ml-1 text-xs ${isSubSelected ? 'text-primary-200' : 'text-gray-400'}`}>
                            ({sub.product_count})
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          
          {filters.category_slug && (
            <button
              onClick={() => {
                onFilterChange('category_slug', '')
              }}
              className="text-xs text-primary-500 hover:text-primary-700 mt-2 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Сбросить категорию
            </button>
          )}
        </div>
      </div>
      
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
            className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
          <span className="text-primary-400">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
        </div>
        <button
          onClick={handlePriceApply}
          className="mt-2 w-full py-1.5 text-sm bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors"
        >
          Применить
        </button>
        {availableFilters.price_range && (
          <p className="mt-1 text-xs text-gray-500">
            {Math.floor(availableFilters.price_range.min)} — {Math.ceil(availableFilters.price_range.max)} ₽
          </p>
        )}
      </div>
      
      {/* Только в наличии */}
      <div className="mb-5">
        <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
          <input
            type="checkbox"
            checked={filters.in_stock === 'true'}
            onChange={(e) => onFilterChange('in_stock', e.target.checked ? 'true' : '')}
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
          />
          <span className="ml-2 text-gray-700">Только в наличии</span>
        </label>
      </div>

      {/* Со скидкой */}
      <div className="mb-5">
        <label className="flex items-center cursor-pointer hover:text-accent-600 transition-colors">
          <input
            type="checkbox"
            checked={filters.has_discount === 'true'}
            onChange={(e) => onFilterChange('has_discount', e.target.checked ? 'true' : '')}
            className="w-4 h-4 text-accent-600 focus:ring-accent-600 rounded"
          />
          <span className="ml-2 text-gray-700">🔥 Со скидкой</span>
        </label>
      </div>

      {/* Рейтинг */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Минимальный рейтинг
        </label>
        <select
          value={filters.min_rating}
          onChange={(e) => onFilterChange('min_rating', e.target.value)}
          className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm bg-white focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Любой рейтинг</option>
          <option value="4">⭐⭐⭐⭐ и выше</option>
          <option value="3">⭐⭐⭐ и выше</option>
          <option value="2">⭐⭐ и выше</option>
          <option value="1">⭐ и выше</option>
        </select>
      </div>

      {/* Популярность */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Количество заказов
        </label>
        <select
          value={filters.min_orders}
          onChange={(e) => onFilterChange('min_orders', e.target.value)}
          className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm bg-white focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Любая популярность</option>
          <option value="100">100+ заказов</option>
          <option value="50">50+ заказов</option>
          <option value="20">20+ заказов</option>
          <option value="10">10+ заказов</option>
          <option value="5">5+ заказов</option>
        </select>
      </div>

      {/* Сортировка */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Сортировка
        </label>
        <select
          value={filters.sort_by}
          onChange={(e) => onFilterChange('sort_by', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">По умолчанию</option>
          <option value="discount">Со скидкой 🔥</option>
          <option value="price_asc">Цена: по возрастанию</option>
          <option value="price_desc">Цена: по убыванию</option>
          <option value="rating">По рейтингу</option>
          <option value="popularity">По популярности</option>
        </select>
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
  productCount = 0,
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
        <ShopFilters
          filters={filters}
          availableFilters={availableFilters}
          onChange={onFilterChange}
          onPriceApply={onPriceApply}
          onReset={onReset}
          isLoading={isLoading}
          productCount={productCount}
          largeButtons
          className="border-0 shadow-none flex-1 min-h-0"
        />
      </div>
    </Modal>
  )
})

export { FilterSidebar, MobileFiltersModal }
