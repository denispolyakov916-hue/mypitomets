/**
 * API «Дневника здоровья» — события календаря питомца (backend CalendarEvent).
 *
 * Эндпоинты: /api/pets/calendar/...
 * Используется единым frontend-слоем (usePetEvents) для «Карточки питомца»
 * и «Дневника здоровья».
 *
 * ВАЖНО: фильтр по питомцу backend ожидает в параметре `pet` (UUID), НЕ `pet_id`.
 *
 * Интерсептор client.js возвращает тело ответа, поэтому:
 *   - список   → { events: [...], count }
 *   - создание → { event: {...} }
 *   - деталь   → { event: {...} }
 * Поля не выдумываем — берём ровно те, что отдаёт backend.
 */

import api from './client'

const BASE = '/pets/calendar/events/'

/** Список событий с фильтрами: { pet, month: 'YYYY-MM', event_type, status }. → { events, count } */
export const getCalendarEvents = async (params = {}) => {
  return await api.get(BASE, { params })
}

/** События конкретного питомца. ВАЖНО: backend ждёт `pet`, а не `pet_id`. → { events, count } */
export const getPetCalendarEvents = async (petId, params = {}) => {
  return await api.get(BASE, { params: { ...params, pet: petId } })
}

/** Создать «Событие дневника». Минимум: { title, pet, start_date, event_type }. → { event } */
export const createCalendarEvent = async (payload) => {
  return await api.post(BASE, payload)
}

/** Частичное обновление события (PATCH). → { event } */
export const updateCalendarEvent = async (eventId, payload) => {
  return await api.patch(`${BASE}${eventId}/`, payload)
}

/** Удалить событие. */
export const deleteCalendarEvent = async (eventId) => {
  return await api.delete(`${BASE}${eventId}/`)
}

/** Отметить событие выполненным. → { event } */
export const completeCalendarEvent = async (eventId) => {
  return await api.post(`${BASE}${eventId}/complete/`)
}

/** Отменить событие. → { event } */
export const cancelCalendarEvent = async (eventId) => {
  return await api.post(`${BASE}${eventId}/cancel/`)
}

/** События на сегодня. → { events, count, date } */
export const getTodayCalendarEvents = async (params = {}) => {
  return await api.get(`${BASE}today/`, { params })
}

/** Предстоящие события: { days = 7, limit = 10 }. → { events, count, period } */
export const getUpcomingCalendarEvents = async (params = {}) => {
  return await api.get(`${BASE}upcoming/`, { params })
}

/** Справочники типов/приоритетов/статусов. → { event_types, priorities, statuses } */
export const getCalendarEventTypes = async () => {
  return await api.get('/pets/calendar/event-types/')
}
