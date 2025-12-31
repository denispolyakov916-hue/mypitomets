import React from 'react';
import { Link } from 'react-router-dom';

const RecentReviews = ({ reviews }) => {
  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">💬 Недавние отзывы</h2>
        <Link
          to="/admin-panel/products"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Все товары →
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <p>Нет недавних отзывов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {review.user_email || 'Аноним'}
                  </span>
                  {review.is_verified_purchase && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      ✓ Проверено
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400 text-sm">
                    {renderStars(review.rating)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({review.rating})
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-2">
                {review.product_name && (
                  <span>📦 {review.product_name}</span>
                )}
                {review.course_title && (
                  <span>🎓 {review.course_title}</span>
                )}
              </div>

              {review.comment && (
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                  {review.comment.length > 100
                    ? `${review.comment.substring(0, 100)}...`
                    : review.comment
                  }
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(review.created_at)}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  review.is_approved
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {review.is_approved ? 'Одобрен' : 'На модерации'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentReviews;
