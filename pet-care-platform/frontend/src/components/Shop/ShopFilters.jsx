/**
 * Modern Shop Filters Component
 * 
 * Comprehensive filter sidebar with:
 * - Animal type selection (dog/cat)
 * - Category tree navigation
 * - Age/Size group filters (for food)
 * - Brand class selection
 * - Special diet toggles
 * - Brand search
 * - Price range
 */

import React, { useState, useEffect, useMemo, memo } from 'react'

// Category icons mapping
const CATEGORY_ICONS = {
  'food': '🍖',
  'питание': '🍖',
  'корм': '🍖',
  'health': '💊',
  'ветаптека': '💊',
  'toilet': '🚽',
  'туалет': '🚽',
  'feeding': '🥣',
  'миски': '🥣',
  'toys': '🎾',
  'игрушки': '🎾',
  'walk': '🎒',
  'амуниция': '🎒',
  'clothing': '👕',
  'одежда': '👕',
  'care': '🧴',
  'уход': '🧴',
  'груминг': '✂️',
  'housing': '🏠',
  'транспорт': '🏠',
  'лакомства': '🦴',
  'витамины': '💪',
  'наполнители': '🧱',
  'когтеточки': '🐾',
}

// Get icon for category by name or slug
const getCategoryIcon = (category) => {
  if (category.icon) return category.icon
  
  const name = (category.name || category.slug || '').toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.includes(key)) return icon
  }
  return '📦'
}

// Brand class colors and labels
const BRAND_CLASS_CONFIG = {
  holistic: { label: 'Холистик', color: 'emerald', emoji: '🌿' },
  super_premium: { label: 'Супер-премиум', color: 'blue', emoji: '⭐' },
  premium: { label: 'Премиум', color: 'amber', emoji: '✨' },
  economy: { label: 'Эконом', color: 'gray', emoji: '💰' },
}

/**
 * Collapsible filter section
 */
const FilterSection = memo(function FilterSection({ 
  title, 
  icon,
  children, 
  defaultOpen = true,
  badge = null,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-gray-800">{title}</span>
          {badge !== null && badge > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[500px] opacity-100 pb-3' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
})

/**
 * Animal Type Filter - Dog/Cat toggle buttons
 */
const AnimalTypeFilter = memo(function AnimalTypeFilter({ value, onChange }) {
  const options = [
    { value: 'dog', label: 'Собаки', icon: '🐕' },
    { value: 'cat', label: 'Кошки', icon: '🐈' },
  ]
  
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium transition-all duration-200 ${
            value === opt.value
              ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="text-xl">{opt.icon}</span>
          <span className="text-sm">{opt.label}</span>
        </button>
      ))}
    </div>
  )
})

/**
 * Category Tree Filter with expand/collapse
 */
const CategoryTreeFilter = memo(function CategoryTreeFilter({ 
  categories, 
  value, 
  onChange,
  productGroups = [],
}) {
  const [expanded, setExpanded] = useState(new Set())
  
  // #region agent log
  // Debug: Log received categories data (Hypothesis A)
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/4f373f70-f463-4309-8a8e-4162185b5f36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShopFilters.jsx:CategoryTreeFilter',message:'Categories data received',data:{categoriesCount:categories?.length||0,firstCategory:categories?.[0],productGroupsCount:productGroups?.length||0,currentValue:value},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  }, [categories, productGroups, value]);
  // #endregion
  
  // Build category tree from hierarchical_categories or product_groups
  const categoryTree = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories
    }
    // Fallback to product_groups
    return productGroups.map(pg => ({
      id: pg.product_group,
      slug: pg.product_group,
      name: pg.product_group,
      product_count: pg.count,
      children: [],
    }))
  }, [categories, productGroups])
  
  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  const renderCategory = (category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expanded.has(category.id)
    const isSelected = value === category.slug
    const icon = getCategoryIcon(category)
    
    return (
      <div key={category.id || category.slug}>
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-all duration-150 ${
            isSelected
              ? 'bg-primary-100 text-primary-800'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4f373f70-f463-4309-8a8e-4162185b5f36',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ShopFilters.jsx:CategoryTreeFilter:onClick',message:'Category clicked',data:{categoryId:category.id,categorySlug:category.slug,categoryName:category.name,hasChildren,isSelected,willSendValue:isSelected?'':category.slug},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
            // #endregion
            if (hasChildren) {
              toggleExpand(category.id)
              // For parent categories, only expand/collapse, don't filter
              // User must click on a child to filter
              return
            }
            onChange(isSelected ? '' : category.slug)
          }}
        >
          <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
          <span className={`flex-1 text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
            {category.name}
          </span>
          {category.product_count > 0 && (
            <span className={`text-xs ${isSelected ? 'text-primary-600' : 'text-gray-400'}`}>
              {category.product_count}
            </span>
          )}
          {hasChildren && (
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(category.id)
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2 border-l-2 border-gray-100">
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
      {categoryTree.map(cat => renderCategory(cat))}
    </div>
  )
})

/**
 * Age Group Filter - Pill buttons
 */
const AgeGroupFilter = memo(function AgeGroupFilter({ value, onChange, options = [] }) {
  const defaultOptions = [
    { value: 'puppy', label: 'Щенок', icon: '🐕' },
    { value: 'kitten', label: 'Котёнок', icon: '🐈' },
    { value: 'adult', label: 'Взрослый', icon: '🦮' },
    { value: 'senior', label: 'Пожилой', icon: '🐕‍🦺' },
  ]
  
  const items = options.length > 0 ? options : defaultOptions
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
            value === opt.value
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
})

/**
 * Size Group Filter - Visual size indicators
 */
const SizeGroupFilter = memo(function SizeGroupFilter({ value, onChange, options = [] }) {
  const defaultOptions = [
    { value: 'mini', label: 'Мини', size: 'w-3 h-3' },
    { value: 'small', label: 'Малый', size: 'w-4 h-4' },
    { value: 'medium', label: 'Средний', size: 'w-5 h-5' },
    { value: 'large', label: 'Крупный', size: 'w-6 h-6' },
    { value: 'giant', label: 'Гигант', size: 'w-7 h-7' },
  ]
  
  const items = options.length > 0 ? options : defaultOptions
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
            value === opt.value
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <div className={`${opt.size || 'w-4 h-4'} rounded-full bg-current opacity-60`} />
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
})

/**
 * Brand Class Filter - Colored badges
 */
const BrandClassFilter = memo(function BrandClassFilter({ value, onChange }) {
  const options = Object.entries(BRAND_CLASS_CONFIG).map(([key, config]) => ({
    value: key,
    ...config,
  }))
  
  const getColorClasses = (colorName, isSelected) => {
    const colors = {
      emerald: isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      blue: isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      amber: isSelected ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      gray: isSelected ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    }
    return colors[colorName] || colors.gray
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
            getColorClasses(opt.color, value === opt.value)
          }`}
        >
          <span>{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
})

/**
 * Special Diet Toggles
 */
const SpecialDietFilters = memo(function SpecialDietFilters({ 
  filters, 
  onChange,
  counts = {},
}) {
  const options = [
    { key: 'is_grain_free', label: 'Беззерновой', icon: '🌾', count: counts.grain_free },
    { key: 'is_hypoallergenic', label: 'Гипоаллергенный', icon: '🛡️', count: counts.hypoallergenic },
    { key: 'is_veterinary', label: 'Ветеринарный', icon: '⚕️', count: counts.veterinary },
  ]
  
  return (
    <div className="space-y-2">
      {options.map(opt => {
        const isActive = filters[opt.key] === 'true'
        return (
          <label
            key={opt.key}
            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
              isActive ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{opt.icon}</span>
              <span className={`text-sm ${isActive ? 'text-primary-800 font-medium' : 'text-gray-700'}`}>
                {opt.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {opt.count > 0 && (
                <span className="text-xs text-gray-400">{opt.count}</span>
              )}
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => onChange(opt.key, e.target.checked ? 'true' : '')}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
})

/**
 * Brand Filter - Searchable dropdown
 */
const BrandFilter = memo(function BrandFilter({ brands = [], value, onChange }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const filteredBrands = useMemo(() => {
    if (!search) return brands.slice(0, 20)
    const searchLower = search.toLowerCase()
    return brands.filter(b => b.name.toLowerCase().includes(searchLower)).slice(0, 20)
  }, [brands, search])
  
  const selectedBrand = brands.find(b => String(b.id) === String(value))
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-primary-300 transition-colors"
      >
        <span className={selectedBrand ? 'text-gray-900' : 'text-gray-500'}>
          {selectedBrand ? selectedBrand.name : 'Все бренды'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск бренда..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${!value ? 'bg-primary-50 text-primary-700' : ''}`}
            >
              Все бренды
            </button>
            {filteredBrands.map(brand => (
              <button
                key={brand.id}
                onClick={() => { onChange(String(brand.id)); setIsOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  String(value) === String(brand.id) ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span>{brand.name}</span>
                <span className="text-xs text-gray-400">{brand.product_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

/**
 * Price Range Filter
 */
const PriceRangeFilter = memo(function PriceRangeFilter({ 
  minPrice, 
  maxPrice, 
  range = { min: 0, max: 100000 },
  onApply,
}) {
  const [localMin, setLocalMin] = useState(minPrice || '')
  const [localMax, setLocalMax] = useState(maxPrice || '')
  
  useEffect(() => {
    setLocalMin(minPrice || '')
    setLocalMax(maxPrice || '')
  }, [minPrice, maxPrice])
  
  const handleApply = () => {
    onApply(localMin, localMax)
  }
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder={`от ${Math.floor(range.min)}`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <span className="text-gray-400">—</span>
        <div className="flex-1">
          <input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder={`до ${Math.ceil(range.max)}`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>
      <button
        onClick={handleApply}
        className="w-full py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
      >
        Применить
      </button>
      {range && (
        <p className="text-xs text-gray-400 text-center">
          {Math.floor(range.min).toLocaleString()} — {Math.ceil(range.max).toLocaleString()} ₽
        </p>
      )}
    </div>
  )
})

/**
 * Additional Filters (in stock, discount)
 */
const AdditionalFilters = memo(function AdditionalFilters({ filters, onChange }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={filters.in_stock === 'true'}
          onChange={(e) => onChange('in_stock', e.target.checked ? 'true' : '')}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">Только в наличии</span>
      </label>
      <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
        <input
          type="checkbox"
          checked={filters.has_discount === 'true'}
          onChange={(e) => onChange('has_discount', e.target.checked ? 'true' : '')}
          className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
        />
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-700">Со скидкой</span>
          <span>🔥</span>
        </div>
      </label>
    </div>
  )
})

/**
 * Main ShopFilters Component
 */
const ShopFilters = memo(function ShopFilters({
  filters,
  availableFilters,
  onChange,
  onReset,
  isLoading = false,
  className = '',
}) {
  // Check if we're in a food-related category
  const isFoodCategory = useMemo(() => {
    const foodRelated = ['food', 'treats', 'vitamins', 'supplements']
    const categorySlug = filters.category_slug || filters.category || ''
    const productGroup = filters.product_group || ''
    return foodRelated.some(f => categorySlug.includes(f) || productGroup.includes(f))
  }, [filters.category_slug, filters.category, filters.product_group])
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.animal) count++
    if (filters.category_slug || filters.category) count++
    if (filters.age_group) count++
    if (filters.size_group) count++
    if (filters.brand_class) count++
    if (filters.brand_id) count++
    if (filters.is_grain_free === 'true') count++
    if (filters.is_hypoallergenic === 'true') count++
    if (filters.is_veterinary === 'true') count++
    if (filters.min_price || filters.max_price) count++
    if (filters.in_stock === 'true') count++
    if (filters.has_discount === 'true') count++
    return count
  }, [filters])
  
  const handlePriceApply = (min, max) => {
    onChange('min_price', min)
    onChange('max_price', max)
  }
  
  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17V12.414L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Фильтры</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={onReset}
          disabled={activeFilterCount === 0}
          className={`text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? 'text-primary-600 hover:text-primary-700'
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          Сбросить
        </button>
      </div>
      
      {/* Filter sections */}
      <div className="p-4 space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin">
        {/* Animal Type */}
        <FilterSection title="Для кого" icon="🐾" defaultOpen={true}>
          <AnimalTypeFilter 
            value={filters.animal || ''} 
            onChange={(val) => onChange('animal', val)} 
          />
        </FilterSection>
        
        {/* Category */}
        <FilterSection 
          title="Категория" 
          icon="📦" 
          defaultOpen={true}
          badge={filters.category_slug || filters.category ? 1 : 0}
        >
          <CategoryTreeFilter
            categories={availableFilters.hierarchical_categories || []}
            productGroups={availableFilters.product_groups || []}
            value={filters.category_slug || filters.category || ''}
            onChange={(val) => onChange('category_slug', val)}
          />
        </FilterSection>
        
        {/* Age Group - show for food categories */}
        {(isFoodCategory || !filters.category_slug) && (
          <FilterSection title="Возраст" icon="📅" defaultOpen={false}>
            <AgeGroupFilter
              value={filters.age_group || ''}
              onChange={(val) => onChange('age_group', val)}
              options={availableFilters.age_groups || []}
            />
          </FilterSection>
        )}
        
        {/* Size Group - show for food categories */}
        {(isFoodCategory || !filters.category_slug) && (
          <FilterSection title="Размер породы" icon="📏" defaultOpen={false}>
            <SizeGroupFilter
              value={filters.size_group || ''}
              onChange={(val) => onChange('size_group', val)}
              options={availableFilters.size_groups || []}
            />
          </FilterSection>
        )}
        
        {/* Brand Class */}
        <FilterSection title="Класс бренда" icon="🏆" defaultOpen={false}>
          <BrandClassFilter
            value={filters.brand_class || ''}
            onChange={(val) => onChange('brand_class', val)}
          />
        </FilterSection>
        
        {/* Special Diets - show for food categories */}
        {(isFoodCategory || !filters.category_slug) && (
          <FilterSection title="Особенности" icon="✨" defaultOpen={false}>
            <SpecialDietFilters
              filters={filters}
              onChange={onChange}
              counts={availableFilters.boolean_filters || {}}
            />
          </FilterSection>
        )}
        
        {/* Brand */}
        <FilterSection title="Бренд" icon="🏷️" defaultOpen={false}>
          <BrandFilter
            brands={availableFilters.brands || []}
            value={filters.brand_id || ''}
            onChange={(val) => onChange('brand_id', val)}
          />
        </FilterSection>
        
        {/* Price Range */}
        <FilterSection title="Цена" icon="💰" defaultOpen={false}>
          <PriceRangeFilter
            minPrice={filters.min_price}
            maxPrice={filters.max_price}
            range={availableFilters.price_range}
            onApply={handlePriceApply}
          />
        </FilterSection>
        
        {/* Additional */}
        <FilterSection title="Дополнительно" icon="⚙️" defaultOpen={false}>
          <AdditionalFilters
            filters={filters}
            onChange={onChange}
          />
        </FilterSection>
      </div>
    </div>
  )
})

export default ShopFilters
