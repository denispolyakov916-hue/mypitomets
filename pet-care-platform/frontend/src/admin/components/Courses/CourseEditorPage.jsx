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
import CourseFormFields from '../Forms/CourseFormFields'
import CourseBuilder from '../../../components/CourseBuilder/CourseBuilder'
import ErrorBoundary from '../../../components/ErrorBoundary'

const STATUS_LABELS = { draft: 'Черновик', published: 'Опубликован', archived: 'Архив' }
const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
}

export default function CourseEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [builderData, setBuilderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('settings')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [saveError, setSaveError] = useState(null)
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
        console.warn('Builder load failed, using empty structure:', err)
        setBuilderData({
          ...courseData,
          modules: [],
          orphan_pages: [],
          pages: [],
        })
      }
    } catch (err) {
      console.error('Error loading course:', err)
      navigate('/admin-panel/courses')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { loadCourse() }, [loadCourse])

  /* ─── Save metadata ─── */
  const saveCourse = useCallback(async () => {
    if (!courseRef.current || !id) return
    setSaving(true)
    setSaveError(null)
    try {
      const d = courseRef.current
      const res = await adminAPI.courses.update(id, {
        title: d.title,
        description: d.description,
        detailed_description: d.detailed_description,
        what_you_will_learn: d.what_you_will_learn,
        category: d.category,
        subcategory: d.subcategory,
        level: d.level,
        pet_type: d.pet_type,
        format_type: d.format_type,
        price: d.price,
        duration: d.duration,
        completion_time: d.completion_time,
        instructor_name: d.instructor_name,
        instructor_bio: d.instructor_bio,
      })
      // Update local state with server response
      const updated = res.data || res
      setCourse(prev => ({ ...prev, ...updated }))
      setIsDirty(false)
      setLastSaved(new Date())
    } catch (err) {
      console.error('Error saving course:', err)
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
      await publishCourse(id)
      setCourse(prev => ({ ...prev, status: 'published', is_active: true }))
      setLastSaved(new Date())
      setSaveError(null)
    } catch (err) {
      console.error('Error publishing:', err)
      setSaveError(err.response?.data?.error || 'Ошибка публикации')
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
      console.error('Error unpublishing:', err)
      setSaveError('Ошибка снятия с публикации')
    } finally {
      setSaving(false)
    }
  }, [id])

  /* ─── Save status display ─── */
  const getSaveStatus = () => {
    if (saving) return { text: 'Сохранение...', dot: 'bg-blue-400 animate-pulse' }
    if (saveError) return { text: saveError, dot: 'bg-red-400' }
    if (isDirty) return { text: 'Несохранённые изменения', dot: 'bg-amber-400' }
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
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
          <button onClick={() => navigate('/admin-panel/courses')} className="text-blue-600 hover:underline text-sm">
            К списку курсов
          </button>
        </div>
      </div>
    )
  }

  const saveStatus = getSaveStatus()
  const isPublished = course.status === 'published'

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              if (isDirty && !window.confirm('У вас есть несохранённые изменения. Покинуть страницу?')) return
              navigate('/admin-panel/courses')
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

          {saveStatus && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${saveStatus.dot}`} />
              <span className="text-[11px] text-gray-400">{saveStatus.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={saveCourse}
            disabled={saving || !isDirty}
            className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 text-gray-600 transition-colors"
          >
            Сохранить
          </button>

          {isPublished ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium border border-amber-300 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
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
          )}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0">
        <nav className="flex gap-5">
          {[
            { key: 'settings', label: 'Настройки', icon: '⚙️' },
            { key: 'builder', label: 'Конструктор', icon: '🧩' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
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
              <CourseFormFields values={course} onChange={handleFieldChange} />
            </div>
          </div>

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
        </ErrorBoundary>
      </div>
    </div>
  )
}
