/**
 * Страница избранного
 *
 * Отображает избранные товары и курсы пользователя.
 * Позволяет добавлять их в корзину или удалять из избранного.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFavoritesStore } from '../store/favoritesStore'
import { useCartStore } from '../store/cartStore'
import { useToastStore } from '../store/toastStore'
import { getProducts } from '../api/shop'
import { getCourses } from '../api/courses'
import ProductCard from '../components/ProductCard'
import CourseCard from '../components/CourseCard'
import { PageLoader } from '../components/Loader'
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

  return (
    <div
      ref={sidebarRef}
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-5 overflow-y-auto"
      style={{
        overscrollBehavior: 'contain',
        height: 'calc(100vh - 6rem)' // 100vh минус header + top offset
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Фильтры</h3>
        <button
          onClick={onReset}
          className={`text-sm transition-colors ${
            (filters.type !== 'all' || filters.animal || filters.min_price || filters.max_price || filters.sort_by)
              ? 'text-purple-600 hover:text-purple-700'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Очистить фильтры
        </button>
      </div>

      {/* Тип контента */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Показывать
        </label>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
            <input
              type="radio"
              name="type"
              value="all"
              checked={filters.type === 'all'}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-gray-700">Все</span>
          </label>
          <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
            <input
              type="radio"
              name="type"
              value="products"
              checked={filters.type === 'products'}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-gray-700">Только товары</span>
          </label>
          <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
            <input
              type="radio"
              name="type"
              value="courses"
              checked={filters.type === 'courses'}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-gray-700">Только курсы</span>
          </label>
        </div>
      </div>

      {/* Для кого */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Для кого
        </label>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
            <input
              type="radio"
              name="animal"
              value=""
              checked={filters.animal === ''}
              onChange={(e) => onFilterChange('animal', e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-gray-700">Для всех</span>
          </label>
          <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
            <input
              type="radio"
              name="animal"
              value="dog"
              checked={filters.animal === 'dog'}
              onChange={(e) => onFilterChange('animal', e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-gray-700">🐕 Для собак</span>
          </label>
          <label className="flex items-center cursor-pointer hover:text-purple-600 transition-colors">
            <input
              type="radio"
              name="animal"
              value="cat"
              checked={filters.animal === 'cat'}
              onChange={(e) => onFilterChange('animal', e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-gray-700">🐱 Для кошек</span>
          </label>
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
          <option value="date_added">По дате добавления</option>
        </select>
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
    <div className="flex justify-center items-center gap-1 mt-8 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-purple-100">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        ←
      </button>

      {getPageNumbers().map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={`px-3 py-2 rounded-lg transition-all duration-200 ${
            num === currentPage
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
              : 'bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:bg-purple-50'
          }`}
        >
          {num}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        →
      </button>
    </div>
  )
}

/**
 * Компонент страницы избранного
 */
function Favorites() {
  const [searchParams, setSearchParams] = useSearchParams()

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
  const {
    products: favoriteProductIds,
    courses: favoriteCourseIds,
    removeProduct,
    removeCourse
  } = useFavoritesStore()

  const { addItem } = useCartStore()
  const { success } = useToastStore()

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
        const productsResponse = await getProducts({
          ids: favoriteProductIdsMemo.join(','),
          per_page: favoriteProductIdsMemo.length
        })
        setFavoriteProducts(productsResponse.products || [])
      } else {
        setFavoriteProducts([])
      }

      // Загружаем все курсы и фильтруем по избранным
      if (favoriteCourseIdsMemo.length > 0) {
        const coursesResponse = await getCourses({
          ids: favoriteCourseIdsMemo.join(','),
          per_page: favoriteCourseIdsMemo.length
        })
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
  }

  /**
   * Обработчик удаления курса из избранного
   */
  const handleRemoveCourse = (courseId) => {
    removeCourse(courseId)
    setFavoriteCourses(prev => prev.filter(c => c.id !== courseId))
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
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  // Пустое состояние - проверяем оригинальные данные, а не отфильтрованные
  const hasFavorites = favoriteProducts.length > 0 || favoriteCourses.length > 0

  if (!hasFavorites) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">💖</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Избранное пустое
          </h2>
          <p className="text-gray-600 mb-6">
            Добавьте товары или курсы в избранное, чтобы они появились здесь
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop" className="btn-primary">
              Перейти в магазин
            </Link>
            <Link to="/courses" className="btn-secondary">
              Посмотреть курсы
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn relative max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      {/* Заголовок и описание */}
      <div className="mb-6">
        <h1 className="page-title mb-4 lg:ml-80">Избранное</h1>
        <p className="text-gray-600 lg:ml-80">
          Ваши любимые товары и курсы в одном месте
        </p>
      </div>

      <div className="flex gap-6">
        {/* Боковая панель с фильтрами */}
        <aside className="w-64 flex-shrink-0 hidden lg:block fixed left-4 top-24 z-10">
          <FavoritesFilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </aside>

        {/* Основной контент */}
        <main className="flex-1 min-w-0 animate-fadeIn lg:pl-72">
          {/* Мобильные фильтры */}
          <div className="lg:hidden mb-4">
            {/* Кнопка сброса фильтров */}
            <div className="mb-3">
              <button
                onClick={handleReset}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  (filters.type !== 'all' || filters.animal || filters.min_price || filters.max_price || filters.sort_by)
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                🧹 Очистить фильтры
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 bg-white/50 backdrop-blur-sm rounded-lg p-2">
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">Все</option>
                <option value="products">Только товары</option>
                <option value="courses">Только курсы</option>
              </select>
              <select
                value={filters.animal}
                onChange={(e) => handleFilterChange('animal', e.target.value)}
                className="px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Для всех</option>
                <option value="dog">🐕 Для собак</option>
                <option value="cat">🐱 Для кошек</option>
              </select>
            </div>
          </div>

          {/* Информация о результатах */}
          {(filteredProducts.length > 0 || filteredCourses.length > 0) && (
            <p className="text-purple-600 mb-4 font-medium">
              Найдено: {filteredProducts.length + filteredCourses.length} элементов
            </p>
          )}

      {/* Избранные товары */}
      {filteredProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Избранные товары ({filteredProducts.length})
            </h2>
            <Link to="/shop" className="text-purple-600 hover:text-purple-700 font-medium">
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
            <h2 className="text-2xl font-bold text-gray-900">
              Избранные курсы ({filteredCourses.length})
            </h2>
            <Link to="/courses" className="text-purple-600 hover:text-purple-700 font-medium">
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
    </main>
    </div>
    </div>
  )
}

export default Favorites
