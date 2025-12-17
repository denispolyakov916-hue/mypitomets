/**
 * Компонент страницы магазина
 * 
 * Каталог товаров с расширенной фильтрацией.
 * Функции:
 * - Сетка отображения товаров
 * - Боковая панель с фильтрами
 * - Фильтр по животному, категории, подкатегории
 * - Фильтр по бренду и цене
 * - Поиск по названию
 * - Пагинация
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getProducts } from '../../api/shop'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import ProductCard from '../../components/ProductCard'
import { PageLoader } from '../../components/Loader'

/**
 * Компонент боковой панели фильтров
 */
function FilterSidebar({ filters, availableFilters, onFilterChange, onReset }) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || '',
    max: filters.max_price || ''
  })
  
  const handlePriceApply = () => {
    onFilterChange('min_price', priceRange.min)
    onFilterChange('max_price', priceRange.max)
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Фильтры</h3>
        {(filters.animal || filters.pet_id || filters.category || filters.subcategory || filters.vendor || filters.min_price || filters.max_price) && (
          <button
            onClick={onReset}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Сбросить
          </button>
        )}
      </div>
      
      {/* Персональные подборки для питомцев */}
      {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
        <div className="mb-5 pb-5 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <span className="text-primary-600">⭐</span>
            Персональные подборки
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Товары специально для ваших питомцев
          </p>
          <div className="space-y-2">
            {availableFilters.user_pets.map(pet => {
              // Показываем только питомцев, для которых есть товары (dog, cat)
              const hasProducts = ['dog', 'cat'].includes(pet.species)
              if (!hasProducts) return null
              
              const isSelected = filters.pet_id === pet.id
              
              return (
                <label 
                  key={pet.id} 
                  className={`flex items-center cursor-pointer group p-2 rounded-lg transition-colors ${
                    isSelected 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'hover:bg-gray-50'
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
                    {pet.name} <span className="text-gray-500">({pet.species_label})</span>
                  </span>
                </label>
              )
            })}
            {filters.pet_id && (
              <button
                onClick={() => onFilterChange('pet_id', '')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
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
            <label key={opt.value} className="flex items-center cursor-pointer">
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
      
      {/* Категория */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Категория
        </label>
        <div className="space-y-2">
          {availableFilters.categories?.map(opt => (
            <label key={opt.value} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="category"
                value={opt.value}
                checked={filters.category === opt.value}
                onChange={(e) => onFilterChange('category', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
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
      
      {/* Подкатегория (если есть) */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="до"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={handlePriceApply}
          className="mt-2 w-full py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filters.in_stock === 'true'}
            onChange={(e) => onFilterChange('in_stock', e.target.checked ? 'true' : '')}
            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
          />
          <span className="ml-2 text-gray-700">Только в наличии</span>
        </label>
      </div>
    </div>
  )
}

/**
 * Компонент пагинации
 */
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.total_pages <= 1) return null
  
  const { page, total_pages } = pagination
  
  // Генерация номеров страниц
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
    <div className="flex justify-center items-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ←
      </button>
      
      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={`px-3 py-2 rounded-lg ${
            num === page
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {num}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === total_pages}
        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        →
      </button>
    </div>
  )
}

/**
 * Главный компонент страницы магазина
 */
function Shop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  
  // Состояние
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [availableFilters, setAvailableFilters] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  
  // Фильтры из URL
  const filters = {
    animal: searchParams.get('animal') || '',
    pet_id: searchParams.get('pet_id') || '',
    category: searchParams.get('category') || '',
    subcategory: searchParams.get('subcategory') || '',
    vendor: searchParams.get('vendor') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    in_stock: searchParams.get('in_stock') || '',
    search: searchParams.get('search') || '',
    page: searchParams.get('page') || '1',
  }
  
  /**
   * Обновление фильтра
   */
  const handleFilterChange = useCallback((name, value) => {
    const newParams = new URLSearchParams(searchParams)
    
    if (value) {
      newParams.set(name, value)
    } else {
      newParams.delete(name)
    }
    
    // Сбрасываем страницу при изменении фильтров
    if (name !== 'page') {
      newParams.set('page', '1')
    }
    
    // Сбрасываем подкатегорию при смене категории или животного
    if (name === 'category' || name === 'animal') {
      newParams.delete('subcategory')
    }
    
    // При выборе питомца сбрасываем фильтр по животному (будет установлен автоматически)
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
   * Загрузка товаров
   */
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await getProducts(filters)
        setProducts(response.products || [])
        setPagination(response.pagination)
        setAvailableFilters(response.filters || {})
      } catch (err) {
        setError(err.message || 'Не удалось загрузить товары')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProducts()
  }, [searchParams])
  
  /**
   * Обработчик добавления в корзину
   */
  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      if (confirm('Для добавления в корзину необходимо войти в аккаунт. Перейти на страницу входа?')) {
        navigate('/login', { state: { from: { pathname: '/shop' } } })
      }
      return
    }
    
    const success = await addItem(product.id)
    if (success) {
      alert('Товар добавлен в корзину')
    }
  }
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок и поиск */}
      <div className="mb-6">
        <h1 className="page-title mb-4">Магазин товаров для питомцев</h1>
        
        {/* Поиск */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
          <button type="submit" className="btn-primary px-6">
            Найти
          </button>
        </form>
      </div>
      
      <div className="flex gap-6">
        {/* Боковая панель с фильтрами */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <FilterSidebar
            filters={filters}
            availableFilters={availableFilters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </aside>
        
        {/* Основной контент */}
        <main className="flex-1 min-w-0">
          {/* Мобильные фильтры */}
          <div className="lg:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Персональные подборки для питомцев */}
              {availableFilters.user_pets && availableFilters.user_pets.length > 0 && (
                <select
                  value={filters.pet_id}
                  onChange={(e) => handleFilterChange('pet_id', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Все животные</option>
                {availableFilters.animals?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Все категории</option>
                {availableFilters.categories?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Состояние загрузки */}
          {isLoading && <PageLoader />}
          
          {/* Состояние ошибки */}
          {error && !isLoading && (
            <div className="card text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="btn-primary">
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
          {!isLoading && !error && products.length > 0 && (
            <>
              {/* Информация о выбранном питомце */}
              {filters.pet_id && availableFilters.user_pets && (
                (() => {
                  const selectedPet = availableFilters.user_pets.find(p => p.id === filters.pet_id)
                  return selectedPet ? (
                    <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                      <p className="text-sm text-primary-800">
                        <span className="font-medium">⭐ Персональная подборка для {selectedPet.name}</span>
                        <span className="text-primary-600 ml-2">({selectedPet.species_label})</span>
                      </p>
                    </div>
                  ) : null
                })()
              )}
              
              <p className="text-gray-600 mb-4">
                Найдено товаров: {pagination?.total || products.length}
              </p>
              
              {/* Сетка товаров */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
              
              {/* Пагинация */}
              <Pagination
                pagination={pagination}
                onPageChange={(page) => handleFilterChange('page', String(page))}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Shop
