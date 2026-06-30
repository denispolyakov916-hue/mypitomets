/**
 * Компонент рейтинга (звезды)
 * 
 * Отображает рейтинг в виде 5 звезд с возможностью:
 * - Только просмотра (readonly)
 * - Интерактивного выбора рейтинга
 * - Отображения среднего рейтинга с количеством отзывов
 */

import { useState } from 'react'
import PropTypes from 'prop-types'

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
  const parsedRating = typeof rating === 'number' ? rating : parseFloat(rating)
  const safeRating = Number.isFinite(parsedRating) ? parsedRating : 0
  
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
  const activeRating = hoveredRating || safeRating
  
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
      
      {/* Отображение рейтинга и количества отзывов.
          Не показываем «0.0» при отсутствии оценки — это вводит в заблуждение (P2.14). */}
      {safeRating > 0 ? (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-gray-700">
            {safeRating.toFixed(1)}
          </span>
          {reviewsCount !== null && reviewsCount !== undefined && reviewsCount > 0 && (
            <span className="text-gray-500">
              ({reviewsCount} {reviewsCount === 1 ? 'отзыв' : reviewsCount % 10 >= 2 && reviewsCount % 10 <= 4 && (reviewsCount % 100 < 10 || reviewsCount % 100 >= 20) ? 'отзыва' : 'отзывов'})
            </span>
          )}
        </div>
      ) : (
        reviewsCount !== null && reviewsCount !== undefined && (
          <span className="text-sm text-gray-400">Нет отзывов</span>
        )
      )}
    </div>
  )
}

Rating.propTypes = {
  rating: PropTypes.number,
  reviewsCount: PropTypes.number,
  readonly: PropTypes.bool,
  onChange: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
}

export default Rating

