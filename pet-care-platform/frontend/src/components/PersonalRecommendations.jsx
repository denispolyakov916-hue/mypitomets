/**
 * Компонент персональных рекомендаций товаров
 *
 * Отображает персонализированные рекомендации на основе питомцев пользователя
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getPersonalRecommendations } from '../api/shop'
import { useAuthStore } from '../store/authStore'
import { PageLoader } from './Loader'

/**
 * Форматирование цены
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Компонент PersonalRecommendations
 */
function PersonalRecommendations() {
  const { isAuthenticated } = useAuthStore()
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Загрузка рекомендаций из API
   */
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await getPersonalRecommendations()
      setRecommendations(response.recommendations || [])
    } catch (err) {
      setError(err.message || 'Не удалось загрузить рекомендации')
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Загрузка персональных рекомендаций
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, fetchRecommendations])

  // Если пользователь не авторизован, не показываем ничего
  if (!isAuthenticated) {
    return null
  }

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <PageLoader />
        </div>
      </div>
    )
  }

  // Состояние ошибки или отсутствие рекомендаций
  if (error || recommendations.length === 0) {
    return null // Не показываем блок, если нет рекомендаций или ошибка
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-600 text-lg">⭐</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Рекомендуем для ваших питомцев</h2>
          <p className="text-sm text-gray-600">Персональные подборки на основе предпочтений ваших питомцев</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <div key={product.id} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
            <Link to={`/shop/products/${product.id}`}>
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {product.main_image ? (
                  <img
                    src={product.main_image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">📦</span>
                  </div>
                )}
              </div>
            </Link>

            <div className="p-4">
              <Link to={`/shop/products/${product.id}`}>
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {product.name}
                </h3>
              </Link>

              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  {product.discount_percent > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg font-bold">
                          -{product.discount_percent}%
                        </span>
                      </div>
                      <span className="text-lg font-bold text-red-600">
                        {formatPrice(product.discounted_price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  product.animal === 'dog' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {product.animal === 'dog' ? 'Собаки' : 'Кошки'}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-2 capitalize">{product.category_name || product.category}</p>

              {product.rating > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">({product.reviews_count})</span>
                </div>
              )}

              <Link
                to={`/shop/products/${product.id}`}
                className="w-full btn-secondary py-2 text-center block text-sm"
              >
                Посмотреть товар
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
          <span>Посмотреть все товары</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

export default PersonalRecommendations
