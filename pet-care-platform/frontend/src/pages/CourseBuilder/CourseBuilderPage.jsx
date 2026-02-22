/**
 * CourseBuilderPage - Главная страница конструктора курсов
 *
 * Реализует визуальный конструктор для создания курсов из блоков.
 * Предоставляет drag-and-drop интерфейс для сборки курса.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import CourseBuilder from '../../components/CourseBuilder/CourseBuilder'
import CoursePreview from '../../components/CourseBuilder/CoursePreview'
import { PageLoader } from '../../components/Loader'
import { getCourseBuilder, getCourse, saveCourseBuilder, publishCourse } from '../../api/courses'

/**
 * CourseBuilderPage - Страница конструктора курсов
 */
function CourseBuilderPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const showToast = useToastStore(s => s.showToast)

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  /**
   * Загрузка данных курса для конструктора
   */
  const loadCourseData = useCallback(async () => {
    try {
      setLoading(true)

      // Сначала получаем базовую информацию о курсе
      const courseData = await getCourse(courseId)

      // Затем получаем структуру для конструктора
      const builderData = await getCourseBuilder(courseId)

      setCourse({
        ...courseData,
        ...builderData
      })
    } catch (error) {
      console.error('Error loading course for builder:', error)
      showToast('Ошибка загрузки курса', 'error')
      navigate('/admin/courses')
    } finally {
      setLoading(false)
    }
  }, [courseId, showToast, navigate])

  /**
   * Сохранение изменений курса
   */
  const handleSave = useCallback(async (courseData) => {
    try {
      setSaving(true)
      await saveCourseBuilder(courseId, courseData)
      showToast('Курс сохранен успешно', 'success')
    } catch (error) {
      console.error('Error saving course:', error)
      showToast('Ошибка сохранения курса', 'error')
    } finally {
      setSaving(false)
    }
  }, [courseId, showToast])

  /**
   * Публикация курса
   */
  const handlePublish = useCallback(async () => {
    try {
      setSaving(true)
      await publishCourse(courseId)
      showToast('Курс опубликован', 'success')
      navigate('/admin/courses')
    } catch (error) {
      console.error('Error publishing course:', error)
      showToast('Ошибка публикации курса', 'error')
    } finally {
      setSaving(false)
    }
  }, [courseId, showToast, navigate])

  /**
   * Предпросмотр курса
   */
  const handlePreview = useCallback(() => {
    setShowPreview(true)
  }, [])

  // Загрузка данных при монтировании
  useEffect(() => {
    loadCourseData()
  }, [loadCourseData])

  // Проверка прав доступа (администраторы и создатели курсов)
  useEffect(() => {
    if (user && !user.is_staff && user.role !== 'course_creator') {
      showToast('Недостаточно прав для доступа к конструктору', 'error')
      navigate('/courses')
    }
  }, [user, showToast, navigate])

  if (loading) {
    return <PageLoader />
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Курс не найден
          </h2>
          <button
            onClick={() => navigate('/admin/courses')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку курсов
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Конструктор курса: {course.title}
            </h1>
            <p className="text-gray-600 mt-1">
              Создайте курс из переиспользуемых блоков контента
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreview}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Предпросмотр
            </button>

            <button
              onClick={() => handleSave(course)}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>

            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Опубликовать
            </button>
          </div>
        </div>
      </div>

      {/* Конструктор курсов */}
      <CourseBuilder
        course={course}
        onSave={handleSave}
        onPublish={handlePublish}
        saving={saving}
      />

      {/* Предпросмотр курса */}
      <CoursePreview
        course={course}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  )
}

export default CourseBuilderPage
