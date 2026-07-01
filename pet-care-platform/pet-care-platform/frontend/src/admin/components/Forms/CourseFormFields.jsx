/**
 * CourseFormFields - Inline form fields for course metadata editing.
 *
 * Renders grouped cards with all course fields.
 * No Modal wrapper -- designed for embedding directly in pages.
 * Calls onChange(fieldName, value) on every field change.
 */

import React from 'react'
import Input from '../../../components/ui/Input'
import { Card, CardHeader, CardTitle, CardBody } from '../../../components/ui/Card'

const petTypeOptions = [
  { value: 'dog', label: 'Собак' },
  { value: 'cat', label: 'Кошек' },
  { value: 'all', label: 'Все' },
]

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

const levelOptions = [
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'expert', label: 'Эксперт' },
]

const formatOptions = [
  { value: 'video', label: 'Видео' },
  { value: 'text', label: 'Текст' },
  { value: 'interactive', label: 'Интерактивный' },
  { value: 'mixed', label: 'Смешанный' },
  { value: 'webinar', label: 'Вебинар' },
  { value: 'workshop', label: 'Мастер-класс' },
]

function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Textarea({ value, onChange, rows = 3, placeholder }) {
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

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export default function CourseFormFields({
  values,
  onChange,
  specialistOptions = [],
  canManageAuthor = false,
}) {
  const set = (field) => (val) => onChange(field, val)

  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Основная информация</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Название курса" required>
            <Input value={values.title} onChange={(e) => set('title')(e.target.value)} placeholder="Например: Базовые команды для собак" />
          </Field>

          <Field label="Краткое описание">
            <Textarea value={values.description} onChange={set('description')} rows={2} placeholder="Краткое описание курса для каталога" />
          </Field>

          <Field label="Подробное описание">
            <Textarea value={values.detailed_description} onChange={set('detailed_description')} rows={4} placeholder="Полное описание курса, которое увидят пользователи на странице курса" />
          </Field>

          <Field label="Чему научатся" hint="Каждый навык с новой строки">
            <Textarea value={values.what_you_will_learn} onChange={set('what_you_will_learn')} rows={3} placeholder="Основные команды послушания&#10;Правильная техника поощрения&#10;Решение проблем поведения" />
          </Field>
        </CardBody>
      </Card>

      {/* Classification */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Классификация</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Категория" required>
              <Select value={values.category} onChange={set('category')} options={categoryOptions} placeholder="Выберите категорию" />
            </Field>

            <Field label="Уровень сложности" required>
              <Select value={values.level} onChange={set('level')} options={levelOptions} />
            </Field>

            <Field label="Для животных">
              <Select value={values.pet_type} onChange={set('pet_type')} options={petTypeOptions} />
            </Field>

            <Field label="Формат обучения">
              <Select value={values.format_type} onChange={set('format_type')} options={formatOptions} />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Pricing & Duration */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Стоимость и длительность</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Цена (руб)" hint="0 = бесплатно">
              <Input type="number" min="0" step="0.01" value={values.price} onChange={(e) => set('price')(parseFloat(e.target.value) || 0)} placeholder="0" />
            </Field>

            <Field label="Длительность (мин)">
              <Input type="number" min="1" value={values.duration} onChange={(e) => set('duration')(parseInt(e.target.value) || 60)} placeholder="60" />
            </Field>

            <Field label="Время прохождения" hint="Например: 2-3 недели">
              <Input value={values.completion_time} onChange={(e) => set('completion_time')(e.target.value)} placeholder="2-3 недели" />
            </Field>
          </div>
        </CardBody>
      </Card>

      {canManageAuthor && (
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-sm">Специалист</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Назначенный специалист" hint="Он увидит курс в своем кабинете и сможет собрать уроки в конструкторе">
              <Select
                value={values.author_id}
                onChange={set('author_id')}
                options={specialistOptions}
                placeholder="Не назначен"
              />
            </Field>
          </CardBody>
        </Card>
      )}

      {/* Instructor */}
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Инструктор</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Имя инструктора">
              <Input value={values.instructor_name} onChange={(e) => set('instructor_name')(e.target.value)} placeholder="Анна Петрова" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Биография инструктора">
                <Textarea value={values.instructor_bio} onChange={set('instructor_bio')} rows={2} placeholder="Опыт работы, квалификация..." />
              </Field>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
