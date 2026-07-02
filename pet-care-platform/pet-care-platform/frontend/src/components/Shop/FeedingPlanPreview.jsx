import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFeedingPlan, getFoodRecommendations } from '../../api/pets'

/**
 * Ненавязчивый мини-блок рекомендаций из подбора питания
 * Берет данные из /pets/:id/feeding-plan/
 */
const FeedingPlanPreview = ({ petId, petName, limit = 4, withCard = true, className = '' }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!petId) return
    const loadPlan = async () => {
      try {
        setLoading(true)
        setError(null)
        // Каноничный источник подбора для интерфейса — /feeding-plan/ (та же схема, что
        // на основной странице подбора), чтобы рекомендации в разных местах совпадали.
        const response = await getFeedingPlan(petId)
        const plan = response?.data || response
        const components = Array.isArray(plan?.components) ? plan.components : []
        const supplements = Array.isArray(plan?.supplements) ? plan.supplements : []
        const merged = [...components, ...supplements]

        if (merged.length > 0) {
          setItems(merged.slice(0, limit))
          return
        }

        // Фолбэк: старые рекомендации, если план питания пуст
        const recResponse = await getFoodRecommendations(petId, { limit })
        const recData = recResponse?.data || recResponse
        const recList = Array.isArray(recData)
          ? recData
          : recData?.recommendations
            ? recData.recommendations
            : recData?.results
              ? recData.results
              : []
        setItems(recList.slice(0, limit))
      } catch (err) {
        setError(err?.message || 'Не удалось загрузить рекомендации')
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    loadPlan()
  }, [petId, limit])

  const title = useMemo(() => {
    if (petName) return `Подбор питания для ${petName}`
    return 'Подбор питания'
  }, [petName])

  if (!petId) return null

  return (
    <div className={`${withCard ? 'card' : ''} ${className}`.trim()}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Link to={`/food-recommendation?pet_id=${petId}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Все →
        </Link>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Подбираем рацион...</div>
      )}

      {!loading && error && (
        <div className="text-sm text-gray-500">Нет рекомендаций</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-gray-500">Пока нет подходящих товаров</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((item, index) => {
            const name = item.product_name || item.name || 'Товар'
            const imageUrl = item.image_url
            const productId = item.product_id || item.id
            const link = item.shop_url || (productId ? `/shop/products/${productId}` : '/shop')
            return (
              <Link
                key={`${productId || index}`}
                to={link}
                className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors flex-shrink-0 min-w-[200px] max-w-[260px]"
              >
                <div className="w-12 h-12 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🍽️</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{name}</p>
                  {item.product_type && (
                    <p className="text-xs text-gray-500">{item.product_type}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FeedingPlanPreview
