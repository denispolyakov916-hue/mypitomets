import React from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/Card'
import { behaviorProblemOptions } from './BehaviorCorrectionPassport'

const behaviorTypeOptions = [
  { value: 'calm', label: 'Спокойный' },
  { value: 'active', label: 'Активный' },
  { value: 'aggressive', label: 'Агрессивный' },
  { value: 'shy', label: 'Пугливый' },
  { value: 'playful', label: 'Игривый' },
]

const activityOptions = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
]

const socialOptions = [
  { value: 'home_only', label: 'Только дома' },
  { value: 'street', label: 'Гуляет на улице' },
  { value: 'social', label: 'Социализирован' },
  { value: 'mixed', label: 'Смешанный режим' },
]

const experienceOptions = [
  { value: '', label: 'Не важно' },
  { value: 'none', label: 'Без опыта' },
  { value: 'basic', label: 'Базовый' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
  { value: 'professional', label: 'Профессиональный' },
]

function toggleValue(list, value) {
  const current = Array.isArray(list) ? list : []
  return current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value]
}

function Checklist({ title, value, options, onChange }) {
  const selected = Array.isArray(value) ? value : []
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-2">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(option => (
          <label
            key={option.value}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
              selected.includes(option.value)
                ? 'border-primary-400 bg-primary-50 text-primary-800'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onChange(toggleValue(selected, option.value))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function toLines(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function fromLines(value) {
  return value
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

function TextList({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={toLines(value)}
        onChange={(e) => onChange(fromLines(e.target.value))}
        rows={4}
        placeholder={placeholder}
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-y"
      />
      <p className="mt-1 text-xs text-gray-400">Каждый пункт с новой строки</p>
    </div>
  )
}

export default function BehaviorMatchingRules({ values, onChange }) {
  const set = (field) => (value) => onChange(field, value)

  return (
    <div className="space-y-5">
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Какие проблемы решает курс</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Checklist
            title="Решаемые поведенческие проблемы"
            value={values.addresses_behavioral_problems}
            options={behaviorProblemOptions}
            onChange={set('addresses_behavioral_problems')}
          />
          <Checklist
            title="Исключить из подбора при этих проблемах"
            value={values.excluded_behavioral_problems}
            options={behaviorProblemOptions}
            onChange={set('excluded_behavioral_problems')}
          />
        </CardBody>
      </Card>

      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Профиль питомца</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <Checklist
            title="Тип поведения"
            value={values.recommended_behavior_types}
            options={behaviorTypeOptions}
            onChange={set('recommended_behavior_types')}
          />
          <Checklist
            title="Уровень активности"
            value={values.recommended_activity_levels}
            options={activityOptions}
            onChange={set('recommended_activity_levels')}
          />
          <Checklist
            title="Уровень социализации"
            value={values.recommended_social_levels}
            options={socialOptions}
            onChange={set('recommended_social_levels')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Минимальный опыт владельца</label>
            <select
              value={values.min_training_experience || ''}
              onChange={(e) => set('min_training_experience')(e.target.value || null)}
              className="block w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              {experienceOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Здоровье и особые условия</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TextList
            label="Совместимые проблемы здоровья"
            value={values.compatible_health_issues}
            onChange={set('compatible_health_issues')}
            placeholder="sensitive_digestion&#10;joint_issues"
          />
          <TextList
            label="Исключающие проблемы здоровья"
            value={values.excluded_health_issues}
            onChange={set('excluded_health_issues')}
            placeholder="acute_pain&#10;post_surgery"
          />
          <TextList
            label="Особые потребности, которые учтены"
            value={values.addresses_special_needs}
            onChange={set('addresses_special_needs')}
            placeholder="senior_pet&#10;limited_mobility"
          />
          <TextList
            label="Подходящие активности"
            value={values.suitable_activities}
            onChange={set('suitable_activities')}
            placeholder="calm_walks&#10;home_training"
          />
        </CardBody>
      </Card>
    </div>
  )
}
