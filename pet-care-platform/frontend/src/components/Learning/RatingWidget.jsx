import React, { useState, useEffect } from 'react'
import { Button } from '../ui'
import { Card } from '../ui'
import { Textarea } from '../ui'
import { getCourseRatings, rateCourse } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'

/**
 * Компонент для оценки курса
 *
 * Показывает текущий рейтинг, распределение оценок,
 * позволяет поставить оценку и оставить отзыв.
 */
const RatingWidget = ({
  courseId,
  petId,
  onRatingSubmit,
  className = ''
}) => {
  const { user } = useAuthStore()
  const [ratings, setRatings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [review, setReview] = useState('')
  const [userRating, setUserRating] = useState(null)
  const [editing, setEditing] = useState(false)

  // Загрузка оценок при монтировании
  useEffect(() => {
    loadRatings()
  }, [courseId])

  const loadRatings = async () => {
    try {
      setLoading(true)
      const response = await getCourseRatings(courseId)
      // API клиент возвращает response.data напрямую
      setRatings(response.ratings)
      setStats(response.stats)

      // Проверяем, ставил ли пользователь оценку для этого питомца
      const currentUserRating = response.ratings?.find(
        rating => rating.pet === petId && rating.user === user?.id
      )
      if (currentUserRating) {
        setUserRating(currentUserRating)
        setSelectedRating(currentUserRating.rating)
        setReview(currentUserRating.review || '')
      }
    } catch (error) {
      console.error('Error loading ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Отправка оценки
  const handleSubmitRating = async () => {
    if (selectedRating === 0) return

    try {
      setSubmitting(true)
      await rateCourse(courseId, selectedRating, review, petId)

      setShowForm(false)
      loadRatings() // Перезагрузка оценок

      if (onRatingSubmit) {
        onRatingSubmit(selectedRating, review)
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Отрисовка звезд
  const renderStars = (rating, interactive = false, onStarClick = null) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl transition-colors ${
              star <= rating
                ? 'text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'hover:text-yellow-500 cursor-pointer' : ''}`}
            onClick={interactive ? () => onStarClick(star) : undefined}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  // Удаление оценки
  const handleDeleteRating = async () => {
    if (!userRating || !confirm('Вы уверены, что хотите удалить свою оценку?')) return

    try {
      // Здесь будет API вызов для удаления оценки
      // await deleteRating(userRating.id)

      setUserRating(null)
      setSelectedRating(0)
      setReview('')
      setShowForm(false)
      loadRatings()
    } catch (error) {
      console.error('Error deleting rating:', error)
    }
  }

  // Начало редактирования
  const startEditing = () => {
    setEditing(true)
    setShowForm(true)
  }

  // Отмена редактирования
  const cancelEditing = () => {
    setEditing(false)
    setShowForm(false)
    if (userRating) {
      setSelectedRating(userRating.rating)
      setReview(userRating.review || '')
    } else {
      setSelectedRating(0)
      setReview('')
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Общий рейтинг */}
      <Card className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats?.average_rating?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-gray-500">средний рейтинг</div>
            </div>

            <div className="flex flex-col items-center">
              {renderStars(Math.round(stats?.average_rating || 0))}
              <div className="text-sm text-gray-500 mt-1">
                {stats?.total_ratings || 0} оценок
              </div>
            </div>
          </div>

          {/* Распределение оценок */}
          {stats && (
            <div className="space-y-2 max-w-xs mx-auto">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating] || 0
                const percentage = stats.total_ratings > 0
                  ? (count / stats.total_ratings) * 100
                  : 0

                return (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 w-8">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Кнопка оценки */}
          {!userRating && (
            <div className="mt-6">
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
              >
                Оценить курс
              </Button>
            </div>
          )}

          {userRating && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm text-blue-700">Ваша оценка:</span>
                {renderStars(userRating.rating)}
              </div>
              {userRating.review && (
                <p className="text-sm text-blue-700 italic">"{userRating.review}"</p>
              )}

              {/* Кнопки управления оценкой */}
              <div className="flex items-center justify-center space-x-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startEditing}
                >
                  ✏️ Редактировать
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteRating}
                  className="text-red-600 hover:text-red-700"
                >
                  🗑️ Удалить
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Форма оценки */}
      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editing ? 'Редактировать оценку' : 'Оценить курс'}
          </h3>

          <div className="space-y-4">
            {/* Выбор рейтинга */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ваша оценка
              </label>
              <div className="flex justify-center">
                {renderStars(selectedRating, true, setSelectedRating)}
              </div>
              {selectedRating > 0 && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  {selectedRating} из 5 звезд
                </p>
              )}
            </div>

            {/* Отзыв */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Отзыв (опционально)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Расскажите, что вам понравилось или не понравилось в курсе..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {review.length}/500
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setSelectedRating(0)
                  setReview('')
                }}
                disabled={submitting}
              >
                Отмена
              </Button>
              <div className="flex space-x-2">
                <Button
                  onClick={handleSubmitRating}
                  disabled={submitting || selectedRating === 0}
                >
                  {submitting ? 'Отправка...' : (editing ? 'Сохранить' : 'Отправить оценку')}
                </Button>

                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={submitting}
                  >
                    Отмена
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Список отзывов */}
      {ratings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Отзывы</h3>

          <div className="space-y-4">
            {ratings.slice(0, 5).map((rating) => (
              <div key={rating.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{rating.user.username}</span>
                    {rating.pet_name && (
                      <span className="text-sm text-gray-500">({rating.pet_name})</span>
                    )}
                  </div>
                  {renderStars(rating.rating)}
                </div>

                {rating.review && (
                  <p className="text-gray-700 italic">"{rating.review}"</p>
                )}

                <div className="text-sm text-gray-500 mt-2">
                  {new Date(rating.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            ))}

            {ratings.length > 5 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  Показать все отзывы ({ratings.length})
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default RatingWidget
