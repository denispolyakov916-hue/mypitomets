/**
 * usePetEvents — общий хук для «Событий дневника» питомца (backend CalendarEvent).
 *
 * Инфраструктура для будущего общего использования в «Карточке питомца»
 * и «Дневнике здоровья». UI пока не подключается.
 *
 * @example
 *   const { events, isLoading, error, refetch, createEvent, completeEvent, cancelEvent, deleteEvent }
 *     = usePetEvents(petId, { status: 'scheduled', limit: 4 })
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getPetCalendarEvents,
  createCalendarEvent,
  completeCalendarEvent,
  cancelCalendarEvent,
  deleteCalendarEvent,
} from '../api/calendar'

/**
 * @param {string} petId — UUID питомца (если пусто — хук не грузит и не падает).
 * @param {Object} options
 * @param {string}  [options.status]    — фильтр по статусу (scheduled/completed/...).
 * @param {string}  [options.eventType] — фильтр по типу события (event_type).
 * @param {number}  [options.limit]     — ограничение количества (срез на фронте).
 * @param {boolean} [options.enabled=true] — загружать ли данные.
 */
export function usePetEvents(petId, options = {}) {
  const { status, eventType, limit, enabled = true } = options

  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEvents = useCallback(async () => {
    if (!enabled || !petId) {
      setEvents([])
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const params = {}
      if (status) params.status = status
      if (eventType) params.event_type = eventType
      const data = await getPetCalendarEvents(petId, params)
      let list = (data && data.events) || []
      if (typeof limit === 'number' && limit >= 0) list = list.slice(0, limit)
      setEvents(list)
    } catch (e) {
      setError(e)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [petId, status, eventType, limit, enabled])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const refetch = useCallback(() => fetchEvents(), [fetchEvents])

  // После любой мутации — перечитываем список (single source of truth = backend).
  const createEvent = useCallback(async (payload) => {
    const res = await createCalendarEvent(payload)
    await fetchEvents()
    return res
  }, [fetchEvents])

  const completeEvent = useCallback(async (eventId) => {
    const res = await completeCalendarEvent(eventId)
    await fetchEvents()
    return res
  }, [fetchEvents])

  const cancelEvent = useCallback(async (eventId) => {
    const res = await cancelCalendarEvent(eventId)
    await fetchEvents()
    return res
  }, [fetchEvents])

  const deleteEvent = useCallback(async (eventId) => {
    const res = await deleteCalendarEvent(eventId)
    await fetchEvents()
    return res
  }, [fetchEvents])

  return { events, isLoading, error, refetch, createEvent, completeEvent, cancelEvent, deleteEvent }
}
