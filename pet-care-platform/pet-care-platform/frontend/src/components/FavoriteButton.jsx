/**
 * Кнопка добавления в избранное
 * 
 * Универсальный компонент для товаров и курсов.
 * Анимированная иконка сердца с состояниями.
 * 
 * @example
 * <FavoriteButton itemId={product.id} type="product" />
 * <FavoriteButton itemId={course.id} type="course" size="lg" />
 */

import { useState } from 'react'
import PropTypes from 'prop-types'
import { useFavoritesStore } from '../store/favoritesStore'
import { useToastStore } from '../store/toastStore'

/**
 * Иконка сердца
 */
const HeartIcon = ({ filled, className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

/**
 * Размеры кнопки
 */
const sizes = {
  sm: {
    button: 'w-11 h-11',
    icon: 'w-5 h-5',
  },
  md: {
    button: 'w-11 h-11',
    icon: 'w-5 h-5',
  },
  lg: {
    button: 'w-12 h-12',
    icon: 'w-6 h-6',
  },
}

/**
 * Компонент FavoriteButton
 */
function FavoriteButton({
  itemId,
  type = 'product', // 'product' | 'course'
  size = 'md',
  showBackground = true,
  className = '',
  onToggle,
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const success = useToastStore(s => s.success)
  
  // Получаем методы из store
  const toggleProduct = useFavoritesStore(state => state.toggleProduct)
  const toggleCourse = useFavoritesStore(state => state.toggleCourse)
  const isProductFavorite = useFavoritesStore(state => state.isProductFavorite)
  const isCourseFavorite = useFavoritesStore(state => state.isCourseFavorite)
  
  // Определяем текущее состояние
  const isFavorite = type === 'product'
    ? isProductFavorite(itemId)
    : isCourseFavorite(itemId)
  
  // Обработчик клика
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Запускаем анимацию
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
    
    // Переключаем состояние
    const newState = type === 'product'
      ? toggleProduct(itemId)
      : toggleCourse(itemId)
    
    // Показываем уведомление
    if (newState) {
      success(type === 'product' ? 'Товар добавлен в избранное' : 'Курс добавлен в избранное')
    }
    
    // Вызываем callback
    onToggle?.(newState)
  }
  
  const sizeConfig = sizes[size] || sizes.md
  
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        ${sizeConfig.button}
        flex items-center justify-center
        ${showBackground ? 'bg-white/90 hover:bg-white shadow-sm' : 'hover:bg-black/5'}
        rounded-full
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${isAnimating ? 'scale-125' : 'scale-100'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      aria-pressed={isFavorite}
    >
      <HeartIcon
        filled={isFavorite}
        className={`
          ${sizeConfig.icon}
          transition-all duration-200
          ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}
          ${isAnimating ? 'scale-110' : 'scale-100'}
        `.trim().replace(/\s+/g, ' ')}
      />
    </button>
  )
}

FavoriteButton.propTypes = {
  itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.oneOf(['product', 'course']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showBackground: PropTypes.bool,
  className: PropTypes.string,
  onToggle: PropTypes.func,
}

export default FavoriteButton

