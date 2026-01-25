import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { LessonPlayer, CommentsSection } from '../../../components/Learning'
import { getLesson, getCourseLessons, completeLesson } from '../../../api/courses'
import { useAuthStore } from '../../../store/authStore'
import { usePets } from '../../../hooks/usePets'
import { useToastStore } from '../../../store/toastStore'

/**
 * Страница отдельного урока с прогрессивной загрузкой
 *
 * Стратегия:
 * 1. Сначала загружаем урок (критично для отображения)
 * 2. Затем фоново загружаем список уроков для навигации
 */
const LessonPage = () => {
  const { lessonId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { pets } = usePets()
  const { success, error: showError } = useToastStore()

  // Раздельные состояния для прогрессивной загрузки
  const [lesson, setLesson] = useState(null)
  const [courseLessons, setCourseLessons] = useState([])
  const [loadingLesson, setLoadingLesson] = useState(true)
  const [loadingNavigation, setLoadingNavigation] = useState(false)
  const [petId, setPetId] = useState(searchParams.get('pet_id') || '')

  // Загрузка урока (первый приоритет)
  const loadLesson = useCallback(async () => {
    try {
      setLoadingLesson(true)
      const lessonResponse = await getLesson(lessonId, petId)
      // API клиент возвращает response.data напрямую
      setLesson(lessonResponse.lesson)
      return lessonResponse.lesson?.course_id
    } catch (error) {
      console.error('Error loading lesson:', error)
      showError('Не удалось загрузить урок')
      return null
    } finally {
      setLoadingLesson(false)
    }
  }, [lessonId, petId, showError])

  // Загрузка навигации (фоновая)
  const loadNavigation = useCallback(async (courseId) => {
    if (!courseId) return
    
    try {
      setLoadingNavigation(true)
      const lessonsResponse = await getCourseLessons(courseId, petId)
      // API клиент возвращает response.data напрямую
      setCourseLessons(lessonsResponse.lessons || [])
    } catch (error) {
      console.error('Error loading navigation:', error)
      // Не критично - навигация просто не будет доступна
    } finally {
      setLoadingNavigation(false)
    }
  }, [petId])

  // Прогрессивная загрузка
  useEffect(() => {
    // Используем isAuthenticated вместо user, т.к. user может быть null пока грузится профиль
    if (!lessonId || !isAuthenticated) return

    const loadData = async () => {
      const courseId = await loadLesson()
      if (courseId) {
        loadNavigation(courseId)
      }
    }

    loadData()
  }, [lessonId, isAuthenticated, loadLesson, loadNavigation])

  // Обработчики
  const handleLessonComplete = useCallback(async (completedLessonId, timeSpent) => {
    try {
      await completeLesson(completedLessonId, petId, timeSpent)
      success('Урок успешно завершён!')

      // Обновляем только урок (не навигацию)
      loadLesson()
    } catch (error) {
      console.error('Error completing lesson:', error)
      showError('Не удалось завершить урок')
    }
  }, [petId, success, showError, loadLesson])

  const handleLessonProgress = useCallback((progressLessonId, status, timeSpent) => {
    // Прогресс обновляется автоматически в компоненте LessonPlayer
  }, [])

  // Мемоизированная навигация
  const navigation = useMemo(() => {
    if (!courseLessons.length || !lesson) return null

    const currentIndex = courseLessons.findIndex(l => 
      (l.lesson_id || l.id) === parseInt(lessonId)
    )
    const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null
    const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null

    return { prevLesson, nextLesson, currentIndex: currentIndex + 1, total: courseLessons.length }
  }, [courseLessons, lesson, lessonId])

  const navigateToLesson = useCallback((targetLessonId) => {
    const params = petId ? `?pet_id=${petId}` : ''
    navigate(`/training/lessons/${targetLessonId}${params}`)
  }, [petId, navigate])

  const navigateToCourse = useCallback(() => {
    if (lesson?.course_id) {
      const params = petId ? `?pet_id=${petId}` : ''
      navigate(`/training/courses/${lesson.course_id}/learn${params}`)
    }
  }, [lesson?.course_id, petId, navigate])

  // Выбор питомца
  const handlePetChange = useCallback((newPetId) => {
    setPetId(newPetId)
    const params = newPetId ? `?pet_id=${newPetId}` : ''
    navigate(`/training/lessons/${lessonId}${params}`, { replace: true })
  }, [lessonId, navigate])

  // Скелетон только для начальной загрузки урока
  if (loadingLesson && !lesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-8 bg-gray-200 rounded w-32"></div>
              <div className="h-8 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!lesson && !loadingLesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Урок не найден</h1>
            <p className="text-gray-600 mb-6">Запрашиваемый урок не существует или недоступен.</p>
            <Button onClick={() => navigate('/training')}>
              Вернуться к курсам
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Заголовок и навигация */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={navigateToCourse}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Вернуться к курсу</span>
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

          {/* Навигация по урокам (загружается фоново) */}
          {loadingNavigation ? (
            <div className="bg-white p-4 rounded-lg shadow animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-9 w-32 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-9 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : navigation && (
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-4">
                {navigation.prevLesson && (
                  <Button
                    variant="outline"
                    onClick={() => navigateToLesson(navigation.prevLesson.lesson_id || navigation.prevLesson.id)}
                  >
                    ← Предыдущий урок
                  </Button>
                )}

                <span className="text-sm text-gray-600">
                  Урок {navigation.currentIndex} из {navigation.total}
                </span>

                {navigation.nextLesson && (
                  <Button
                    variant="outline"
                    onClick={() => navigateToLesson(navigation.nextLesson.lesson_id || navigation.nextLesson.id)}
                  >
                    Следующий урок →
                  </Button>
                )}
              </div>

              {/* Прогресс */}
              <div className="text-sm text-gray-600">
                Прогресс: {navigation.currentIndex}/{navigation.total}
              </div>
            </div>
          )}
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Урок */}
          <div className="lg:col-span-2">
            <LessonPlayer
              lessonId={lessonId}
              petId={petId}
              onComplete={handleLessonComplete}
              onProgress={handleLessonProgress}
            />
          </div>

          {/* Комментарии */}
          <div className="lg:col-span-1">
            <CommentsSection
              lessonId={lessonId}
              className="sticky top-8"
            />
          </div>
        </div>

        {/* Нижняя навигация */}
        {navigation && !loadingNavigation && (
          <div className="mt-8 flex justify-center space-x-4">
            {navigation.prevLesson && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateToLesson(navigation.prevLesson.lesson_id || navigation.prevLesson.id)}
              >
                ← {navigation.prevLesson.title}
              </Button>
            )}

            {navigation.nextLesson && (
              <Button
                size="lg"
                onClick={() => navigateToLesson(navigation.nextLesson.lesson_id || navigation.nextLesson.id)}
              >
                {navigation.nextLesson.title} →
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LessonPage
