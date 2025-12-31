import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { getCourseRatings } from '../api/courses'
import { useAuthStore } from '../store/authStore'

/**
 * Компонент для отображения рейтинга курса с пагинацией
 *
 * Показывает средний рейтинг, количество оценок и отзывы с эффективной пагинацией.
 * Может обновляться извне через updateTrigger prop.
 */
const CourseRatingDisplay = ({
  courseId,
  className = ''
}) => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState([])
  const [userRatings, setUserRatings] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const reviewsPerPage = 3

  // Загрузка данных рейтинга
  useEffect(() => {
    if (courseId) {
      loadRatingData()
    }
  }, [courseId, currentPage])

  const loadRatingData = async () => {
    if (!courseId) return

    try {
      setLoading(true)
      const response = await getCourseRatings(courseId, {
        page: currentPage,
        per_page: reviewsPerPage
      })

      setStats(response.stats || {})
      setReviews(response.results || [])
      setTotalPages(response.total_pages || 1)
      setUserRatings(response.all_user_ratings || [])
    } catch (error) {
      console.error('Error loading rating data:', error)
      setStats({})
      setReviews([])
      setUserRatings([])
    } finally {
      setLoading(false)
    }
  }

  // Отрисовка звезд
  const renderStars = (rating, size = 'text-sm') => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${size} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  // Навигация по страницам
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  if (loading && !stats) {
    return (
      <div className={`flex items-center justify-center space-x-4 mb-4 ${className}`}>
        <div className="animate-pulse flex items-center space-x-4">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 w-4 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    )
  }

  if (!stats || stats.total_ratings === 0) {
    return (
      <div className={`flex items-center justify-center space-x-4 mb-4 text-gray-500 ${className}`}>
        <span>Нет оценок</span>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Заголовок */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Рейтинг и отзывы курса</h3>

      {/* Основной рейтинг */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900">
            {stats.average_rating?.toFixed(1) || '0.0'}
          </div>
          <div className="text-sm text-gray-500">средний рейтинг</div>
        </div>

        <div className="flex flex-col items-center">
          {renderStars(Math.round(stats.average_rating || 0), 'text-xl')}
          <div className="text-xs text-gray-400 mt-1">
            {stats.total_ratings} оценок
          </div>
        </div>
      </div>

      {/* Оценки пользователя */}
      {userRatings.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="text-sm font-medium text-blue-900 mb-2">Ваши оценки:</div>
          <div className="flex flex-wrap gap-3">
            {userRatings.map((rating, index) => (
              <div key={rating.id || index} className="flex items-center space-x-2 text-sm bg-white rounded px-2 py-1">
                {renderStars(rating.rating, 'text-xs')}
                {rating.pet_name && (
                  <span className="text-blue-700">({rating.pet_name})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Отзывы с пагинацией */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <div className="text-md font-medium text-gray-700 border-b pb-2">Отзывы ({stats.total_ratings})</div>

          {reviews.map((review) => (
            <div key={review.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {review.user.username}
                  </span>
                  {review.pet_name && (
                    <span className="text-xs text-gray-500">({review.pet_name})</span>
                  )}
                  {review.user === user?.id && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Вы
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating, 'text-sm')}
                </div>
              </div>

              {review.review && (
                <p className="text-sm text-gray-700 mb-3 italic">"{review.review}"</p>
              )}

              <div className="text-xs text-gray-500">
                {new Date(review.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          ))}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>

              <span className="text-xs text-gray-500">
                {currentPage} из {totalPages}
              </span>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CourseRatingDisplay
