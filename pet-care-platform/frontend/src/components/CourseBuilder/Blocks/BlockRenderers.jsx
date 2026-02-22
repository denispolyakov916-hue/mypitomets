/**
 * BlockRenderers - Компоненты для отображения блоков контента в режиме просмотра
 *
 * Эти компоненты используются в системе обучения для отображения
 * блоков контента пользователям (в отличие от редактирования в конструкторе).
 */

import React, { useState, useEffect, useRef } from 'react'
import ReactPlayer from 'react-player'
import { Button } from '../../ui'
import { CheckCircle, Circle, Clock, Download, Star, MessageCircle } from 'lucide-react'
import { getVideoPlaybackUrl } from '../../../api/upload'

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
 *
 * Поддерживает:
 * - Прямые URL (YouTube, Vimeo, внешние ссылки)
 * - S3 presigned URLs через video_key (Yandex Cloud)
 * - Защита от скачивания (nodownload)
 * - Блокировка контекстного меню
 */
export function VideoPlayerRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [watched, setWatched] = useState(false)
  const [videoUrl, setVideoUrl] = useState(block.content?.video_url || '')
  const [urlLoading, setUrlLoading] = useState(false)
  const urlCacheRef = useRef({ url: null, expiry: 0 })

  // Если есть video_key (S3), получаем presigned URL
  useEffect(() => {
    const videoKey = block.content?.video_key
    if (!videoKey) {
      setVideoUrl(block.content?.video_url || '')
      return
    }

    // Проверяем кеш (1.5 часа из 2-часового TTL)
    const now = Date.now()
    if (urlCacheRef.current.url && urlCacheRef.current.expiry > now) {
      setVideoUrl(urlCacheRef.current.url)
      return
    }

    const fetchPresignedUrl = async () => {
      try {
        setUrlLoading(true)
        const courseId = block.content?.course_id
        const result = await getVideoPlaybackUrl(videoKey, courseId)
        const presignedUrl = result.url
        setVideoUrl(presignedUrl)

        // Кешируем на 1.5 часа
        urlCacheRef.current = {
          url: presignedUrl,
          expiry: now + 90 * 60 * 1000,
        }
      } catch (err) {
        console.error('Failed to get video playback URL:', err)
        // Fallback на video_url если presigned не сработал
        setVideoUrl(block.content?.video_url || '')
      } finally {
        setUrlLoading(false)
      }
    }

    fetchPresignedUrl()
  }, [block.content?.video_key, block.content?.video_url, block.content?.course_id])

  const handleVideoEnd = () => {
    setWatched(true)
    onComplete && onComplete(block.id, { completed: true })
  }

  const handleProgress = (progress) => {
    onProgress && onProgress(block.id, progress)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="aspect-video relative" onContextMenu={(e) => e.preventDefault()}>
        {urlLoading ? (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-white text-sm">Загрузка видео...</div>
          </div>
        ) : videoUrl ? (
          <ReactPlayer
            url={videoUrl}
            width="100%"
            height="100%"
            controls
            onEnded={handleVideoEnd}
            onProgress={handleProgress}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload',
                  disablePictureInPicture: true,
                  onContextMenu: (e) => e.preventDefault(),
                }
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">🎥</div>
              <p>Видео не загружено</p>
            </div>
          </div>
        )}
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
 * QuizRenderer - Полнофункциональный тест/викторина
 *
 * Поддерживает типы вопросов:
 * - single_choice: один правильный ответ (радиокнопки)
 * - multi_choice: несколько правильных (чекбоксы)
 * - text_input: текстовый ввод
 * - true_false: верно/неверно
 * - matching: сопоставление пар
 */
export function QuizRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const questions = block.content?.questions || []

  /* ─── Обработчики ─── */
  const handleSingleSelect = (qi, value) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qi]: value }))
  }

  const handleMultiToggle = (qi, value) => {
    if (submitted) return
    setAnswers(prev => {
      const current = Array.isArray(prev[qi]) ? [...prev[qi]] : []
      const idx = current.indexOf(value)
      if (idx >= 0) current.splice(idx, 1)
      else current.push(value)
      return { ...prev, [qi]: current }
    })
  }

  const handleTextInput = (qi, value) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qi]: value }))
  }

  const handleMatchSelect = (qi, leftIdx, rightIdx) => {
    if (submitted) return
    setAnswers(prev => {
      const current = { ...(prev[qi] || {}) }
      current[leftIdx] = rightIdx
      return { ...prev, [qi]: current }
    })
  }

  const checkAnswer = (question, answer) => {
    const type = question.type || 'single_choice'
    switch (type) {
      case 'single_choice':
      case 'true_false':
        return answer === question.correct_answer || answer === question.correct
      case 'multi_choice': {
        // Только correct_answers — correct_answer это число для single_choice
        const correct = question.correct_answers ?? question.correct ?? []
        const correctArr = (Array.isArray(correct) ? correct : []).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
        const userArr = (Array.isArray(answer) ? answer : []).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
        const userSet = new Set(userArr)
        const correctSet = new Set(correctArr)
        // Должны быть выбраны все правильные и не выбрано ни одного лишнего
        if (userSet.size !== correctSet.size) return false
        return correctArr.every(idx => userSet.has(idx))
      }
      case 'text_input': {
        const correctText = (question.correct_answer || question.correct || '').toString().toLowerCase().trim()
        const userText = (answer || '').toString().toLowerCase().trim()
        return userText === correctText
      }
      case 'matching': {
        const correctPairs = question.correct_answer || question.correct || {}
        const userPairs = answer || {}
        return Object.keys(correctPairs).every(k => userPairs[k] === correctPairs[k])
      }
      default:
        return answer === question.correct_answer
    }
  }

  const handleSubmit = () => {
    let correct = 0
    questions.forEach((q, i) => { if (checkAnswer(q, answers[i])) correct++ })
    const finalScore = Math.round((correct / questions.length) * 100)
    setScore(finalScore)
    setSubmitted(true)
    onComplete?.(block.id, { completed: true, score: finalScore, answers })
  }

  const handleRetry = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(0)
  }

  const isAllAnswered = questions.every((q, i) => {
    const a = answers[i]
    if (a === undefined || a === null || a === '') return false
    if (Array.isArray(a) && a.length === 0) return false
    return true
  })

  if (!questions.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
        <p>Вопросы теста не настроены</p>
      </div>
    )
  }

  /* ─── Рендер вопроса ─── */
  const renderQuestion = (question, qi) => {
    const type = question.type || 'single_choice'
    const isCorrectQ = submitted && checkAnswer(question, answers[qi])

    return (
      <div key={qi} className={`pb-5 ${qi < questions.length - 1 ? 'border-b border-gray-100 mb-5' : ''}`}>
        <div className="flex items-start gap-3 mb-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
            {qi + 1}
          </span>
          <h4 className="font-medium text-gray-900 pt-0.5">{question.question || question.text}</h4>
        </div>

        {/* Подсказка о типе */}
        {type === 'multi_choice' && !submitted && (
          <p className="text-xs text-gray-400 ml-10 mb-2">Выберите все правильные ответы</p>
        )}

        <div className="ml-10">
          {/* Single choice / True-False */}
          {(type === 'single_choice' || type === 'true_false') && (
            <div className="space-y-2">
              {(question.options || (type === 'true_false' ? ['Верно', 'Неверно'] : [])).map((opt, oi) => {
                const isSelected = answers[qi] === oi
                const correctIdx = question.correct_answer ?? question.correct
                const isCorrectOpt = submitted && isCorrectQ && oi === correctIdx
                const isWrongOpt = submitted && isSelected && oi !== correctIdx
                return (
                  <button key={oi} onClick={() => handleSingleSelect(qi, oi)} disabled={submitted}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isCorrectOpt ? 'bg-green-100 border-green-300 text-green-800'
                      : isWrongOpt ? 'bg-red-100 border-red-300 text-red-800'
                      : isSelected ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Multi choice */}
          {type === 'multi_choice' && (
            <div className="space-y-2">
              {(question.options || []).map((opt, oi) => {
                const selected = Array.isArray(answers[qi]) && answers[qi].includes(oi)
                const correctArr = question.correct_answers ?? question.correct ?? []
                const isCorrectOpt = submitted && isCorrectQ && correctArr.includes(oi)
                const isWrongOpt = submitted && selected && !correctArr.includes(oi)
                return (
                  <button key={oi} onClick={() => handleMultiToggle(qi, oi)} disabled={submitted}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isCorrectOpt ? 'bg-green-100 border-green-300 text-green-800'
                      : isWrongOpt ? 'bg-red-100 border-red-300 text-red-800'
                      : selected ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border ${
                        selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      } flex items-center justify-center`}>
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Text input */}
          {type === 'text_input' && (
            <div>
              <input
                type="text"
                value={answers[qi] || ''}
                onChange={(e) => handleTextInput(qi, e.target.value)}
                disabled={submitted}
                placeholder="Введите ваш ответ..."
                className={`w-full p-3 rounded-lg border text-sm ${
                  submitted
                    ? isCorrectQ ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                    : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                }`}
              />
            </div>
          )}

          {/* Matching */}
          {type === 'matching' && (
            <div className="space-y-3">
              {(question.left_items || []).map((left, li) => {
                const rightItems = question.right_items || []
                const userMatch = (answers[qi] || {})[li]
                const correctMatch = (question.correct_answer || question.correct || {})[li]
                const isMatchCorrect = submitted && userMatch === correctMatch
                const isMatchWrong = submitted && userMatch !== undefined && userMatch !== correctMatch
                return (
                  <div key={li} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-1/3 text-right">{left}</span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={userMatch ?? ''}
                      onChange={(e) => handleMatchSelect(qi, li, parseInt(e.target.value))}
                      disabled={submitted}
                      className={`flex-1 p-2 rounded-lg border text-sm ${
                        isMatchCorrect ? 'bg-green-100 border-green-300'
                        : isMatchWrong ? 'bg-red-100 border-red-300'
                        : 'border-gray-200'
                      }`}
                    >
                      <option value="">Выберите...</option>
                      {rightItems.map((right, ri) => (
                        <option key={ri} value={ri}>{right}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}

          {/* Объяснение после ответа */}
          {submitted && question.explanation && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${isCorrectQ ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              <span className="font-medium">Пояснение:</span> {question.explanation}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-primary-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">❓</span>
        <h3 className="text-lg font-semibold text-gray-900">{block.content?.title || 'Тест'}</h3>
      </div>

      {questions.map((q, qi) => renderQuestion(q, qi))}

      {!submitted ? (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!isAllAnswered}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Проверить ответы
          </button>
        </div>
      ) : (
        <div className={`mt-6 p-5 rounded-xl ${score >= 70 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="text-center">
            <div className="text-3xl mb-2">{score >= 70 ? '🎉' : '💪'}</div>
            <h4 className="text-xl font-bold mb-1">{score}%</h4>
            <p className="text-sm text-gray-600 mb-3">
              Правильных: {Math.round((score / 100) * questions.length)} из {questions.length}
            </p>
            {score >= 70 ? (
              <p className="text-green-700 font-medium">Отлично! Тест пройден.</p>
            ) : (
              <div>
                <p className="text-amber-700 font-medium mb-3">Попробуйте ещё раз.</p>
                <button onClick={handleRetry} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Пройти заново
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * PetActionRenderer - Пошаговое упражнение с питомцем
 *
 * Формат контента:
 * {
 *   title: "Название упражнения",
 *   instructions: "Общее описание",
 *   steps: [{ text: "Шаг 1...", tip: "Совет", media_placeholder: "[Фото: ...]" }],
 *   timer_enabled: true/false,
 *   timer_duration: 300 (в секундах)
 * }
 */
export function PetActionRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const steps = block.content?.steps || []
  const [checkedSteps, setCheckedSteps] = useState({})
  const [completed, setCompleted] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let interval
    if (timerActive) {
      interval = setInterval(() => setTimeSpent(prev => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive])

  const toggleStep = (idx) => {
    if (completed) return
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const allStepsChecked = steps.length > 0 && steps.every((_, i) => checkedSteps[i])
  const checkedCount = Object.values(checkedSteps).filter(Boolean).length

  const handleStart = () => {
    setStarted(true)
    if (block.content?.timer_enabled) setTimerActive(true)
  }

  const handleComplete = () => {
    setCompleted(true)
    setTimerActive(false)
    onComplete?.(block.id, { completed: true, time_spent: timeSpent })
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Fallback если шаги не заданы — старый формат (просто instructions)
  const hasSteps = steps.length > 0

  return (
    <div className="bg-white border-2 border-green-200 rounded-xl overflow-hidden">
      {/* Заголовок */}
      <div className="bg-green-50 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🐾</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {block.content?.title || 'Упражнение с питомцем'}
          </h3>
          {block.content?.instructions && (
            <p className="text-sm text-gray-600 mt-1">{block.content.instructions}</p>
          )}
        </div>
        {/* Прогресс */}
        {hasSteps && started && !completed && (
          <div className="text-right">
            <span className="text-sm font-medium text-green-700">{checkedCount}/{steps.length}</span>
            <div className="w-16 h-1.5 bg-green-200 rounded-full mt-1">
              <div
                className="h-1.5 bg-green-500 rounded-full transition-all"
                style={{ width: `${steps.length > 0 ? (checkedCount / steps.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        {/* Таймер */}
        {block.content?.timer_enabled && started && (
          <div className="flex items-center justify-center gap-2 mb-5 p-3 bg-gray-50 rounded-lg">
            <Clock size={18} className="text-gray-500" />
            <span className="font-mono text-xl font-medium">{formatTime(timeSpent)}</span>
            {block.content?.timer_duration && (
              <span className="text-sm text-gray-400">/ {formatTime(block.content.timer_duration)}</span>
            )}
          </div>
        )}

        {!started && !completed ? (
          /* Кнопка начать */
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">Приготовьте питомца и нажмите «Начать»</p>
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
            >
              🐾 Начать упражнение
            </button>
          </div>
        ) : completed ? (
          /* Завершено */
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-lg font-semibold text-green-700 mb-1">Упражнение выполнено!</p>
            <p className="text-sm text-gray-500">Время: {formatTime(timeSpent)}</p>
          </div>
        ) : hasSteps ? (
          /* Пошаговые инструкции */
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div
                key={i}
                onClick={() => toggleStep(i)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  checkedSteps[i]
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-green-300'
                }`}
              >
                {/* Чекбокс */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  checkedSteps[i] ? 'bg-green-500 border-green-500' : 'border-gray-300'
                }`}>
                  {checkedSteps[i] && (
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">Шаг {i + 1}</span>
                  </div>
                  <p className={`text-sm mt-1 ${checkedSteps[i] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {step.text}
                  </p>
                  {step.tip && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span>💡</span> {step.tip}
                    </p>
                  )}
                  {step.media_placeholder && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-500 italic">
                      {step.media_placeholder}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: нет шагов */
          <p className="text-gray-600 whitespace-pre-line">{block.content?.instructions || 'Выполните упражнение с питомцем.'}</p>
        )}

        {/* Кнопка завершения */}
        {started && !completed && (
          <div className="mt-5 text-center">
            <button
              onClick={handleComplete}
              disabled={hasSteps && !allStepsChecked}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✓ Выполнено
            </button>
            {hasSteps && !allStepsChecked && (
              <p className="text-xs text-gray-400 mt-2">Отметьте все шаги, чтобы завершить</p>
            )}
          </div>
        )}
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

  const items = (block.content?.items || []).filter(item => (item?.text || '').trim())

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
 *
 * Отображает прогресс курса. Данные прогресса передаются через content блока
 * или через контекст курса.
 */
export function ProgressTrackerRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const progressPercent = block.content?.progress_percent || 0
  const completedLessons = block.content?.completed_lessons || 0
  const totalLessons = block.content?.total_lessons || 0
  const milestones = block.content?.milestones || []

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {block.content?.title || 'Прогресс обучения'}
      </h3>

      {/* Общий прогресс */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Общий прогресс</span>
          <span className="text-lg font-bold text-blue-600">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {totalLessons > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Завершено {completedLessons} из {totalLessons} уроков
          </p>
        )}
      </div>

      {/* Вехи */}
      {milestones.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Достижения</h4>
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                milestone.completed ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              {milestone.completed ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <Circle size={18} className="text-gray-300" />
              )}
              <span className={`text-sm ${milestone.completed ? 'text-green-700' : 'text-gray-600'}`}>
                {milestone.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalLessons === 0 && milestones.length === 0 && (
        <p className="text-center text-gray-400 text-sm">
          Прогресс обучения будет отображаться здесь
        </p>
      )}
    </div>
  )
}

/**
 * CommentSectionRenderer - Секция комментариев
 *
 * Интегрирует существующий CommentsSection для отображения
 * комментариев к курсу/уроку.
 */
export function CommentSectionRenderer({ block, mode = 'view', onComplete, onProgress }) {
  // Ленивая загрузка CommentsSection для избежания циклических зависимостей
  const [CommentsComponent, setCommentsComponent] = useState(null)

  useEffect(() => {
    import('../../Learning/CommentsSection').then(module => {
      setCommentsComponent(() => module.default)
    }).catch(() => {
      // CommentsSection не найден — оставляем заглушку
    })
  }, [])

  const courseId = block.content?.course_id
  const lessonId = block.content?.lesson_id
  const pageId = block.content?.page_id

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <MessageCircle className="text-blue-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">
          {block.content?.title || 'Обсуждение'}
        </h3>
      </div>

      {CommentsComponent && (courseId || lessonId || pageId) ? (
        <CommentsComponent
          courseId={courseId}
          lessonId={lessonId}
          pageId={pageId}
        />
      ) : (
        <div className="text-center text-gray-400 py-4">
          <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Комментарии и обсуждение доступны после настройки</p>
        </div>
      )}
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

