/**
 * QuickWeightModal — быстрая запись веса питомца (MVP).
 *
 * Делает две вещи:
 *   1) обновляет ТЕКУЩИЙ вес питомца через updatePetPartial (Pet.weight) —
 *      только если дата записи не старше последней (иначе затёрли бы актуальный);
 *   2) создаёт событие дневника `Вес: X кг` (event_type='other') через createCalendarEvent.
 *
 * Если PATCH веса упал — событие НЕ создаём. Если событие не создалось после
 * успешного PATCH — показываем понятную ошибку и оставляем модалку для повтора.
 *
 * TODO(backend): когда появится модель PetWeightRecord — заменить двойную запись
 * (PATCH + событие) на один create записи веса с серверной валидацией.
 */

import { useState, useEffect } from 'react'
import Modal, { ModalFooter } from '../ui/Modal'
import { Button } from '../ui/Button'
import Input from '../ui/Input'
import { updatePetPartial } from '../../api/pets'
import { createCalendarEvent } from '../../api/calendar'
import { useToastStore } from '../../store/toastStore'
import {
  validateWeightInput,
  formatWeightTitle,
  weightRangeForSpecies,
} from '../../constants/weight'

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function QuickWeightModal({ isOpen, onClose, pet, latestDate, onSaved }) {
  const showSuccess = useToastStore((s) => s.success)
  const showError = useToastStore((s) => s.error)

  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setWeight(pet?.weight_kg != null ? String(pet.weight_kg).replace('.', ',') : '')
    setDate(todayStr())
    setNote('')
    setError('')
    setSaving(false)
  }, [isOpen, pet])

  const species = pet?.species
  const range = weightRangeForSpecies(species)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validateWeightInput(weight, species)
    if (!v.ok) {
      setError(v.error)
      return
    }
    setError('')
    if (!pet?.id) {
      if (showError) showError('Не выбран питомец — вес не сохранён')
      return
    }

    // Текущий вес обновляем только если запись не старше последней в истории.
    const isLatest = !latestDate || date >= latestDate

    setSaving(true)
    // Шаг 1 — обновить текущий вес питомца (если это самая свежая дата).
    if (isLatest) {
      try {
        await updatePetPartial(pet.id, { weight: v.value })
      } catch {
        if (showError) showError('Не удалось обновить вес питомца')
        setSaving(false)
        return
      }
    }
    // Шаг 2 — создать событие дневника. Если упало — вес уже обновлён, даём повторить.
    try {
      await createCalendarEvent({
        pet: pet.id,
        event_type: 'other',
        title: formatWeightTitle(v.value),
        start_date: date,
        description: note.trim(),
      })
    } catch {
      if (showError) showError('Вес сохранён, но запись в дневник не создана. Попробуйте ещё раз.')
      setSaving(false)
      return
    }

    if (showSuccess) showSuccess('Вес записан')
    if (onSaved) onSaved(v.value)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Записать вес" size="sm">
      <form onSubmit={handleSubmit}>
        <Input
          label="Вес, кг"
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => { setWeight(e.target.value); if (error) setError('') }}
          placeholder={`Например: 4,8 (${range.min}–${range.max} кг)`}
          error={error}
          required
          autoFocus
          className="mb-4"
        />
        <Input
          label="Дата"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={todayStr()}
          required
          className="mb-4"
        />
        <div className="mb-2">
          <label className="label">Заметка (необязательно)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input min-h-[64px] w-full"
            placeholder="Например: натощак, после прогулки"
            rows={2}
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
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
