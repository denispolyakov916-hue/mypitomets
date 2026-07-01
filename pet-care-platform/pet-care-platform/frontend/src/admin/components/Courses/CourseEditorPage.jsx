/**
 * CourseEditorPage - Unified course editor with two tabs.
 *
 * Tab 1: Settings (course metadata via CourseFormFields)
 * Tab 2: Constructor (CourseBuilder with module tree, canvas, properties)
 *
 * Features:
 * - Auto-save every 30s when dirty
 * - Manual save button
 * - Publish button (sets status to published)
 * - Unsaved changes indicator with live timer
 * - beforeunload warning
 * - Builder preserved when switching tabs (CSS display toggle)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../utils/api'
import { getCourseBuilder, publishCourse } from '../../../api/courses'
import { useAuthStore } from '../../../store/authStore'
import CourseFormFields from '../Forms/CourseFormFields'
import CourseBuilder from '../../../components/CourseBuilder/CourseBuilder'
import ErrorBoundary from '../../../components/ErrorBoundary'
import BehaviorCorrectionPassport from './BehaviorCorrectionPassport'
import BehaviorMatchingRules from './BehaviorMatchingRules'
import BehaviorSafetyChecklist from './BehaviorSafetyChecklist'
import CourseStudentsPanel from './CourseStudentsPanel'
import CourseAnalyticsPanel from './CourseAnalyticsPanel'
import { devLog } from '../../utils/logger';

const STATUS_LABELS = { draft: 'Черновик', published: 'Опубликован', archived: 'Архив' }
const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
}
const REVIEW_LABELS = {
  not_submitted: 'Не отправлен',
  in_review: 'На проверке',
  changes_requested: 'Нужны правки',
  approved: 'Одобрен',
}
const REVIEW_COLORS = {
  not_submitted: 'bg-gray-100 text-gray-600',
  in_review: 'bg-blue-100 text-blue-800',
  changes_requested: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
}

const COURSE_SAVE_FIELDS = [
  'title', 'description', 'detailed_description', 'what_you_will_learn',
  'category', 'subcategory', 'level', 'pet_type', 'format_type',
  'price', 'duration', 'completion_time',
  'instructor_name', 'instructor_bio',
  'author_id',
  'course_type',
  'recommended_behavior_types', 'recommended_activity_levels',
  'recommended_social_levels', 'min_training_experience',
  'compatible_health_issues', 'addresses_special_needs',
  'suitable_activities', 'addresses_behavioral_problems',
  'correction_problem', 'correction_problem_tags', 'correction_symptoms',
  'correction_goal', 'success_metrics', 'risk_level',
  'contraindications', 'red_flags', 'safety_notes', 'required_equipment',
  'owner_daily_time_minutes', 'min_age_months', 'max_age_months',
  'excluded_behavioral_problems', 'excluded_health_issues',
  'requires_specialist_supervision', 'requires_vet_clearance',
]

export default function CourseEditorPage({ panelBase = '/admin-panel', specialistMode = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const routeBase = panelBase.replace(/\/$/, '')
  const user = useAuthStore(s => s.user)
  const canPublish = !specialistMode && (user?.is_staff || user?.is_superuser || user?.role === 'admin')

  const [course, setCourse] = useState(null)
  const [builderData, setBuilderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('settings')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [publishCheckTick, setPublishCheckTick] = useState(0)
  const [specialists, setSpecialists] = useState([])
  const [, setTick] = useState(0) // force re-render for save status timer

  const dirtyRef = useRef(false)
  const courseRef = useRef(null)

  useEffect(() => { dirtyRef.current = isDirty }, [isDirty])
  useEffect(() => { courseRef.current = course }, [course])

  // Tick every 10s to update "saved X ago" text
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10000)
    return () => clearInterval(t)
  }, [])

  /* ─── Load course data ─── */
  const loadCourse = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const courseRes = await adminAPI.courses.retrieve(id)
      const courseData = courseRes.data || courseRes
      setCourse(courseData)

      try {
        const builder = await getCourseBuilder(id)
        setBuilderData({
          ...courseData,
          ...builder,
          modules: builder?.modules ?? [],
          orphan_pages: builder?.orphan_pages ?? [],
        })
      } catch (err) {
        devLog.warn('Builder load failed, using empty structure:', err)
        setBuilderData({
          ...courseData,
          modules: [],
          orphan_pages: [],
          pages: [],
        })
      }
    } catch (err) {
      devLog.error('Error loading course:', err)
      navigate(`${routeBase}/courses`)
    } finally {
      setLoading(false)
    }
  }, [id, navigate, routeBase])

  useEffect(() => { loadCourse() }, [loadCourse])

  useEffect(() => {
    if (specialistMode || !canPublish) return

    const loadSpecialists = async () => {
      try {
        const response = await adminAPI.users.list({
          role: 'course_creator',
          is_active: 'true',
          page_size: 100,
        })
        const users = response.data?.results || response.data || []
        setSpecialists(users.map(item => ({
          value: item.id,
          label: item.email || `${item.first_name || ''} ${item.last_name || ''}`.trim() || `Специалист #${item.id}`,
        })))
      } catch (err) {
        devLog.warn('Failed to load course specialists:', err)
        setSpecialists([])
      }
    }

    loadSpecialists()
  }, [canPublish, specialistMode])

  /* ─── Save metadata ─── */
  const saveCourse = useCallback(async () => {
    if (!courseRef.current || !id) return
    setSaving(true)
    setSaveError(null)
    try {
      const d = courseRef.current
      const payload = COURSE_SAVE_FIELDS.reduce((acc, field) => {
        acc[field] = d[field]
        return acc
      }, {})
      const res = await adminAPI.courses.update(id, payload)
      // Update local state with server response
      const updated = res.data || res
      setCourse(prev => ({ ...prev, ...updated }))
      setIsDirty(false)
      setLastSaved(new Date())
      setPublishCheckTick(n => n + 1)
    } catch (err) {
      devLog.error('Error saving course:', err)
      setSaveError('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }, [id])

  /* ─── Auto-save every 30s ─── */
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current) saveCourse()
    }, 30000)
    return () => clearInterval(timer)
  }, [saveCourse])

  /* ─── Before unload warning ─── */
  useEffect(() => {
    const handler = (e) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  /* ─── Field change handler for settings ─── */
  const handleFieldChange = useCallback((field, value) => {
    setCourse(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }, [])

  /* ─── Publish ─── */
  const handlePublish = useCallback(async () => {
    if (isDirty) await saveCourse()
    setSaving(true)
    try {
      if (courseRef.current?.course_type === 'behavior_correction') {
        const checkResponse = await adminAPI.courses.publishCheck(id)
        const check = checkResponse.data
        if (!check.can_publish) {
          setSaveError(check.blocking_errors?.[0] || 'Курс пока нельзя опубликовать')
          setPublishCheckTick(n => n + 1)
          return
        }
      }
      await publishCourse(id)
      setCourse(prev => ({ ...prev, status: 'published', is_active: true }))
      setLastSaved(new Date())
      setSaveError(null)
      setPublishCheckTick(n => n + 1)
    } catch (err) {
      devLog.error('Error publishing:', err)
      setSaveError(err.response?.data?.blocking_errors?.[0] || err.response?.data?.error || 'Ошибка публикации')
    } finally {
      setSaving(false)
    }
  }, [id, isDirty, saveCourse])

  const handleSubmitForReview = useCallback(async () => {
    if (isDirty) await saveCourse()
    setSaving(true)
    try {
      const res = await adminAPI.courses.submitForReview(id)
      const updated = res.data || res
      setCourse(prev => ({ ...prev, ...updated }))
      setLastSaved(new Date())
      setSaveError(null)
    } catch (err) {
      devLog.error('Error submitting course for review:', err)
      setSaveError(err.response?.data?.error || 'Ошибка отправки на проверку')
    } finally {
      setSaving(false)
    }
  }, [id, isDirty, saveCourse])

  /* ─── Unpublish (back to draft) ─── */
  const handleUnpublish = useCallback(async () => {
    setSaving(true)
    try {
      await adminAPI.courses.update(id, { status: 'draft', is_active: false })
      setCourse(prev => ({ ...prev, status: 'draft', is_active: false }))
      setLastSaved(new Date())
    } catch (err) {
      devLog.error('Error unpublishing:', err)
      setSaveError('Ошибка снятия с публикации')
    } finally {
      setSaving(false)
    }
  }, [id])

  /* ─── Save status display ─── */
  const getSaveStatus = () => {
    if (saving) return { text: 'Сохранение...', dot: 'bg-primary-400 animate-pulse' }
    if (saveError) return { text: saveError, dot: 'bg-red-400' }
    if (isDirty) return { text: 'Несохранённые изменения', dot: 'bg-secondary-400' }
    if (lastSaved) {
      const secs = Math.round((Date.now() - lastSaved.getTime()) / 1000)
      if (secs < 5) return { text: 'Сохранено', dot: 'bg-green-400' }
      if (secs < 60) return { text: `Сохранено ${secs}с назад`, dot: 'bg-green-400' }
      const mins = Math.round(secs / 60)
      return { text: `Сохранено ${mins}м назад`, dot: 'bg-gray-300' }
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Загрузка курса...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-3">Курс не найден</p>
          <button onClick={() => navigate(`${routeBase}/courses`)} className="text-primary-600 hover:underline text-sm">
            К списку курсов
          </button>
        </div>
      </div>
    )
  }

  const saveStatus = getSaveStatus()
  const isPublished = course.status === 'published'
  const isBehaviorCorrection = course.course_type === 'behavior_correction'
  const canSubmitForReview = (
    isBehaviorCorrection &&
    !canPublish &&
    !['in_review', 'approved'].includes(course.review_status)
  )
  const tabs = [
    { key: 'settings', label: 'Настройки', icon: '⚙️' },
    ...(isBehaviorCorrection ? [
      { key: 'passport', label: 'Паспорт коррекции', icon: '📋' },
      { key: 'matching', label: 'Подбор', icon: '🎯' },
      { key: 'safety', label: 'Безопасность', icon: '🛡' },
    ] : []),
    { key: 'builder', label: 'Конструктор', icon: '🧩' },
    ...(isBehaviorCorrection ? [
      { key: 'students', label: 'Ученики', icon: '👥' },
      { key: 'analytics', label: 'Аналитика', icon: '📈' },
    ] : []),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              if (isDirty && !window.confirm('У вас есть несохранённые изменения. Покинуть страницу?')) return
              navigate(`${routeBase}/courses`)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
            title="К списку курсов"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h1 className="text-base font-semibold text-gray-800 truncate">
            {course.title || 'Без названия'}
          </h1>

          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[course.status] || STATUS_COLORS.draft}`}>
            {STATUS_LABELS[course.status] || 'Черновик'}
          </span>

          {isBehaviorCorrection && (
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${REVIEW_COLORS[course.review_status] || REVIEW_COLORS.not_submitted}`}>
              {REVIEW_LABELS[course.review_status] || 'Не отправлен'}
            </span>
          )}

          {saveStatus && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${saveStatus.dot}`} />
              <span className="text-[11px] text-gray-400">{saveStatus.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => window.open(`/training/courses/${id}/learn`, '_blank', 'noopener,noreferrer')}
            className="px-3 py-1.5 text-xs font-medium border border-primary-300 text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            title="Предпросмотр курса"
          >
            👁 Предпросмотр
          </button>

          <button
            onClick={saveCourse}
            disabled={saving || !isDirty}
            className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-600 transition-colors"
          >
            Сохранить
          </button>

          {canSubmitForReview && (
            <button
              onClick={handleSubmitForReview}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {course.review_status === 'changes_requested' ? 'Повторно на проверку' : 'Отправить на проверку'}
            </button>
          )}

          {canPublish && (
            isPublished ? (
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium border border-secondary-300 text-secondary-700 bg-secondary-50 rounded-lg hover:bg-secondary-100 disabled:opacity-50 transition-colors"
              >
                Снять с публикации
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Опубликовать
              </button>
            )
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0 overflow-x-auto">
        <nav className="flex gap-5 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Tab content ─── */}
      {/* Both tabs rendered, toggled via display to preserve builder state */}
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary>
          <div className={`absolute inset-0 overflow-y-auto bg-gray-50 ${activeTab === 'settings' ? '' : 'hidden'}`}>
            <div className="max-w-3xl mx-auto p-5 pb-20">
              <CourseFormFields
                values={course}
                onChange={handleFieldChange}
                specialistOptions={specialists}
                canManageAuthor={canPublish}
              />
            </div>
          </div>

          {isBehaviorCorrection && (
            <div className={`absolute inset-0 overflow-y-auto bg-gray-50 ${activeTab === 'passport' ? '' : 'hidden'}`}>
              <div className="max-w-5xl mx-auto p-5 pb-20">
                <BehaviorCorrectionPassport values={course} onChange={handleFieldChange} />
              </div>
            </div>
          )}

          {isBehaviorCorrection && (
            <div className={`absolute inset-0 overflow-y-auto bg-gray-50 ${activeTab === 'matching' ? '' : 'hidden'}`}>
              <div className="max-w-5xl mx-auto p-5 pb-20">
                <BehaviorMatchingRules values={course} onChange={handleFieldChange} />
              </div>
            </div>
          )}

          {isBehaviorCorrection && (
            <div className={`absolute inset-0 overflow-y-auto bg-gray-50 ${activeTab === 'safety' ? '' : 'hidden'}`}>
              <div className="max-w-5xl mx-auto p-5 pb-20">
                <BehaviorSafetyChecklist
                  courseId={id}
                  values={course}
                  onChange={handleFieldChange}
                  refreshKey={publishCheckTick}
                />
              </div>
            </div>
          )}

          <div className={`absolute inset-0 ${activeTab === 'builder' ? '' : 'hidden'}`}>
            {builderData && (
              <CourseBuilder
                course={builderData}
                onSave={() => {}}
                onPublish={handlePublish}
                saving={saving}
              />
            )}
          </div>

          {isBehaviorCorrection && (
            <div className={`absolute inset-0 overflow-y-auto bg-gray-50 ${activeTab === 'students' ? '' : 'hidden'}`}>
              <div className="max-w-6xl mx-auto p-5 pb-20">
                <CourseStudentsPanel courseId={id} />
              </div>
            </div>
          )}

          {isBehaviorCorrection && (
            <div className={`absolute inset-0 overflow-y-auto bg-gray-50 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
              <div className="max-w-6xl mx-auto p-5 pb-20">
                <CourseAnalyticsPanel courseId={id} />
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
