/**
 * CoursePageLearning - Страница обучения с новой архитектурой
 *
 * Работает с новой системой страниц и блоков вместо старой системы уроков.
 * Каждая страница содержит упорядоченный набор блоков контента.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { Card } from '../../../components/ui'
import ReviewsSection from '../../../components/ReviewsSection'
import { getCoursePages, getCoursePage, completeCoursePage } from '../../../api/courses'
import { useAuthStore } from '../../../store/authStore'
import { usePets } from '../../../hooks/usePets'
import { useToastStore } from '../../../store/toastStore'
import {
  RichTextRenderer,
  VideoPlayerRenderer,
  QuizRenderer,
  PetActionRenderer,
  GalleryRenderer,
  FileDownloadRenderer,
  CheckListRenderer,
  TimerRenderer,
  ProgressTrackerRenderer,
  CommentSectionRenderer,
  RatingRenderer
} from '../../../components/CourseBuilder/Blocks'

// Маппинг типов блоков к компонентам рендеринга
const blockRenderers = {
  rich_text: RichTextRenderer,
  video_player: VideoPlayerRenderer,
  quiz: QuizRenderer,
  pet_action: PetActionRenderer,
  gallery: GalleryRenderer,
  file_download: FileDownloadRenderer,
  checklist: CheckListRenderer,
  timer: TimerRenderer,
  progress_tracker: ProgressTrackerRenderer,
  comment_section: CommentSectionRenderer,
  rating: RatingRenderer,
}

/**
 * BlockRenderer - Универсальный рендерер блоков контента
 */
function BlockRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const Renderer = blockRenderers[block.block_type]

  if (!Renderer) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-yellow-50">
        <p className="text-yellow-800">
          Блок типа "{block.block_type}" пока не поддерживается
        </p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <Renderer
        block={block}
        mode={mode}
        onComplete={onComplete}
        onProgress={onProgress}
      />
    </div>
  )
}

/**
 * CoursePageLearning - Основная страница обучения
 */
const CoursePageLearning = () => {
  const { courseId, pageId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { pets } = usePets()
  const { success, error: showError } = useToastStore()

  // Состояния
  const [course, setCourse] = useState(null)
  const [currentPage, setCurrentPage] = useState(null)
  const [allPages, setAllPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPages, setLoadingPages] = useState(false)
  const [petId, setPetId] = useState(searchParams.get('pet_id') || '')

  /**
   * Загрузка данных курса и страниц
   */
  const loadCourseData = useCallback(async () => {
    if (!courseId || !isAuthenticated) return

    try {
      setLoading(true)

      // Загружаем все страницы курса
      const pagesResponse = await getCoursePages(courseId)
      setAllPages(pagesResponse.pages || [])
      setCourse(pagesResponse.course)

      // Если указан pageId, загружаем конкретную страницу
      if (pageId) {
        const pageResponse = await getCoursePage(courseId, pageId)
        setCurrentPage(pageResponse.page)
      } else if (pagesResponse.pages && pagesResponse.pages.length > 0) {
        // Если pageId не указан, берем первую страницу
        const firstPage = pagesResponse.pages[0]
        navigate(`/training/courses/${courseId}/learn/pages/${firstPage.id}${petId ? `?pet_id=${petId}` : ''}`, { replace: true })
        setCurrentPage(firstPage)
      }

    } catch (error) {
      console.error('Error loading course data:', error)
      showError('Не удалось загрузить курс')
      navigate('/training')
    } finally {
      setLoading(false)
    }
  }, [courseId, pageId, petId, isAuthenticated, navigate, showError])

  /**
   * Загрузка конкретной страницы
   */
  const loadPage = useCallback(async (targetPageId) => {
    if (!courseId || !targetPageId) return

    try {
      setLoadingPages(true)
      const pageResponse = await getCoursePage(courseId, targetPageId)
      setCurrentPage(pageResponse.page)
    } catch (error) {
      console.error('Error loading page:', error)
      showError('Не удалось загрузить страницу')
    } finally {
      setLoadingPages(false)
    }
  }, [courseId, showError])

  // Загрузка данных при монтировании
  useEffect(() => {
    loadCourseData()
  }, [loadCourseData])

  // Перезагрузка страницы при изменении pageId
  useEffect(() => {
    if (pageId && pageId !== currentPage?.id?.toString()) {
      loadPage(pageId)
    }
  }, [pageId, currentPage?.id, loadPage])

  /**
   * Навигация по страницам
   */
  const navigation = useMemo(() => {
    if (!allPages.length || !currentPage) return null

    const currentIndex = allPages.findIndex(p => p.id === currentPage.id)
    const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null
    const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null

    return {
      prevPage,
      nextPage,
      currentIndex: currentIndex + 1,
      total: allPages.length
    }
  }, [allPages, currentPage])

  /**
   * Обработчики
   */
  const handlePageChange = useCallback((targetPageId) => {
    const params = petId ? `?pet_id=${petId}` : ''
    navigate(`/training/courses/${courseId}/learn/pages/${targetPageId}${params}`)
  }, [courseId, petId, navigate])

  const handleBlockComplete = useCallback(async (blockId, data) => {
    // Обработка завершения блока
    console.log('Block completed:', blockId, data)
  }, [])

  const handleBlockProgress = useCallback((blockId, progress) => {
    // Обработка прогресса блока
    console.log('Block progress:', blockId, progress)
  }, [])

  const handlePageComplete = useCallback(async () => {
    if (!currentPage || !petId) return

    try {
      await completeCoursePage(currentPage.id, petId)
      success('Страница успешно завершена!')

      // Переход к следующей странице
      if (navigation?.nextPage) {
        handlePageChange(navigation.nextPage.id)
      }
    } catch (error) {
      console.error('Error completing page:', error)
      showError('Не удалось завершить страницу')
    }
  }, [currentPage, petId, navigation, handlePageChange, success, showError])

  const handlePetChange = useCallback((newPetId) => {
    setPetId(newPetId)
    const params = newPetId ? `?pet_id=${newPetId}` : ''
    const pagePath = pageId ? `/pages/${pageId}` : ''
    navigate(`/training/courses/${courseId}/learn${pagePath}${params}`, { replace: true })
  }, [courseId, pageId, navigate])

  // Загрузка
  if (loading && !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ошибка загрузки
  if (!course && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Курс не найден</h1>
            <p className="text-gray-600 mb-6">Запрашиваемый курс не существует или недоступен.</p>
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
              onClick={() => navigate(`/training/courses/${courseId}/learn`)}
              className="flex items-center space-x-2"
            >
              <span>←</span>
              <span>Обзор курса</span>
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

          {/* Навигация по страницам */}
          {navigation && (
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-4">
                {navigation.prevPage && (
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(navigation.prevPage.id)}
                  >
                    ← Предыдущая страница
                  </Button>
                )}

                <span className="text-sm text-gray-600">
                  Страница {navigation.currentIndex} из {navigation.total}
                </span>

                {navigation.nextPage && (
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(navigation.nextPage.id)}
                  >
                    Следующая страница →
                  </Button>
                )}
              </div>

              <div className="text-sm text-gray-600">
                {currentPage?.title}
              </div>
            </div>
          )}
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Страница с блоками */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              {loadingPages ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-4">
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-40 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : currentPage ? (
                <div>
                  {/* Заголовок страницы */}
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {currentPage.title}
                    </h1>
                    {currentPage.page_type_display && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {currentPage.page_type_display}
                      </span>
                    )}
                  </div>

                  {/* Блоки контента */}
                  <div className="space-y-6">
                    {currentPage.blocks && currentPage.blocks.length > 0 ? (
                      currentPage.blocks.map((block) => (
                        <BlockRenderer
                          key={block.id}
                          block={block}
                          mode="view"
                          onComplete={handleBlockComplete}
                          onProgress={handleBlockProgress}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-4">📄</div>
                        <p>На этой странице пока нет контента</p>
                      </div>
                    )}
                  </div>

                  {/* Кнопка завершения страницы */}
                  <div className="mt-8 flex justify-center">
                    <Button
                      onClick={handlePageComplete}
                      size="lg"
                      className="px-8"
                    >
                      Завершить страницу
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📖</div>
                  <p>Страница не найдена</p>
                </div>
              )}
            </Card>
          </div>

          {/* Боковая панель */}
          <div className="lg:col-span-1 space-y-6">
            {/* Содержание курса */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Содержание курса</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allPages.map((page, index) => (
                  <button
                    key={page.id}
                    onClick={() => handlePageChange(page.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      page.id === currentPage?.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        page.id === currentPage?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{page.title}</p>
                        <p className="text-xs text-gray-500">
                          {page.blocks_count || 0} блоков
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Прогресс */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Ваш прогресс</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {navigation ? Math.round((navigation.currentIndex / navigation.total) * 100) : 0}%
                  </div>
                  <p className="text-sm text-gray-600">завершено</p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${navigation ? (navigation.currentIndex / navigation.total) * 100 : 0}%`
                    }}
                  ></div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  {navigation ? `${navigation.currentIndex} из ${navigation.total} страниц` : 'Загрузка...'}
                </p>
              </div>
            </Card>

            {/* Рейтинг курса */}
            <ReviewsSection
              type="course"
              itemId={courseId}
              isPurchased={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoursePageLearning

