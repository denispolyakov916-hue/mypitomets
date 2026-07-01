import React from 'react'
import Input from '../../../components/ui/Input'
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/Card'

export const behaviorProblemOptions = [
  { value: 'aggression_dogs', label: 'Агрессия к собакам' },
  { value: 'aggression_people', label: 'Агрессия к людям' },
  { value: 'aggression_cats', label: 'Агрессия к кошкам' },
  { value: 'separation_anxiety', label: 'Тревога разлуки' },
  { value: 'excessive_barking', label: 'Чрезмерный лай' },
  { value: 'destructive_behavior', label: 'Разрушительное поведение' },
  { value: 'fear_phobias', label: 'Страхи и фобии' },
  { value: 'marking_territory', label: 'Метки территории' },
  { value: 'excessive_licking', label: 'Чрезмерное вылизывание' },
  { value: 'food_aggression', label: 'Агрессия за еду' },
  { value: 'leash_pulling', label: 'Тянет поводок' },
  { value: 'jumping_on_people', label: 'Прыжки на людей' },
]

const riskOptions = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
]

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
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

function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
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

function ListField({ label, value, onChange, placeholder, hint }) {
  return (
    <Field label={label} hint={hint || 'Каждый пункт с новой строки'}>
      <Textarea
        value={toLines(value)}
        onChange={(next) => onChange(fromLines(next))}
        rows={4}
        placeholder={placeholder}
      />
    </Field>
  )
}

export default function BehaviorCorrectionPassport({ values, onChange }) {
  const set = (field) => (value) => onChange(field, value)

  return (
    <div className="space-y-5">
      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Паспорт коррекции</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Основная проблема">
              <Select
                value={values.correction_problem}
                onChange={set('correction_problem')}
                options={behaviorProblemOptions}
              />
            </Field>

            <Field label="Уровень риска">
              <Select value={values.risk_level || 'low'} onChange={set('risk_level')} options={riskOptions} />
            </Field>

            <Field label="Минимальный возраст, мес">
              <Input
                type="number"
                min="0"
                value={values.min_age_months ?? ''}
                onChange={(e) => set('min_age_months')(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                placeholder="Например: 6"
              />
            </Field>

            <Field label="Максимальный возраст, мес">
              <Input
                type="number"
                min="0"
                value={values.max_age_months ?? ''}
                onChange={(e) => set('max_age_months')(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                placeholder="Оставьте пустым без ограничения"
              />
            </Field>

            <Field label="Минут занятий в день">
              <Input
                type="number"
                min="0"
                value={values.owner_daily_time_minutes ?? ''}
                onChange={(e) => set('owner_daily_time_minutes')(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                placeholder="Например: 15"
              />
            </Field>
          </div>

          <Field label="Цель коррекции">
            <Textarea
              value={values.correction_goal}
              onChange={set('correction_goal')}
              placeholder="Какое поведение должно измениться после прохождения курса"
            />
          </Field>
        </CardBody>
      </Card>

      <Card variant="default">
        <CardHeader>
          <CardTitle className="text-sm">Симптомы и результат</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ListField
            label="Симптомы"
            value={values.correction_symptoms}
            onChange={set('correction_symptoms')}
            placeholder="Тянет поводок&#10;Лает на прохожих"
          />
          <ListField
            label="Критерии успеха"
            value={values.success_metrics}
            onChange={set('success_metrics')}
            placeholder="Собака спокойно проходит мимо людей&#10;Владелец выполняет упражнение без рывков"
          />
          <ListField
            label="Необходимые предметы"
            value={values.required_equipment}
            onChange={set('required_equipment')}
            placeholder="Поводок 3 метра&#10;Лакомство"
          />
          <ListField
            label="Теги проблемы для подбора"
            value={values.correction_problem_tags}
            onChange={set('correction_problem_tags')}
            placeholder="leash_pulling&#10;fear_phobias"
          />
        </CardBody>
      </Card>
    </div>
  )
}
