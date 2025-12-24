/**
 * Компонент рейтинга (звезды)
 * 
 * Отображает рейтинг в виде 5 звезд с возможностью:
 * - Только просмотра (readonly)
 * - Интерактивного выбора рейтинга
 * - Отображения среднего рейтинга с количеством отзывов
 */

import { useState } from 'react'

/**
 * Компонент рейтинга
 * 
 * @param {number} rating - Текущий рейтинг (0-5)
 * @param {number} reviewsCount - Количество отзывов (опционально)
 * @param {boolean} readonly - Только для просмотра
 * @param {function} onChange - Обработчик изменения рейтинга
 * @param {string} size - Размер звезд ('sm', 'md', 'lg')
 */
function Rating({ 
  rating = 0, 
  reviewsCount = null, 
  readonly = true, 
  onChange = null,
  size = 'md' 
}) {
  const [hoveredRating, setHoveredRating] = useState(0)
  
  // Размеры звезд
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }
  
  const starSize = sizeClasses[size] || sizeClasses.md
  
  /**
   * Обработчик клика по звезде
   */
  const handleClick = (value) => {
    if (readonly || !onChange) return
    onChange(value)
  }
  
  /**
   * Обработчик наведения на звезду
   */
  const handleMouseEnter = (value) => {
    if (readonly) return
    setHoveredRating(value)
  }
  
  /**
   * Обработчик ухода мыши
   */
  const handleMouseLeave = () => {
    if (readonly) return
    setHoveredRating(0)
  }
  
  // Определяем активный рейтинг (hovered или текущий)
  const activeRating = hoveredRating || rating
  
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= activeRating
          
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleClick(value)}
              onMouseEnter={() => handleMouseEnter(value)}
              disabled={readonly}
              className={`
                ${starSize} 
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} 
                transition-all duration-150
                ${isFilled ? 'text-yellow-400' : 'text-gray-300'}
              `}
              aria-label={`Оценка ${value} из 5`}
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            </button>
          )
        })}
      </div>
      
      {/* Отображение рейтинга и количества отзывов */}
      {(rating > 0 || reviewsCount !== null) && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-gray-700">
            {rating > 0 ? rating.toFixed(1) : '0.0'}
          </span>
          {reviewsCount !== null && reviewsCount !== undefined && (
            <span className="text-gray-500">
              ({reviewsCount} {reviewsCount === 1 ? 'отзыв' : reviewsCount < 5 ? 'отзыва' : 'отзывов'})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Rating

