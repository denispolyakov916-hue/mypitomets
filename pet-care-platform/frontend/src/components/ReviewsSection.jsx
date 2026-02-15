/**
 * ReviewsSection - Секция отзывов с формой, списком, лайками, ответами
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
import { useAuthStore } from '../store/authStore'

function ReviewsSection({ type, itemId, isPurchased = false }) {
  const { isAuthenticated } = useAuthStore()
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(0)
  const [reviewsCount, setReviewsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingReview, setExistingReview] = useState(null)
  const [canReview, setCanReview] = useState(false)
  const [sortOrder, setSortOrder] = useState('positive')
  const [replyingTo, setReplyingTo] = useState(null) // ID отзыва, на который отвечаем
  const { success, error: showError } = useToastStore()

  useEffect(() => {
    fetchReviews()
    if (isAuthenticated) checkEligibility()
  }, [type, itemId, isAuthenticated])

  const fetchReviews = async () => {
    setIsLoading(true)
    try {
      const response = type === 'product'
        ? await getProductReviews(itemId)
        : await getCourseReviews(itemId)

      setReviews(response.reviews || [])
      setRating(response.rating || 0)
      setReviewsCount(response.reviews_count || 0)
      if (response.user_review) setExistingReview(response.user_review)
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const checkEligibility = async () => {
    try {
      const response = await checkReviewEligibility(type === 'product' ? 'products' : 'courses', itemId)
      setCanReview(response.can_review || false)
    } catch {
      setCanReview(false)
    }
  }

  const handleSubmitReview = async (reviewData) => {
    setIsSubmitting(true)
    try {
      let response
      if (existingReview && !replyingTo) {
        // Обновление существующего отзыва
        response = type === 'product'
          ? await updateProductReview(itemId, existingReview.id, reviewData)
          : await updateCourseReview(itemId, existingReview.id, reviewData)
        success('Отзыв обновлен')
      } else {
        // Создание нового отзыва (или ответа)
        const data = { ...reviewData }
        if (replyingTo) data.parent_id = replyingTo

        response = type === 'product'
          ? await createProductReview(itemId, data)
          : await createCourseReview(itemId, data)

        success(replyingTo ? 'Ответ опубликован' : 'Отзыв опубликован')
        setReplyingTo(null)
      }

      await fetchReviews()
      if (!replyingTo) setExistingReview(response.review)
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Не удалось опубликовать отзыв')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!existingReview) return
    if (!window.confirm('Удалить ваш отзыв?')) return

    setIsSubmitting(true)
    try {
      await deleteReview(type === 'product' ? 'products' : 'courses', itemId, existingReview.id)
      success('Отзыв удален')
      await fetchReviews()
      setExistingReview(null)
    } catch (err) {
      showError(err.response?.data?.error || 'Не удалось удалить отзыв')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = (reviewId) => {
    setReplyingTo(reviewId)
    // Скроллим к форме
    document.getElementById('review-reply-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length
    const percentage = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0
    return { star, count, percentage }
  })

  const sortedReviews = useMemo(() => {
    const list = [...reviews]
    if (sortOrder === 'negative') return list.sort((a, b) => (a.rating || 0) - (b.rating || 0))
    if (sortOrder === 'newest') return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  }, [reviews, sortOrder])

  const replyParentReview = replyingTo ? reviews.find(r => r.id === replyingTo) : null

  return (
    <div className="mt-6 space-y-4" id="reviews">
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Отзывы</h2>
          <span className="text-xs text-gray-500">{reviewsCount} отзывов</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-3">
          {/* Форма отзыва / ответа */}
          {(canReview || replyingTo) && (
            <div className="card" id="review-reply-form">
              {replyingTo && replyParentReview && (
                <div className="flex items-center justify-between mb-3 p-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    Ответ на отзыв от {replyParentReview.user_name?.[0]}***
                  </span>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-blue-400 hover:text-blue-600 text-xs"
                  >
                    Отмена
                  </button>
                </div>
              )}
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                {replyingTo ? 'Написать ответ' : existingReview ? 'Обновить ваш отзыв' : 'Оставить отзыв'}
              </h3>
              <ReviewForm
                isPurchased={isPurchased}
                onSubmit={handleSubmitReview}
                onDelete={!replyingTo ? handleDeleteReview : undefined}
                isLoading={isSubmitting}
                existingReview={replyingTo ? null : existingReview}
              />
            </div>
          )}

          {/* Список отзывов */}
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
                <option value="newest">Сначала новые</option>
              </select>
            </div>
            <ReviewList
              reviews={sortedReviews}
              isLoading={isLoading}
              onReply={isAuthenticated ? handleReply : undefined}
            />
          </div>
        </div>

        {/* Сайдбар с рейтингом */}
        <aside className="rounded-xl border border-gray-100 bg-gray-50 p-3 h-fit">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-600">Средний рейтинг</div>
            <div className="text-lg font-semibold text-gray-900">{rating > 0 ? rating.toFixed(1) : '—'}</div>
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
                  <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${percentage}%` }} />
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
