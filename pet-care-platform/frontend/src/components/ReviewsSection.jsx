/**
 * Компонент секции отзывов
 * 
 * Объединяет форму отзыва и список отзывов для товаров и курсов.
 */

import { useState, useEffect } from 'react'
import ReviewForm from './ReviewForm'
import ReviewList from './ReviewList'
import Rating from './Rating'
import { 
  getProductReviews, 
  getCourseReviews, 
  createProductReview, 
  createCourseReview,
  updateProductReview,
  updateCourseReview,
  checkReviewEligibility
} from '../api/reviews'
import { useToastStore } from '../store/toastStore'

/**
 * Компонент секции отзывов
 * 
 * @param {string} type - Тип ('product' или 'course')
 * @param {number} itemId - ID товара или курса
 * @param {boolean} isPurchased - Приобретен ли товар/курс
 */
function ReviewsSection({ type, itemId, isPurchased = false }) {
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(0)
  const [reviewsCount, setReviewsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingReview, setExistingReview] = useState(null)
  const [canReview, setCanReview] = useState(false)
  const [eligibilityLoading, setEligibilityLoading] = useState(true)
  const { success, error: showError } = useToastStore()
  
  /**
   * Загрузка отзывов и проверка возможности оставить отзыв
   */
  useEffect(() => {
    fetchReviews()
    checkEligibility()
  }, [type, itemId])
  
  /**
   * Загрузка отзывов
   */
  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const response = type === 'product' 
        ? await getProductReviews(itemId)
        : await getCourseReviews(itemId)
      
      setReviews(response.reviews || [])
      setRating(response.rating || 0)
      setReviewsCount(response.reviews_count || 0)
      
      // Проверяем, есть ли отзыв текущего пользователя
      if (response.user_review) {
        setExistingReview(response.user_review)
      }
    } catch (err) {
      console.error('Ошибка загрузки отзывов:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Проверка возможности оставить отзыв
   */
  const checkEligibility = async () => {
    if (!isPurchased) {
      setCanReview(false)
      setEligibilityLoading(false)
      return
    }
    
    setEligibilityLoading(true)
    try {
      const response = await checkReviewEligibility(type === 'product' ? 'products' : 'courses', itemId)
      setCanReview(response.can_review || false)
    } catch (err) {
      console.error('Ошибка проверки возможности отзыва:', err)
      // Если API недоступен, используем isPurchased как fallback
      setCanReview(isPurchased)
    } finally {
      setEligibilityLoading(false)
    }
  }
  
  /**
   * Обработчик отправки отзыва
   */
  const handleSubmitReview = async (reviewData) => {
    setIsSubmitting(true)
    try {
      let response
      
      if (existingReview) {
        // Обновление существующего отзыва
        if (type === 'product') {
          response = await updateProductReview(itemId, existingReview.id, reviewData)
        } else {
          response = await updateCourseReview(itemId, existingReview.id, reviewData)
        }
        success('Отзыв обновлен')
      } else {
        // Создание нового отзыва
        if (type === 'product') {
          response = await createProductReview(itemId, reviewData)
        } else {
          response = await createCourseReview(itemId, reviewData)
        }
        success('Отзыв опубликован')
      }
      
      // Обновляем список отзывов
      await fetchReviews()
      setExistingReview(response.review)
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Не удалось опубликовать отзыв'
      showError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Распределение рейтингов
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length
    const percentage = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0
    return { star, count, percentage }
  })
  
  return (
    <div className="mt-12 space-y-8">
      {/* Заголовок секции */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Отзывы и рейтинги</h2>
        
        {/* Общая статистика рейтинга */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Средний рейтинг */}
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {rating > 0 ? rating.toFixed(1) : '0.0'}
            </div>
            <Rating rating={rating} reviewsCount={reviewsCount} readonly={true} size="lg" />
            <p className="text-sm text-gray-500 mt-2">
              {reviewsCount} {reviewsCount === 1 ? 'отзыв' : reviewsCount < 5 ? 'отзыва' : 'отзывов'}
            </p>
          </div>
          
          {/* Распределение рейтингов */}
          <div className="md:col-span-2 space-y-2">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium text-gray-700 w-4">{star}</span>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Форма отзыва */}
      {canReview && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {existingReview ? 'Обновить ваш отзыв' : 'Оставить отзыв'}
          </h3>
          <ReviewForm
            isPurchased={isPurchased}
            onSubmit={handleSubmitReview}
            isLoading={isSubmitting}
            existingReview={existingReview}
          />
        </div>
      )}
      
      {/* Список отзывов */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Все отзывы ({reviewsCount})
        </h3>
        <ReviewList reviews={reviews} isLoading={isLoading} />
      </div>
    </div>
  )
}

export default ReviewsSection

