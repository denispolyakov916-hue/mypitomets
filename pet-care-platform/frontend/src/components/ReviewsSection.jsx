/**
 * Компонент секции отзывов
 * 
 * Объединяет форму отзыва и список отзывов для товаров и курсов.
 */

import React, { useState, useEffect, useMemo } from 'react'
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
  deleteReview,
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
  const [sortOrder, setSortOrder] = useState('positive')
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
    setEligibilityLoading(true)
    try {
      const response = await checkReviewEligibility(type === 'product' ? 'products' : 'courses', itemId)
      setCanReview(response.can_review || false)
    } catch (err) {
      console.error('Ошибка проверки возможности отзыва:', err)
      // Без подтверждения доставки не даем оставить отзыв
      setCanReview(false)
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

  /**
   * Обработчик удаления отзыва
   */
  const handleDeleteReview = async () => {
    if (!existingReview) return

    // Подтверждение удаления
    const confirmed = window.confirm('Вы уверены, что хотите удалить свой отзыв? Это действие нельзя отменить.')
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      await deleteReview(type === 'product' ? 'products' : 'courses', itemId, existingReview.id)
      success('Отзыв удален')

      // Обновляем список отзывов и сбрасываем состояние
      await fetchReviews()
      setExistingReview(null)
    } catch (err) {
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.message ||
                          err.message ||
                          'Не удалось удалить отзыв'
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

  const sortedReviews = useMemo(() => {
    const list = [...reviews]
    if (sortOrder === 'negative') {
      return list.sort((a, b) => (a.rating || 0) - (b.rating || 0))
    }
    return list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  }, [reviews, sortOrder])

  const formatReviewsCount = (count) => {
    if (count === 1) return 'отзыв'
    if (count > 1 && count < 5) return 'отзыва'
    return 'отзывов'
  }
  
  return (
    <div className="mt-6 space-y-4" id="reviews">
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Отзывы и рейтинги</h2>
          <span className="text-xs text-gray-500">
            {reviewsCount} {formatReviewsCount(reviewsCount)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-3">
          {canReview && (
            <div className="card">
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {existingReview ? 'Обновить ваш отзыв' : 'Оставить отзыв'}
              </h3>
              <ReviewForm
                isPurchased={isPurchased}
                onSubmit={handleSubmitReview}
                onDelete={handleDeleteReview}
                isLoading={isSubmitting}
                existingReview={existingReview}
              />
            </div>
          )}

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                Все отзывы ({reviewsCount})
              </h3>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="positive">Сначала положительные</option>
                <option value="negative">Сначала отрицательные</option>
              </select>
            </div>
            <ReviewList reviews={sortedReviews} isLoading={isLoading} />
          </div>
        </div>

        <aside className="rounded-xl border border-gray-100 bg-gray-50 p-3 h-fit">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600">Средний рейтинг</div>
            <div className="text-lg font-semibold text-gray-900">
              {rating > 0 ? rating.toFixed(1) : '0.0'}
            </div>
          </div>
          <Rating rating={rating} reviewsCount={null} readonly={true} size="md" />
          <div className="mt-2 space-y-1.5">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-10">
                  <span className="text-xs font-medium text-gray-700 w-3">{star}</span>
                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                </div>
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ReviewsSection

