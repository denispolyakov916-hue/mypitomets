/**
 * BlockRenderers - Компоненты для отображения блоков контента в режиме просмотра
 *
 * Эти компоненты используются в системе обучения для отображения
 * блоков контента пользователям (в отличие от редактирования в конструкторе).
 */

import React, { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { Button } from '../../ui'
import { CheckCircle, Circle, Clock, Download, Star, MessageCircle } from 'lucide-react'

/**
 * RichTextRenderer - Отображение форматированного текста
 */
export function RichTextRenderer({ block, mode = 'view', onComplete, onProgress }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: block.content?.html || '<p>Текст не задан</p>' }}
      />
    </div>
  )
}

/**
 * VideoPlayerRenderer - Воспроизведение видео
 */
export function VideoPlayerRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [watched, setWatched] = useState(false)

  const handleVideoEnd = () => {
    setWatched(true)
    onComplete && onComplete(block.id, { completed: true })
  }

  const handleProgress = (progress) => {
    onProgress && onProgress(block.id, progress)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="aspect-video">
        <ReactPlayer
          url={block.content?.video_url}
          width="100%"
          height="100%"
          controls
          onEnded={handleVideoEnd}
          onProgress={handleProgress}
          config={{
            file: {
              attributes: {
                controlsList: 'nodownload'
              }
            }
          }}
        />
      </div>

      {block.content?.title && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900">{block.content.title}</h4>
          {block.content?.description && (
            <p className="text-sm text-gray-600 mt-1">{block.content.description}</p>
          )}
        </div>
      )}

      {watched && (
        <div className="p-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Видео просмотрено</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * QuizRenderer - Отображение теста/викторины
 */
export function QuizRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const questions = block.content?.questions || []

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }))
  }

  const handleSubmit = () => {
    let correctAnswers = 0
    questions.forEach((question, index) => {
      const userAnswer = answers[index]
      const correctAnswer = question.correct_answer
      if (userAnswer === correctAnswer) {
        correctAnswers++
      }
    })

    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    setScore(finalScore)
    setSubmitted(true)

    onComplete && onComplete(block.id, {
      completed: true,
      score: finalScore,
      answers
    })
  }

  if (!questions.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
        <p>Вопросы теста не настроены</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {block.content?.title || 'Тест'}
      </h3>

      <div className="space-y-6">
        {questions.map((question, questionIndex) => (
          <div key={questionIndex} className="border-b border-gray-100 pb-4">
            <h4 className="font-medium text-gray-900 mb-3">
              {questionIndex + 1}. {question.question}
            </h4>

            <div className="space-y-2">
              {question.options?.map((option, optionIndex) => {
                const isSelected = answers[questionIndex] === optionIndex
                const isCorrect = submitted && optionIndex === question.correct_answer
                const isWrong = submitted && isSelected && optionIndex !== question.correct_answer

                return (
                  <button
                    key={optionIndex}
                    onClick={() => !submitted && handleAnswerSelect(questionIndex, optionIndex)}
                    disabled={submitted}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isCorrect
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : isWrong
                        ? 'bg-red-100 border-red-300 text-red-800'
                        : isSelected
                        ? 'bg-blue-100 border-blue-300 text-blue-800'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full mx-auto" />}
                      </div>
                      <span>{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            className="px-8"
          >
            Проверить ответы
          </Button>
        </div>
      ) : (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              Результат: {score}%
            </h4>
            <p className="text-blue-700">
              Правильных ответов: {Math.round((score / 100) * questions.length)} из {questions.length}
            </p>
            {score >= 70 ? (
              <p className="text-green-600 font-medium mt-2">Отлично! Вы успешно прошли тест.</p>
            ) : (
              <p className="text-orange-600 font-medium mt-2">Попробуйте пройти тест еще раз.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * PetActionRenderer - Действия с питомцем
 */
export function PetActionRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [completed, setCompleted] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [timerActive, setTimerActive] = useState(false)

  useEffect(() => {
    let interval
    if (timerActive) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive])

  const handleStart = () => {
    setTimerActive(true)
  }

  const handleComplete = () => {
    setCompleted(true)
    setTimerActive(false)
    onComplete && onComplete(block.id, {
      completed: true,
      time_spent: timeSpent
    })
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-blue-100 rounded-lg">
          <span className="text-2xl">🎯</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {block.content?.title || 'Упражнение с питомцем'}
          </h3>

          {block.content?.instructions && (
            <p className="text-gray-700 mb-4 whitespace-pre-line">
              {block.content.instructions}
            </p>
          )}

          {/* Таймер */}
          {block.content?.timer_enabled && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Время выполнения:</span>
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-gray-500" />
                  <span className="font-mono text-lg">{formatTime(timeSpent)}</span>
                </div>
              </div>

              {!timerActive && !completed && (
                <Button onClick={handleStart} variant="outline" size="sm">
                  Начать упражнение
                </Button>
              )}
            </div>
          )}

          {/* Кнопка завершения */}
          {!completed ? (
            <Button
              onClick={handleComplete}
              disabled={block.content?.timer_enabled && !timerActive}
              className="w-full"
            >
              Отметить как выполненное
            </Button>
          ) : (
            <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg">
              <CheckCircle size={20} />
              <span className="font-medium">Упражнение выполнено!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * GalleryRenderer - Галерея изображений
 */
export function GalleryRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const images = block.content?.images || []

  if (!images.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
        <p>Изображения не загружены</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {block.content?.title || 'Галерея'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative group cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={image.url}
              alt={image.alt || image.caption || 'Изображение галереи'}
              className="w-full h-48 object-cover rounded-lg transition-transform group-hover:scale-105"
            />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 rounded-b-lg">
                <p className="text-sm">{image.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Модальное окно с увеличенным изображением */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl max-h-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.alt || selectedImage.caption || ''}
              className="max-w-full max-h-full object-contain"
            />
            {selectedImage.caption && (
              <p className="text-white text-center mt-4">{selectedImage.caption}</p>
            )}
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * FileDownloadRenderer - Скачивание файлов
 */
export function FileDownloadRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const handleDownload = () => {
    if (block.content?.url) {
      window.open(block.content.url, '_blank')
      onComplete && onComplete(block.id, { downloaded: true })
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-green-100 rounded-lg">
          <Download className="text-green-600" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {block.content?.filename || 'Файл для скачивания'}
          </h3>
          {block.content?.description && (
            <p className="text-gray-600 mt-1">{block.content.description}</p>
          )}
        </div>
        <Button onClick={handleDownload}>
          <Download size={16} className="mr-2" />
          Скачать
        </Button>
      </div>
    </div>
  )
}

/**
 * CheckListRenderer - Чек-лист задач
 */
export function CheckListRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [checkedItems, setCheckedItems] = useState(new Set())

  const items = block.content?.items || []

  const handleItemToggle = (itemId) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }

      // Проверяем, все ли элементы отмечены
      if (newSet.size === items.length) {
        onComplete && onComplete(block.id, { completed: true })
      }

      return newSet
    })
  }

  if (!items.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
        <p>Элементы чек-листа не настроены</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {block.content?.title || 'Чек-лист'}
      </h3>

      <div className="space-y-3">
        {items.map((item, index) => {
          const itemId = item.id || index
          const isChecked = checkedItems.has(itemId)

          return (
            <div
              key={itemId}
              onClick={() => handleItemToggle(itemId)}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                isChecked ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
              }`}
            >
              {isChecked ? (
                <CheckCircle className="text-green-600" size={20} />
              ) : (
                <Circle className="text-gray-400" size={20} />
              )}
              <span className={isChecked ? 'text-green-800 line-through' : 'text-gray-700'}>
                {item.text}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Выполнено: {checkedItems.size} из {items.length}
      </div>
    </div>
  )
}

/**
 * TimerRenderer - Таймер
 */
export function TimerRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [timeLeft, setTimeLeft] = useState(block.content?.duration || 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  useEffect(() => {
    let interval
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsFinished(true)
            onComplete && onComplete(block.id, { completed: true })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, onComplete, block.id])

  const handleStart = () => setIsRunning(true)
  const handlePause = () => setIsRunning(false)
  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(block.content?.duration || 60)
    setIsFinished(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((block.content?.duration || 60) - timeLeft) / (block.content?.duration || 60) * 100

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {block.content?.title || 'Таймер'}
        </h3>

        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            <path
              d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray={`${progress}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-mono font-bold text-gray-900">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {isFinished ? (
          <div className="text-green-600 font-medium">
            Время вышло! Задание выполнено.
          </div>
        ) : (
          <div className="flex justify-center space-x-2">
            {!isRunning ? (
              <Button onClick={handleStart} disabled={timeLeft === 0}>
                Старт
              </Button>
            ) : (
              <Button onClick={handlePause} variant="outline">
                Пауза
              </Button>
            )}
            <Button onClick={handleReset} variant="outline">
              Сброс
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ProgressTrackerRenderer - Отслеживание прогресса
 */
export function ProgressTrackerRenderer({ block, mode = 'view', onComplete, onProgress }) {
  // Этот компонент может показывать общий прогресс курса
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {block.content?.title || 'Прогресс обучения'}
      </h3>
      <div className="text-center text-gray-500">
        <p>Отображение прогресса курса</p>
        {/* Здесь можно интегрировать компонент прогресса */}
      </div>
    </div>
  )
}

/**
 * CommentSectionRenderer - Секция комментариев
 */
export function CommentSectionRenderer({ block, mode = 'view', onComplete, onProgress }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <MessageCircle className="text-blue-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">
          {block.content?.title || 'Обсуждение'}
        </h3>
      </div>
      <div className="text-center text-gray-500">
        <p>Комментарии и обсуждение</p>
        {/* Здесь можно интегрировать компонент комментариев */}
      </div>
    </div>
  )
}

/**
 * RatingRenderer - Система оценки
 */
export function RatingRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [rating, setRating] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const handleRating = (value) => {
    setRating(value)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    onComplete && onComplete(block.id, { rating })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {block.content?.title || 'Оцените материал'}
      </h3>

      {!submitted ? (
        <div className="text-center">
          <div className="flex justify-center space-x-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className={`text-3xl ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                ★
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={rating === 0}
          >
            Отправить оценку
          </Button>
        </div>
      ) : (
        <div className="text-center text-green-700">
          <div className="flex justify-center mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={24}
                className={i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
              />
            ))}
          </div>
          <p className="font-medium">Спасибо за оценку!</p>
        </div>
      )}
    </div>
  )
}

