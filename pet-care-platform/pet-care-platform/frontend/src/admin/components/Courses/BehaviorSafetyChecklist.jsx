import React, { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/Card'
import { adminAPI } from '../../utils/api'

function toLines(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function fromLines(value) {
  return value
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

function Textarea({ value, onChange, rows = 4, placeholder }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-y"
    />
  )
}

function ListField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Textarea
        value={toLines(value)}
        onChange={(next) => onChange(fromLines(next))}
        rows={5}
        placeholder={placeholder}
      />
      <p className="mt-1 text-xs text-gray-400">Каждый пункт с новой строки</p>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
    </label>
  )
}

function PublishCheck({ courseId, refreshKey }) {
  const [check, setCheck] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    adminAPI.courses.publishCheck(courseId)
      .then((response) => {
        if (!cancelled) setCheck(response.data)
      })
      .catch(() => {
        if (!cancelled) setCheck(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId, refreshKey])

  if (loading) {
    return <div className="text-sm text-gray-500">Проверка публикации...</div>
  }

  if (!check) {
    return <div className="text-sm text-gray-500">Проверка публикации пока недоступна</div>
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-lg px-3 py-2 text-sm font-medium ${
        check.can_publish ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
      }`}>
        {check.can_publish ? 'Курс готов к публикации' : 'Курс пока нельзя опубликовать'}
      </div>

      {check.blocking_errors?.length > 0 && (
        <div>
          <div className="text-sm font-medium text-red-800 mb-2">Что нужно исправить</div>
          <ul className="space-y-1">
            {check.blocking_errors.map(error => (
              <li key={error} className="text-sm text-red-700">- {error}</li>
            ))}
          </ul>
        </div>
      )}

      {check.warnings?.length > 0 && (
        <div>
          <div className="text-sm font-medium text-amber-800 mb-2">На что обратить внимание</div>
          <ul className="space-y-1">
            {check.warnings.map(warning => (
              <li key={warning} className="text-sm text-amber-700">- {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function BehaviorSafetyChecklist({ courseId, values, onChange, refreshKey }) {
  const set = (field) => (value) => onChange(field, value)

  return (
    <div className="space-y-5">
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Безопасность</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Инструкция по безопасности</label>
            <Textarea
              value={values.safety_notes}
              onChange={set('safety_notes')}
              rows={6}
              placeholder="Что владелец должен знать до старта и когда нужно остановить упражнение"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListField
              label="Противопоказания"
              value={values.contraindications}
              onChange={set('contraindications')}
              placeholder="Острая боль&#10;Недавняя операция"
            />
            <ListField
              label="Красные флаги"
              value={values.red_flags}
              onChange={set('red_flags')}
              placeholder="Укус до крови&#10;Резкое ухудшение поведения"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Toggle
              label="Нужен контроль специалиста"
              checked={values.requires_specialist_supervision}
              onChange={set('requires_specialist_supervision')}
            />
            <Toggle
              label="Нужна консультация ветеринара"
              checked={values.requires_vet_clearance}
              onChange={set('requires_vet_clearance')}
            />
          </div>
        </CardBody>
      </Card>

      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Проверка перед публикацией</CardTitle>
        </CardHeader>
        <CardBody>
          <PublishCheck courseId={courseId} refreshKey={refreshKey} />
        </CardBody>
      </Card>
    </div>
  )
}
