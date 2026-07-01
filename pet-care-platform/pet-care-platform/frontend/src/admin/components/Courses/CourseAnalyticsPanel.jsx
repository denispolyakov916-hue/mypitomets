import React, { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/Card'
import { adminAPI } from '../../utils/api'

function Metric({ label, value, note }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {note && <div className="mt-1 text-xs text-gray-400">{note}</div>}
    </div>
  )
}

export default function CourseAnalyticsPanel({ courseId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    setError('')
    adminAPI.courses.analytics(courseId)
      .then((response) => {
        if (!cancelled) setAnalytics(response.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Не удалось загрузить аналитику')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="text-sm">Аналитика курса</CardTitle>
      </CardHeader>
      <CardBody>
        {loading && <div className="text-sm text-gray-500">Загрузка...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Metric label="Учеников" value={analytics.students_count || 0} />
              <Metric label="Питомцев" value={analytics.pets_count || 0} />
              <Metric label="Завершили курс" value={analytics.completed_count || 0} />
              <Metric label="Средний прогресс" value={`${analytics.completion_rate || 0}%`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Metric label="В процессе" value={analytics.in_progress_count || 0} />
              <Metric label="Не начинали" value={analytics.not_started_count || 0} />
              <Metric
                label="Выручка"
                value={analytics.revenue == null ? 'Нет данных' : `${analytics.revenue} ₽`}
                note={analytics.revenue_note}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
