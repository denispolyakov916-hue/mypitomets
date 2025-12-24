/**
 * Компонент списка отзывов
 * 
 * Отображает список отзывов с рейтингом, комментариями и информацией о пользователях.
 */

import Rating from './Rating'

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
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'минуту' : diffMins < 5 ? 'минуты' : 'минут'} назад`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`
    
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
 * Компонент одного отзыва
 */
function ReviewItem({ review }) {
  // Маскируем имя пользователя (показываем только первую букву)
  const userName = review.user_name 
    ? `${review.user_name[0]}${'*'.repeat(Math.max(3, review.user_name.length - 1))}`
    : 'Анонимный пользователь'
  
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">
                {review.user_name?.[0]?.toUpperCase() || 'А'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
            </div>
          </div>
          <Rating 
            rating={review.rating} 
            readonly={true} 
            size="sm"
          />
        </div>
      </div>
      
      {review.comment && (
        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
          {review.comment}
        </p>
      )}
      
      {review.is_verified_purchase && (
        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Подтвержденная покупка
        </div>
      )}
    </div>
  )
}

/**
 * Компонент списка отзывов
 * 
 * @param {Array} reviews - Массив отзывов
 * @param {boolean} isLoading - Состояние загрузки
 */
function ReviewList({ reviews = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Загрузка отзывов...</p>
      </div>
    )
  }
  
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Пока нет отзывов. Будьте первым!</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}
    </div>
  )
}

export default ReviewList

