/**
 * CreateCourseModal - Quick modal to create a new draft course.
 *
 * Collects minimal info: title, category, pet_type, level.
 * Creates the course via admin API and navigates to the editor.
 */

import React, { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import { adminAPI } from '../../utils/api'

const categoryOptions = [
  { value: 'basics', label: 'Основы' },
  { value: 'training', label: 'Дрессировка' },
  { value: 'care', label: 'Уход' },
  { value: 'health', label: 'Здоровье' },
  { value: 'nutrition', label: 'Питание' },
  { value: 'behavior', label: 'Поведение' },
  { value: 'specialized', label: 'Специализированные' },
  { value: 'entertainment', label: 'Развлечения' },
]

const petTypeOptions = [
  { value: 'all', label: 'Все' },
  { value: 'dog', label: 'Собак' },
  { value: 'cat', label: 'Кошек' },
]

const levelOptions = [
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' },
]

export default function CreateCourseModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('basics')
  const [petType, setPetType] = useState('all')
  const [level, setLevel] = useState('beginner')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Введите название курса')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = await adminAPI.courses.create({
        title: title.trim(),
        category,
        pet_type: petType,
        level,
        status: 'draft',
      })
      const courseId = response.data?.id || response.id
      onCreated(courseId)
      onClose()
      setTitle('')
    } catch (err) {
      console.error('Error creating course:', err)
      setError(err.response?.data?.error || 'Ошибка создания курса')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый курс" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название курса <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Базовые команды для собак"
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Уровень</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {levelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Для животных</label>
          <select
            value={petType}
            onChange={(e) => setPetType(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
          >
            {petTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Создание...' : 'Создать курс'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
