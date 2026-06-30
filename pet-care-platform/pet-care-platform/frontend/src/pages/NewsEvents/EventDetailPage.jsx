/**
 * Деталь мероприятия (/news-events/events/:slug).
 * «Добавить в календарь» (.ics/Google) + «В мой календарь» (сохранение, для авторизованных).
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Video, Star, Loader2, CalendarHeart, Check } from 'lucide-react'
import { BrandSection, BrandButton } from '../../components/brand'
import { useAuthStore } from '../../store/authStore'
import { getEventBySlug, getMySavedEvents, saveEvent, unsaveEvent, formatEventDate } from '../../api/events'
import AddToCalendarMenu from './AddToCalendarMenu'

export default function EventDetailPage() {
  const { slug } = useParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [event, setEvent] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | notfound
  const [saved, setSaved] = useState(false)
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    let alive = true
    setState('loading')
    getEventBySlug(slug)
      .then((r) => { if (alive) { setEvent(r?.data || null); setState(r?.data ? 'ready' : 'notfound') } })
      .catch(() => { if (alive) setState('notfound') })
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    if (!isAuthenticated || !event) return undefined
    let alive = true
    getMySavedEvents()
      .then((r) => { if (alive) setSaved((r?.data || []).some((e) => e.id === event.id)) })
      .catch(() => {})
    return () => { alive = false }
  }, [isAuthenticated, event])

  const toggleSave = async () => {
    if (savePending || !event) return
    setSavePending(true)
    try {
      if (saved) { await unsaveEvent(event.id); setSaved(false) } else { await saveEvent(event.id); setSaved(true) }
    } catch (e) { /* тихо игнорируем — не мешаем пользователю */ } finally {
      setSavePending(false)
    }
  }

  if (state === 'loading') {
    return <BrandSection><div className="flex justify-center py-16 text-primary-400"><Loader2 className="h-8 w-8 animate-spin" /></div></BrandSection>
  }
  if (state === 'notfound') {
    return (
      <BrandSection title="Мероприятие не найдено">
        <BrandButton as={Link} to="/news-events" variant="outline" leftIcon={<ArrowLeft className="h-5 w-5" />}>К мероприятиям</BrandButton>
      </BrandSection>
    )
  }

  return (
    <BrandSection bg="milk">
      <Link to="/news-events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Все мероприятия
      </Link>
      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        {event.cover_image_url && (
          <div className="aspect-[21/9] w-full overflow-hidden bg-primary-50">
            <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-4 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">{event.event_type_display}</span>
            {event.is_featured && <span className="inline-flex items-center gap-1 text-gold-500"><Star className="h-4 w-4" /> Рекомендуем</span>}
            {event.status === 'cancelled' && <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-600">Отменено</span>}
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary-900 md:text-3xl">{event.title}</h1>
          <div className="flex flex-col gap-2 text-primary-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary-400" />
              {formatEventDate(event.start_at)}{event.end_at ? ` — ${formatEventDate(event.end_at)}` : ''}
            </span>
            {(event.is_online || event.location) && (
              <span className="inline-flex items-center gap-2">
                {event.is_online ? <Video className="h-5 w-5 text-primary-400" /> : <MapPin className="h-5 w-5 text-primary-400" />}
                {event.is_online
                  ? (event.online_url
                      ? <a href={event.online_url} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">Онлайн-трансляция</a>
                      : 'Онлайн')
                  : event.location}
              </span>
            )}
          </div>
          {event.description && <p className="whitespace-pre-line leading-relaxed text-primary-700">{event.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <AddToCalendarMenu event={event} />
            {isAuthenticated && (
              <BrandButton variant={saved ? 'secondary' : 'primary'} onClick={toggleSave} isLoading={savePending}
                           leftIcon={saved ? <Check className="h-5 w-5" /> : <CalendarHeart className="h-5 w-5" />}>
                {saved ? 'В моём календаре' : 'В мой календарь'}
              </BrandButton>
            )}
          </div>
        </div>
      </div>
    </BrandSection>
  )
}
