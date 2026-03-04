import React, { useState, useEffect } from 'react'
import { Progress } from '../ui'
import { Button } from '../ui'
import { useProgress } from '../../hooks/learning'

/**
 * Компонент отслеживания прогресса по курсу
 *
 * Показывает общий прогресс, список уроков и их статусы.
 * Позволяет переходить между уроками.
 * Использует хук useProgress для автоматической синхронизации.
 */
const ProgressTracker = ({
  courseId,
  petId,
  onLessonSelect,
  onProgressUpdate,
  className = ''
}) => {
  const {
    courseProgress,
    loading,
    error,
    loadProgress,
    getLessonProgress,
    isLessonCompleted,
    getProgressStats
  } = useProgress(courseId, petId)

  // Обновление прогресса (вызывается извне)
  const refreshProgress = () => {
    loadProgress()
  }

  // Уведомляем родительский компонент об изменениях прогресса
  useEffect(() => {
    if (onProgressUpdate && courseProgress) {
      onProgressUpdate(courseProgress)
    }
  }, [courseProgress, onProgressUpdate])

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !courseProgress) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>{error || 'Прогресс не найден'}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshProgress}
            className="mt-2"
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    )
  }

  const stats = getProgressStats()
  const { totalLessons, completedLessons, progressPercent, totalTimeSpent } = stats

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {/* Заголовок с общим прогрессом */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Прогресс обучения
          </h3>
          <span className="text-sm text-gray-500">
            {completedLessons} из {totalLessons} уроков
          </span>
        </div>

        <div className="mb-2">
          <Progress value={progressPercent} className="h-3" />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{progressPercent}% завершено</span>
          <span>
            {courseProgress.status === 'completed' && '✅ Завершён'}
            {courseProgress.status === 'in_progress' && '⏳ В процессе'}
            {courseProgress.status === 'not_started' && '🎯 Не начат'}
            {courseProgress.status === 'paused' && '⏸️ Приостановлен'}
          </span>
        </div>
      </div>

      {/* Список уроков */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Уроки курса
        </h4>

        {courseProgress.lessons_progress.map((lesson) => {
          const lessonProgress = getLessonProgress(lesson.lesson_id)
          const status = lessonProgress?.status || 'not_started'
          const isCompleted = isLessonCompleted(lesson.lesson_id)
          const isCurrent = status === 'in_progress' || status === 'viewed'

          return (
            <div
              key={lesson.lesson_id}
              className={`
                flex items-center justify-between p-3 rounded-lg border cursor-pointer
                transition-colors hover:bg-gray-50
                ${isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}
                ${isCompleted ? 'bg-green-50 border-green-200' : ''}
              `}
              onClick={() => onLessonSelect && onLessonSelect(lesson.lesson_id)}
            >
              <div className="flex items-center space-x-3">
                {/* Статус урока */}
                <div className="flex-shrink-0">
                  {isCompleted && <span className="text-green-600">✅</span>}
                  {isCurrent && <span className="text-blue-600">📖</span>}
                  {status === 'not_started' && <span className="text-gray-400">⭕</span>}
                  {status === 'viewed' && <span className="text-blue-600">👁️</span>}
                </div>

                {/* Информация об уроке */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    isCompleted ? 'text-green-900' :
                    isCurrent ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    Урок {lesson.order}: {lesson.title}
                  </p>
                  {lessonProgress && (
                    <p className="text-xs text-gray-500">
                      {lessonProgress.time_spent ? `${Math.round(lessonProgress.time_spent / 60)} мин просмотра` : 'Не просмотрено'}
                    </p>
                  )}
                </div>
              </div>

              {/* Обязательность */}
              {lesson.is_required && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  Обязательный
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Статистика */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Время обучения:</span>
            <div className="font-medium">
              {Math.round(totalTimeSpent / 60)} мин
            </div>
          </div>
          <div>
            <span className="text-gray-500">Последняя активность:</span>
            <div className="font-medium">
              {courseProgress.last_activity_at ?
                new Date(courseProgress.last_activity_at).toLocaleDateString('ru-RU') :
                'Не было'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressTracker
