/**
 * Страница «Новости и Мероприятия» (/news-events).
 * Табы: Мероприятия · Новости · Мой календарь (для авторизованных).
 * Мой календарь = сохранённые события + webcal-подписка для Apple/Google.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CalendarDays, Check, Clock, Copy, Loader2, MapPin, Megaphone, Newspaper, Sparkles, Star, Video, CalendarHeart,
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

function CoverFallback({ type = 'event' }) {
  const Icon = type === 'news' ? Newspaper : CalendarDays
  return (
    <div className="flex h-full w-full items-center justify-center bg-primary-50 text-primary-200">
      <Icon className="h-12 w-12" />
    </div>
  )
}

function FeatureVisual({ item, type, className = '' }) {
  return (
    <div className={`overflow-hidden bg-primary-50 ${className}`}>
      {item?.cover_image_url ? (
        <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover" />
      ) : (
        <CoverFallback type={type} />
      )}
    </div>
  )
}

function FeaturedHero({ events, news, onSelectTab }) {
  const mainEvent = events?.find((item) => item.is_featured) || events?.[0]
  const mainNews = news?.find((item) => item.is_featured) || news?.[0]

  return (
    <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="relative min-h-[26rem] bg-primary-900 text-white">
          <FeatureVisual item={mainEvent} type="event" className="absolute inset-0 opacity-75" />
          <div className="absolute inset-0 bg-primary-950/55" />
          <div className="relative flex min-h-[26rem] flex-col justify-end p-6 sm:p-8 lg:p-10">
            <div className="mb-4 inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20">
              <Megaphone className="mr-2 h-4 w-4" />
              Афиша Питомец+
            </div>
            <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-5xl">
              Новости, встречи и события для владельцев питомцев
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
              Главные анонсы, полезные публикации и мероприятия сообщества в одном месте.
            </p>

            {mainEvent && (
              <div className="mt-7 max-w-3xl rounded-lg bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/75">
                  <span className="rounded-full bg-white/15 px-2.5 py-1">{mainEvent.event_type_display}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatEventDate(mainEvent.start_at)}
                  </span>
                </div>
                <Link to={`/news-events/events/${mainEvent.slug}`} className="mt-2 inline-flex items-center text-xl font-semibold text-white hover:text-white/90">
                  {mainEvent.title}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                {mainEvent.summary && <p className="mt-2 line-clamp-2 text-sm text-white/75">{mainEvent.summary}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-0 bg-white">
          <button
            type="button"
            onClick={() => onSelectTab('events')}
            className="group grid min-h-52 grid-cols-[7rem_1fr] gap-4 border-b border-primary-100 p-5 text-left transition hover:bg-primary-50/60 sm:grid-cols-[9rem_1fr]"
          >
            <FeatureVisual item={mainEvent} type="event" className="h-full rounded-lg" />
            <div className="min-w-0 self-center">
              <div className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Ближайшее
              </div>
              <h2 className="mt-3 line-clamp-2 text-lg font-bold text-primary-900 group-hover:text-primary-700">
                {mainEvent?.title || 'Скоро здесь появятся мероприятия'}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-primary-500">
                {mainEvent?.summary || 'Маркетолог сможет вывести сюда главный анонс.'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('news')}
            className="group grid min-h-52 grid-cols-[7rem_1fr] gap-4 p-5 text-left transition hover:bg-gold-50/60 sm:grid-cols-[9rem_1fr]"
          >
            <FeatureVisual item={mainNews} type="news" className="h-full rounded-lg" />
            <div className="min-w-0 self-center">
              <div className="inline-flex items-center rounded-full bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold-700">
                <Newspaper className="mr-1.5 h-3.5 w-3.5" />
                Последнее
              </div>
              <h2 className="mt-3 line-clamp-2 text-lg font-bold text-primary-900 group-hover:text-primary-700">
                {mainNews?.title || 'Скоро здесь появятся новости'}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm text-primary-500">
                {mainNews?.excerpt || 'Новости, промо и полезные материалы будут собираться здесь.'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function PromoBanner({ events, news }) {
  const featuredCount = [
    ...(events || []).filter((item) => item.is_featured),
    ...(news || []).filter((item) => item.is_featured),
  ].length

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
        <Sparkles className="h-5 w-5 text-emerald-700" />
        <div className="mt-3 text-sm font-semibold text-primary-900">Главные баннеры</div>
        <div className="mt-1 text-3xl font-bold text-emerald-700">{featuredCount}</div>
        <p className="mt-2 text-sm text-primary-500">Материалы, которые маркетолог вывел в промо-зоны.</p>
      </div>
      <div className="rounded-lg border border-primary-100 bg-white p-5">
        <CalendarDays className="h-5 w-5 text-primary-600" />
        <div className="mt-3 text-sm font-semibold text-primary-900">Мероприятия</div>
        <div className="mt-1 text-3xl font-bold text-primary-700">{events?.length || 0}</div>
        <p className="mt-2 text-sm text-primary-500">Встречи, вебинары, лекции и выставки для сообщества.</p>
      </div>
      <div className="rounded-lg border border-gold-100 bg-gold-50 p-5">
        <Newspaper className="h-5 w-5 text-gold-700" />
        <div className="mt-3 text-sm font-semibold text-primary-900">Новости</div>
        <div className="mt-1 text-3xl font-bold text-gold-700">{news?.length || 0}</div>
        <p className="mt-2 text-sm text-primary-500">Последние публикации, обновления сервиса и полезные подборки.</p>
      </div>
    </div>
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
  useEffect(() => { loadNews() }, [loadNews])
  useEffect(() => { if (tab === 'news') loadNews() }, [tab, loadNews])

  const tabs = isAuthenticated ? [...TABS, { value: 'mine', label: 'Мой календарь' }] : TABS

  return (
    <BrandSection
      bg="milk"
    >
      <FeaturedHero events={events || []} news={news || []} onSelectTab={setTab} />
      <PromoBanner events={events || []} news={news || []} />

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
