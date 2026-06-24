/**
 * EventModal — единая модалка создания «События дневника» (backend CalendarEvent).
 * Используется и в «Дневнике здоровья», и в «Карточке питомца».
 *
 * Типы берутся ТОЛЬКО из constants/eventTypes.js — второго списка типов нет.
 */

import { useState, useEffect } from 'react'
import Modal, { ModalFooter } from '../ui/Modal'
import { Button } from '../ui/Button'
import Input from '../ui/Input'
import { EVENT_TYPE_OPTIONS, DEFAULT_EVENT_TYPE } from '../../constants/eventTypes'
import { createCalendarEvent } from '../../api/calendar'
import { useToastStore } from '../../store/toastStore'

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Date | 'YYYY-MM-DD' | undefined → значение для input[type=date]. */
function toDateInput(v) {
  if (!v) return todayStr()
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return todayStr()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function EventModal({
  isOpen,
  onClose,
  petId,
  onCreated,
  defaultType = DEFAULT_EVENT_TYPE,
  defaultDate,
}) {
  const showSuccess = useToastStore((s) => s.success)
  const showError = useToastStore((s) => s.error)

  const [type, setType] = useState(defaultType)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toDateInput(defaultDate))
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Сброс полей при каждом открытии.
  useEffect(() => {
    if (!isOpen) return
    setType(defaultType || DEFAULT_EVENT_TYPE)
    setTitle('')
    setDate(toDateInput(defaultDate))
    setTime('')
    setDescription('')
    setErrors({})
    setSaving(false)
  }, [isOpen, defaultType, defaultDate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!title.trim()) next.title = 'Введите название события'
    if (!date) next.date = 'Укажите дату'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    if (!petId) {
      if (showError) showError('Не выбран питомец — событие не сохранено')
      return
    }
    setSaving(true)
    try {
      const payload = {
        pet: petId,
        title: title.trim(),
        event_type: type || DEFAULT_EVENT_TYPE,
        start_date: date,
        description: description.trim(),
      }
      if (time) payload.start_time = time
      const res = await createCalendarEvent(payload)
      const created = (res && res.event) || res
      if (showSuccess) showSuccess('Событие добавлено в дневник')
      if (onCreated) onCreated(created)
      onClose()
    } catch {
      if (showError) showError('Не удалось сохранить событие')
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить событие в дневник" size="lg">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-gray-600 mb-3">Тип события</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {EVENT_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = type === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex items-center gap-2 rounded-2xl border-2 p-2.5 text-left transition-all min-h-[52px] ${
                  active ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${opt.tint}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold text-gray-900 leading-tight">{opt.shortLabel}</span>
              </button>
            )
          })}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Дата"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            error={errors.date}
          />
          <Input
            label="Время (необязательно)"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <Input
          label="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: прививка от бешенства"
          required
          error={errors.title}
          className="mb-4"
        />

        <div className="mb-4">
          <label className="label">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[88px] w-full"
            placeholder="Дополнительно (необязательно)"
            rows={3}
          />
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gold-400 hover:bg-gold-500 text-primary-900 font-semibold shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
          >
            {saving ? 'Сохранение…' : 'Сохранить событие'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
