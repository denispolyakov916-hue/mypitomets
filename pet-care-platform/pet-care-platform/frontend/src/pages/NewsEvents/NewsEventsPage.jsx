/**
 * Страница «Новости и Мероприятия» (/news-events).
 * Табы: Мероприятия · Новости · Мой календарь (для авторизованных).
 * Мой календарь = сохранённые события + webcal-подписка для Apple/Google.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, MapPin, Video, Star, Newspaper, Copy, Check, Loader2, CalendarHeart,
} from 'lucide-react'
import { BrandSection, BrandTabs, BrandEmptyState, BrandButton } from '../../components/brand'
import { useAuthStore } from '../../store/authStore'
import { getEvents, getNews, getMySavedEvents, getSubscribeUrl, formatEventDate } from '../../api/events'

function EventCard({ ev }) {
  return (
    <Link
      to={`/news-events/events/${ev.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-primary-50">
        {ev.cover_image_url ? (
          <img src={ev.cover_image_url} alt={ev.title}
               className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary-200">
            <CalendarDays className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-primary-700">{ev.event_type_display}</span>
          {ev.is_featured && <Star className="h-3.5 w-3.5 text-gold-400" aria-label="Рекомендуем" />}
        </div>
        <h3 className="font-heading text-lg font-bold leading-snug text-primary-900 line-clamp-2">{ev.title}</h3>
        {ev.summary && <p className="text-sm text-primary-500 line-clamp-2">{ev.summary}</p>}
        <div className="mt-auto flex flex-col gap-1 pt-2 text-sm text-primary-600">
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

function NewsCard({ item }) {
  return (
    <Link
      to={`/news-events/news/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-primary-50">
        {item.cover_image_url ? (
          <img src={item.cover_image_url} alt={item.title}
               className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-primary-200">
            <Newspaper className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {item.category && <span className="text-xs font-medium text-primary-400">{item.category}</span>}
        <h3 className="font-heading text-lg font-bold leading-snug text-primary-900 line-clamp-2">{item.title}</h3>
        {item.excerpt && <p className="text-sm text-primary-500 line-clamp-3">{item.excerpt}</p>}
        {item.published_at && (
          <span className="mt-auto pt-2 text-xs text-primary-400">{formatEventDate(item.published_at, false)}</span>
        )}
      </div>
    </Link>
  )
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function Loading() {
  return (
    <div className="flex justify-center py-16 text-primary-400">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

function MyCalendar() {
  const [saved, setSaved] = useState([])
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getMySavedEvents().catch(() => ({ data: [] })), getSubscribeUrl().catch(() => null)])
      .then(([s, u]) => { if (alive) { setSaved(s?.data || []); setSub(u) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const copy = () => {
    if (!sub?.webcal_url) return
    navigator.clipboard?.writeText(sub.webcal_url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  if (loading) return <Loading />

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <h3 className="font-heading text-lg font-bold text-primary-900">Подписка на календарь (Apple / Google)</h3>
        <p className="mt-1 text-sm text-primary-500">
          Добавьте ссылку как «подписку на календарь» — сохранённые мероприятия появятся в вашем календаре
          и будут обновляться автоматически.
        </p>
        {sub?.webcal_url ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-700">{sub.webcal_url}</code>
            <BrandButton variant="secondary" size="sm" onClick={copy}
                         leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
              {copied ? 'Скопировано' : 'Копировать'}
            </BrandButton>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-primary-400">
          iPhone: Настройки → Календарь → Учётные записи → Добавить подписной календарь. Google: «Другие
          календари» → «По URL».
        </p>
      </div>

      <div>
        <h3 className="mb-4 font-heading text-xl font-bold text-primary-900">Мои мероприятия</h3>
        {saved.length ? (
          <Grid>{saved.map((ev) => <EventCard key={ev.id} ev={ev} />)}</Grid>
        ) : (
          <BrandEmptyState
            icon={<CalendarHeart className="h-7 w-7" />}
            title="Пока пусто"
            description="Откройте мероприятие и нажмите «В мой календарь» — оно появится здесь и в подписке."
          />
        )}
      </div>
    </div>
  )
}

const TABS = [
  { value: 'events', label: 'Мероприятия' },
  { value: 'news', label: 'Новости' },
]

export default function NewsEventsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState(null)
  const [news, setNews] = useState(null)

  const loadEvents = useCallback(() => {
    if (events) return
    getEvents().then((r) => setEvents(r?.data || [])).catch(() => setEvents([]))
  }, [events])

  const loadNews = useCallback(() => {
    if (news) return
    getNews().then((r) => setNews(r?.data || [])).catch(() => setNews([]))
  }, [news])

  useEffect(() => { loadEvents() }, [loadEvents])
  useEffect(() => { if (tab === 'news') loadNews() }, [tab, loadNews])

  const tabs = isAuthenticated ? [...TABS, { value: 'mine', label: 'Мой календарь' }] : TABS

  return (
    <BrandSection
      bg="milk"
      title="Новости и Мероприятия"
      subtitle="Сходки, встречи, выставки, вебинары и новости сообщества «Питомец+»."
    >
      <div className="mb-8">
        <BrandTabs items={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === 'events' && (
        events === null ? <Loading /> : (
          events.length
            ? <Grid>{events.map((ev) => <EventCard key={ev.id} ev={ev} />)}</Grid>
            : <BrandEmptyState icon={<CalendarDays className="h-7 w-7" />} title="Скоро здесь появятся мероприятия"
                               description="Сходки, выставки и вебинары — следите за анонсами." />
        )
      )}

      {tab === 'news' && (
        news === null ? <Loading /> : (
          news.length
            ? <Grid>{news.map((item) => <NewsCard key={item.id} item={item} />)}</Grid>
            : <BrandEmptyState icon={<Newspaper className="h-7 w-7" />} title="Новостей пока нет"
                               description="Здесь будут публикации сообщества." />
        )
      )}

      {tab === 'mine' && (isAuthenticated ? <MyCalendar /> : (
        <BrandEmptyState icon={<CalendarHeart className="h-7 w-7" />} title="Войдите в аккаунт"
                         description="Сохраняйте мероприятия в свой календарь и подписывайтесь в Apple/Google."
                         action={<BrandButton as={Link} to="/login">Войти</BrandButton>} />
      ))}
    </BrandSection>
  )
}
