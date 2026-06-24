/**
 * usePetWeightHistory — история веса питомца (MVP поверх CalendarEvent).
 *
 * Источник — события дневника типа 'other' с заголовком `Вес: X кг` (см. constants/weight.js).
 * Новый backend-endpoint НЕ создаётся; переиспользуется usePetEvents.
 *
 * TODO(backend): заменить на чтение из модели PetWeightRecord, когда она появится.
 */

import { useMemo } from 'react'
import { usePetEvents } from './usePetEvents'
import { WEIGHT_EVENT_TYPE, parseWeightFromEvent } from '../constants/weight'

/**
 * @param {string} petId — UUID питомца.
 * @returns {{ points, latest, isLoading, error, refetch }}
 *   points — [{ eventId, weight, date, note }] по возрастанию даты (последняя — самая свежая).
 */
export function usePetWeightHistory(petId) {
  const { events, isLoading, error, refetch } = usePetEvents(petId, { eventType: WEIGHT_EVENT_TYPE })

  const points = useMemo(() => {
    const parsed = (events || [])
      .map(parseWeightFromEvent)
      .filter(Boolean)
    parsed.sort((a, b) => new Date(a.date) - new Date(b.date))
    return parsed
  }, [events])

  const latest = points.length ? points[points.length - 1] : null

  return { points, latest, isLoading, error, refetch }
}
