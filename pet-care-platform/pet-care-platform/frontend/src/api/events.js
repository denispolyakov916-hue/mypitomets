/**
 * API «Новости и Мероприятия».
 *
 * Публичные read-эндпоинты + действия пользователя (сохранить событие в свой
 * календарь, получить webcal-ссылку подписки). Клиент (./client) сам отдаёт
 * response.data и подставляет JWT.
 */

import api from './client'
import { createReadOnlyApi } from './baseApi'

const eventsApi = createReadOnlyApi('/events/')
const newsApi = createReadOnlyApi('/events/news/')

// --- Чтение ---
export const getEvents = (filters = {}) => eventsApi.getList(filters)
export const getEvent = (id) => eventsApi.getById(id)
export const getEventBySlug = (slug) => eventsApi.getByField(slug, 'slug')
export const getNews = (filters = {}) => newsApi.getList(filters)
export const getNewsItem = (id) => newsApi.getById(id)
export const getNewsBySlug = (slug) => newsApi.getByField(slug, 'slug')

// --- «Мой календарь»: сохранение + подписка ---
export const saveEvent = (id) => api.post(`/events/${id}/save/`)
export const unsaveEvent = (id) => api.delete(`/events/${id}/save/`)
export const getMySavedEvents = () => api.get('/events/my/saved/')
export const getSubscribeUrl = () => api.get('/events/calendar/subscribe-url/')
export const rotateSubscribeUrl = () => api.post('/events/calendar/subscribe-url/')

// Абсолютный URL .ics для одного события (скачивание «Добавить в календарь»)
export const eventIcsUrl = (id) => `/api/events/${id}/calendar.ics`

/** Deep-link «Добавить в Google Календарь» (строится на клиенте, без бэкенда). */
export function googleCalendarUrl(ev) {
  const toG = (iso) => {
    if (!iso) return ''
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }
  const start = toG(ev.start_at)
  const end = toG(ev.end_at || ev.start_at)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title || '',
    dates: start && end ? `${start}/${end}` : '',
    details: ev.summary || ev.description || '',
    location: ev.location || ev.online_url || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Человеко-читаемая дата мероприятия (ru). */
export function formatEventDate(iso, withTime = true) {
  if (!iso) return ''
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  if (withTime) {
    opts.hour = '2-digit'
    opts.minute = '2-digit'
  }
  return new Date(iso).toLocaleString('ru-RU', opts)
}
