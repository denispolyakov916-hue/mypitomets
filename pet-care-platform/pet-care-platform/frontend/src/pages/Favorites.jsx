/**
 * Страница избранного
 *
 * Отображает избранные товары и курсы пользователя.
 * Позволяет добавлять их в корзину или удалять из избранного.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, Gift } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useFavoritesStore } from '../store/favoritesStore'
import { useShareableWishlistStore } from '../store/shareableWishlistStore'
import { useCartStore } from '../store/cartStore'
import { useToastStore } from '../store/toastStore'
import { getProducts } from '../api/shop'
import { getCourses } from '../api/courses'
import { apiCache } from '../utils/apiCache'
import ProductCard from '../components/ProductCard'
import CourseCard from '../components/CourseCard'
import { PageLoader } from '../components/Loader'
import { EmptyState } from '../components/ui/EmptyState'
import { PuffLottie } from '../components/brand'
import { Alert } from '../components/ui/Alert'
/**
 * Компонент боковой панели фильтров для избранного
 */
function FavoritesFilterSidebar({ filters, onFilterChange, onReset }) {
  const [priceRange, setPriceRange] = useState({
    min: filters.min_price || '',
    max: filters.max_price || ''
  })
  const sidebarRef = useRef(null)

  useEffect(() => {
    const handleWheel = (e) => {
      // Проверяем, находится ли target внутри боковой панели
      if (sidebarRef.current && sidebarRef.current.contains(e.target)) {
        const sidebar = sidebarRef.current
        const isAtTop = sidebar.scrollTop === 0
        const isAtBottom = sidebar.scrollTop + sidebar.clientHeight >= sidebar.scrollHeight

        // Предотвращаем прокрутку страницы только если панель не может прокручиваться дальше
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
          // Панель достигла конца, позволяем прокрутку страницы
          return
        }

        // Панель может прокручиваться, предотвращаем прокрутку страницы
        e.stopPropagation()
      }
    }

    // Добавляем обработчик на document с passive: false для возможности preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const handlePriceApply = () => {
    onFilterChange('min_price', priceRange.min)
    onFilterChange('max_price', priceRange.max)
  }

  const hasActiveFilters = filters.type !== 'all' || filters.animal || filters.min_price || filters.max_price || filters.sort_by

  return (
    <div
      ref={sidebarRef}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full min-h-0"
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="flex justify-between items-center border-b border-gray-200 bg-white flex-shrink-0 p-2.5">
        <h3 className="font-semibold text-gray-800 text-sm">Фильтры</h3>
        <button
          type="button"
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

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
        {/* Тип контента */}
        <div className="border-b border-gray-200 pb-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Показывать
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="type"
                value="all"
                checked={filters.type === 'all'}
                onChange={(e) => onFilterChange('type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">Все</span>
            </label>
            <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="type"
                value="products"
                checked={filters.type === 'products'}
                onChange={(e) => onFilterChange('type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">Только товары</span>
            </label>
            <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="type"
                value="courses"
                checked={filters.type === 'courses'}
                onChange={(e) => onFilterChange('type', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">Только курсы</span>
            </label>
          </div>
        </div>

        {/* Тип питомца */}
        <div className="border-b border-gray-200 pb-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Тип питомца
          </label>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="animal"
                value=""
                checked={filters.animal === ''}
                onChange={(e) => onFilterChange('animal', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">Все</span>
            </label>
            <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="animal"
                value="dog"
                checked={filters.animal === 'dog'}
                onChange={(e) => onFilterChange('animal', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">🐕 Собак</span>
            </label>
            <label className="flex items-center cursor-pointer hover:text-primary-600 transition-colors">
              <input
                type="radio"
                name="animal"
                value="cat"
                checked={filters.animal === 'cat'}
                onChange={(e) => onFilterChange('animal', e.target.value)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">🐱 Кошек</span>
            </label>
          </div>
        </div>

        {/* Цена */}
        <div className="border-b border-gray-200 pb-2">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Цена, ₽
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="ОТ"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
            />
            <span className="text-gray-400 text-xs">—</span>
            <input
              type="number"
              placeholder="ДО"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={handlePriceApply}
            className="mt-2 w-full py-2.5 text-sm font-medium bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-xl transition-colors"
          >
            Применить
          </button>
        </div>

        {/* Сортировка */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Сортировка
          </label>
          <select
            value={filters.sort_by}
            onChange={(e) => onFilterChange('sort_by', e.target.value)}
            className="w-full px-3 py-3 text-sm bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-colors focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">По умолчанию</option>
            <option value="price_asc">Цена: по возрастанию</option>
            <option value="price_desc">Цена: по убыванию</option>
            <option value="date_added">По дате добавления</option>
          </select>
        </div>
      </div>
    </div>
  )
}

/**
 * Компонент пагинации для избранного
 */
function FavoritesPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const showPages = 5
    let start = Math.max(1, currentPage - Math.floor(showPages / 2))
    let end = Math.min(totalPages, start + showPages - 1)

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
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ←
      </button>

      {getPageNumbers().map(num => (
        <button
          key={num}
          type="button"
          onClick={() => onPageChange(num)}
          className={`px-3 py-2 rounded-xl transition-colors ${
            num === currentPage
              ? 'bg-primary-600 text-white border border-primary-600'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {num}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        →
      </button>
    </div>
  )
}

/**
 * Компонент страницы избранного
 */
// Иконка сердца (как в хедере)
const HeartIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.001 20.727c-.292 0-.584-.094-.829-.281-2.596-1.961-4.594-3.684-6.03-5.265C2.55 12.488 1.5 10.84 1.5 9.047 1.5 6.5 3.55 4.5 6.05 4.5c1.272 0 2.468.48 3.351 1.352l.599.593.599-.593A4.72 4.72 0 0 1 14.95 4.5c2.5 0 4.55 2 4.55 4.547 0 1.793-1.05 3.441-3.643 6.134-1.437 1.581-3.436 3.304-6.033 5.265a1.23 1.23 0 0 1-.823.281z" />
  </svg>
)

function Favorites() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'wishlist' ? 'wishlist' : 'favorites'
  const setView = useCallback((next) => {
    const value = typeof next === 'function' ? next(view) : next
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      if (value === 'wishlist') p.set('view', 'wishlist')
      else p.delete('view')
      return p
    }, { replace: true })
  }, [view, setSearchParams])

  // Состояние данных
  const [favoriteProducts, setFavoriteProducts] = useState([])
  const [favoriteCourses, setFavoriteCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Отфильтрованные данные
  const [filteredProducts, setFilteredProducts] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Stores
  const favoriteProductIds = useFavoritesStore(s => s.products)
  const favoriteCourseIds = useFavoritesStore(s => s.courses)
  const { removeProduct, removeCourse } = useFavoritesStore()

  const addItem = useCartStore(s => s.addItem)
  const success = useToastStore(s => s.success)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  // Вишлист (для переключения вида)
  const wishlist = useShareableWishlistStore(s => s.wishlist)
  const wishlistLoading = useShareableWishlistStore(s => s.isLoading)
  const wishlistError = useShareableWishlistStore(s => s.error)
  const fetchWishlist = useShareableWishlistStore(s => s.fetchWishlist)
  const removeFromWishlist = useShareableWishlistStore(s => s.removeProduct)
  const [wishlistCopied, setWishlistCopied] = useState(false)

  useEffect(() => {
    if (view === 'wishlist' && isAuthenticated) fetchWishlist()
  }, [view, isAuthenticated, fetchWishlist])

  const wishlistShareUrl = wishlist?.share_url
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${wishlist.share_url}`
    : ''
  const handleCopyWishlistLink = useCallback(() => {
    if (!wishlistShareUrl) return
    navigator.clipboard.writeText(wishlistShareUrl).then(() => {
      setWishlistCopied(true)
      success('Ссылка скопирована в буфер обмена')
      setTimeout(() => setWishlistCopied(false), 2000)
    })
  }, [wishlistShareUrl, success])

  const wishlistItems = wishlist?.items ?? []
  const hasWishlistItems = wishlistItems.length > 0

  // Мемоизированные ID избранных элементов
  const favoriteProductIdsMemo = useMemo(() =>
    favoriteProductIds.map(p => p.id), [favoriteProductIds]
  )
  const favoriteCourseIdsMemo = useMemo(() =>
    favoriteCourseIds.map(c => c.id), [favoriteCourseIds]
  )

  // Фильтры из URL (мемоизируем)
  const filters = useMemo(() => ({
    type: searchParams.get('type') || 'all', // 'all', 'products', 'courses'
    animal: searchParams.get('animal') || '', // '', 'dog', 'cat'
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    sort_by: searchParams.get('sort_by') || '', // '', 'price_asc', 'price_desc', 'date_added'
    page: searchParams.get('page') || '1',
  }), [searchParams])

  // Обработчики фильтров
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

    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  /**
   * Загрузка данных избранных товаров и курсов
   */
  const loadFavorites = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Загружаем все товары и фильтруем по избранным
      if (favoriteProductIdsMemo.length > 0) {
        const productsCacheKey = `products-${favoriteProductIdsMemo.sort().join(',')}`
        const productsResponse = await apiCache.get(productsCacheKey, () => getProducts({
          ids: favoriteProductIdsMemo.join(','),
          per_page: favoriteProductIdsMemo.length
        }), 60000) // Кэш на 1 минуту для избранного
        setFavoriteProducts(productsResponse.products || [])
      } else {
        setFavoriteProducts([])
      }

      // Загружаем все курсы и фильтруем по избранным
      if (favoriteCourseIdsMemo.length > 0) {
        const coursesCacheKey = `courses-${favoriteCourseIdsMemo.sort().join(',')}`
        const coursesResponse = await apiCache.get(coursesCacheKey, () => getCourses({
          ids: favoriteCourseIdsMemo.join(','),
          per_page: favoriteCourseIdsMemo.length
        }), 60000) // Кэш на 1 минуту для избранного
        setFavoriteCourses(coursesResponse.courses || [])
      } else {
        setFavoriteCourses([])
      }
    } catch (err) {
      console.error('Ошибка загрузки избранного:', err)
      setError(err.message || 'Не удалось загрузить избранные товары')
    } finally {
      setIsLoading(false)
    }
  }, [favoriteProductIdsMemo, favoriteCourseIdsMemo])

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  /**
   * Применение фильтров и сортировки
   */
  const applyFiltersAndSorting = useCallback(() => {
    let filteredProductsData = [...favoriteProducts]
    let filteredCoursesData = [...favoriteCourses]

    // Добавляем информацию о дате добавления
    filteredProductsData = filteredProductsData.map(product => {
      const favoriteData = favoriteProductIds.find(p => p.id === product.id)
      return {
        ...product,
        addedAt: favoriteData ? favoriteData.addedAt : new Date().toISOString()
      }
    })

    filteredCoursesData = filteredCoursesData.map(course => {
      const favoriteData = favoriteCourseIds.find(c => c.id === course.id)
      return {
        ...course,
        addedAt: favoriteData ? favoriteData.addedAt : new Date().toISOString()
      }
    })

    // Фильтр по типу контента
    if (filters.type === 'products') {
      filteredCoursesData = []
    } else if (filters.type === 'courses') {
      filteredProductsData = []
    }
    // Для 'all' оставляем оба типа

    // Фильтр по животному
    if (filters.animal) {
      filteredProductsData = filteredProductsData.filter(product => {
        // Проверяем поле animal (из модели Product)
        return product.animal === filters.animal
      })

      filteredCoursesData = filteredCoursesData.filter(course => {
        // Для курсов проверяем поле pet_type или animal
        return course.pet_type === filters.animal || course.animal === filters.animal
      })
    }

    // Фильтр по цене
    if (filters.min_price) {
      const minPrice = parseFloat(filters.min_price)
      filteredProductsData = filteredProductsData.filter(product => {
        const price = product.discount_price || product.price || 0
        return price >= minPrice
      })
      filteredCoursesData = filteredCoursesData.filter(course => {
        const price = course.price || 0
        return price >= minPrice
      })
    }

    if (filters.max_price) {
      const maxPrice = parseFloat(filters.max_price)
      filteredProductsData = filteredProductsData.filter(product => {
        const price = product.discount_price || product.price || 0
        return price <= maxPrice
      })
      filteredCoursesData = filteredCoursesData.filter(course => {
        const price = course.price || 0
        return price <= maxPrice
      })
    }

    // Сортировка
    const sortItems = (items, sortBy) => {
      switch (sortBy) {
        case 'price_asc':
          return items.sort((a, b) => {
            const priceA = a.discount_price || a.price || 0
            const priceB = b.discount_price || b.price || 0
            return priceA - priceB
          })
        case 'price_desc':
          return items.sort((a, b) => {
            const priceA = a.discount_price || a.price || 0
            const priceB = b.discount_price || b.price || 0
            return priceB - priceA
          })
        case 'date_added':
          return items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
        default:
          return items
      }
    }

    filteredProductsData = sortItems(filteredProductsData, filters.sort_by)
    filteredCoursesData = sortItems(filteredCoursesData, filters.sort_by)

    // Пагинация
    const ITEMS_PER_PAGE = 12
    const allItems = [...filteredProductsData, ...filteredCoursesData]
    const totalItems = allItems.length
    const totalPagesCalc = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const currentPageCalc = parseInt(filters.page) || 1
    const startIndex = (currentPageCalc - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    // Разделяем на товары и курсы для отображения
    const paginatedItems = allItems.slice(startIndex, endIndex)
    const paginatedProducts = paginatedItems.filter(item => !item.pet_type) // товары не имеют pet_type
    const paginatedCourses = paginatedItems.filter(item => item.pet_type) // курсы имеют pet_type

    setFilteredProducts(paginatedProducts)
    setFilteredCourses(paginatedCourses)
    setCurrentPage(currentPageCalc)
    setTotalPages(totalPagesCalc)
  }, [favoriteProducts, favoriteCourses, filters, favoriteProductIds, favoriteCourseIds])

  // Применяем фильтры и сортировку при изменении данных или фильтров
  useEffect(() => {
    if (favoriteProducts.length > 0 || favoriteCourses.length > 0) {
      applyFiltersAndSorting()
    } else {
      // Если нет данных, сбрасываем фильтры
      setFilteredProducts([])
      setFilteredCourses([])
      setCurrentPage(1)
      setTotalPages(1)
    }
  }, [applyFiltersAndSorting, favoriteProducts.length, favoriteCourses.length])

  /**
   * Обработчик добавления товара в корзину
   */
  const handleAddProductToCart = async (product, quantity = 1) => {
    const result = await addItem(product.id, quantity)
    if (result) {
      success(`${product.name} добавлен в корзину`)
      return true
    }
    return false
  }

  /**
   * Обработчик добавления курса в корзину
   */
  const handleAddCourseToCart = async (course) => {
    const result = await useCartStore.getState().addCourse(course.id)
    if (result) {
      success(`Курс "${course.title}" добавлен в корзину`)
      return true
    }
    return false
  }

  /**
   * Обработчик удаления товара из избранного
   */
  const handleRemoveProduct = (productId) => {
    removeProduct(productId)
    setFavoriteProducts(prev => prev.filter(p => p.id !== productId))
    // Инвалидируем кэш товаров
    apiCache.clearByPrefix('products-')
  }

  /**
   * Обработчик удаления курса из избранного
   */
  const handleRemoveCourse = (courseId) => {
    removeCourse(courseId)
    setFavoriteCourses(prev => prev.filter(c => c.id !== courseId))
    // Инвалидируем кэш курсов
    apiCache.clearByPrefix('courses-')
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <PageLoader />
        </div>
      </div>
    )
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="page-container">
        <div className="card py-8">
          <Alert variant="error" title="Ошибка загрузки">
            <p className="mb-3">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary text-sm">
              Попробовать снова
            </button>
          </Alert>
        </div>
      </div>
    )
  }

  const hasFavorites = favoriteProducts.length > 0 || favoriteCourses.length > 0
  const favCount = favoriteProducts.length + favoriteCourses.length
  const wishCount = wishlistItems.length

  return (
    <div className="animate-fadeIn page-container-with-sidebar flex flex-col min-h-[calc(100vh-4rem)]">
      <section className="mb-5 overflow-hidden rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-milk to-violet-50 px-5 py-5 md:px-7 md:py-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary-600">
          <Heart className="h-3.5 w-3.5" aria-hidden /> Избранное и вишлист
        </span>
        <h1 className="mt-2 font-heading text-2xl font-bold text-primary-800 md:text-3xl">Сохранённое для ваших питомцев</h1>
        <p className="mt-1 text-sm text-primary-600">Товары и курсы, которые вы отметили, и вишлист, которым можно поделиться с близкими.</p>
      </section>
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Боковая панель: фильтры для избранного, блок вишлиста (ссылка) для вишлиста — остаётся при переключении */}
        {((view === 'favorites' && hasFavorites) || view === 'wishlist') && (
          <aside className="w-72 xl:w-80 flex-shrink-0 hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] min-h-[320px]">
            {view === 'favorites' && hasFavorites && (
              <FavoritesFilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
              />
            )}
            {view === 'wishlist' && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full min-h-0 p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3">Вишлист</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Поделитесь ссылкой — друзья смогут открыть список и добавить товары в корзину.
                </p>
                {wishlistShareUrl && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      readOnly
                      value={wishlistShareUrl}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWishlistLink}
                      className={`w-full px-3 py-2 rounded-xl font-medium text-sm transition-colors ${
                        wishlistCopied ? 'bg-green-100 text-green-800' : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      {wishlistCopied ? 'Скопировано' : 'Копировать ссылку'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}

        {/* Основной контент */}
        <main className="flex-1 min-w-0 animate-fadeIn">
          {/* Хедер с табами Избранное | Вишлист — в стиле разделов магазина питания (btn-slide) */}
          {isAuthenticated && (
            <nav className="mb-6" aria-label="Раздел">
              <div className="inline-flex w-full max-w-md rounded-2xl border border-primary-100 bg-white p-1 shadow-sm">
                {[
                  { key: 'favorites', label: 'Избранное', Icon: Heart, count: favCount },
                  { key: 'wishlist', label: 'Вишлист', Icon: Gift, count: wishCount },
                ].map(({ key, label, Icon, count }) => {
                  const active = view === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setView(key)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-primary-600 text-white shadow-sm' : 'text-primary-600 hover:bg-primary-50'}`}
                    >
                      <Icon size={16} strokeWidth={2.4} aria-hidden />
                      {label}
                      {count > 0 && (
                        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${active ? 'bg-white/25 text-white' : 'bg-primary-100 text-primary-700'}`}>{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </nav>
          )}

          {/* Контент вишлиста: только продукты (фильтры и хедер остаются) */}
          {view === 'wishlist' && (
            <>
              {wishlistError && (
                <Alert variant="error" className="mb-6">
                  {wishlistError}
                </Alert>
              )}
              {wishlistLoading && !wishlist && <PageLoader />}
              {!wishlistLoading && wishlist && !hasWishlistItems && (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-primary-100 bg-white px-6 py-12 text-center">
                  <PuffLottie name="hello_wave" size={120} alt="Пуфыч" />
                  <h3 className="mt-3 font-heading text-xl font-bold text-primary-800">Вишлист пуст</h3>
                  <p className="mt-1 max-w-sm text-sm text-primary-500">Добавляйте товары кнопкой «Подарок» на карточке — и делитесь списком с близкими.</p>
                  <Link to="/shop" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">В магазин</Link>
                </div>
              )}
              {!wishlistLoading && wishlist && hasWishlistItems && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Товары в списке ({wishlistItems.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {wishlistItems.map((item) => (
                      <div key={item.id} className="relative">
                        <ProductCard product={item.product} />
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(item.product.id)}
                          className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/90 text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-sm shadow-sm"
                          aria-label="Удалить из вишлиста"
                          title="Удалить из вишлиста"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Контент избранного (фильтры + товары/курсы) — показывается только при view === 'favorites' */}
          {view === 'favorites' && (
            <>
          {!hasFavorites ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-primary-100 bg-white px-6 py-12 text-center">
              <PuffLottie name="bored_yawn" size={120} alt="Пуфыч скучает" />
              <h3 className="mt-3 font-heading text-xl font-bold text-primary-800">Тут пока пусто</h3>
              <p className="mt-1 max-w-sm text-sm text-primary-500">Отмечайте товары и курсы сердечком — и они соберутся здесь, чтобы не потерялись.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">Перейти в магазин</Link>
                <Link to="/courses" className="inline-flex items-center gap-2 rounded-full border border-primary-200 px-5 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50">Посмотреть курсы</Link>
              </div>
            </div>
          ) : (
            <>
          {/* Мобильные фильтры */}
          <div className="lg:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={!(filters.type !== 'all' || filters.animal || filters.min_price || filters.max_price || filters.sort_by)}
                className="flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Очистить фильтры
              </button>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="flex-shrink-0 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">Все</option>
                <option value="products">Только товары</option>
                <option value="courses">Только курсы</option>
              </select>
              <select
                value={filters.animal}
                onChange={(e) => handleFilterChange('animal', e.target.value)}
                className="flex-shrink-0 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Все</option>
                <option value="dog">🐕 Собак</option>
                <option value="cat">🐱 Кошек</option>
              </select>
            </div>
          </div>

      {/* Избранные товары */}
      {filteredProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">
              Избранные товары ({filteredProducts.length})
            </h2>
            <Link to="/shop" className="text-primary-600 hover:text-primary-700 font-medium">
              Перейти в магазин →
            </Link>
          </div>

          <div className="grid responsive-grid gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative group">
                {/* Кнопка удаления из избранного */}
                <button
                  onClick={() => handleRemoveProduct(product.id)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить из избранного"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                <ProductCard
                  product={product}
                  onAddToCart={handleAddProductToCart}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Избранные курсы */}
      {filteredCourses.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title mb-0">
              Избранные курсы ({filteredCourses.length})
            </h2>
            <Link to="/courses" className="text-primary-600 hover:text-primary-700 font-medium">
              Посмотреть все курсы →
            </Link>
          </div>

          <div className="grid responsive-grid gap-6">
            {filteredCourses.map((course) => (
              <div key={course.id} className="relative group">
                {/* Кнопка удаления из избранного */}
                <button
                  onClick={() => handleRemoveCourse(course.id)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить из избранного"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                <CourseCard
                  course={course}
                  onAddToCart={handleAddCourseToCart}
                  onEnrollFree={(course) => {
                    console.log('Enroll free course:', course.title)
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <FavoritesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => handleFilterChange('page', String(page))}
        />
      )}
            </>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default Favorites
