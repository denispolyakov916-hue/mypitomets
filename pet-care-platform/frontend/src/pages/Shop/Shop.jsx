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

/**
 * Компонент боковой панели фильтров (мемоизированный)
 */
const FilterSidebar = memo(function FilterSidebar({ filters, availableFilters, onFilterChange, onReset, isLoading }) {
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
    filters.subcategory || filters.vendor || filters.min_price || 
    filters.max_price || filters.in_stock || filters.has_discount || filters.search
  
  return (
    <div
      ref={sidebarRef}
      className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5 overflow-y-auto transition-opacity duration-200 ${isLoading ? 'opacity-70' : 'opacity-100'}`}
      style={{
        overscrollBehavior: 'contain',
        height: 'calc(100vh - 6rem)'
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Фильтры</h3>
        <button
          onClick={onReset}
          disabled={!hasActiveFilters}
          className={`text-sm transition-colors ${
            hasActiveFilters
              ? 'text-purple-600 hover:text-purple-700'
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          Очистить фильтры
        </button>
      </div>
      
      {/* Персональные подборки для питомцев */}
      {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
        <div className="mb-5 pb-5 border-b border-purple-100">
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-purple-600">⭐</span>
            Персональные подборки
          </label>
          <p className="text-xs text-purple-400 mb-3">
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
                      ? 'bg-purple-50 border border-purple-200'
                      : 'hover:bg-purple-25'
                  }`}
                >
                  <input
                    type="radio"
                    name="pet_id"
                    value={pet.id}
                    checked={isSelected}
                    onChange={(e) => onFilterChange('pet_id', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className={`ml-2 text-sm ${
                    isSelected
                      ? 'text-purple-700 font-medium'
                      : 'text-gray-700 group-hover:text-purple-600'
                  }`}>
                    {pet.name} <span className="text-purple-400">({pet.species_label})</span>
                  </span>
                </label>
              )
            })}
            {filters.pet_id && (
              <button
                onClick={() => onFilterChange('pet_id', '')}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-2 transition-colors"
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
            <label key={opt.value} className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
              <input
                type="radio"
                name="animal"
                value={opt.value}
                checked={filters.animal === opt.value}
                onChange={(e) => onFilterChange('animal', e.target.value)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
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
      
      {/* Категория */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Категория
        </label>
        <div className="space-y-2">
          {availableFilters.categories?.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
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
          ))}
          {filters.category && (
            <button
              onClick={() => onFilterChange('category', '')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Все категории
            </button>
          )}
        </div>
      </div>
      
      {/* Подкатегория */}
      {availableFilters.subcategories?.length > 0 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Подкатегория
          </label>
          <select
            value={filters.subcategory || ''}
            onChange={(e) => onFilterChange('subcategory', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Все</option>
            {availableFilters.subcategories.map(sub => (
              <option key={sub.subcategory} value={sub.subcategory}>
                {sub.subcategory} ({sub.count})
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Бренд */}
      {availableFilters.vendors?.length > 0 && (
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Бренд
          </label>
          <select
            value={filters.vendor || ''}
            onChange={(e) => onFilterChange('vendor', e.target.value)}
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
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
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
          />
          <span className="text-purple-400">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
          />
        </div>
        <button
          onClick={handlePriceApply}
          className="mt-2 w-full py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
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
        <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
          <input
            type="checkbox"
            checked={filters.in_stock === 'true'}
            onChange={(e) => onFilterChange('in_stock', e.target.checked ? 'true' : '')}
            className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
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
          className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
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
          className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
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
  const { addItem } = useCartStore()
  const { success } = useToastStore()
  
  // Поисковая строка (локальное состояние для контролируемого ввода)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  
  // Фильтры из URL
  const filters = useMemo(() => ({
    animal: searchParams.get('animal') || '',
    pet_id: searchParams.get('pet_id') || '',
    category: searchParams.get('category') || '',
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
      // Для фильтров используем debouncing
      fetchProducts(filters, page === 1 ? 300 : 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]) // Зависимость только от сериализованных фильтров
  
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

    const result = await addItem(product.id, quantity)
    if (result) {
      const itemText = quantity === 1 ? 'Товар' : `${quantity} товара`
      success(`${itemText} добавлен${quantity > 1 ? 'ы' : ''} в корзину.`, 3000)
      return true
    }
    return false
  }, [isAuthenticated, navigate, addItem, success])
  
  // Определяем, есть ли активный выбор питомца
  const selectedPet = useMemo(() => {
    if (filters.pet_id && availableFilters.user_pets) {
      return availableFilters.user_pets.find(p => p.id === filters.pet_id)
    }
    return null
  }, [filters.pet_id, availableFilters.user_pets])
  
  // Индикатор фоновой загрузки
  const showRefetchIndicator = isRefetching && !isLoading
  
  return (
    <div className="animate-fadeIn relative max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      {/* Индикатор фоновой загрузки */}
      {showRefetchIndicator && (
        <div className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2 shadow-lg">
          <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          Обновление...
        </div>
      )}
      
      {/* Заголовок и поиск */}
      <div className="mb-6">
        <h1 className="page-title mb-4 lg:ml-80">Магазин товаров для питомцев</h1>

        {/* Поиск */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl lg:ml-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="flex-1 px-4 py-2 border border-purple-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary px-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50"
          >
            Найти
          </button>
        </form>
      </div>

      <div className="flex gap-6">
        {/* Боковая панель с фильтрами */}
        <aside className="w-64 flex-shrink-0 hidden lg:block fixed left-4 top-24 z-10">
          <FilterSidebar
            filters={filters}
            availableFilters={availableFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            isLoading={isLoading}
          />
        </aside>
        
        {/* Основной контент */}
        <main className="flex-1 min-w-0 animate-fadeIn lg:pl-72">
          {/* Мобильные фильтры */}
          <div className="lg:hidden mb-4">
            <div className="mb-3">
              <button
                onClick={handleReset}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  (filters.animal || filters.pet_id || filters.category || filters.subcategory || filters.vendor || filters.min_price || filters.max_price || filters.in_stock || filters.has_discount || filters.search)
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                🧹 Очистить фильтры
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 bg-white/50 backdrop-blur-sm rounded-lg p-2">
              {/* Персональные подборки для питомцев */}
              {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
                <select
                  value={filters.pet_id}
                  onChange={(e) => handleFilterChange('pet_id', e.target.value)}
                  className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Все товары</option>
                  {availableFilters.user_pets
                    .filter(pet => ['dog', 'cat'].includes(pet.species))
                    .map(pet => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.species_label})
                      </option>
                    ))}
                </select>
              )}
              <select
                value={filters.animal}
                onChange={(e) => handleFilterChange('animal', e.target.value)}
                className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Все животные</option>
                {availableFilters.animals?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Все категории</option>
                {availableFilters.categories?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
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
              
              {/* Счётчик товаров */}
              {!isLoading && (
                <p className="text-purple-600 mb-4 font-medium">
                  Найдено товаров: {pagination?.total || products.length}
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
