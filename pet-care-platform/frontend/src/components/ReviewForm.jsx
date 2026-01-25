/**
 * Компонент формы отзыва
 * 
 * Позволяет пользователю оставить отзыв и рейтинг для товара или курса.
 * Доступно только для пользователей, которые приобрели товар/курс.
 */

import { useState } from 'react'
import Rating from './Rating'
import { ButtonLoader } from './Loader'

/**
 * Компонент формы отзыва
 *
 * @param {boolean} isPurchased - Приобретен ли товар/курс
 * @param {function} onSubmit - Обработчик отправки отзыва
 * @param {function} onDelete - Обработчик удаления отзыва
 * @param {boolean} isLoading - Состояние загрузки
 * @param {Object} existingReview - Существующий отзыв (если есть)
 */
function ReviewForm({ isPurchased, onSubmit, onDelete, isLoading = false, existingReview = null }) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [errors, setErrors] = useState({})
  
  /**
   * Валидация формы
   */
  const validate = () => {
    const newErrors = {}
    
    if (rating === 0) {
      newErrors.rating = 'Пожалуйста, выберите оценку'
    }
    
    if (comment.trim().length < 10) {
      newErrors.comment = 'Отзыв должен содержать минимум 10 символов'
    }
    
    if (comment.trim().length > 2000) {
      newErrors.comment = 'Отзыв не должен превышать 2000 символов'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  /**
   * Обработчик отправки формы
   */
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    onSubmit({
      rating,
      comment: comment.trim()
    })
  }
  
  // Проверка возможности оставить отзыв теперь происходит в ReviewsSection
  // через API eligibility, поэтому здесь не нужна проверка isPurchased
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Рейтинг */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ваша оценка *
        </label>
        <Rating
          rating={rating}
          readonly={false}
          onChange={setRating}
          size="lg"
        />
        {errors.rating && (
          <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
        )}
      </div>
      
      {/* Комментарий */}
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Ваш отзыв *
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          placeholder="Поделитесь своим опытом использования товара или прохождения курса..."
          disabled={isLoading}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.comment && (
            <p className="text-sm text-red-600">{errors.comment}</p>
          )}
          <p className={`text-xs ml-auto ${comment.length > 2000 ? 'text-red-600' : 'text-gray-500'}`}>
            {comment.length} / 2000
          </p>
        </div>
      </div>
      
      {/* Кнопка отправки */}
      <div className="flex justify-between items-center">
        {/* Кнопка удаления (только для существующего отзыва) */}
        {existingReview && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Удалить отзыв
          </button>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-3 ml-auto">
          {existingReview && (
            <button
              type="button"
              onClick={() => {
                setRating(existingReview.rating)
                setComment(existingReview.comment)
                setErrors({})
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || rating === 0 || comment.trim().length < 10}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <ButtonLoader />
                Отправка...
              </>
            ) : existingReview ? (
              'Обновить отзыв'
            ) : (
              'Опубликовать отзыв'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

export default ReviewForm

