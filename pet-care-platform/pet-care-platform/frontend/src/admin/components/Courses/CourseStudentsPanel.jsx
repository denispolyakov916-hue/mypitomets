import React, { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/Card'
import { adminAPI } from '../../utils/api'

function speciesLabel(value) {
  if (value === 'dog') return 'Собака'
  if (value === 'cat') return 'Кошка'
  return value || 'Не указано'
}

export default function CourseStudentsPanel({ courseId }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    setError('')
    adminAPI.courses.students(courseId)
      .then((response) => {
        if (!cancelled) setStudents(response.data?.results || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Не удалось загрузить учеников')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [courseId])

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="text-sm">Ученики и питомцы</CardTitle>
      </CardHeader>
      <CardBody padding="none">
        {loading && <div className="p-5 text-sm text-gray-500">Загрузка...</div>}
        {error && <div className="p-5 text-sm text-red-600">{error}</div>}
        {!loading && !error && students.length === 0 && (
          <div className="p-5 text-sm text-gray-500">Пока нет реальных учеников по этому курсу</div>
        )}
        {!loading && !error && students.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Питомец</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Прогресс</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Последняя активность</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {students.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{item.user_name}</div>
                      <div className="text-xs text-gray-500">{item.user_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.pet ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.pet.name}</div>
                          <div className="text-xs text-gray-500">
                            {speciesLabel(item.pet.species)}
                            {item.pet.breed_name ? `, ${item.pet.breed_name}` : ''}
                            {item.pet.age_months != null ? `, ${item.pet.age_months} мес.` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Не привязан</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.progress || 0}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString('ru-RU') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
