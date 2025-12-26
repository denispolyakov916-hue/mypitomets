import React, { useState, useEffect, useRef } from 'react'
import { Button } from '../ui'
import { Card } from '../ui'
import { Progress } from '../ui'
import { getLesson, completeLesson, updateLessonProgress } from '../../api/courses'
import { useLessonTimer } from '../../hooks/learning'

/**
 * Универсальный компонент для проигрывания уроков
 *
 * Поддерживает различные типы контента:
 * - video: видеоплеер с таймлайном
 * - text: текстовый контент с прокруткой
 * - interactive: интерактивные задания
 * - mixed: комбинированный контент
 * - webinar: видео-вебинар
 * - workshop: мастер-класс
 */
const LessonPlayer = ({
  lessonId,
  petId,
  onComplete,
  onProgress,
  className = ''
}) => {
  const [lesson, setLesson] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  // Используем хук таймера
  const {
    timeSpent,
    isRunning,
    start: startTimer,
    stop: stopTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    getFormattedTime
  } = useLessonTimer(
    lessonId,
    (lessonId, time) => {
      // Автосохранение каждые 30 секунд
      if (time % 30 === 0) {
        handleProgressUpdate({ time_spent: time })
      }
    },
    false // Не запускаем автоматически
  )

  // Загрузка урока
  useEffect(() => {
    if (lessonId && petId) {
      loadLesson()
    }
  }, [lessonId, petId])

  // Управление таймером в зависимости от состояния урока
  useEffect(() => {
    if (lesson && progress?.status !== 'completed') {
      if (progress?.status === 'in_progress' || progress?.status === 'viewed') {
        startTimer()
      }
    } else {
      stopTimer()
    }
  }, [lesson, progress?.status, startTimer, stopTimer])

  const loadLesson = async () => {
    try {
      setLoading(true)
      const response = await getLesson(lessonId, petId)
      // API клиент возвращает response.data напрямую
      setLesson(response.lesson)
      setProgress(response.progress)

      // Устанавливаем начальное время из прогресса
      if (response.progress?.time_spent) {
        // Таймер будет установлен через useLessonTimer
      }
    } catch (error) {
      console.error('Error loading lesson:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProgressUpdate = async (updates) => {
    if (!lesson || !progress) return

    try {
      await updateLessonProgress(lessonId, petId, {
        status: progress.status,
        time_spent: timeSpent,
        ...updates
      })

      if (onProgress) {
        onProgress(lessonId, progress.status, timeSpent)
      }
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const handleComplete = async () => {
    try {
      setCompleting(true)
      await completeLesson(lessonId, petId, timeSpent)

      // Останавливаем таймер
      stopTimer()

      // Обновляем локальный прогресс
      setProgress(prev => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent: timeSpent
      }))

      if (onComplete) {
        onComplete(lessonId, timeSpent)
      }
    } catch (error) {
      console.error('Error completing lesson:', error)
    } finally {
      setCompleting(false)
    }
  }

  const updateProgressStatus = (status) => {
    setProgress(prev => ({
      ...prev,
      status: status,
      started_at: prev.started_at || new Date().toISOString()
    }))

    // Управляем таймером в зависимости от статуса
    if (status === 'in_progress') {
      startTimer()
    } else if (status === 'paused') {
      pauseTimer()
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-gray-500">
          Урок не найден
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (lesson.content_type) {
      case 'video':
        return <VideoLesson content={lesson.content} onProgress={updateProgressStatus} />
      case 'text':
        return <TextLesson content={lesson.content} onProgress={updateProgressStatus} />
      case 'interactive':
        return <InteractiveLesson content={lesson.content} onProgress={updateProgressStatus} />
      case 'mixed':
        return <MixedLesson content={lesson.content} onProgress={updateProgressStatus} />
      case 'webinar':
        return <WebinarLesson content={lesson.content} onProgress={updateProgressStatus} />
      case 'workshop':
        return <WorkshopLesson content={lesson.content} onProgress={updateProgressStatus} />
      default:
        return <div className="text-center text-gray-500">Неподдерживаемый тип контента</div>
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Заголовок урока */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {lesson.title}
            </h2>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Урок {lesson.order}</span>
              <span>•</span>
              <span>{lesson.content_type_display}</span>
              {lesson.duration > 0 && (
                <>
                  <span>•</span>
                  <span>{lesson.duration} мин</span>
                </>
              )}
            </div>
          </div>

          {/* Статус прогресса */}
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              progress?.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : progress?.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {progress?.status === 'completed' && '✅ Завершён'}
              {progress?.status === 'in_progress' && '⏳ В процессе'}
              {progress?.status === 'viewed' && '👁️ Просмотрен'}
              {progress?.status === 'not_started' && '🎯 Не начат'}
            </div>
          </div>
        </div>

        {/* Прогресс-бар времени */}
        {progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Время просмотра</span>
              <span>{getFormattedTime()}</span>
            </div>
            <Progress
              value={lesson.duration > 0 ? Math.min((timeSpent / 60 / lesson.duration) * 100, 100) : 0}
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>Статус: {isRunning ? '⏸️' : '▶️'}</span>
              <span>Рекомендуемое время: {lesson.duration} мин</span>
            </div>
          </div>
        )}
      </div>

      {/* Контент урока */}
      <div className="p-6">
        {renderContent()}
      </div>

      {/* Дополнительные материалы */}
      {lesson.additional_materials && lesson.additional_materials.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold mb-3">Дополнительные материалы</h3>
          <div className="space-y-2">
            {lesson.additional_materials.map((material, index) => (
              <div key={index} className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 cursor-pointer">
                <span>📎</span>
                <span>{material.title || `Материал ${index + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="px-6 pb-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {lesson.is_required && <span className="text-red-600">⚠️ Обязательный урок</span>}
          </div>

          <div className="flex space-x-3">
            {progress?.status !== 'completed' && (
              <Button
                variant="outline"
                onClick={() => updateProgressStatus('viewed')}
                disabled={timeSpent < 30}
              >
                Отметить как просмотренный
              </Button>
            )}

            {/* Управление таймером */}
            {progress?.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={isRunning ? pauseTimer : resumeTimer}
              >
                {isRunning ? '⏸️ Пауза' : '▶️ Продолжить'}
              </Button>
            )}

            {progress?.status !== 'completed' && (
              <Button
                onClick={handleComplete}
                disabled={completing || (lesson.is_required && timeSpent < lesson.duration * 60 * 0.8)}
              >
                {completing ? 'Завершение...' : 'Завершить урок'}
              </Button>
            )}

            {progress?.status === 'completed' && (
              <div className="flex items-center space-x-2 text-green-600">
                <span>✅</span>
                <span className="font-medium">Урок завершён!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Видео-урок
 */
const VideoLesson = ({ content, onProgress }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      onProgress('in_progress')
    }

    const handlePause = () => setIsPlaying(false)

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [onProgress])

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          controls
          className="w-full max-h-96"
          poster={content.poster_url}
        >
          <source src={content.video_url} type="video/mp4" />
          Ваш браузер не поддерживает видео.
        </video>
      </div>

      {content.description && (
        <div className="prose max-w-none">
          <p className="text-gray-700">{content.description}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Текстовый урок
 */
const TextLesson = ({ content, onProgress }) => {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    onProgress('in_progress')
  }, [onProgress])

  const handleScroll = (e) => {
    const element = e.target
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight - element.clientHeight
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
    setScrollProgress(progress)
  }

  return (
    <div className="space-y-4">
      <div
        className="prose max-w-none h-96 overflow-y-auto border rounded-lg p-4"
        onScroll={handleScroll}
      >
        <div dangerouslySetInnerHTML={{ __html: content.html_content || content.text }} />
      </div>

      <div className="text-sm text-gray-500 text-center">
        Прогресс чтения: {Math.round(scrollProgress)}%
      </div>
    </div>
  )
}

/**
 * Интерактивный урок
 */
const InteractiveLesson = ({ content, onProgress }) => {
  const [answers, setAnswers] = useState({})
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    onProgress('in_progress')
  }, [onProgress])

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleComplete = () => {
    setCompleted(true)
    onProgress('completed')
  }

  return (
    <div className="space-y-6">
      {content.questions?.map((question, index) => (
        <Card key={index} className="p-4">
          <h3 className="font-semibold mb-3">{question.text}</h3>

          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              {question.options.map((option, optIndex) => (
                <label key={optIndex} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`question_${index}`}
                    value={option}
                    onChange={(e) => handleAnswer(index, e.target.value)}
                    checked={answers[index] === option}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              className="w-full p-2 border rounded"
              placeholder="Ваш ответ..."
              value={answers[index] || ''}
              onChange={(e) => handleAnswer(index, e.target.value)}
            />
          )}
        </Card>
      ))}

      {!completed && (
        <div className="text-center">
          <Button onClick={handleComplete}>
            Завершить задание
          </Button>
        </div>
      )}

      {completed && (
        <div className="text-center text-green-600">
          ✅ Задание выполнено!
        </div>
      )}
    </div>
  )
}

/**
 * Смешанный урок (видео + интерактив)
 */
const MixedLesson = ({ content, onProgress }) => {
  return (
    <div className="space-y-6">
      {content.video_url && <VideoLesson content={content} onProgress={onProgress} />}
      {content.interactive && <InteractiveLesson content={content.interactive} onProgress={onProgress} />}
    </div>
  )
}

/**
 * Вебинар
 */
const WebinarLesson = ({ content, onProgress }) => {
  return (
    <div className="space-y-4">
      <VideoLesson content={content} onProgress={onProgress} />

      {content.chat_enabled && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Чат вебинара</h3>
          <div className="text-gray-500 text-sm">
            Чат недоступен в записи вебинара
          </div>
        </Card>
      )}

      {content.qa_section && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Вопросы и ответы</h3>
          <div className="text-gray-600">
            {content.qa_content || 'Раздел вопросов и ответов недоступен'}
          </div>
        </Card>
      )}
    </div>
  )
}

/**
 * Мастер-класс
 */
const WorkshopLesson = ({ content, onProgress }) => {
  return (
    <div className="space-y-6">
      <VideoLesson content={content} onProgress={onProgress} />

      {content.steps && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Пошаговая инструкция</h3>
          <div className="space-y-4">
            {content.steps.map((step, index) => (
              <div key={index} className="flex space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                  {step.duration && (
                    <span className="text-xs text-gray-500">⏱️ {step.duration} мин</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {content.materials_needed && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Необходимые материалы</h3>
          <ul className="list-disc list-inside space-y-1">
            {content.materials_needed.map((material, index) => (
              <li key={index} className="text-gray-700">{material}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export default LessonPlayer
