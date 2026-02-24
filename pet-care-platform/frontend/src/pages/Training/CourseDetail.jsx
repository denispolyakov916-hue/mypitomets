/**
 * Страница детального просмотра курса (Stepik-style)
 * 
 * Чистый минималистичный дизайн:
 * - Hero: обложка + заголовок + бейджи
 * - О курсе (краткое описание)
 * - Чему вы научитесь
 * - Программа курса (аккордеон модулей)
 * - Персонализация
 * - Отзывы
 * - Боковая панель (sticky): цена, действия, быстрая информация
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { enrollFreeCourse, getCourseStructure, resetCourseProgress } from '../../api/courses'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { usePets } from '../../hooks/usePets'
import { useCourse } from '../../hooks/useCourse'
import { PageLoader, ButtonLoader } from '../../components/Loader'
import ReviewsSection from '../../components/ReviewsSection'
import { CoursePersonalizationWidget } from '../../components/Learning'

import { formatCoursePrice } from '../../utils/format'

/* ─── Утилиты ──────────────────────────────────────────── */

const formatDuration = (minutes) => {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

const petTypeInfo = {
  dog:  { label: 'Для собак',  icon: '🐕', color: 'from-blue-100 to-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  cat:  { label: 'Для кошек',  icon: '🐱', color: 'from-primary-100 to-primary-200', badge: 'bg-primary-100 text-primary-700' },
  all:  { label: 'Для всех',   icon: '🐾', color: 'from-green-100 to-green-200',  badge: 'bg-green-100 text-green-700' },
}

const levelLabels = { beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый', expert: 'Эксперт' }
const formatLabels = { video: 'Видео', text: 'Текст', interactive: 'Интерактив', mixed: 'Смешанный', webinar: 'Вебинар', workshop: 'Мастер-класс' }
const categoryLabels = { basics: 'Основы', training: 'Дрессировка', care: 'Уход', health: 'Здоровье', nutrition: 'Питание', behavior: 'Поведение', specialized: 'Спец.', entertainment: 'Развлечения' }

/** Иконка типа страницы */
const pageTypeConfig = {
  text:        { icon: '📖', color: 'bg-blue-100 text-blue-600', label: 'Теория' },
  video:       { icon: '▶️', color: 'bg-red-100 text-red-600', label: 'Видео' },
  quiz:        { icon: '❓', color: 'bg-primary-100 text-primary-600', label: 'Тест' },
  interactive: { icon: '🐾', color: 'bg-green-100 text-green-600', label: 'Упражнение' },
  assignment:  { icon: '✏️', color: 'bg-secondary-100 text-secondary-600', label: 'Задание' },
  webinar:     { icon: '📡', color: 'bg-primary-100 text-primary-600', label: 'Вебинар' },
}

/* ─── Компонент ────────────────────────────────────────── */

function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const cartError = useCartStore(s => s.error)
  const { addCourse, getItemInCart } = useCartStore()
  const { success, error: showError } = useToastStore()
  const { pets } = usePets()

  const { course, isOwned, isLoading, error, setOwned } = useCourse(id)
  const [imageError, setImageError] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  // Бесплатная запись
  const [showFreeEnrollModal, setShowFreeEnrollModal] = useState(false)
  const [freeEnrollAccepted, setFreeEnrollAccepted] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [selectedPetForEnroll, setSelectedPetForEnroll] = useState(null)

  // Структура курса
  const [courseStructure, setCourseStructure] = useState(null)
  const [expandedModules, setExpandedModules] = useState({})
  const [isResetting, setIsResetting] = useState(false)

  /* ─── Загрузка структуры курса ─── */

  useEffect(() => {
    getCourseStructure(id)
      .then(structure => {
        setCourseStructure(structure)
        if (structure.modules?.length > 0) {
          setExpandedModules({ [structure.modules[0].id || 0]: true })
        }
      })
      .catch(() => {})
  }, [id])

  // Авто-открытие модалки при ?enroll=free
  useEffect(() => {
    const enrollParam = searchParams.get('enroll')
    if (enrollParam === 'free' && course && course.price === 0 && !isOwned) {
      if (isAuthenticated) {
        setShowFreeEnrollModal(true)
        searchParams.delete('enroll')
        setSearchParams(searchParams, { replace: true })
      } else {
        navigate('/login', { state: { from: `/courses/${id}?enroll=free` } })
      }
    }
  }, [course, isOwned, isAuthenticated])

  useEffect(() => { setImageError(false) }, [course?.image_url])

  /* ─── Обработчики ─── */

  const handleResetProgress = async () => {
    if (!course || !window.confirm('Начать курс заново? Весь прогресс будет сброшен.')) return
    try {
      setIsResetting(true)
      await resetCourseProgress(course.id, null)
      success('Прогресс сброшен.')
      const structure = await getCourseStructure(id)
      setCourseStructure(structure)
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Не удалось сбросить прогресс')
    } finally {
      setIsResetting(false)
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: `/courses/${id}` } })
    if (isOwned) return
    setIsAddingToCart(true)
    try {
      const result = await addCourse(course.id, null, false)
      if (result) { success('Курс добавлен в корзину') }
      else { showError(cartError || 'Не удалось добавить курс в корзину') }
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Ошибка добавления в корзину')
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleOpenFreeEnrollModal = () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: `/courses/${id}` } })
    if (isOwned) return
    setShowFreeEnrollModal(true)
    setFreeEnrollAccepted(false)
  }

  const handleFreeEnroll = async () => {
    if (!freeEnrollAccepted) return showError('Необходимо согласиться с условиями')
    setIsEnrolling(true)
    try {
      await enrollFreeCourse(course.id, true, selectedPetForEnroll)
      setOwned(true)
      setShowFreeEnrollModal(false)
      success(`Вы записались на курс "${course.title}"!`)
      setTimeout(() => navigate(`/training/courses/${course.id}/learn`), 2000)
    } catch (err) {
      showError(err.response?.data?.error || err.message || 'Не удалось записаться')
    } finally {
      setIsEnrolling(false)
    }
  }

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }))
  }

  /* ─── Состояния загрузки / ошибки ─── */

  if (isLoading) return <PageLoader />
  if (error || !course) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Курс не найден'}</p>
          <Link to="/courses" className="btn-primary">Вернуться к курсам</Link>
        </div>
      </div>
    )
  }

  const petInfo = petTypeInfo[course.pet_type] || petTypeInfo.all
  const cartItem = course ? getItemInCart(course.id) : null
  const isInCart = !!cartItem
  const totalPages = courseStructure?.total_pages || course.lessons_count || 0

  /* ─── Рендер ─── */
  return (
    <div className="page-container animate-fadeIn">
      {/* Назад */}
      <Link to="/courses" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-6 transition-colors text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Все курсы
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ═══ Левая колонка — контент ═══ */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Hero: обложка + заголовок ── */}
          <div>
            {course.image_url && !imageError ? (
              <img
                src={course.image_url}
                alt={course.title}
                className="w-full h-72 object-cover rounded-2xl mb-5 shadow-md"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`w-full h-72 bg-gradient-to-br ${petInfo.color} rounded-2xl flex items-center justify-center mb-5 shadow-md`}>
                <span className="text-8xl opacity-40">{petInfo.icon}</span>
              </div>
            )}

            {/* Бейджи */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`px-3 py-1 ${petInfo.badge} text-xs rounded-full font-medium`}>{petInfo.label}</span>
              {course.category && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {categoryLabels[course.category] || course.category}
                </span>
              )}
              {course.level && (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                  {levelLabels[course.level] || course.level}
                </span>
              )}
              {course.is_free && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">Бесплатно</span>
              )}
            </div>

            <h1 className="page-title mb-2">{course.title}</h1>

            {/* Компактная строка: рейтинг + кол-во уроков */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {course.rating > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium text-gray-700">{Number(course.rating).toFixed(1)}</span>
                  {course.reviews_count > 0 && <span>({course.reviews_count} отзывов)</span>}
                </span>
              )}
              {totalPages > 0 && <span>{totalPages} уроков</span>}
              {formatDuration(course.duration) && <span>{formatDuration(course.duration)}</span>}
            </div>
          </div>

          {/* ── О курсе ── */}
          {(course.description || course.detailed_description) && (
            <div className="card">
              <h2 className="section-title mb-3">О курсе</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {course.description}
              </p>
              {course.detailed_description && course.detailed_description !== course.description && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-line mt-3">
                  {course.detailed_description}
                </p>
              )}
            </div>
          )}

          {/* ── Чему вы научитесь ── */}
          {course.what_you_will_learn && (
            <div className="card">
              <h2 className="section-title mb-3">Чему вы научитесь</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {course.what_you_will_learn.split('\n').filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">{item.replace(/^[-•]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Программа курса (аккордеон) ── */}
          {courseStructure?.modules?.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title mb-0">Программа курса</h2>
                <span className="text-sm text-gray-400">
                  {courseStructure.modules.length} модулей · {totalPages} уроков
                </span>
              </div>

              <div className="space-y-1">
                {courseStructure.modules.map((module, mi) => {
                  const mKey = module.id || mi
                  const isOpen = expandedModules[mKey]
                  const pages = module.pages || []

                  return (
                    <div key={mKey} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(mKey)}
                        className="w-full flex items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <svg className={`w-4 h-4 mr-3 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-800 flex-1">{module.title}</span>
                        <span className="text-xs text-gray-400 ml-2">{pages.length} уроков</span>
                      </button>

                      {isOpen && pages.length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {pages.map((page, pi) => {
                            const typeConf = pageTypeConfig[page.page_type] || pageTypeConfig.text
                            return (
                              <div key={page.id || pi} className="flex items-center px-4 py-2.5 pl-11">
                                {/* Иконка типа */}
                                <span className={`w-6 h-6 rounded-full ${typeConf.color} flex items-center justify-center text-xs mr-3 flex-shrink-0`}>
                                  {typeConf.icon}
                                </span>
                                <span className={`text-sm flex-1 ${isOwned || pi === 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                  {page.title}
                                </span>
                                {/* Замок для не купленных (кроме первого) */}
                                {!isOwned && pi > 0 && (
                                  <svg className="w-4 h-4 text-gray-300 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {!isOwned && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Доступ ко всем урокам открывается после записи на курс
                </p>
              )}
            </div>
          )}

          {/* ── Персонализация ── */}
          {course.personalization && pets?.length > 0 && (
            <CoursePersonalizationWidget
              personalization={course.personalization}
              petInfo={pets[0]}
            />
          )}

          {/* ── Требования (компактно, только если есть) ── */}
          {course.requirements && (
            <div className="card">
              <h2 className="section-title mb-2">Требования</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{course.requirements}</p>
            </div>
          )}

          {/* ── Инструктор (компактно, только если есть) ── */}
          {course.instructor_name && (
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">👨‍🏫</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Инструктор</p>
                  <p className="font-semibold text-gray-900">{course.instructor_name}</p>
                  {course.instructor_bio && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{course.instructor_bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Боковая панель (sticky) ═══ */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4 space-y-5">
            {/* Цена */}
            <div>
              <div className={`text-3xl font-bold ${course.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                {formatCoursePrice(course.price)}
              </div>
              {course.price > 0 && <p className="text-xs text-gray-400 mt-1">Единоразовая оплата · Доступ навсегда</p>}
            </div>

            {/* Быстрая информация */}
            <div className="space-y-2.5 pb-4 border-b border-gray-100 text-sm">
              {formatDuration(course.duration) && (
                <div className="flex justify-between"><span className="text-gray-500">Длительность</span><span className="font-medium">{formatDuration(course.duration)}</span></div>
              )}
              {totalPages > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Уроков</span><span className="font-medium">{totalPages}</span></div>
              )}
              {course.level && (
                <div className="flex justify-between"><span className="text-gray-500">Уровень</span><span className="font-medium">{levelLabels[course.level]}</span></div>
              )}
              {course.format_type && (
                <div className="flex justify-between"><span className="text-gray-500">Формат</span><span className="font-medium">{formatLabels[course.format_type]}</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Для кого</span><span className="font-medium">{petInfo.label}</span></div>
            </div>

            {/* Кнопки действий */}
            {isOwned ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-700 font-medium">✓ Курс доступен</p>
                  {courseStructure?.progress_percent > 0 && (
                    <p className="text-xs text-green-600 mt-1">Прогресс: {Math.round(courseStructure.progress_percent)}%</p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/training/courses/${course.id}/learn`)}
                  className="w-full py-3 px-4 rounded-xl font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors flex items-center justify-center gap-2"
                >
                  🎓 {courseStructure?.progress_percent > 0 ? 'Продолжить обучение' : 'Начать обучение'}
                </button>
                {courseStructure?.progress_percent > 0 && (
                  <button
                    onClick={handleResetProgress}
                    disabled={isResetting}
                    className="w-full py-2 px-4 rounded-lg text-sm text-gray-600 hover:text-secondary-600 hover:bg-secondary-50 border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isResetting ? 'Сброс...' : '🔄 Начать курс заново'}
                  </button>
                )}
              </div>
            ) : course.price > 0 ? (
              <div className="space-y-3">
                <button
                  onClick={isInCart ? () => navigate('/cart') : handleAddToCart}
                  disabled={isAddingToCart}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isInCart ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {isAddingToCart ? <ButtonLoader /> : isInCart ? '✓ В корзине — перейти' : 'Добавить в корзину'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleOpenFreeEnrollModal}
                disabled={isEnrolling}
                className="w-full py-3 px-4 rounded-xl font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEnrolling ? <><ButtonLoader /> Запись...</> : 'Записаться бесплатно'}
              </button>
            )}

            {/* Гарантии */}
            <div className="space-y-2 text-xs text-gray-400 pt-2">
              {['Доступ навсегда', 'Все материалы включены', 'Поддержка инструктора'].map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Отзывы (единственное место) ═══ */}
      <div className="mt-10">
        <ReviewsSection type="course" itemId={course.id} isPurchased={isOwned} />
      </div>

      {/* ═══ Модальное окно записи на бесплатный курс ═══ */}
      {showFreeEnrollModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowFreeEnrollModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fadeIn">
              {/* Заголовок */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Записаться на курс</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{course.title}</p>
                </div>
                <button onClick={() => setShowFreeEnrollModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Выбор питомца */}
              {pets?.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Для какого питомца? (опционально)</label>
                  <select
                    value={selectedPetForEnroll || ''}
                    onChange={(e) => setSelectedPetForEnroll(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Не выбран</option>
                    {pets
                      .filter(pet => course.pet_type === 'all' || pet.species === course.pet_type)
                      .map(pet => (
                        <option key={pet.id} value={pet.id}>{pet.name} ({pet.species === 'dog' ? '🐕 Собака' : '🐱 Кошка'})</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {/* Условия */}
              <div className="p-4 bg-secondary-50 border border-secondary-200 rounded-lg mb-5">
                <p className="text-sm text-secondary-700 mb-3">
                  Записываясь на курс, вы подтверждаете, что мы не гарантируем стопроцентного результата. 
                  Результаты зависят от особенностей питомца и усердия в выполнении рекомендаций.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeEnrollAccepted}
                    onChange={(e) => setFreeEnrollAccepted(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Принимаю условия использования</span>
                </label>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFreeEnrollModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleFreeEnroll}
                  disabled={!freeEnrollAccepted || isEnrolling}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEnrolling ? <><ButtonLoader /> Запись...</> : '✓ Записаться'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseDetail
