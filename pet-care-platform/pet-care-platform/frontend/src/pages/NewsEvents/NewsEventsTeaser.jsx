/**
 * NewsEventsTeaser — блок «Новости и мероприятия» на главной (/).
 * Показывает ближайшие мероприятия (а если их нет — свежие новости) и ведёт
 * на /news-events. Если опубликованного контента нет — секция не рендерится,
 * чтобы на лендинге не было пустого блока.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Video, ArrowRight, Newspaper } from 'lucide-react'
import { BrandSection, BrandButton, BrandBadge } from '../../components/brand'
import { getEvents, getNews, formatEventDate } from '../../api/events'

const TYPE_LABEL = {
  meetup: 'Сходка', exhibition: 'Выставка', webinar: 'Вебинар',
  workshop: 'Мастер-класс', lecture: 'Лекция', other: 'Событие',
}

function EventTile({ ev }) {
  return (
    <Link
      to={`/news-events/events/${ev.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="aspect-[16/9] overflow-hidden bg-primary-50">
        {ev.cover_image_url
          ? <img src={ev.cover_image_url} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-primary-200"><CalendarDays className="h-10 w-10" /></div>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
          {ev.is_online ? <Video className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
          {ev.event_type_display || TYPE_LABEL[ev.event_type] || 'Событие'}
        </span>
        <h3 className="font-heading text-base font-bold leading-snug text-primary-900 line-clamp-2">{ev.title}</h3>
        <div className="mt-auto flex flex-col gap-1 pt-1 text-sm text-primary-500">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary-400" />{formatEventDate(ev.start_at)}</span>
          {(ev.is_online || ev.location) && (
            <span className="inline-flex items-center gap-1.5">
              {ev.is_online ? <Video className="h-4 w-4 text-primary-400" /> : <MapPin className="h-4 w-4 text-primary-400" />}
              {ev.is_online ? 'Онлайн' : ev.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function NewsItemTile({ item }) {
  return (
    <Link
      to={`/news-events/news/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="aspect-[16/9] overflow-hidden bg-primary-50">
        {item.cover_image_url
          ? <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full items-center justify-center text-primary-200"><Newspaper className="h-10 w-10" /></div>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {item.category && <span className="text-xs font-medium uppercase tracking-wide text-primary-400">{item.category}</span>}
        <h3 className="font-heading text-base font-bold leading-snug text-primary-900 line-clamp-2">{item.title}</h3>
        {item.published_at && <span className="mt-auto pt-1 text-sm text-primary-400">{formatEventDate(item.published_at, false)}</span>}
      </div>
    </Link>
  )
}

export default function NewsEventsTeaser() {
  const [events, setEvents] = useState(null)
  const [news, setNews] = useState(null)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    getEvents({ from: today, per_page: 3 }).then((r) => setEvents(r?.data || [])).catch(() => setEvents([]))
    getNews({ per_page: 3 }).then((r) => setNews(r?.data || [])).catch(() => setNews([]))
  }, [])

  if (events === null || news === null) return null
  const showEvents = events.length > 0
  const list = showEvents ? events : news
  if (!list.length) return null

  return (
    <BrandSection
      bg="white"
      title="Новости и мероприятия"
      subtitle="Сходки, выставки и вебинары сообщества «Питомец+» — офлайн и онлайн. Добавляйте в свой календарь."
      align="center"
    >
      <div className="mb-6 text-center">
        <BrandBadge variant="soft" size="sm">Сообщество</BrandBadge>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((it) => (showEvents ? <EventTile key={it.id} ev={it} /> : <NewsItemTile key={it.id} item={it} />))}
      </div>
      <div className="mt-8 text-center">
        <BrandButton as={Link} to="/news-events" variant="outline" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
          Смотреть все
        </BrandButton>
      </div>
    </BrandSection>
  )
}
