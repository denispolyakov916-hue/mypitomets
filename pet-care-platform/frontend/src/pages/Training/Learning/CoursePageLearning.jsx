/**
 * CoursePageLearning - Страница обучения (Stepik-стиль)
 *
 * Трёхколоночный лейаут:
 * - Левый сайдбар: ModuleSidebar (дерево модулей/уроков)
 * - Центр: StepNavigation + контент страницы + нижняя навигация
 * - Контент обёрнут в ContentProtection (защита от копирования)
 *
 * Прогресс считается по реально завершённым страницам.
 * Комментарии привязаны к конкретному уроку (lesson-level).
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { getCourseStructure, getCoursePage, completeCoursePage, resetCourseProgress } from '../../../api/courses'
import { useAuthStore } from '../../../store/authStore'
import { usePets } from '../../../hooks/usePets'
import { useToastStore } from '../../../store/toastStore'
import ContentProtection from '../../../components/Learning/ContentProtection'
import ModuleSidebar from '../../../components/Learning/ModuleSidebar'
import StepNavigation from '../../../components/Learning/StepNavigation'
import {
  RichTextRenderer,
  VideoPlayerRenderer,
  QuizRenderer,
  PetActionRenderer,
  GalleryRenderer,
  FileDownloadRenderer,
  CheckListRenderer,
  TimerRenderer,
} from '../../../components/CourseBuilder/Blocks'

// Ленивая загрузка CommentsSection
const CommentsSection = lazy(() =>
  import('../../../components/Learning/CommentsSection').catch(() => ({ default: () => null }))
)

// Маппинг типов блоков к компонентам (убраны progress_tracker, comment_section, rating — они обрабатываются отдельно)
const blockRenderers = {
  rich_text: RichTextRenderer,
  video_player: VideoPlayerRenderer,
  quiz: QuizRenderer,
  pet_action: PetActionRenderer,
  gallery: GalleryRenderer,
  file_download: FileDownloadRenderer,
  checklist: CheckListRenderer,
  timer: TimerRenderer,
}

/** Конфигурация типов страниц (цвета и иконки) */
const pageTypeConfig = {
  text:        { icon: '📖', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   label: 'Теория' },
  video:       { icon: '▶️', bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: 'Видео' },
  quiz:        { icon: '❓', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Тест' },
  interactive: { icon: '🐾', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Упражнение' },
  assignment:  { icon: '✏️', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'Задание' },
  webinar:     { icon: '📡', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', label: 'Вебинар' },
}

/**
 * BlockRenderer - Универсальный рендерер блоков контента
 */
function BlockRenderer({ block, mode = 'view', onComplete, onProgress }) {
  const Renderer = blockRenderers[block.block_type]

  if (!Renderer) {
    // Пропускаем неподдерживаемые блоки (progress_tracker, comment_section, rating)
    return null
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

  const [courseStructure, setCourseStructure] = useState(null)
  const [currentPage, setCurrentPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [petId, setPetId] = useState(searchParams.get('pet_id') || '')
  const [completedQuizzes, setCompletedQuizzes] = useState({})

  /* ─── Загрузка структуры ─── */

  const loadCourseStructure = useCallback(async () => {
    if (!courseId || !isAuthenticated) return
    try {
      setLoading(true)
      const structure = await getCourseStructure(courseId, petId || undefined)
      setCourseStructure(structure)

      const allPages = structure.modules?.flatMap(m => m.pages || []) || []

      if (pageId) {
        const pageResponse = await getCoursePage(courseId, pageId)
        setCurrentPage(pageResponse.page || pageResponse)
      } else if (allPages.length > 0) {
        const firstIncomplete = allPages.find(p => p.status !== 'completed')
        const targetPage = firstIncomplete || allPages[0]
        navigate(
          `/training/courses/${courseId}/learn/pages/${targetPage.id}${petId ? `?pet_id=${petId}` : ''}`,
          { replace: true }
        )
        const pageResponse = await getCoursePage(courseId, targetPage.id)
        setCurrentPage(pageResponse.page || pageResponse)
      }
    } catch (err) {
      console.error('Error loading course structure:', err)
      showError('Не удалось загрузить курс')
      navigate('/courses')
    } finally {
      setLoading(false)
    }
  }, [courseId, pageId, petId, isAuthenticated, navigate, showError])

  const loadPage = useCallback(async (targetPageId) => {
    if (!courseId || !targetPageId) return
    try {
      setLoadingPage(true)
      const pageResponse = await getCoursePage(courseId, targetPageId)
      setCurrentPage(pageResponse.page || pageResponse)
    } catch (err) {
      console.error('Error loading page:', err)
      showError('Не удалось загрузить страницу')
    } finally {
      setLoadingPage(false)
    }
  }, [courseId, showError])

  useEffect(() => { loadCourseStructure() }, [loadCourseStructure])

  // Сброс результатов тестов при смене страницы
  useEffect(() => {
    setCompletedQuizzes({})
  }, [currentPage?.id])

  useEffect(() => {
    if (pageId && currentPage && pageId !== currentPage.id?.toString()) {
      loadPage(pageId)
    }
  }, [pageId, currentPage, loadPage])

  /* ─── Мемоизированные данные ─── */

  const allPages = useMemo(() => {
    if (!courseStructure?.modules) return []
    return courseStructure.modules.flatMap(m => m.pages || [])
  }, [courseStructure])

  const navigation = useMemo(() => {
    if (!allPages.length || !currentPage) return null
    const idx = allPages.findIndex(p => p.id === currentPage.id)
    return {
      prevPage: idx > 0 ? allPages[idx - 1] : null,
      nextPage: idx < allPages.length - 1 ? allPages[idx + 1] : null,
      currentIndex: idx,
      total: allPages.length,
    }
  }, [allPages, currentPage])

  const currentModule = useMemo(() => {
    if (!courseStructure?.modules || !currentPage) return null
    return courseStructure.modules.find(m => m.pages?.some(p => p.id === currentPage.id))
  }, [courseStructure, currentPage])

  const currentModuleSteps = useMemo(() => currentModule?.pages || [], [currentModule])

  const realProgress = useMemo(() => {
    if (!courseStructure) return { percent: 0, completed: 0, total: 0 }
    return {
      percent: courseStructure.progress_percent || 0,
      completed: courseStructure.completed_pages || 0,
      total: courseStructure.total_pages || 0,
    }
  }, [courseStructure])

  /* ─── Обработчики ─── */

  const handlePageSelect = useCallback((targetPageId) => {
    const params = petId ? `?pet_id=${petId}` : ''
    navigate(`/training/courses/${courseId}/learn/pages/${targetPageId}${params}`)
  }, [courseId, petId, navigate])

  const handleBlockComplete = useCallback((blockId, data) => {
    const block = currentPage?.blocks?.find(b => b.id === blockId)
    if (block?.block_type === 'quiz' && data?.score !== undefined) {
      setCompletedQuizzes(prev => ({ ...prev, [blockId]: data.score }))
    }
  }, [currentPage?.blocks])

  const handleBlockProgress = useCallback((blockId, progress) => {
    console.log('Block progress:', blockId, progress)
  }, [])

  const handlePageComplete = useCallback(async () => {
    if (!currentPage) return
    try {
      await completeCoursePage(currentPage.id, petId || undefined)
      success('Страница завершена!')

      setCourseStructure(prev => {
        if (!prev) return prev
        const updatedModules = prev.modules.map(m => ({
          ...m,
          pages: m.pages?.map(p => p.id === currentPage.id ? { ...p, status: 'completed' } : p),
        }))
        const completedCount = updatedModules.flatMap(m => m.pages || []).filter(p => p.status === 'completed').length
        const totalCount = updatedModules.flatMap(m => m.pages || []).length
        return {
          ...prev,
          modules: updatedModules,
          completed_pages: completedCount,
          total_pages: totalCount,
          progress_percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 1000) / 10 : 0,
        }
      })

      if (navigation?.nextPage) handlePageSelect(navigation.nextPage.id)
    } catch (err) {
      console.error('Error completing page:', err)
      showError('Не удалось завершить страницу')
    }
  }, [currentPage, petId, navigation, handlePageSelect, success, showError])

  const mandatoryQuizzes = useMemo(() => {
    return (currentPage?.blocks || []).filter(
      b => b.block_type === 'quiz' && b.content?.mandatory_testing
    )
  }, [currentPage?.blocks])

  const canCompletePage = useMemo(() => {
    if (mandatoryQuizzes.length === 0) return true
    const passingScore = (b) => b.content?.passing_score ?? 70
    return mandatoryQuizzes.every(b => {
      const score = completedQuizzes[b.id]
      return score !== undefined && score >= passingScore(b)
    })
  }, [mandatoryQuizzes, completedQuizzes])

  const [isResetting, setIsResetting] = useState(false)

  const handleResetProgress = useCallback(async () => {
    if (!courseId || !window.confirm('Начать курс заново? Весь прогресс будет сброшен.')) return
    try {
      setIsResetting(true)
      await resetCourseProgress(courseId, petId || undefined)
      success('Прогресс сброшен. Курс начат заново.')
      await loadCourseStructure()
      if (currentPage?.id) await loadPage(currentPage.id)
    } catch (err) {
      console.error('Error resetting progress:', err)
      showError('Не удалось сбросить прогресс')
    } finally {
      setIsResetting(false)
    }
  }, [courseId, petId, loadCourseStructure, currentPage?.id, loadPage, success, showError])

  const handlePetChange = useCallback((newPetId) => {
    setPetId(newPetId)
    const params = newPetId ? `?pet_id=${newPetId}` : ''
    const pagePath = pageId ? `/pages/${pageId}` : ''
    navigate(`/training/courses/${courseId}/learn${pagePath}${params}`, { replace: true })
  }, [courseId, pageId, navigate])

  /* ─── Загрузка / ошибка ─── */

  if (loading && !courseStructure) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r animate-pulse">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
          </div>
        </div>
        <div className="flex-1 p-8">
          <div className="animate-pulse max-w-3xl mx-auto">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
            <div className="h-64 bg-gray-200 rounded mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    )
  }

  if (!courseStructure && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Курс не найден</h1>
          <p className="text-gray-600 mb-6">Курс не существует или недоступен.</p>
          <Button onClick={() => navigate('/courses')}>Вернуться к курсам</Button>
        </div>
      </div>
    )
  }

  const pageType = currentPage?.page_type || 'text'
  const typeConf = pageTypeConfig[pageType] || pageTypeConfig.text

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Левый сайдбар */}
      <ModuleSidebar
        modules={courseStructure?.modules || []}
        currentPageId={currentPage?.id}
        onPageSelect={handlePageSelect}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Основная область */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Верхняя панель */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← К описанию курса
            </button>
            <h1 className="text-lg font-semibold text-gray-800 truncate max-w-md">
              {courseStructure?.course_title}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {pets?.length > 1 && (
              <select
                value={petId}
                onChange={(e) => handlePetChange(e.target.value)}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Выберите питомца</option>
                {pets.map(pet => (
                  <option key={pet.id} value={pet.id}>{pet.name}</option>
                ))}
              </select>
            )}

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${realProgress.percent}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600">{Math.round(realProgress.percent)}%</span>
              </div>
              {realProgress.percent > 0 && (
                <button
                  onClick={handleResetProgress}
                  disabled={isResetting}
                  className="text-xs text-gray-500 hover:text-amber-600 transition-colors disabled:opacity-50"
                  title="Начать курс заново"
                >
                  {isResetting ? 'Сброс...' : '🔄 Начать заново'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Степпер */}
        <StepNavigation
          steps={currentModuleSteps}
          currentStepId={currentPage?.id}
          onStepSelect={handlePageSelect}
          moduleTitle={currentModule?.title}
        />

        {/* Контент */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {loadingPage ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-6" />
                <div className="space-y-4">
                  <div className="h-48 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            ) : currentPage ? (
              <ContentProtection
                userId={user?.id}
                userEmail={user?.email}
                enabled={true}
                showWatermark={true}
              >
                {/* Заголовок с цветной карточкой типа */}
                <div className={`mb-8 p-4 rounded-xl border ${typeConf.bg} ${typeConf.border}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeConf.icon}</span>
                    <div>
                      <span className={`text-xs font-medium ${typeConf.text} uppercase tracking-wider`}>
                        {typeConf.label}
                      </span>
                      <h2 className="text-xl font-bold text-gray-900">{currentPage.title}</h2>
                    </div>
                  </div>
                </div>

                {/* Блоки контента */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px' }}>
                  {currentPage.blocks?.length > 0 ? (
                    currentPage.blocks.map((block) => {
                      const span = block.settings?.layout?.span || 12
                      const offset = block.settings?.layout?.offset || 0
                      return (
                        <div
                          key={block.id}
                          style={{
                            gridColumn: offset > 0
                              ? `${offset + 1} / span ${span}`
                              : `span ${span} / span ${span}`,
                          }}
                        >
                          <BlockRenderer
                            block={block}
                            mode="view"
                            onComplete={handleBlockComplete}
                            onProgress={handleBlockProgress}
                          />
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-4">📄</div>
                      <p>На этой странице пока нет контента</p>
                    </div>
                  )}
                </div>
              </ContentProtection>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📖</div>
                <p>Выберите урок из содержания слева</p>
              </div>
            )}

            {/* Нижняя навигация */}
            {currentPage && navigation && (
              <div className="mt-10 mb-6 flex items-center justify-between border-t border-gray-200 pt-6">
                <div>
                  {navigation.prevPage && (
                    <button
                      onClick={() => handlePageSelect(navigation.prevPage.id)}
                      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <div className="text-left">
                        <div className="text-xs text-gray-400">Назад</div>
                        <div className="text-sm font-medium">{navigation.prevPage.title}</div>
                      </div>
                    </button>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <Button
                    onClick={handlePageComplete}
                    disabled={!canCompletePage}
                    title={!canCompletePage && mandatoryQuizzes.length > 0 ? 'Сначала пройдите обязательный тест' : undefined}
                    className="px-8 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                  >
                    Завершить и продолжить
                  </Button>
                  {mandatoryQuizzes.length > 0 && !canCompletePage && (
                    <p className="text-xs text-amber-600 mt-1 text-center max-w-xs">
                      Пройдите обязательный тест для завершения страницы
                    </p>
                  )}
                </div>

                <div>
                  {navigation.nextPage && (
                    <button
                      onClick={() => handlePageSelect(navigation.nextPage.id)}
                      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Далее</div>
                        <div className="text-sm font-medium">{navigation.nextPage.title}</div>
                      </div>
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Комментарии к уроку (lesson-level) */}
            {currentPage && (
              <div className="mt-8 border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Комментарии к уроку</h3>
                <Suspense fallback={<div className="text-gray-400 text-sm">Загрузка комментариев...</div>}>
                  <CommentsSection
                    courseId={courseId}
                    pageId={currentPage.id}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoursePageLearning
