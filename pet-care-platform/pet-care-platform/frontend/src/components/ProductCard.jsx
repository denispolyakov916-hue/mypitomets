/**
 * Оптимизированный компонент карточки товара (стиль Wildberries)
 *
 * Информативный дизайн с:
 * - Скидка и старая цена
 * - Бейджи особенностей (гипоаллергенный, ветеринарный, беззерновой)
 * - Количество вариаций (SKU)
 * - Рейтинг с количеством отзывов
 * - Кнопка избранного (всегда видна)
 * - Индикатор наличия
 */

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { ShoppingCart } from 'lucide-react'
import { Card, CardMedia } from './ui/Card'
import { ButtonLoader } from './Loader'
import { useCartStore } from '../store/cartStore'
import { useFavoritesStore } from '../store/favoritesStore'
import { ProductPropTypes } from '../utils/propTypes'
import { formatPrice } from '../utils/format'

/**
 * Получение URL изображения из различных форматов
 */
const getImageUrl = (image) => {
  if (!image) return null
  if (typeof image === 'string') return image
  if (typeof image === 'object') {
    return image.url || image.src || image.image_url || null
  }
  return null
}

/**
 * Компонент оптимизированного изображения товара
 */
const ProductImage = memo(function ProductImage({ src, alt, animal }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px', threshold: 0 }
    )
    
    if (imgRef.current) observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [])
  
  const animalEmoji = animal === 'dog' ? '🐕' : animal === 'cat' ? '🐱' : '🐾'
  
  return (
    <div ref={imgRef} className="w-full h-full relative">
      {/* #region agent log */}
      {(!isLoaded || !isInView) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <span className="text-5xl opacity-30 animate-pulse">{animalEmoji}</span>
        </div>
      )}
      
      {isInView && src && !hasError && (
        <img
          src={src}
          alt={alt || 'Изображение товара'}
          className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
      
      {(hasError || !src) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <span className="text-5xl opacity-30">{animalEmoji}</span>
        </div>
      )}
    </div>
  )
})

/**
 * Кнопка избранного
 */
const FavoriteBtn = memo(function FavoriteBtn({ productId }) {
  const { isProductFavorite, toggleProduct } = useFavoritesStore()
  const isFavorite = isProductFavorite(productId)
  
  const handleClick = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleProduct(productId)
  }, [productId, toggleProduct])
  
  return (
    <button
      onClick={handleClick}
      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
        isFavorite 
          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
          : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white'
      } shadow-sm`}
      aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <svg 
        className="w-5 h-5" 
        fill={isFavorite ? 'currentColor' : 'none'} 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        strokeWidth={isFavorite ? 0 : 2}
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
        />
      </svg>
    </button>
  )
})

/**
 * Анимированная кнопка корзины (стиль Ozon)
 * При добавлении товара кнопка сжимается влево, освобождая место для счётчика
 */
const CartButton = memo(function CartButton({ 
  product, 
  isInCart, 
  cartQuantity, 
  isAvailable, 
  isAdding, 
  onAdd, 
  onQuantityChange 
}) {
  const navigate = useNavigate()

  if (!isAvailable) {
    return (
      <button
        disabled
        className="w-full h-10 rounded-2xl flex flex-col items-center justify-center bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        <span className="text-sm font-medium">Нет в наличии</span>
      </button>
    )
  }

  // Показываем счётчик, когда товар в корзине
  const showCounter = isInCart
  const counterWidthClass = showCounter ? 'w-[88px]' : 'w-0'

  return (
    <div className="flex items-stretch gap-1.5 h-10">
      {/* Основная кнопка: либо "В корзину", либо "В корзине" */}
      {showCounter ? (
        <button
          onClick={() => navigate('/cart')}
          className="flex-1 min-w-0 px-3 rounded-2xl flex flex-col items-center justify-center bg-green-500 hover:bg-green-600 text-white transition-all duration-300"
        >
          <span className="text-xs font-medium leading-tight">В корзине</span>
          <span className="text-[10px] opacity-80 leading-tight">Перейти</span>
        </button>
      ) : (
        <button
          onClick={onAdd}
          disabled={isAdding}
          className="flex-1 min-w-0 h-10 rounded-xl flex items-center justify-center gap-2 text-white transition-all duration-300 bg-primary-700 hover:bg-primary-800 active:scale-[0.98]"
        >
          {isAdding ? (
            <ButtonLoader />
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 flex-shrink-0" aria-hidden />
              <span className="text-sm font-medium">В корзину</span>
            </>
          )}
        </button>
      )}
      
      {/* Счётчик количества - ширина и появление синхронизированы с кнопкой */}
      <div
        className={`
          flex-shrink-0 flex items-center bg-gray-100 rounded-2xl overflow-hidden
          transition-all duration-300
          ${counterWidthClass}
          ${showCounter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'}
        `.trim().replace(/\s+/g, ' ')}
        aria-hidden={!showCounter}
      >
        <button
          onClick={() => onQuantityChange(-1)}
          className="min-w-11 h-11 flex items-center justify-center text-primary-700 hover:bg-gray-200 transition-colors"
          tabIndex={showCounter ? 0 : -1}
          aria-label="Уменьшить количество"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 0 3h-13A1.5 1.5 0 0 1 4 12" />
          </svg>
        </button>
        
        <span className="text-sm font-semibold text-gray-800 w-6 text-center">
          {cartQuantity}
        </span>
        
        <button
          onClick={() => onQuantityChange(1)}
          disabled={cartQuantity >= (product.stock_count || 999)}
          className="min-w-11 h-11 flex items-center justify-center text-primary-700 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          tabIndex={showCounter ? 0 : -1}
          aria-label="Увеличить количество"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4a1.5 1.5 0 0 1 1.5 1.5v5h5a1.5 1.5 0 0 1 0 3h-5v5a1.5 1.5 0 0 1-3 0v-5h-5a1.5 1.5 0 0 1 0-3h5v-5A1.5 1.5 0 0 1 12 4" />
          </svg>
        </button>
      </div>
    </div>
  )
})

/**
 * Компонент ProductCard (информативный стиль)
 */
const ProductCard = memo(function ProductCard({ product, onAddToCart, isLoading = false }) {
  const [isAdding, setIsAdding] = useState(false)
  const { getItemInCart, updateQuantity, addItem } = useCartStore()

  const cartItem = getItemInCart(product.id)
  const isInCart = !!cartItem
  const cartQuantity = cartItem?.quantity || 0
  
  // Расчёт скидки
  const hasDiscount = product.compare_price && product.compare_price > product.price
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.price / product.compare_price) * 100) 
    : 0
  
  // Главное изображение
  const mainImage = getImageUrl(product.image_url) 
    || getImageUrl(product.main_image) 
    || getImageUrl(product.images?.[0])
  
  // Тип животного
  const animalType = product.animal_type
  
  // Наличие
  const isAvailable = product.is_available
  
  const handleAddToCart = useCallback(async () => {
    if (isAdding || isLoading) return
    setIsAdding(true)
    try {
      // Если передан внешний обработчик - используем его (для проверки авторизации и т.д.)
      if (onAddToCart) {
        await onAddToCart(product, 1)
      } else {
        // Иначе добавляем напрямую через store
        await addItem(product.id, 1)
      }
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
    } finally {
      setIsAdding(false)
    }
  }, [isAdding, isLoading, onAddToCart, product, addItem])

  const handleQuantityChange = useCallback(async (delta) => {
    const newQuantity = cartQuantity + delta
    if (newQuantity < 0) return
    await updateQuantity(product.id, newQuantity)
  }, [cartQuantity, product.id, updateQuantity])

  return (
    <Card as="article" variant="default" hoverable rounded="2xl" className="group flex flex-col h-full overflow-hidden bg-[#F7F5FC]/50 border border-primary-200/50 shadow-card hover:shadow-card-hover">
      {/* Изображение */}
      <CardMedia aspectRatio="square" className="bg-white rounded-t-2xl">
        <Link 
          to={`/shop/products/${product.id}`} 
          className="relative block w-full h-full"
          aria-label={`Перейти к товару ${product.name}`}
        >
        <ProductImage src={mainImage} alt={product.name || 'Изображение товара'} animal={animalType} />
        
        {/* Бейдж скидки по референсу — жёлтый, скруглённый */}
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-accent-400 text-gray-900 text-xs font-bold rounded-lg shadow-sm">
            -{discountPercent}%
          </span>
        )}
        
        {/* Особенность (одна по приоритету) */}
        {discountPercent === 0 && (product.is_veterinary || product.is_hypoallergenic || product.is_grain_free) && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 text-gray-700 text-[10px] font-semibold rounded-lg shadow-sm border border-primary-200">
            {product.is_veterinary ? '⚕️ Ветдиета' : product.is_hypoallergenic ? '🛡️ Гипоаллерг.' : '🌾 Без зерна'}
          </span>
        )}
        
        {/* Кнопка избранного - всегда видна */}
        <div className="absolute top-2 right-2">
          <FavoriteBtn productId={product.id} />
        </div>
        
        {/* Тип животного */}
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
            animalType === 'dog' ? 'bg-blue-100 text-blue-700' :
            animalType === 'cat' ? 'bg-primary-100 text-primary-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {animalType === 'dog' ? 'Для собак' : animalType === 'cat' ? 'Для кошек' : 'Для всех'}
          </span>
        </div>
        
        {/* Количество вариаций */}
        {product.sku_count > 1 && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-0.5 bg-white/90 text-gray-600 text-[10px] font-medium rounded shadow-sm">
              {product.sku_count} вариант{product.sku_count > 4 ? 'ов' : product.sku_count > 1 ? 'а' : ''}
            </span>
          </div>
        )}
        
        {/* Нет в наличии */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="px-3 py-1 bg-gray-800 text-white text-sm font-medium rounded">
              Нет в наличии
            </span>
          </div>
        )}
        </Link>
      </CardMedia>
      
      {/* Информация по референсу: бренд → цена → описание → кнопка */}
      <div className="flex-1 flex flex-col p-4">
        {/* Бренд сверху */}
        {product.brand_name && (
          <p className="text-sm text-primary-800 font-semibold mb-1 truncate">
            {product.brand_name}
          </p>
        )}
        
        {/* Цена: текущая жирно, старая зачёркнута, серое число (рейтинг/отзывы) */}
        <div className="flex items-baseline gap-2 flex-wrap mb-1">
          <span className="text-lg font-bold text-primary-900">
            {formatPrice(product.price)}
          </span>
          {discountPercent > 0 && product.compare_price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
          {(product.rating_count || product.reviews_count) > 0 && (
            <span className="text-xs text-gray-500">
              {product.rating_count || product.reviews_count}
            </span>
          )}
        </div>
        
        {/* Описание (название) */}
        <Link to={`/shop/products/${product.id}`} className="block mb-3">
          <h3 className="text-sm text-gray-700 leading-snug line-clamp-2 hover:text-primary-700 transition-colors min-h-[2.6rem]">
            {product.name}
          </h3>
        </Link>
        
        {/* Рейтинг — компактно */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-accent-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
            <span className="ml-0.5 text-sm font-medium text-gray-700">
              {(product.rating || 0).toFixed(1)}
            </span>
          </div>
          {product.stock_count > 0 && product.stock_count <= 5 && isAvailable && (
            <span className="ml-auto text-xs text-accent-600 font-medium">
              Осталось {product.stock_count}
            </span>
          )}
        </div>
        
        {/* Кнопка корзины */}
        <div className="mt-auto">
          <CartButton
            product={product}
            isInCart={isInCart}
            cartQuantity={cartQuantity}
            isAvailable={isAvailable}
            isAdding={isAdding}
            onAdd={handleAddToCart}
            onQuantityChange={handleQuantityChange}
          />
        </div>
      </div>
    </Card>
  )
})

ProductCard.propTypes = {
  product: ProductPropTypes.isRequired,
  onAddToCart: PropTypes.func,
  isLoading: PropTypes.bool,
}

export default ProductCard
