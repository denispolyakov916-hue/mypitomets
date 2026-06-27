/**
 * Страница магазина
 *
 * Каталог товаров с расширенной фильтрацией, поиском и пагинацией.
 * Данные загружаются через useProducts с SWR-like кэшированием и
 * debouncing фильтров.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { useProducts } from '../../hooks/useProducts'
import { usePets } from '../../hooks/usePets'
import ShopFilters from '../../components/Shop/ShopFilters'
import { ShopHeader, MobileFiltersModal, ProductGrid, Pagination } from './components'
import { BrandButton, BrandCard, BrandEmptyState } from '../../components/brand'
import { SearchX, AlertTriangle, Sparkles } from 'lucide-react'

function Shop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { addItem, loadCart } = useCartStore()
  const { success, error: showError } = useToastStore()
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const isFirstProductsLoadRef = useRef(true)
  const { pets: userPets } = usePets()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  
  const filters = useMemo(() => ({
    animal: searchParams.get('animal') || '',
    pet_id: searchParams.get('pet_id') || '',
    category_code: searchParams.get('category_code') || '',
    category_slug: searchParams.get('category_slug') || '',
    product_group: searchParams.get('product_group') || '',
    age_group: searchParams.get('age_group') || '',
    brand_class: searchParams.get('brand_class') || '',
    brand_id: searchParams.get('brand_id') || '',
    is_grain_free: searchParams.get('is_grain_free') || '',
    is_hypoallergenic: searchParams.get('is_hypoallergenic') || '',
    is_veterinary: searchParams.get('is_veterinary') || '',
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

  const filtersWithPets = useMemo(() => {
    const petsFromFilters = availableFilters?.user_pets || []
    if (userPets.length > 0) {
      return { ...availableFilters, user_pets: userPets }
    }
    return { ...availableFilters, user_pets: petsFromFilters }
  }, [availableFilters, userPets])
  
  const handleFilterChange = useCallback((name, value) => {
    const newParams = new URLSearchParams(searchParams)
    
    if (value) {
      newParams.set(name, value)
    } else {
      newParams.delete(name)
    }
    
    if (name !== 'page') {
      newParams.set('page', '1')
    }
    
    if (name === 'pet_id') {
      newParams.delete('animal')
      newParams.delete('age_group')
    }
    
    if (name === 'animal') {
      newParams.delete('pet_id')
      const ageGroup = newParams.get('age_group')
      if (ageGroup) {
        if (value === 'dog' && ageGroup.includes('kitten')) {
          newParams.set('age_group', 'puppy')
        }
        if (value === 'cat' && ageGroup.includes('puppy')) {
          newParams.set('age_group', 'kitten')
        }
      }
    }

    if (name === 'category_code') {
      newParams.delete('category_slug')
    }
    
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  /** Атомарное обновление нескольких параметров (мобильная шапка магазина) */
  const applyShopNavUpdates = useCallback((updates) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      for (const [name, value] of Object.entries(updates)) {
        if (value === '' || value === null || value === undefined) p.delete(name)
        else p.set(name, String(value))
      }
      if (!('page' in updates)) p.set('page', '1')
      if ('category_code' in updates) p.delete('category_slug')

      const petIdAfter = p.get('pet_id')
      if (petIdAfter) {
        p.delete('animal')
        p.delete('age_group')
      } else {
        if ('animal' in updates && updates.animal) p.delete('pet_id')
        const animal = p.get('animal')
        const ageGroup = p.get('age_group')
        if (animal === 'dog' && ageGroup === 'kitten') p.set('age_group', 'puppy')
        if (animal === 'cat' && ageGroup === 'puppy') p.set('age_group', 'kitten')
      }
      return p
    })
  }, [setSearchParams])

  const handlePriceApply = useCallback((min, max) => {
    const newParams = new URLSearchParams(searchParams)
    if (min) {
      newParams.set('min_price', min)
    } else {
      newParams.delete('min_price')
    }
    if (max) {
      newParams.set('max_price', max)
    } else {
      newParams.delete('max_price')
    }
    newParams.set('page', '1')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams())
    setSearchQuery('')
  }, [setSearchParams])
  
  const handleSearch = useCallback((e) => {
    e.preventDefault()
    handleFilterChange('search', searchQuery)
  }, [searchQuery, handleFilterChange])
  
  const handlePageChange = useCallback((page) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', String(page))
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])
  
  useEffect(() => {
    const page = parseInt(filters.page, 10)
    
    if (isCached(filters)) {
      fetchImmediate(filters)
    } else {
      const isFirstLoad = isFirstProductsLoadRef.current
      const delay = isFirstLoad ? 0 : (page === 1 ? 300 : 0)
      fetchProducts(filters, delay)
      if (isFirstLoad) isFirstProductsLoadRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => {
    if (!isAuthenticated) return
    loadCart(false)
  }, [isAuthenticated, loadCart])
  
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
  
  const selectedPet = useMemo(() => {
    if (filters.pet_id && availableFilters.user_pets) {
      return availableFilters.user_pets.find(p => p.id === filters.pet_id)
    }
    return null
  }, [filters.pet_id, availableFilters.user_pets])
  
  const showRefetchIndicator = isRefetching && !isLoading

  const handleRemoveChip = useCallback((chipKey) => {
    const newParams = new URLSearchParams(searchParams)

    const clear = (key) => newParams.delete(key)

    if (chipKey === 'price') {
      clear('min_price')
      clear('max_price')
    } else {
      clear(chipKey)
      if (chipKey === 'category_code') {
        clear('category_slug')
      }
    }

    newParams.set('page', '1')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])
  
  return (
    <div className="animate-fadeIn page-container-with-sidebar flex flex-col min-h-[calc(100vh-4rem)] bg-milk">
      {/* Брендовый герой магазина */}
      <section className="mb-8 overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-milk to-violet-50 px-6 py-8 md:px-10 md:py-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Магазин заботы
          </span>
          <h1 className="mt-3 font-heading font-bold text-3xl md:text-4xl leading-tight text-primary-800">
            Товары для заботы о питомце
          </h1>
          <p className="mt-3 text-base md:text-lg text-primary-600">
            Подберём питание и уход под вашего питомца — без лишних трат и лишнего шума.
          </p>
          <div className="mt-6">
            <BrandButton as={Link} to="/food-recommendation" variant="primary" leftIcon={<Sparkles className="h-5 w-5" />}>
              Подобрать корм по питомцу
            </BrandButton>
          </div>
        </div>
      </section>

      {showRefetchIndicator && (
        <div className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2 shadow-lg">
          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          Обновление...
        </div>
      )}

      <ShopHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
        onCategoryChange={handleFilterChange}
        onShopNavUpdate={applyShopNavUpdates}
        filters={filters}
        availableFilters={filtersWithPets}
        onRemoveChip={handleRemoveChip}
        onReset={handleReset}
        isLoading={isLoading}
        error={error}
        productCount={pagination?.total || products.length}
      />

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Боковая панель с фильтрами — во всю высоту и шире */}
        <aside className="w-72 xl:w-80 flex-shrink-0 hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] min-h-[320px]">
          <ShopFilters
            filters={filters}
            availableFilters={filtersWithPets}
            onChange={handleFilterChange}
            onPriceApply={handlePriceApply}
            onReset={handleReset}
            isLoading={isLoading}
            productCount={pagination?.total ?? 0}
          />
        </aside>
        
        {/* Основной контент */}
        <main className="flex-1 min-w-0 animate-fadeIn">
          <MobileFiltersModal
            isOpen={isMobileFiltersOpen}
            onClose={() => setIsMobileFiltersOpen(false)}
            filters={filters}
            availableFilters={filtersWithPets}
            onFilterChange={handleFilterChange}
            onPriceApply={handlePriceApply}
            onReset={() => {
              handleReset()
              setIsMobileFiltersOpen(false)
            }}
            isLoading={isLoading}
            productCount={pagination?.total ?? 0}
          />
          
          {error && !isLoading && (
            <BrandCard variant="default" padding="lg">
              <BrandEmptyState
                icon={<AlertTriangle className="h-8 w-8" />}
                title="Не удалось загрузить товары"
                description={error}
                action={<BrandButton variant="primary" onClick={() => fetchImmediate(filters)}>Попробовать снова</BrandButton>}
              />
            </BrandCard>
          )}
          
          {!isLoading && !error && products.length === 0 && (
            <BrandCard variant="default" padding="lg">
              <BrandEmptyState
                icon={<SearchX className="h-8 w-8" />}
                title="Ничего не нашлось"
                description="Попробуйте изменить фильтры — подберём подходящее для вашего питомца."
                action={<BrandButton variant="primary" onClick={handleReset}>Сбросить фильтры</BrandButton>}
              />
            </BrandCard>
          )}
          
          {(products.length > 0 || isLoading) && !error && (
            <>
              {selectedPet && (
                <div className="mb-5 px-4 py-3 rounded-2xl bg-primary-50 border border-primary-100">
                  <p className="text-sm text-primary-800">
                    <span className="font-semibold">★ Персональная подборка для {selectedPet.name}</span>
                    <span className="text-primary-500 ml-2">({selectedPet.species_label})</span>
                  </p>
                </div>
              )}

              <ProductGrid
                products={products}
                onAddToCart={handleAddToCart}
                isLoading={isLoading && products.length === 0}
                selectedPet={selectedPet}
              />
              
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
