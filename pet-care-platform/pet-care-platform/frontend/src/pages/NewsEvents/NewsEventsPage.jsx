/**
 * «Новости и Мероприятия» (/news-events) — маркетинговая ЛЕНТА:
 * hero-баннер → крупное избранное событие → фильтр по типам → лента событий
 * (журнальные карточки) → блок новостей → «Мой календарь» (для авторизованных).
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, MapPin, Video, ArrowRight, Newspaper, CalendarHeart,
  Users, Award, Presentation, Wrench, BookOpen, Sparkles, Copy, Check, Loader2, X,
} from 'lucide-react'
import { BrandButton } from '../../components/brand'
import { useAuthStore } from '../../store/authStore'
import { getEvents, getNews, getMySavedEvents, getSubscribeUrl, formatEventDate } from '../../api/events'

const TYPE_META = {
  meetup: { label: 'Сходка', icon: Users },
  exhibition: { label: 'Выставка', icon: Award },
  webinar: { label: 'Вебинар', icon: Video },
  workshop: { label: 'Мастер-класс', icon: Wrench },
  lecture: { label: 'Лекция', icon: BookOpen },
  other: { label: 'Событие', icon: Presentation },
}
const typeMeta = (t) => TYPE_META[t] || TYPE_META.other

function TypePill({ type, display, className = '' }) {
  const Icon = typeMeta(type).icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      <Icon className="h-3.5 w-3.5" /> {display || typeMeta(type).label}
    </span>
  )
}

function FeaturedEvent({ ev }) {
  return (
    <Link to={`/news-events/events/${ev.slug}`} className="group relative block overflow-hidden rounded-[32px] shadow-card">
      <div className="aspect-[16/10] w-full sm:aspect-[2/1] md:aspect-[21/9]">
        {ev.cover_image_url
          ? <img src={ev.cover_image_url} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          : <div className="h-full w-full bg-gradient-to-br from-primary-600 to-primary-900" />}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <TypePill type={ev.event_type} display={ev.event_type_display} className="bg-white/20 text-white backdrop-blur" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-1 text-xs font-semibold text-primary-900">
            <Sparkles className="h-3.5 w-3.5" /> Рекомендуем
          </span>
        </div>
        <h2 className="font-heading text-2xl font-bold leading-tight md:text-4xl md:max-w-2xl">{ev.title}</h2>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/90">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatEventDate(ev.start_at)}</span>
          {(ev.is_online || ev.location) && (
            <span className="inline-flex items-center gap-1.5">{ev.is_online ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{ev.is_online ? 'Онлайн' : ev.location}</span>
          )}
        </div>
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary-800 transition-transform group-hover:translate-x-1">
          Подробнее <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

function FeedEvent({ ev }) {
  return (
    <Link
      to={`/news-events/events/${ev.slug}`}
      className="group grid grid-cols-1 overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-card-hover md:grid-cols-[2fr_3fr]"
    >
      <div className="aspect-[16/9] overflow-hidden bg-primary-50 md:aspect-auto">
        {ev.cover_image_url
          ? <img src={ev.cover_image_url} alt={ev.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
          : <div className="flex h-full min-h-[160px] items-center justify-center text-primary-200"><CalendarDays className="h-12 w-12" /></div>}
      </div>
      <div className="flex flex-col gap-3 p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <TypePill type={ev.event_type} display={ev.event_type_display} className="bg-primary-50 text-primary-700" />
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500">
            <CalendarDays className="h-4 w-4 text-primary-400" />{formatEventDate(ev.start_at)}
          </span>
        </div>
        <h3 className="font-heading text-xl font-bold leading-snug text-primary-900 md:text-2xl">{ev.title}</h3>
        {ev.summary && <p className="text-primary-500 line-clamp-2">{ev.summary}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          {(ev.is_online || ev.location) ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-primary-600">
              {ev.is_online ? <Video className="h-4 w-4 text-primary-400" /> : <MapPin className="h-4 w-4 text-primary-400" />}
              {ev.is_online ? 'Онлайн' : ev.location}
            </span>
          ) : <span />}
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-500 transition-transform group-hover:translate-x-1">
            Подробнее <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

function NewsTile({ item }) {
  return (
    <Link to={`/news-events/news/${item.slug}`} className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-shadow hover:shadow-card-hover">
      <div className="aspect-[16/9] overflow-hidden bg-primary-50">
        {item.cover_image_url
          ? <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
          : <div className="flex h-full items-center justify-center text-primary-200"><Newspaper className="h-10 w-10" /></div>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {item.category && <span className="text-xs font-medium uppercase tracking-wide text-primary-400">{item.category}</span>}
        <h3 className="font-heading text-base font-bold leading-snug text-primary-900 line-clamp-2">{item.title}</h3>
        {item.excerpt && <p className="text-sm text-primary-500 line-clamp-2">{item.excerpt}</p>}
        {item.published_at && <span className="mt-auto pt-2 text-xs text-primary-400">{formatEventDate(item.published_at, false)}</span>}
      </div>
    </Link>
  )
}

function MyCalendarPanel({ onClose }) {
  const [saved, setSaved] = useState(null)
  const [sub, setSub] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getMySavedEvents().catch(() => ({ data: [] })), getSubscribeUrl().catch(() => null)])
      .then(([s, u]) => { if (alive) { setSaved(s?.data || []); setSub(u) } })
    return () => { alive = false }
  }, [])

  const copy = () => {
    if (!sub?.webcal_url) return
    navigator.clipboard?.writeText(sub.webcal_url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  return (
    <div className="rounded-3xl border border-primary-100 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-primary-900">Мой календарь</h3>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-primary-400 hover:bg-primary-50 hover:text-primary-700" aria-label="Закрыть">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="text-sm text-primary-500">
        Подпишитесь — сохранённые мероприятия появятся в Apple/Google календаре и будут обновляться сами.
      </p>
      {sub?.webcal_url && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-700">{sub.webcal_url}</code>
          <BrandButton variant="secondary" size="sm" onClick={copy} leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copied ? 'Скопировано' : 'Копировать'}
          </BrandButton>
        </div>
      )}
      <div className="mt-5">
        {saved === null ? (
          <div className="flex justify-center py-6 text-primary-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : saved.length ? (
          <div className="flex flex-col gap-3">
            {saved.map((ev) => (
              <Link key={ev.id} to={`/news-events/events/${ev.slug}`} className="flex items-center gap-3 rounded-2xl bg-primary-50/60 p-3 transition-colors hover:bg-primary-50">
                <CalendarHeart className="h-5 w-5 shrink-0 text-primary-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-primary-800">{ev.title}</span>
                  <span className="block text-xs text-primary-500">{formatEventDate(ev.start_at)}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-primary-400">Пока пусто. Откройте мероприятие и нажмите «В мой календарь».</p>
        )}
      </div>
    </div>
  )
}

export default function NewsEventsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [events, setEvents] = useState(null)
  const [news, setNews] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showMine, setShowMine] = useState(false)

  const load = useCallback(() => {
    getEvents().then((r) => setEvents(r?.data || [])).catch(() => setEvents([]))
    getNews().then((r) => setNews(r?.data || [])).catch(() => setNews([]))
  }, [])
  useEffect(() => { load() }, [load])

  const featured = useMemo(() => (events || []).find((e) => e.is_featured) || (events || [])[0] || null, [events])
  const feed = useMemo(() => {
    let list = (events || []).filter((e) => !featured || e.id !== featured.id)
    if (filter !== 'all') list = list.filter((e) => e.event_type === filter)
    return list
  }, [events, featured, filter])

  const presentTypes = useMemo(() => {
    const set = new Set((events || []).map((e) => e.event_type))
    return Object.keys(TYPE_META).filter((t) => set.has(t))
  }, [events])

  // Избранные новости — вперёд (маркетолог помечает «на главную» через панель).
  const newsSorted = useMemo(
    () => [...(news || [])].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)),
    [news],
  )

  return (
    <div className="bg-milk min-h-screen pb-16">
      {/* Hero */}
      <div className="relative isolate overflow-hidden bg-primary-800 px-[clamp(1rem,4vw,2rem)] pb-12 pt-[clamp(2rem,6vh,4rem)] text-white">
        {/* Фон: дрессировка / жизнь сообщества — фото справа, слева фиолетовая заливка для читаемости текста */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: "url('/landing/behavior-courses-feature.png')",
            backgroundSize: 'cover',
            backgroundPosition: '72% 26%',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/20" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-primary-900/80 via-primary-900/10 to-transparent" />
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold [text-shadow:_0_2px_16px_rgb(30_10_60_/_55%)] md:text-5xl">Новости и Мероприятия</h1>
              <p className="mt-3 max-w-xl text-base text-white/85 [text-shadow:_0_1px_10px_rgb(30_10_60_/_45%)] md:text-lg">
                Сходки, встречи, выставки и вебинары сообщества «Питомец+». Листайте ленту и добавляйте в свой календарь.
              </p>
            </div>
            {isAuthenticated && (
              <BrandButton variant="primary" onClick={() => setShowMine((v) => !v)} leftIcon={<CalendarHeart className="h-5 w-5" />}>
                Мой календарь
              </BrandButton>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-6 flex max-w-5xl flex-col gap-8 px-[clamp(1rem,4vw,2rem)]">
        {isAuthenticated && showMine && <MyCalendarPanel onClose={() => setShowMine(false)} />}

        {events === null ? (
          <div className="flex justify-center py-20 text-primary-300"><Loader2 className="h-9 w-9 animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-card">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-primary-200" />
            <h3 className="font-heading text-xl font-bold text-primary-800">Скоро здесь появятся мероприятия</h3>
            <p className="mt-2 text-primary-500">Сходки, выставки и вебинары — следите за анонсами.</p>
          </div>
        ) : (
          <>
            {featured && <FeaturedEvent ev={featured} />}

            {presentTypes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {[{ t: 'all', label: 'Все' }, ...presentTypes.map((t) => ({ t, label: typeMeta(t).label }))].map(({ t, label }) => {
                  const active = filter === t
                  return (
                    <button key={t} type="button" onClick={() => setFilter(t)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? 'bg-primary-700 text-white shadow-card' : 'bg-white text-primary-700 border border-primary-100 hover:bg-primary-50'}`}>
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {feed.length ? (
              <div className="flex flex-col gap-6">{feed.map((ev) => <FeedEvent key={ev.id} ev={ev} />)}</div>
            ) : (
              <p className="py-8 text-center text-primary-400">В этой категории пока нет мероприятий.</p>
            )}
          </>
        )}

        {/* Новости */}
        {news && news.length > 0 && (
          <section className="mt-4">
            <div className="mb-5 flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-primary-500" />
              <h2 className="font-heading text-2xl font-bold text-primary-900">Новости</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newsSorted.map((item) => <NewsTile key={item.id} item={item} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
