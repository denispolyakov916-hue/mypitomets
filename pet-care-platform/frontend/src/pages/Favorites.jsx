/**
 * Страница избранного
 *
 * Отображает избранные товары и курсы пользователя.
 * Позволяет добавлять их в корзину или удалять из избранного.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFavoritesStore } from '../store/favoritesStore'
import { useCartStore } from '../store/cartStore'
import { useToastStore } from '../store/toastStore'
import { getProducts } from '../api/shop'
import { getCourses } from '../api/courses'
import ProductCard from '../components/ProductCard'
import CourseCard from '../components/CourseCard'
import { PageLoader } from '../components/Loader'

/**
 * Компонент страницы избранного
 */
function Favorites() {
  const [favoriteProducts, setFavoriteProducts] = useState([])
  const [favoriteCourses, setFavoriteCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Stores
  const {
    products: favoriteProductIds,
    courses: favoriteCourseIds,
    removeProduct,
    removeCourse
  } = useFavoritesStore()

  const { addItem } = useCartStore()
  const { success } = useToastStore()

  /**
   * Загрузка данных избранных товаров и курсов
   */
  useEffect(() => {
    loadFavorites()
  }, [favoriteProductIds, favoriteCourseIds])

  const loadFavorites = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Загружаем все товары и фильтруем по избранным
      if (favoriteProductIds.length > 0) {
        const productsResponse = await getProducts({
          ids: favoriteProductIds.join(','),
          per_page: favoriteProductIds.length // Загружаем только избранные товары
        })
        setFavoriteProducts(productsResponse.products || [])
      } else {
        setFavoriteProducts([])
      }

      // Загружаем все курсы и фильтруем по избранным
      if (favoriteCourseIds.length > 0) {
        const coursesResponse = await getCourses({
          ids: favoriteCourseIds.join(','),
          per_page: favoriteCourseIds.length // Загружаем только избранные курсы
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
  }

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
          <button onClick={loadFavorites} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  // Пустое состояние
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
    <div className="animate-fadeIn max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="page-title">Избранное</h1>
        <p className="text-gray-600">
          Ваши любимые товары и курсы в одном месте
        </p>
      </div>

      {/* Избранные товары */}
      {favoriteProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Избранные товары ({favoriteProducts.length})
            </h2>
            <Link to="/shop" className="text-purple-600 hover:text-purple-700 font-medium">
              Перейти в магазин →
            </Link>
          </div>

          <div className="grid responsive-grid gap-6">
            {favoriteProducts.map((product) => (
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
      {favoriteCourses.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Избранные курсы ({favoriteCourses.length})
            </h2>
            <Link to="/courses" className="text-purple-600 hover:text-purple-700 font-medium">
              Посмотреть все курсы →
            </Link>
          </div>

          <div className="grid responsive-grid gap-6">
            {favoriteCourses.map((course) => (
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
                    // Для бесплатных курсов можно добавить логику прямой записи
                    console.log('Enroll free course:', course.title)
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Favorites
