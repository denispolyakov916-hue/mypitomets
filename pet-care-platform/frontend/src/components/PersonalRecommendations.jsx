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
import Rating from './Rating'
import { apiCache } from '../utils/apiCache'

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
function PersonalRecommendations({
  type = 'all',
  productsLimit = 8,
  coursesLimit = 4,
  maxItems = null,
  title = 'Рекомендуем для ваших питомцев',
  description = 'Персональные подборки на основе предпочтений ваших питомцев',
  showCta = true,
  ctaLabel = 'Посмотреть все товары',
  ctaHref = '/shop'
}) {
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
      // Используем кэширование с TTL 5 минут для персональных рекомендаций
      const cacheKey = `personal-recommendations:${type}:${productsLimit}:${coursesLimit}`
      const requestOptions = {}
      if (type === 'products') {
        requestOptions.products_limit = productsLimit
      } else if (type === 'courses') {
        requestOptions.courses_limit = coursesLimit
      } else {
        requestOptions.products_limit = productsLimit
        requestOptions.courses_limit = coursesLimit
      }
      const response = await apiCache.get(
        cacheKey,
        () => getPersonalRecommendations(requestOptions),
        300000
      )
      // API возвращает объект с products и courses, объединяем их в один массив с метками типа
      const products = (response.products || []).map(item => ({ ...item, itemType: 'product' }))
      const courses = (response.courses || []).map(item => ({
        ...item.course,
        itemType: 'course',
        recommendation_reason: item.reason,
        pet_name: item.pet_name
      }))
      let merged = []
      if (type === 'products') {
        merged = products
      } else if (type === 'courses') {
        merged = courses
      } else {
        merged = [...products, ...courses]
      }
      if (maxItems && merged.length > maxItems) {
        merged = merged.slice(0, maxItems)
      }
      setRecommendations(merged)
    } catch (err) {
      console.error('Error loading personal recommendations:', err)
      setError(err.message || 'Не удалось загрузить рекомендации')
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }, [type, productsLimit, coursesLimit, maxItems])

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
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recommendations.map((item) => {
          const isProduct = item.itemType === 'product'
          const isCourse = item.itemType === 'course'
          const linkUrl = isProduct ? `/shop/products/${item.id}` : `/courses/${item.id}`

          return (
          <div key={`${item.itemType}-${item.id}`} className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
            <Link to={linkUrl}>
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {(item.main_image || item.image_url) ? (
                  <img
                    src={item.main_image || item.image_url}
                    alt={item.name || item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">{isProduct ? '📦' : '🎓'}</span>
                  </div>
                )}
              </div>
            </Link>

            <div className="p-4">
              <Link to={linkUrl}>
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {item.name || item.title}
                </h3>
              </Link>

              {item.recommendation_reason && (
                <p className="text-xs text-primary-600 mb-2 italic">
                  {item.recommendation_reason}
                </p>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  {isProduct && item.discount_percent > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(item.price)}
                        </span>
                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg font-bold">
                          -{item.discount_percent}%
                        </span>
                      </div>
                      <span className="text-lg font-bold text-red-600">
                        {formatPrice(item.discounted_price)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {isProduct ? formatPrice(item.price) : (item.is_free ? 'Бесплатно' : formatPrice(item.price))}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    (item.animal || item.pet_type) === 'dog' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {(item.animal || item.pet_type) === 'dog' ? 'Собаки' : (item.pet_type === 'all' ? 'Все' : 'Кошки')}
                  </span>
                  {isCourse && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      Курс
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-2 capitalize">
                {isProduct ? (item.category_name || item.category) : item.category_display}
              </p>

              {item.rating > 0 && (
                <div className="mb-3">
                  <Rating
                    rating={item.rating}
                    reviewsCount={item.reviews_count || 0}
                    readonly={true}
                    size="sm"
                  />
                </div>
              )}

              <Link
                to={linkUrl}
                className={`w-full py-2 text-center block text-sm font-medium rounded-lg transition-colors ${
                  isProduct
                    ? 'btn-secondary'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isProduct ? 'Посмотреть товар' : 'Записаться на курс'}
              </Link>
            </div>
          </div>
          )
        })}
      </div>

      {showCta && (
        <div className="mt-6 text-center">
          <Link to={ctaHref} className="btn-primary inline-flex items-center gap-2">
            <span>{ctaLabel}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}

export default PersonalRecommendations
