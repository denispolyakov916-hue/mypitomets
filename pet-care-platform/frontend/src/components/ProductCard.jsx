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
import { ButtonLoader } from './Loader'
import { useCartStore } from '../store/cartStore'
import { useFavoritesStore } from '../store/favoritesStore'
import { ProductPropTypes } from '../utils/propTypes'

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
 * Форматирование цены
 */
const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0
})
const formatPrice = (price) => priceFormatter.format(price)

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
      {(!isLoaded || !isInView) && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <span className="text-5xl opacity-30 animate-pulse">{animalEmoji}</span>
        </div>
      )}
      
      {isInView && src && !hasError && (
        <img
          src={src}
          alt={alt}
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
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
        isFavorite 
          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
          : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white'
      } shadow-sm`}
      title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      <svg 
        className="w-5 h-5" 
        fill={isFavorite ? 'currentColor' : 'none'} 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        strokeWidth={isFavorite ? 0 : 2}
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
  const [isAnimating, setIsAnimating] = useState(false)
  const [showCounter, setShowCounter] = useState(isInCart)
  
  // Синхронизация с состоянием корзины
  useEffect(() => {
    if (isInCart && !showCounter) {
      // Товар добавлен - запускаем анимацию
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setShowCounter(true)
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    } else if (!isInCart && showCounter) {
      // Товар удалён - сбрасываем состояние
      setShowCounter(false)
      setIsAnimating(false)
    }
  }, [isInCart, showCounter])

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

  // Если товар в корзине или анимация завершается - показываем две кнопки
  if (showCounter || isInCart) {
    return (
      <div className="flex items-stretch gap-1.5 h-10">
        {/* Кнопка "В корзине" - занимает основное пространство */}
        <button
          onClick={() => navigate('/cart')}
          className="flex-1 min-w-0 px-3 rounded-2xl flex flex-col items-center justify-center bg-green-500 hover:bg-green-600 text-white transition-all duration-300"
        >
          <span className="text-xs font-medium leading-tight">В корзине</span>
          <span className="text-[10px] opacity-80 leading-tight">Перейти</span>
        </button>
        
        {/* Счётчик количества - компактный */}
        <div 
          className={`flex-shrink-0 flex items-center bg-gray-100 rounded-2xl overflow-hidden transition-all duration-300 ${
            showCounter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
          }`}
        >
          <button
            onClick={() => onQuantityChange(-1)}
            className="w-8 h-full flex items-center justify-center text-purple-600 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 12a1.5 1.5 0 0 1 1.5-1.5h13a1.5 1.5 0 0 1 0 3h-13A1.5 1.5 0 0 1 4 12" />
            </svg>
          </button>
          
          <span className="text-sm font-semibold text-gray-800 w-6 text-center">
            {cartQuantity}
          </span>
          
          <button
            onClick={() => onQuantityChange(1)}
            disabled={cartQuantity >= (product.stock_count || 999)}
            className="w-8 h-full flex items-center justify-center text-purple-600 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4a1.5 1.5 0 0 1 1.5 1.5v5h5a1.5 1.5 0 0 1 0 3h-5v5a1.5 1.5 0 0 1-3 0v-5h-5a1.5 1.5 0 0 1 0-3h5v-5A1.5 1.5 0 0 1 12 4" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Исходное состояние - кнопка "В корзину"
  return (
    <button
      onClick={onAdd}
      disabled={isAdding}
      className={`w-full h-10 rounded-2xl flex flex-col items-center justify-center text-white transition-all duration-300 ${
        isAnimating 
          ? 'bg-green-500 animate-shrinkLeft' 
          : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.98]'
      }`}
    >
      {isAdding ? (
        <ButtonLoader />
      ) : (
        <>
          <span className="text-sm font-medium leading-tight">В корзину</span>
          <span className="text-[10px] opacity-80 leading-tight">Быстрая доставка</span>
        </>
      )}
    </button>
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
    : (product.discount_percent || 0)
  
  // Главное изображение
  const mainImage = getImageUrl(product.image_url) 
    || getImageUrl(product.main_image) 
    || getImageUrl(product.images?.[0])
  
  // Тип животного
  const animalType = product.animal_type || product.animal
  
  // Наличие
  const isAvailable = product.is_available || product.in_stock || product.stock_count > 0
  
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
    if (delta > 0 && newQuantity > (product.stock_count || 999)) return
    if (newQuantity < 0) return
    await updateQuantity(product.id, newQuantity)
  }, [cartQuantity, product.stock_count, product.id, updateQuantity])

  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col h-full overflow-hidden">
      {/* Изображение */}
      <Link to={`/shop/products/${product.id}`} className="aspect-square relative overflow-hidden bg-gray-50 block">
        <ProductImage src={mainImage} alt={product.name} animal={animalType} />
        
        {/* Бейджи сверху слева */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Скидка */}
          {discountPercent > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
              -{discountPercent}%
            </span>
          )}
          
          {/* Особенности */}
          {product.is_veterinary && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-medium rounded">
              Ветдиета
            </span>
          )}
          {product.is_hypoallergenic && (
            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-medium rounded">
              Гипоаллерг.
            </span>
          )}
          {product.is_grain_free && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded">
              Без зерна
            </span>
          )}
        </div>
        
        {/* Кнопка избранного - всегда видна */}
        <div className="absolute top-2 right-2">
          <FavoriteBtn productId={product.id} />
        </div>
        
        {/* Тип животного */}
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
            animalType === 'dog' ? 'bg-blue-100 text-blue-700' :
            animalType === 'cat' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {animalType === 'dog' ? '🐕 Собаки' : animalType === 'cat' ? '🐱 Кошки' : '🐾 Все'}
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
      
      {/* Информация */}
      <div className="flex-1 flex flex-col p-3">
        {/* Цена */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-lg font-bold ${discountPercent > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatPrice(product.price)}
          </span>
          {discountPercent > 0 && product.compare_price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
        
        {/* Бренд */}
        {(product.brand_name || product.vendor) && (
          <p className="text-xs text-purple-600 font-medium mb-0.5 truncate">
            {product.brand_name || product.vendor}
          </p>
        )}
        
        {/* Название */}
        <Link to={`/shop/products/${product.id}`} className="block">
          <h3 className="text-sm text-gray-800 leading-tight line-clamp-2 hover:text-purple-600 transition-colors mb-1.5 min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>
        
        {/* Рейтинг и отзывы */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
            </svg>
            <span className="ml-1 text-sm font-medium text-gray-700">
              {(product.rating || 0).toFixed(1)}
            </span>
          </div>
          {(product.rating_count || product.reviews_count) > 0 && (
            <span className="text-xs text-gray-400">
              ({product.rating_count || product.reviews_count})
            </span>
          )}
          
          {/* Остаток */}
          {product.stock_count > 0 && product.stock_count <= 5 && isAvailable && (
            <span className="ml-auto text-xs text-orange-500 font-medium">
              Осталось {product.stock_count}
            </span>
          )}
        </div>
        
        {/* Кнопка корзины (анимированная) */}
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
    </div>
  )
})

ProductCard.propTypes = {
  product: ProductPropTypes.isRequired,
  onAddToCart: PropTypes.func,
  isLoading: PropTypes.bool,
}

export default ProductCard
