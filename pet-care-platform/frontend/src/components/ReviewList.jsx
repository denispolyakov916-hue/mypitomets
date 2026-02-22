/**
 * ReviewList - Компонент списка отзывов с лайками, дизлайками и ответами
 */

import { useState } from 'react'
import Rating from './Rating'
import { likeReview, dislikeReview } from '../api/reviews'
import { useAuthStore } from '../store/authStore'

/**
 * Форматирование даты в относительный формат
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин. назад`
    if (diffHours < 24) return `${diffHours} ч. назад`
    if (diffDays < 7) return `${diffDays} дн. назад`

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  } catch {
    return 'недавно'
  }
}

/**
 * Компонент одного отзыва (поддерживает вложенные ответы)
 */
function ReviewItem({ review, onReply, isReply = false, onReactionUpdate }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [reaction, setReaction] = useState(review.user_reaction || null)
  const [likes, setLikes] = useState(review.likes_count || 0)
  const [dislikes, setDislikes] = useState(review.dislikes_count || 0)
  const [reacting, setReacting] = useState(false)

  const userName = review.user_name
    ? `${review.user_name[0]}${'*'.repeat(Math.max(3, review.user_name.length - 1))}`
    : 'Анонимный пользователь'

  const handleReaction = async (type) => {
    if (!isAuthenticated || reacting) return
    setReacting(true)
    try {
      let res
      if (type === 'like') {
        res = await likeReview(review.id)
      } else {
        res = await dislikeReview(review.id)
      }
      setReaction(res.user_reaction)
      setLikes(res.likes_count)
      setDislikes(res.dislikes_count)
      onReactionUpdate?.(review.id, res)
    } catch (err) {
      console.error('Reaction error:', err)
    } finally {
      setReacting(false)
    }
  }

  return (
    <div className={`${isReply ? 'ml-10 pl-4 border-l-2 border-gray-100' : 'border-b border-gray-100 pb-4 last:border-0 last:pb-0'}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0`}>
          <span className={`text-primary-600 font-semibold ${isReply ? 'text-xs' : 'text-sm'}`}>
            {review.user_name?.[0]?.toUpperCase() || 'А'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{userName}</span>
            <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
            {review.is_verified_purchase && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-full">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Покупка
              </span>
            )}
            {review.is_edited && <span className="text-[10px] text-gray-400">(ред.)</span>}
          </div>

          {/* Рейтинг (только для корневых отзывов) */}
          {!isReply && review.rating && (
            <div className="mt-1">
              <Rating rating={review.rating} readonly={true} size="sm" />
            </div>
          )}

          {/* Комментарий */}
          {review.comment && (
            <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-wrap">{review.comment}</p>
          )}

          {/* Панель реакций */}
          <div className="flex items-center gap-3 mt-2">
            {/* Лайк */}
            <button
              onClick={() => handleReaction('like')}
              disabled={reacting || !isAuthenticated}
              className={`flex items-center gap-1 text-xs transition-colors ${
                reaction === 'like' ? 'text-green-600' : 'text-gray-400 hover:text-green-500'
              } disabled:opacity-50`}
              title={isAuthenticated ? 'Полезно' : 'Войдите, чтобы оценить'}
            >
              <svg className="w-4 h-4" fill={reaction === 'like' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 15H2v7h2v-7z" />
              </svg>
              {likes > 0 && <span>{likes}</span>}
            </button>

            {/* Дизлайк */}
            <button
              onClick={() => handleReaction('dislike')}
              disabled={reacting || !isAuthenticated}
              className={`flex items-center gap-1 text-xs transition-colors ${
                reaction === 'dislike' ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
              } disabled:opacity-50`}
              title={isAuthenticated ? 'Не полезно' : 'Войдите, чтобы оценить'}
            >
              <svg className="w-4 h-4 rotate-180" fill={reaction === 'dislike' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M4 15H2v7h2v-7z" />
              </svg>
              {dislikes > 0 && <span>{dislikes}</span>}
            </button>

            {/* Ответить */}
            {onReply && isAuthenticated && (
              <button
                onClick={() => onReply(review.id)}
                className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
              >
                Ответить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ответы (replies) */}
      {review.replies?.length > 0 && (
        <div className="mt-3 space-y-3">
          {review.replies.map(reply => (
            <ReviewItem
              key={reply.id}
              review={reply}
              isReply={true}
              onReactionUpdate={onReactionUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Компонент списка отзывов
 */
function ReviewList({ reviews = [], isLoading = false, onReply, onReactionUpdate }) {
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Загрузка отзывов...</p>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">💬</div>
        <p className="text-gray-500 text-sm">Пока нет отзывов. Будьте первым!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          onReply={onReply}
          onReactionUpdate={onReactionUpdate}
        />
      ))}
    </div>
  )
}

export default ReviewList
