import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui'
import { Card } from '../ui'
import { Textarea } from '../ui'
import Rating from '../Rating'
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
  const user = useAuthStore(s => s.user)
  const [ratings, setRatings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(true)
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

      setEditing(false)

      if (onRatingSubmit) {
        onRatingSubmit(selectedRating, review)
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setSubmitting(false)
    }
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
      setEditing(false)
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
      {/* Форма оценки */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editing || userRating ? 'Редактировать оценку' : 'Оценить курс'}
        </h3>

        <div className="space-y-4">
            {/* Выбор рейтинга */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ваша оценка
              </label>
              <div className="flex justify-center">
                <Rating
                  rating={selectedRating}
                  readonly={false}
                  onChange={setSelectedRating}
                  size="lg"
                />
              </div>
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
              {!userRating && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedRating(0)
                    setReview('')
                  }}
                  disabled={submitting}
                >
                  Отмена
                </Button>
              )}
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
                  <Rating rating={rating.rating} size="sm" />
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
