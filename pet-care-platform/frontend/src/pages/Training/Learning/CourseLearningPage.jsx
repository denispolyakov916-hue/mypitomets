import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { Card } from '../../../components/ui'
import { ProgressTracker, RatingWidget } from '../../../components/Learning'
import CourseRatingDisplay from '../../../components/CourseRatingDisplay'
import { getCourse, getCourseLessons, getCourseProgress, enrollFreeCourse, getCoursePages } from '../../../api/courses'
import { useAuthStore } from '../../../store/authStore'
import { usePets } from '../../../hooks/usePets'
import { useToastStore } from '../../../store/toastStore'
import { LessonListSkeleton, ProgressSkeleton } from '../../../components/Skeletons'

// Хелпер для отображения типа контента
const getContentTypeLabel = (type) => {
  const labels = {
    video: '🎬 Видео',
    text: '📝 Текст',
    interactive: '🎮 Интерактив',
    mixed: '📚 Смешанный',
    webinar: '📡 Вебинар',
    workshop: '🛠️ Мастер-класс'
  }
  return labels[type] || type
}

/**
 * Страница обучения курсу с прогрессивной загрузкой
 *
 * Стратегия загрузки:
 * 1. Сначала загружается базовая информация о курсе (критично для отображения)
 * 2. Затем параллельно загружаются уроки и прогресс
 * 3. Каждая секция имеет свой скелетон для плавного UX
 */
const CourseLearningPage = () => {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { pets } = usePets()
  const { success, error: showError } = useToastStore()

  // Раздельные состояния загрузки для прогрессивного отображения
  const [course, setCourse] = useState(null)
  const [courseLessons, setCourseLessons] = useState([])
  const [progress, setProgress] = useState(null)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [petId, setPetId] = useState(searchParams.get('pet_id') || '')

  // Мемоизированная проверка доступа
  const isOwned = useMemo(() => course?.is_owned, [course])

  // Загрузка базовой информации о курсе (первый приоритет)
  const loadCourse = useCallback(async () => {
    try {
      setLoadingCourse(true)
      const courseResponse = await getCourse(courseId)
      // API клиент возвращает response.data напрямую
      const courseData = { ...courseResponse.course, is_owned: courseResponse.is_owned }
      setCourse(courseData)

      // Проверяем, использует ли курс новую архитектуру страниц
      try {
        const pagesResponse = await getCoursePages(courseId)
        if (pagesResponse.pages && pagesResponse.pages.length > 0) {
          // Курс использует новую архитектуру - перенаправляем
          const params = petId ? `?pet_id=${petId}` : ''
          navigate(`/training/courses/${courseId}/learn/pages/1${params}`, { replace: true })
          return courseResponse.is_owned
        }
      } catch (error) {
        // Если API страниц недоступен, продолжаем со старой архитектурой
        console.log('Pages API not available, using legacy architecture')
      }

      return courseResponse.is_owned
    } catch (error) {
      console.error('Error loading course:', error)
      showError('Не удалось загрузить курс')
      return false
    } finally {
      setLoadingCourse(false)
    }
  }, [courseId, petId, showError, navigate])

  // Загрузка уроков (параллельно с прогрессом)
  const loadLessons = useCallback(async () => {
    try {
      setLoadingLessons(true)
      const lessonsResponse = await getCourseLessons(courseId, petId)
      // API клиент возвращает response.data напрямую
      setCourseLessons(lessonsResponse.lessons || [])
    } catch (error) {
      console.error('Error loading lessons:', error)
      // Не показываем ошибку, уроки загрузятся при повторе
    } finally {
      setLoadingLessons(false)
    }
  }, [courseId, petId])

  // Загрузка прогресса (параллельно с уроками)
  const loadProgress = useCallback(async () => {
    if (!petId) {
      setProgress(null)
      return
    }
    
    try {
      setLoadingProgress(true)
      const progressResponse = await getCourseProgress(courseId, petId)
      // API клиент возвращает response.data напрямую
      setProgress(progressResponse.progress)
    } catch (error) {
      // Прогресс может не существовать - это нормально
      setProgress(null)
    } finally {
      setLoadingProgress(false)
    }
  }, [courseId, petId])

  // Прогрессивная загрузка данных
  useEffect(() => {
    // Используем isAuthenticated вместо user, т.к. user может быть null пока грузится профиль
    if (!courseId || !isAuthenticated) return

    const loadData = async () => {
      // Шаг 1: Загружаем курс
      const owned = await loadCourse()
      
      // Шаг 2: Если есть доступ, параллельно загружаем уроки и прогресс
      if (owned) {
        Promise.all([loadLessons(), loadProgress()])
      }
    }

    loadData()
  }, [courseId, isAuthenticated, loadCourse])

  // Перезагрузка при смене питомца
  useEffect(() => {
    if (isOwned && petId) {
      Promise.all([loadLessons(), loadProgress()])
    }
  }, [petId, isOwned, loadLessons, loadProgress])

  // Запись на курс
  const handleEnroll = async () => {
    if (!petId) {
      showError('Пожалуйста, выберите питомца')
      return
    }

    try {
      setEnrolling(true)
      await enrollFreeCourse(courseId, true, petId)
      success('Вы успешно записались на курс!')

      // Перезагружаем данные
      await loadCourse()
      Promise.all([loadLessons(), loadProgress()])
    } catch (error) {
      console.error('Error enrolling in course:', error)
      showError('Не удалось записаться на курс')
    } finally {
      setEnrolling(false)
    }
  }

  // Выбор урока
  const handleLessonSelect = useCallback((lessonId) => {
    const params = petId ? `?pet_id=${petId}` : ''
    navigate(`/training/lessons/${lessonId}${params}`)
  }, [petId, navigate])

  // Обновление прогресса (оптимизировано)
  const handleProgressRefresh = useCallback(() => {
    Promise.all([loadLessons(), loadProgress()])
  }, [loadLessons, loadProgress])

  // Выбор питомца
  const handlePetChange = useCallback((newPetId) => {
    setPetId(newPetId)
    const params = newPetId ? `?pet_id=${newPetId}` : ''
    navigate(`/training/courses/${courseId}/learn${params}`, { replace: true })
  }, [courseId, navigate])

  // Скелетон только для начальной загрузки курса
  if (loadingCourse && !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="w-32 h-32 bg-gray-200 rounded-lg ml-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course && !loadingCourse) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Курс не найден</h1>
            <p className="text-gray-600 mb-6">Запрашиваемый курс не существует или недоступен.</p>
            <Button onClick={() => navigate('/courses')}>
              Вернуться к курсам
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Проверки с fallback на false при загрузке
  const isEnrolled = isOwned ?? false
  const hasProgress = progress && petId
  const isLoadingSecondary = loadingLessons || loadingProgress

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Заголовок и навигация */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/training')}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Все курсы</span>
            </Button>

            {/* Выбор питомца */}
            {pets.length > 1 && (
              <select
                value={petId}
                onChange={(e) => handlePetChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Выберите питомца</option>
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species_display})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {course.title}
                </h1>
                <p className="text-gray-600 mb-4">{course.description}</p>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📚 {course.lessons_count} уроков</span>
                  <span>⏱️ {course.duration} мин</span>
                  <span>🎯 {course.level_display}</span>
                  <span>🎬 {course.format_display}</span>
                </div>
              </div>

              {course.image_url && (
                <img
                  src={course.image_url}
                  alt={course.title}
                  className="w-32 h-32 object-cover rounded-lg ml-6"
                />
              )}
            </div>
          </div>

          {/* Рейтинг курса */}
          {course && (
            <CourseRatingDisplay
              courseId={courseId}
              className="mb-8"
            />
          )}
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Прогресс и уроки */}
          <div className="lg:col-span-2 space-y-6">
            {/* Статус доступа */}
            {!isEnrolled && (
              <Card className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    {course.is_free ? 'Запишитесь на бесплатный курс' : 'Курс платный'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {course.is_free
                      ? 'Этот курс доступен бесплатно. Выберите питомца и начните обучение!'
                      : `Стоимость курса: ${course.price} ₽`
                    }
                  </p>

                  {course.is_free && (
                    <div className="space-y-4">
                      {!petId && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Выберите питомца для обучения
                          </label>
                          <select
                            value={petId}
                            onChange={(e) => setPetId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Выберите питомца</option>
                            {pets.map(pet => (
                              <option key={pet.id} value={pet.id}>
                                {pet.name} ({pet.species_display})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <Button
                        onClick={handleEnroll}
                        disabled={enrolling || !petId}
                        className="w-full"
                      >
                        {enrolling ? 'Запись...' : 'Записаться на курс'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Прогресс по курсу (с прогрессивной загрузкой) */}
            {isEnrolled && (
              loadingProgress ? (
                <ProgressSkeleton />
              ) : hasProgress ? (
                <ProgressTracker
                  courseId={courseId}
                  petId={petId}
                  onLessonSelect={handleLessonSelect}
                />
              ) : petId && (
                <Card className="p-6">
                  <div className="text-center text-gray-500">
                    <p>Выберите первый урок, чтобы начать обучение</p>
                  </div>
                </Card>
              )
            )}

            {/* Список уроков (с прогрессивной загрузкой) */}
            {isEnrolled && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Уроки курса</h3>
                {loadingLessons ? (
                  <LessonListSkeleton count={5} />
                ) : courseLessons.length > 0 ? (
                  <div className="space-y-3">
                    {courseLessons.map((lesson, index) => (
                      <button
                        key={lesson.id || lesson.lesson_id}
                        onClick={() => handleLessonSelect(lesson.id || lesson.lesson_id)}
                        className="w-full flex items-center gap-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-blue-200 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          lesson.status === 'completed' 
                            ? 'bg-green-100 text-green-600' 
                            : lesson.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {lesson.status === 'completed' ? '✓' : index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {lesson.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {lesson.duration ? `${lesson.duration} мин` : ''} 
                            {lesson.content_type && ` • ${getContentTypeLabel(lesson.content_type)}`}
                          </p>
                        </div>
                        <div className="text-gray-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Уроки пока не добавлены
                  </p>
                )}
              </Card>
            )}

            {/* Информация о курсе */}
            {course.what_you_will_learn && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Чему вы научитесь</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">
                    {course.what_you_will_learn}
                  </p>
                </div>
              </Card>
            )}

            {/* Детали формата */}
            {course.format_details && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Формат обучения</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">
                    {course.format_details}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Боковая панель */}
          <div className="lg:col-span-1 space-y-6">
            {/* Оценки и отзывы */}
            {isEnrolled && (
              <RatingWidget
                courseId={courseId}
                petId={petId}
                onRatingSubmit={(rating, review) => {
                  success('Спасибо за оценку!')
                  // Перезагружаем страницу для обновления всех данных
                  setTimeout(() => {
                    window.location.reload()
                  }, 1000)
                }}
              />
            )}

            {/* Информация об инструкторе */}
            {(course.instructor_name || course.instructor_bio) && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Инструктор</h3>
                {course.instructor_name && (
                  <h4 className="font-medium text-gray-900 mb-2">
                    {course.instructor_name}
                  </h4>
                )}
                {course.instructor_bio && (
                  <p className="text-gray-700 text-sm whitespace-pre-line">
                    {course.instructor_bio}
                  </p>
                )}
              </Card>
            )}

            {/* Требования */}
            {course.requirements && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Требования</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 text-sm whitespace-pre-line">
                    {course.requirements}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseLearningPage
