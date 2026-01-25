/**
 * Оптимизированный компонент страницы магазина
 * 
 * Каталог товаров с расширенной фильтрацией.
 * 
 * Оптимизации:
 * - Кэширование данных с SWR-like стратегией
 * - Debouncing фильтров для уменьшения запросов
 * - Skeleton loading для улучшения perceived performance
 * - Prefetching следующей страницы
 * - Мгновенная навигация между закэшированными страницами
 * - Оптимизация изображений с lazy loading
 */

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { useProducts } from '../../hooks/useProducts'
import ProductCard from '../../components/ProductCard'
import { ProductGridSkeleton } from '../../components/ProductCardSkeleton'
import Modal from '../../components/ui/Modal'

/**
 * Компонент боковой панели фильтров (мемоизированный)
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
  
  // Состояние раскрытых категорий
  const [expandedCategories, setExpandedCategories] = useState(new Set())
  
  // Синхронизация priceRange с filters
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

  // Проверка активных фильтров для кнопки сброса
  const hasActiveFilters = filters.animal || filters.pet_id || filters.category || 
    filters.category_slug || filters.subcategory || filters.vendor || filters.min_price || 
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
            // Группируем Лакомства и Витамины под Корма
            const categories = availableFilters.hierarchical_categories || []
            const treatsCategory = categories.find(c => c.slug === 'treats' || c.name?.includes('Лакомства'))
            const vitaminsCategory = categories.find(c => c.slug === 'vitamins' || c.name?.includes('Витамины'))
            
            // Создаём модифицированный список категорий
            const modifiedCategories = categories
              .filter(c => {
                // Исключаем отдельные категории Лакомства и Витамины - они будут в Корма
                const isTreats = c.slug === 'treats' || c.name?.includes('Лакомства')
                const isVitamins = c.slug === 'vitamins' || c.name?.includes('Витамины')
                return !isTreats && !isVitamins
              })
              .map(category => {
                // Для категории Корма добавляем Лакомства и Витамины как подкатегории
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
                          <span className={`ml-1 text-xs ${isSubSelected ? 'text-purple-200' : 'text-gray-400'}`}>
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
          
          {/* Fallback на legacy категории */}
          {(!availableFilters.hierarchical_categories || availableFilters.hierarchical_categories.length === 0) && 
            availableFilters.categories?.map(opt => (
              <label key={opt.value} className="flex items-center cursor-pointer hover:text-purple-600 transition-colors p-2">
                <input
                  type="radio"
                  name="category"
                  value={opt.value}
                  checked={filters.category === opt.value}
                  onChange={(e) => onFilterChange('category', e.target.value)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-gray-700">{opt.label}</span>
              </label>
            ))
          }
          
          {/* Сброс категории */}
          {(filters.category || filters.category_slug) && (
            <button
              onClick={() => {
                onFilterChange('category', '')
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
      
      {/* Бренд */}
      {availableFilters.vendors?.length > 0 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Бренд
          </label>
          <select
            value={filters.vendor || ''}
            onChange={(e) => onFilterChange('vendor', e.target.value)}
            className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
          >
            <option value="">Все бренды</option>
            {availableFilters.vendors.map(v => (
              <option key={v.vendor} value={v.vendor}>
                {v.vendor} ({v.count})
              </option>
            ))}
          </select>
        </div>
      )}
      
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
        <label className="flex items-center cursor-pointer hover:text-orange-600 transition-colors">
          <input
            type="checkbox"
            checked={filters.has_discount === 'true'}
            onChange={(e) => onFilterChange('has_discount', e.target.checked ? 'true' : '')}
            className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
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
  onReset,
  isLoading,
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Настройте подборку под вашего питомца
          </p>
          <button
            onClick={onReset}
            disabled={isLoading}
            className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            Сбросить
          </button>
        </div>

        <FilterSidebar
          filters={filters}
          availableFilters={availableFilters}
          onFilterChange={(name, value) => onFilterChange(name, value)}
          onReset={onReset}
          isLoading={isLoading}
          disableInternalScroll={true}
          hideHeader={true}
        />
      </div>
    </Modal>
  )
})

/**
 * Чипы активных фильтров (витрина)
 */
const ActiveFilterChips = memo(function ActiveFilterChips({ filters, availableFilters, onRemove }) {
  const chips = []

  // Поиск
  if (filters.search) chips.push({ key: 'search', label: `Поиск: ${filters.search}` })

  // Животное
  if (filters.animal) {
    const animalLabel = availableFilters.animals?.find(a => a.value === filters.animal)?.label
    chips.push({ key: 'animal', label: animalLabel ? `Для: ${animalLabel}` : `Для: ${filters.animal}` })
  }

  // Питомец
  if (filters.pet_id) {
    const petLabel = availableFilters.user_pets?.find(p => String(p.id) === String(filters.pet_id))?.name
    chips.push({ key: 'pet_id', label: petLabel ? `Питомец: ${petLabel}` : 'Питомец' })
  }

  // Категория (slug)
  if (filters.category_slug) {
    const flat = (availableFilters.hierarchical_categories || [])
      .flatMap(c => [c, ...(c.children || [])])
    const catLabel = flat.find(c => c.slug === filters.category_slug)?.name
    chips.push({ key: 'category_slug', label: catLabel ? `Категория: ${catLabel}` : 'Категория' })
  } else if (filters.category) {
    const legacyLabel = availableFilters.categories?.find(c => c.value === filters.category)?.label
    chips.push({ key: 'category', label: legacyLabel ? `Категория: ${legacyLabel}` : 'Категория' })
  }

  // Бренд
  if (filters.vendor) chips.push({ key: 'vendor', label: `Бренд: ${filters.vendor}` })

  // Цена
  if (filters.min_price || filters.max_price) {
    const from = filters.min_price ? `от ${filters.min_price}` : 'от …'
    const to = filters.max_price ? `до ${filters.max_price}` : 'до …'
    chips.push({ key: 'price', label: `Цена: ${from} ${to}` })
  }

  // Наличие / скидки
  if (filters.in_stock === 'true') chips.push({ key: 'in_stock', label: 'В наличии' })
  if (filters.has_discount === 'true') chips.push({ key: 'has_discount', label: 'Со скидкой' })

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
 * Компонент пагинации (мемоизированный)
 */
const Pagination = memo(function Pagination({ pagination, onPageChange, isLoading }) {
  if (!pagination || pagination.total_pages <= 1) return null
  
  const { page, total_pages } = pagination
  
  const getPageNumbers = () => {
    const pages = []
    const showPages = 5
    let start = Math.max(1, page - Math.floor(showPages / 2))
    let end = Math.min(total_pages, start + showPages - 1)
    
    if (end - start < showPages - 1) {
      start = Math.max(1, end - showPages + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }
  
  return (
    <div className={`flex justify-center items-center gap-1 mt-8 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-purple-100 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || isLoading}
        className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        ←
      </button>

      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          disabled={isLoading}
          className={`px-3 py-2 rounded-lg transition-all duration-200 ${
            num === page
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
              : 'bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:bg-purple-50'
          }`}
        >
          {num}
        </button>
      ))}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages || isLoading}
        className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        →
      </button>
    </div>
  )
})

/**
 * Оптимизированная сетка товаров
 */
const ProductGrid = memo(function ProductGrid({ products, onAddToCart, isLoading }) {
  if (isLoading && products.length === 0) {
    return <ProductGridSkeleton count={20} />
  }
  
  return (
    <div className={`grid responsive-grid gap-4 transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-scaleIn"
          style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
        >
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
          />
        </div>
      ))}
    </div>
  )
})

/**
 * Главный компонент страницы магазина
 */
function Shop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const { addItem, loadCart } = useCartStore()
  const { success, error: showError } = useToastStore()
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const isFirstProductsLoadRef = useRef(true)
  
  // Поисковая строка (локальное состояние для контролируемого ввода)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  
  // Фильтры из URL
  const filters = useMemo(() => ({
    animal: searchParams.get('animal') || '',
    pet_id: searchParams.get('pet_id') || '',
    category: searchParams.get('category') || '',
    category_slug: searchParams.get('category_slug') || '',  // Новый фильтр для иерархических категорий
    subcategory: searchParams.get('subcategory') || '',
    vendor: searchParams.get('vendor') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    in_stock: searchParams.get('in_stock') || '',
    has_discount: searchParams.get('has_discount') || '',
    min_rating: searchParams.get('min_rating') || '',
    min_orders: searchParams.get('min_orders') || '',
    sort_by: searchParams.get('sort_by') || '',
    search: searchParams.get('search') || '',
    page: searchParams.get('page') || '1',
  }), [searchParams])
  
  // Используем оптимизированный хук для работы с продуктами
  const {
    products,
    pagination,
    availableFilters,
    isLoading,
    isRefetching,
    error,
    fetchProducts,
    fetchImmediate,
    isCached
  } = useProducts(filters)
  
  /**
   * Обновление фильтра с debouncing
   */
  const handleFilterChange = useCallback((name, value) => {
    const newParams = new URLSearchParams(searchParams)
    
    if (value) {
      newParams.set(name, value)
    } else {
      newParams.delete(name)
    }
    
    // Сбрасываем страницу при изменении фильтров (кроме page)
    if (name !== 'page') {
      newParams.set('page', '1')
    }
    
    // Сбрасываем подкатегорию при смене категории или животного
    if (name === 'category' || name === 'animal') {
      newParams.delete('subcategory')
    }
    
    // При выборе питомца сбрасываем фильтр по животному
    if (name === 'pet_id') {
      newParams.delete('animal')
    }
    
    // При выборе животного сбрасываем фильтр по питомцу
    if (name === 'animal') {
      newParams.delete('pet_id')
    }
    
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  /**
   * Сброс всех фильтров
   */
  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams())
    setSearchQuery('')
  }, [setSearchParams])
  
  /**
   * Поиск
   */
  const handleSearch = useCallback((e) => {
    e.preventDefault()
    handleFilterChange('search', searchQuery)
  }, [searchQuery, handleFilterChange])
  
  /**
   * Смена страницы (мгновенная, без debounce)
   */
  const handlePageChange = useCallback((page) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', String(page))
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  /**
   * Эффект загрузки товаров при изменении фильтров
   * ВАЖНО: Зависимости только от filters (сериализованный ключ), чтобы избежать бесконечных циклов
   */
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])
  
  useEffect(() => {
    const page = parseInt(filters.page, 10)
    
    // Для смены страницы используем мгновенную загрузку (если закэшировано)
    if (isCached(filters)) {
      fetchImmediate(filters)
    } else {
      // Для фильтров используем debouncing, но НЕ тормозим первый рендер страницы
      const isFirstLoad = isFirstProductsLoadRef.current
      const delay = isFirstLoad ? 0 : (page === 1 ? 300 : 0)
      fetchProducts(filters, delay)
      if (isFirstLoad) isFirstProductsLoadRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]) // Зависимость только от сериализованных фильтров

  /**
   * Гидрация корзины для карточек (после refresh страницы)
   * Нужно, чтобы `ProductCard` мог корректно показывать "В корзине" и счётчик.
   */
  useEffect(() => {
    if (!isAuthenticated) return
    // cartStore сам защищён от дублей/частых запросов
    loadCart(false)
  }, [isAuthenticated, loadCart])
  
  /**
   * Обработчик добавления в корзину
   */
  const handleAddToCart = useCallback(async (product, quantity = 1) => {
    if (!isAuthenticated) {
      if (confirm('Для добавления в корзину необходимо войти в аккаунт. Перейти на страницу входа?')) {
        navigate('/login', { state: { from: { pathname: '/shop' } } })
      }
      return false
    }

    try {
      const result = await addItem(product.id, quantity)
      if (result) {
        const itemText = quantity === 1 ? 'Товар' : `${quantity} товара`
        success(`${itemText} добавлен${quantity > 1 ? 'ы' : ''} в корзину.`, 3000)
        return true
      } else {
        showError('Не удалось добавить товар в корзину. Попробуйте ещё раз.', 5000)
        return false
      }
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
      showError('Произошла ошибка при добавлении товара.', 5000)
      return false
    }
  }, [isAuthenticated, navigate, addItem, success, showError])
  
  // Определяем, есть ли активный выбор питомца
  const selectedPet = useMemo(() => {
    if (filters.pet_id && availableFilters.user_pets) {
      return availableFilters.user_pets.find(p => p.id === filters.pet_id)
    }
    return null
  }, [filters.pet_id, availableFilters.user_pets])
  
  // Индикатор фоновой загрузки
  const showRefetchIndicator = isRefetching && !isLoading

  const handleRemoveChip = useCallback((chipKey) => {
    const newParams = new URLSearchParams(searchParams)

    const clear = (key) => newParams.delete(key)

    if (chipKey === 'price') {
      clear('min_price')
      clear('max_price')
    } else {
      clear(chipKey)
    }

    // Любое изменение фильтров сбрасывает страницу
    newParams.set('page', '1')

    // При смене категории сбрасываем подкатегорию
    if (chipKey === 'category' || chipKey === 'category_slug') {
      clear('subcategory')
    }

    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  return (
    <div className="animate-fadeIn page-container-with-sidebar">
      {/* Индикатор фоновой загрузки */}
      {showRefetchIndicator && (
        <div className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2 shadow-lg">
          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          Обновление...
        </div>
      )}
      
      {/* Hero + toolbar */}
      <div className="mb-6">
        <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                  Магазин товаров для питомцев
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Подбор по питомцу, бренду и цене. Сохраняйте избранное и собирайте корзину в пару кликов.
                </p>
              </div>

              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-primary-200 text-primary-700 hover:bg-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 019 17V12.414L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Фильтры
              </button>
            </div>

            {/* Search + sort */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                      Найдено: <span className="font-semibold text-gray-900">{pagination?.total || products.length}</span>
                    </span>
                  )}
                </div>
                <select
                  value={filters.sort_by || ''}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full sm:w-auto px-3 py-2.5 border border-primary-200 rounded-xl text-sm bg-white/90 backdrop-blur-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Сортировка: по умолчанию</option>
                  <option value="price_asc">Цена: по возрастанию</option>
                  <option value="price_desc">Цена: по убыванию</option>
                  <option value="rating">По рейтингу</option>
                  <option value="popularity">По популярности</option>
                </select>
              </div>
            </div>

            {/* Active filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <ActiveFilterChips
                filters={filters}
                availableFilters={availableFilters}
                onRemove={handleRemoveChip}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
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

      <div className="flex gap-6">
        {/* Боковая панель с фильтрами - внутри контейнера */}
        <aside className="w-72 flex-shrink-0 hidden lg:block sticky top-24 self-start">
          <FilterSidebar
            filters={filters}
            availableFilters={availableFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            isLoading={isLoading}
          />
        </aside>
        
        {/* Основной контент */}
        <main className="flex-1 min-w-0 animate-fadeIn">
          {/* Мобильные фильтры (полный набор) */}
          <MobileFiltersModal
            isOpen={isMobileFiltersOpen}
            onClose={() => setIsMobileFiltersOpen(false)}
            filters={filters}
            availableFilters={availableFilters}
            onFilterChange={handleFilterChange}
            onReset={() => {
              handleReset()
              setIsMobileFiltersOpen(false)
            }}
            isLoading={isLoading}
          />
          
          {/* Состояние ошибки */}
          {error && !isLoading && (
            <div className="card text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={() => fetchImmediate(filters)} className="btn-primary">
                Попробовать снова
              </button>
            </div>
          )}
          
          {/* Пустое состояние */}
          {!isLoading && !error && products.length === 0 && (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Товары не найдены
              </h2>
              <p className="text-gray-600 mb-4">
                Попробуйте изменить параметры фильтра
              </p>
              <button onClick={handleReset} className="btn-primary">
                Сбросить фильтры
              </button>
            </div>
          )}
          
          {/* Результаты */}
          {(products.length > 0 || isLoading) && !error && (
            <>
              {/* Информация о выбранном питомце */}
              {selectedPet && (
                <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <p className="text-sm text-primary-800">
                    <span className="font-medium">⭐ Персональная подборка для {selectedPet.name}</span>
                    <span className="text-primary-600 ml-2">({selectedPet.species_label})</span>
                  </p>
                </div>
              )}
              
              {/* Счётчик товаров (дублируем на очень маленьких экранах) */}
              {!isLoading && (
                <p className="text-primary-700 mb-4 font-medium sm:hidden">
                  Найдено: {pagination?.total || products.length}
                </p>
              )}
              
              {/* Сетка товаров (с skeleton при загрузке) */}
              <ProductGrid
                products={products}
                onAddToCart={handleAddToCart}
                isLoading={isLoading && products.length === 0}
              />
              
              {/* Пагинация */}
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                isLoading={isLoading}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Shop
