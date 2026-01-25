/**
 * Компонент блока рекомендаций
 *
 * Универсальный компонент для отображения персонализированных рекомендаций:
 * - "Часто покупают вместе" на странице товара
 * - "Вам может понравиться" в корзине
 * - Персональные рекомендации на основе PetID
 *
 * Props:
 *   title: Заголовок блока
 *   recommendations: Массив рекомендаций (товары или курсы)
 *   type: 'products' | 'courses' | 'mixed'
 *   onAddToCart: Обработчик добавления в корзину
 *   loading: Состояние загрузки
 *   compact: Компактный режим (меньше карточек в ряду)
 *   showReason: Показывать причину рекомендации
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { ButtonLoader } from './Loader'

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
 * Компонент мини-карточки товара для рекомендаций
 */
function RecommendationProductCard({ product, onAddToCart, showReason = false }) {
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const { getItemInCart, updateQuantity } = useCartStore()

  const cartItem = getItemInCart(product.id)
  const isInCart = !!cartItem
  const cartQuantity = cartItem?.quantity || 0

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isAdding) return
    setIsAdding(true)
    
    try {
      await onAddToCart?.(product, 1)
    } finally {
      setIsAdding(false)
    }
  }

  const handleQuantityChange = async (e, delta) => {
    e.preventDefault()
    e.stopPropagation()
    
    const newQuantity = cartQuantity + delta
    if (newQuantity >= 0 && newQuantity <= (product.stock_count || 999)) {
      await updateQuantity(product.id, newQuantity)
    }
  }

  const mainImage = product.main_image || (product.images && product.images[0])

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 hover:border-primary-200">
      {/* Изображение */}
      <Link to={`/shop/products/${product.id}`} className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden block">
        {mainImage && !imageError ? (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">
              {product.animal === 'dog' ? '🐕' : product.animal === 'cat' ? '🐱' : '🐾'}
            </span>
          </div>
        )}
        
        {/* Бейдж скидки */}
        {product.discount_percent > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs rounded-full font-bold shadow-sm">
            -{product.discount_percent}%
          </div>
        )}
        
        {/* Причина рекомендации */}
        {showReason && product.reason && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">
              {product.reason}
            </p>
          </div>
        )}
      </Link>
      
      {/* Информация */}
      <div className="flex-1 flex flex-col p-3">
        {/* Бренд */}
        {product.vendor && (
          <p className="text-xs text-primary-600 font-semibold mb-0.5 uppercase tracking-wider">
            {product.vendor}
          </p>
        )}
        
        {/* Название */}
        <Link to={`/shop/products/${product.id}`}>
          <h4 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug hover:text-primary-600 transition-colors mb-2">
            {product.name}
          </h4>
        </Link>
        
        {/* Цена и кнопка */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <div className="flex flex-col">
            {product.discount_percent > 0 ? (
              <>
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="text-base font-bold text-red-600">
                  {formatPrice(product.discounted_price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {isInCart ? (
            <div className="flex items-center bg-gray-100 rounded-lg text-sm">
              <button
                onClick={(e) => handleQuantityChange(e, -1)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-l-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="px-2 font-medium text-gray-700">{cartQuantity}</span>
              <button
                onClick={(e) => handleQuantityChange(e, 1)}
                disabled={cartQuantity >= (product.stock_count || 999)}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-r-lg transition-colors disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isAdding || product.stock_count <= 0}
              className={`p-2 rounded-lg transition-all duration-200 ${
                product.stock_count <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md'
              }`}
              title={product.stock_count <= 0 ? 'Нет в наличии' : 'Добавить в корзину'}
            >
              {isAdding ? (
                <ButtonLoader />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Компонент мини-карточки курса для рекомендаций
 */
function RecommendationCourseCard({ course, showReason = false }) {
  const mainImage = course.main_image || course.image_url

  return (
    <Link 
      to={`/courses/${course.id}`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100 hover:border-amber-200"
    >
      {/* Изображение */}
      <div className="aspect-video bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">📚</span>
          </div>
        )}
        
        {/* Бейдж уровня */}
        {course.level && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 text-xs rounded-full font-medium">
            {course.level_display || course.level}
          </div>
        )}
        
        {/* Цена/Бесплатно */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold ${
          course.is_free || course.price === 0
            ? 'bg-green-500 text-white'
            : 'bg-amber-500 text-white'
        }`}>
          {course.is_free || course.price === 0 ? 'Бесплатно' : formatPrice(course.effective_price || course.price)}
        </div>
        
        {/* Причина рекомендации */}
        {showReason && course.reason && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">
              {course.reason}
            </p>
          </div>
        )}
      </div>
      
      {/* Информация */}
      <div className="flex-1 flex flex-col p-3">
        <h4 className="font-medium text-gray-900 text-sm line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors mb-2">
          {course.title}
        </h4>
        
        {/* Мета-информация */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto">
          {course.duration_display && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {course.duration_display}
            </span>
          )}
          {course.lessons_count && (
            <span>{course.lessons_count} уроков</span>
          )}
        </div>
      </div>
    </Link>
  )
}

/**
 * Скелетон загрузки
 */
function RecommendationSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-5 bg-gray-200 rounded w-16" />
              <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Основной компонент RecommendationBlock
 */
function RecommendationBlock({
  title = 'Рекомендуем',
  subtitle,
  recommendations = [],
  type = 'products',
  onAddToCart,
  loading = false,
  compact = false,
  showReason = true,
  emptyMessage = 'Нет рекомендаций',
  className = ''
}) {
  if (loading) {
    return (
      <section className={`py-6 ${className}`}>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <RecommendationSkeleton count={compact ? 3 : 4} />
      </section>
    )
  }

  if (!recommendations || recommendations.length === 0) {
    return null // Не показываем пустой блок
  }

  const gridCols = compact 
    ? 'grid-cols-2 sm:grid-cols-3' 
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'

  return (
    <section className={`py-6 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        
        {recommendations.length > 6 && (
          <Link 
            to={type === 'courses' ? '/courses' : '/shop'}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            Смотреть все
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
      
      {/* Карточки */}
      <div className={`grid ${gridCols} gap-4`}>
        {recommendations.slice(0, compact ? 6 : 12).map((item, index) => {
          // Определяем тип элемента
          const isProduct = type === 'products' || item.product || item.price !== undefined
          const isCourse = type === 'courses' || item.course || item.title !== undefined
          
          // Извлекаем данные
          const data = item.product || item.course || item
          
          if (isCourse && !isProduct) {
            return (
              <RecommendationCourseCard
                key={data.id || index}
                course={data}
                showReason={showReason}
              />
            )
          }
          
          return (
            <RecommendationProductCard
              key={data.id || index}
              product={data}
              onAddToCart={onAddToCart}
              showReason={showReason}
            />
          )
        })}
      </div>
    </section>
  )
}

export default RecommendationBlock
export { RecommendationProductCard, RecommendationCourseCard, RecommendationSkeleton }

