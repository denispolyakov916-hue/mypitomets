import React, { useState, useEffect } from 'react'
import { Card } from '../ui'
import { Button } from '../ui'
import { getPersonalizedCourses } from '../../api/courses'
import { useNavigate } from 'react-router-dom'
import Rating from '../Rating'

/**
 * Компонент персонализированных рекомендаций курсов
 *
 * Отображает рекомендованные курсы на основе характеристик питомца,
 * включая курсы для решения проблем и по предпочтениям активностей.
 */
const CourseRecommendations = ({
  petId,
  petInfo,
  recommendations = [],
  className = ''
}) => {
  const navigate = useNavigate()
  const [personalizedCourses, setPersonalizedCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Загружаем персонализированные курсы при изменении petId
  useEffect(() => {
    if (petId) {
      loadPersonalizedCourses()
    }
  }, [petId])

  const loadPersonalizedCourses = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getPersonalizedCourses(petId)
      setPersonalizedCourses(response.courses || [])

    } catch (err) {
      console.error('Error loading personalized courses:', err)
      setError('Не удалось загрузить персонализированные курсы')
    } finally {
      setLoading(false)
    }
  }

  const handleCourseClick = (courseId) => {
    navigate(`/training/courses/${courseId}`)
  }

  const handleViewAllPersonalized = () => {
    navigate('/training/courses', {
      state: {
        filters: { personal: 'true', pet_id: petId }
      }
    })
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPersonalizedCourses}
            className="mt-2"
          >
            Попробовать снова
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Основные персонализированные курсы */}
      {personalizedCourses.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                🎯 Персональные курсы для {petInfo?.name || 'питомца'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Курсы подобраны специально под характеристики вашего питомца
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewAllPersonalized}
            >
              Смотреть все
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personalizedCourses.slice(0, 6).map((course) => (
              <div
                key={course.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleCourseClick(course.id)}
              >
                <div className="aspect-video bg-gray-100 relative">
                  {course.image ? (
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-2xl">📚</span>
                    </div>
                  )}
                  {course.is_free && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Бесплатно
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h4>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{course.level_display}</span>
                    <span>{course.duration} мин</span>
                  </div>

                  {course.rating && (
                    <div className="mt-2">
                      <Rating
                        rating={course.rating}
                        reviewsCount={course.reviews_count}
                        readonly={true}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Рекомендации по проблемам */}
      {recommendations.map((rec, index) => (
        <Card key={index} className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {rec.title}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rec.courses.map((course) => (
              <div
                key={course.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleCourseClick(course.id)}
              >
                <div className="aspect-video bg-gray-100 relative">
                  {course.image ? (
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-2xl">🎓</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Рекомендовано для решения проблем
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Если нет рекомендаций */}
      {personalizedCourses.length === 0 && recommendations.length === 0 && (
        <Card className="p-6">
          <div className="text-center text-gray-500">
            <span className="text-4xl mb-4 block">🔍</span>
            <h3 className="text-lg font-medium mb-2">Нет персональных рекомендаций</h3>
            <p className="text-sm">
              Заполните больше информации о вашем питомце для более точных рекомендаций
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default CourseRecommendations
