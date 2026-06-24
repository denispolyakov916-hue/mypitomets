/**
 * Дневник здоровья питомца с календарём и вкладками Обзор / Календарь / Список
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePets } from '../../hooks/usePets'
import { useToastStore } from '../../store/toastStore'
import { PageLoader } from '../../components/Loader'
import SimpleCalendar from './SimpleCalendar'
import { ConfirmModal } from '../../components/ui/Modal'
import EventModal from '../../components/events/EventModal'
import { usePetEvents } from '../../hooks/usePetEvents'
import { updateCalendarEvent, deleteCalendarEvent, getPetCalendarEvents } from '../../api/calendar'
import { migrateDiaryEventsToBackend } from '../../utils/migrateDiaryToBackend'
import { EVENT_TYPES, EVENT_TYPE_OPTIONS, getEventTypeMeta } from '../../constants/eventTypes'
import { isWeightEvent, WEIGHT_META } from '../../constants/weight'
import { PuffLottie } from '../../components/brand'
import { Plus, CalendarDays, CheckCircle2, AlertTriangle, Bell, Check, Trash2, Stethoscope, PawPrint } from 'lucide-react'

/** Тень как у мобильной кнопки «Начать бесплатно» (MobileBottomNav) */
const fabCtaShadow =
  'inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1), 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)'

/** Микро-метрика в hero дневника. */
function DiaryMetric({ icon: Icon, tint, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 text-center">
      <span className={`inline-flex w-8 h-8 rounded-xl items-center justify-center mb-1 ${tint}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="text-base font-bold text-primary-900 leading-tight truncate">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  )
}

/** Пустое состояние дневника с Пуфычем. */
function DiaryEmpty({ petName, onAdd }) {
  return (
    <div className="bg-white rounded-3xl border border-primary-100 shadow-[0_4px_24px_rgba(82,47,129,0.06)] p-8 text-center">
      <div aria-hidden="true" className="mx-auto w-40 h-40 mb-1">
        <PuffLottie name="sit" size={160} alt="Пуфыч ждёт первую запись" />
      </div>
      <h3 className="text-lg font-bold text-primary-900" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
        В дневнике пока нет записей
      </h3>
      <p className="text-gray-500 mt-1.5 max-w-sm mx-auto">
        Добавьте прививку, обработку, визит или заметку{petName ? ` для ${petName}` : ''} — Пуфыч поможет ничего не забыть.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gold-400 hover:bg-gold-500 text-primary-900 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
      >
        <Plus className="w-4 h-4" /> Добавить первое событие
      </button>
    </div>
  )
}

function dateKey(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

/** Backend start_date('YYYY-MM-DD') [+ start_time] → локальный Date (нужно SimpleCalendar). */
function parseBackendDate(startDate, startTime) {
  if (!startDate) return new Date(NaN)
  const parts = String(startDate).split('-')
  const dt = new Date(Number(parts[0]), (Number(parts[1]) || 1) - 1, Number(parts[2]) || 1)
  if (startTime) {
    const t = String(startTime).split(':')
    dt.setHours(Number(t[0]) || 0, Number(t[1]) || 0, 0, 0)
  }
  return dt
}

function HealthDiary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showInfo = useToastStore((s) => s.info)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { pets, isLoading: petsLoading } = usePets()

  const [selectedPetId, setSelectedPetId] = useState(null)
  // Шаг 1.3: источник правды — backend CalendarEvent (localStorage больше не источник).
  const {
    events: rawEvents,
    refetch,
    completeEvent,
  } = usePetEvents(selectedPetId)

  // Адаптер backend-события → форма, ожидаемая UI и SimpleCalendar (date = Date).
  const events = useMemo(
    () => (rawEvents || []).map((e) => ({
      id: e.id,
      type: e.event_type,
      title: e.title,
      date: parseBackendDate(e.start_date, e.start_time),
      description: e.description || '',
      completed: e.status === 'completed',
      status: e.status,
    })),
    [rawEvents]
  )

  // Защита от двойного удаления (двойной клик по «Удалить» / повторный вызов).
  const deletingRef = useRef(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState('overview')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [addModalOpen, setAddModalOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (pets.length === 0) return
    const q = searchParams.get('pet_id')
    if (q && pets.some((p) => String(p.id) === String(q))) {
      setSelectedPetId(q)
      return
    }
    setSelectedPetId((prev) => (prev == null ? pets[0].id : prev))
  }, [pets, searchParams])

  // Разовая миграция старых localStorage-событий в backend (без дублей, без демо).
  useEffect(() => {
    if (!selectedPetId) return undefined
    let alive = true
    migrateDiaryEventsToBackend(selectedPetId)
      .then((res) => { if (alive && res && res.migrated > 0) refetch() })
      .catch(() => {})
    return () => { alive = false }
  }, [selectedPetId, refetch])
  // Завершение/возврат события: completed → backend-статус (через новый слой).
  const updateEvent = useCallback((eventId, updates) => {
    if (updates && typeof updates.completed === 'boolean') {
      return updates.completed
        ? completeEvent(eventId)
        : updateCalendarEvent(eventId, { status: 'scheduled' }).then(() => refetch())
    }
    return refetch()
  }, [completeEvent, refetch])

  const performDelete = async () => {
    if (!deleteConfirmId || deletingRef.current) return
    deletingRef.current = true
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    try {
      // DELETE возвращает 204 (промис иногда реджектит из-за тела ответа), а повторный
      // вызов даёт 404 — поэтому судим по факту: перечитываем список и проверяем наличие.
      await deleteCalendarEvent(id).catch(() => {})
      let stillThere = false
      try {
        const data = await getPetCalendarEvents(selectedPetId)
        stillThere = !!(data && (data.events || []).some((e) => String(e.id) === String(id)))
      } catch {
        stillThere = false
      }
      await refetch()
      showInfo(stillThere ? 'Не удалось удалить событие' : 'Событие удалено')
    } finally {
      deletingRef.current = false
    }
  }

  const openAddModal = useCallback((date = selectedDate) => {
    if (date instanceof Date) setSelectedDate(date)
    setAddModalOpen(true)
  }, [])
  const handleCalendarAddEvent = useCallback(() => openAddModal(selectedDate), [openAddModal, selectedDate])
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => new Date(event.date) >= now && !event.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5)
  }, [events])

  const lastVetVisit = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => event.type === 'veterinary' && new Date(event.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  }, [events])

  const eventStats = useMemo(() => {
    const stats = {}
    Object.keys(EVENT_TYPES).forEach((type) => {
      stats[type] = events.filter((ev) => ev.type === type).length
    })
    return stats
  }, [events])

  const groupedEventsForList = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(b.date) - new Date(a.date))
    const map = new Map()
    sorted.forEach((ev) => {
      const k = dateKey(ev.date)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(ev)
    })
    return Array.from(map.entries())
  }, [events])

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getDaysUntil = (date) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const eventDate = new Date(date)
    eventDate.setHours(0, 0, 0, 0)
    const diff = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24))

    if (diff === 0) return 'Сегодня'
    if (diff === 1) return 'Завтра'
    if (diff < 0) return `${Math.abs(diff)} дн. назад`
    return `Через ${diff} дн.`
  }

  if (!isAuthenticated || petsLoading) {
    return <PageLoader />
  }

  if (pets.length === 0) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <div aria-hidden="true" className="mx-auto w-32 h-32 mb-3"><PuffLottie name="sit" size={128} alt="Пуфыч" /></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">У вас пока нет питомцев</h3>
          <p className="text-gray-600 mb-4">Добавьте профиль питомца, чтобы вести дневник здоровья</p>
          <Link to="/pet-id" className="btn-primary">
            Добавить питомца
          </Link>
        </div>
      </div>
    )
  }

  const selectedPet = pets.find((p) => p.id === selectedPetId)

  const tabClass = (id) =>
    `shrink-0 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
      activeTab === id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-primary-700'
    }`

  /** Блоки обзора (без карточки питомца — выбор уже в чипах / select) */
  const cardCls = 'bg-white rounded-2xl border border-primary-100 shadow-[0_4px_24px_rgba(82,47,129,0.06)] p-5'
  const statTypes = EVENT_TYPE_OPTIONS.filter((info) => (eventStats[info.value] || 0) > 0)

  const overviewGrid = selectedPet ? (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Ближайшие события — интерактивный timeline (2/3 ширины на десктопе) */}
      <div className={`lg:col-span-2 ${cardCls}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <CalendarDays className="w-4 h-4" />
          </span>
          <h3 className="font-bold text-primary-900" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>Ближайшие события</h3>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4">
            <div aria-hidden="true" className="w-12 h-12 shrink-0"><PuffLottie name="stay" size={48} alt="Пуфыч" /></div>
            <p className="text-sm text-gray-600">Ближайших событий нет. Запланируйте прививку, обработку или визит — Пуфыч напомнит вовремя.</p>
          </div>
        ) : (
          <div className="relative">
            <span aria-hidden="true" className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />
            <div className="space-y-1">
              {upcomingEvents.map((event) => {
                const meta = isWeightEvent(event) ? WEIGHT_META : getEventTypeMeta(event.type)
                const Icon = meta.icon
                return (
                  <div key={event.id} className="group relative flex items-center gap-3 py-2 pr-1 rounded-2xl hover:bg-gray-50 transition-colors">
                    <span className="relative z-10 shrink-0 w-10 h-10 rounded-xl ring-4 ring-white flex items-center justify-center" style={{ backgroundColor: meta.bgColor }}>
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">{meta.shortLabel} · {getDaysUntil(event.date)}</p>
                    </div>
                    <div className="flex items-center gap-1 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <button type="button" onClick={() => updateEvent(event.id, { completed: true })} title="Отметить выполненным" aria-label="Отметить выполненным" className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteConfirmId(event.id)} title="Удалить" aria-label="Удалить" className="w-11 h-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Aside: компактная статистика (только ненулевые типы) + последний визит */}
      <div className="space-y-4">
        <div className={cardCls}>
          <h3 className="font-bold text-primary-900 mb-3" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>Статистика</h3>
          {statTypes.length === 0 ? (
            <p className="text-sm text-gray-500">Событий пока нет.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {statTypes.map((info) => {
                const Icon = info.icon
                return (
                  <div key={info.value} className="flex items-center gap-2 rounded-xl p-2" style={{ backgroundColor: info.bgColor }}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: info.color }} />
                    <span className="text-sm font-bold" style={{ color: info.color }}>{eventStats[info.value]}</span>
                    <span className="text-xs text-gray-600 truncate">{info.shortLabel}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {lastVetVisit && (
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </span>
              <h3 className="font-semibold text-gray-800 text-sm">Последний визит</h3>
            </div>
            <p className="text-gray-800 text-sm font-medium truncate">{lastVetVisit.title}</p>
            <p className="text-gray-400 text-xs mt-0.5">{formatDate(lastVetVisit.date)}</p>
          </div>
        )}
      </div>
    </div>
  ) : null

  const nearest = upcomingEvents[0] || null
  const plannedCount = events.filter((e) => !e.completed).length
  const doneCount = events.filter((e) => e.completed).length
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const overdueEvents = events.filter((e) => !e.completed && new Date(e.date) < startOfToday)
  // Пуфыч в hero отражает статус событий питомца
  const heroPuffState =
    events.length === 0
      ? 'stay' // событий нет — спокойно ждёт первую запись
      : overdueEvents.length
        ? 'think' // есть просрочка — мягкое «обрати внимание»
        : plannedCount === 0
          ? 'hello_wave' // всё выполнено — спокойная радость
          : 'talk_gesture' // есть запланированные — подсказывает

  return (
    <div className="page-container animate-fadeIn pb-24 lg:pb-8 relative">
      <div className="relative overflow-hidden bg-white rounded-3xl border border-primary-100 shadow-[0_8px_30px_rgba(82,47,129,0.08)] p-6 sm:p-8 mb-6">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary-200/40 to-gold-200/40 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          {/* Заголовок + CTA */}
          <div className="lg:max-w-sm">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-900 tracking-tight" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>Дневник здоровья</h1>
            <p className="text-gray-500 mt-1.5">
              Прививки, обработки, визиты и заметки — всё под рукой.{selectedPet ? ` Здоровье ${selectedPet.name} под контролем.` : ''}
            </p>
            {selectedPet && (
              <button
                type="button"
                onClick={() => openAddModal(new Date())}
                className="mt-4 hidden lg:inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gold-400 hover:bg-gold-500 text-primary-900 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4" /> Добавить событие
              </button>
            )}
          </div>

          {/* Выбор питомца — заполняет центральное пространство */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-2 mb-3">
              <PawPrint className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-primary-800">Мои питомцы</h3>
            </div>
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-0.5" style={{ scrollbarWidth: 'thin' }}>
              {pets.map((pet) => {
                const isSelected = String(selectedPetId) === String(pet.id)
                const photoUrl = pet.photo || null
                const placeholderEmoji =
                  pet.species === 'cat' ? '🐈' : pet.species === 'dog' ? '🐕' : '🐾'
                const cardBg =
                  pet.species === 'dog'
                    ? 'bg-blue-50'
                    : pet.species === 'cat'
                      ? 'bg-amber-50/80'
                      : 'bg-gray-50'
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`flex-shrink-0 w-[100px] sm:w-[110px] rounded-xl border-2 overflow-hidden transition-all duration-200 flex flex-col ${
                      isSelected
                        ? 'border-accent-400 bg-accent-400/20 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`aspect-square flex items-center justify-center overflow-hidden ${!isSelected ? cardBg : ''}`}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl" aria-hidden>
                          {placeholderEmoji}
                        </span>
                      )}
                    </div>
                    <div className="p-2 text-center bg-white border-t border-gray-100">
                      <span className="block font-medium truncate text-gray-800 text-sm">{pet.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Пуфыч — реагирует на статус событий */}
          <div aria-hidden="true" className="hidden lg:block flex-shrink-0 self-center">
            <PuffLottie name={heroPuffState} size={140} alt="Пуфыч — помощник по здоровью" />
          </div>
        </div>

        {selectedPet && (
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-3 sm:gap-4">
            <DiaryMetric icon={CalendarDays} tint="bg-primary-50 text-primary-600" label="Ближайшее" value={nearest ? getDaysUntil(nearest.date) : '—'} />
            <DiaryMetric icon={Bell} tint="bg-sky-50 text-sky-600" label="Запланировано" value={plannedCount} />
            <DiaryMetric icon={CheckCircle2} tint="bg-emerald-50 text-emerald-600" label="Выполнено" value={doneCount} />
          </div>
        )}
      </div>

      <div className="inline-flex gap-1 p-1 bg-primary-50/70 rounded-full mb-6 max-w-full overflow-x-auto">
        <button type="button" className={tabClass('overview')} onClick={() => setActiveTab('overview')}>
          Обзор
        </button>
        <button type="button" className={tabClass('calendar')} onClick={() => setActiveTab('calendar')}>
          Календарь
        </button>
        <button type="button" className={tabClass('list')} onClick={() => setActiveTab('list')}>
          Список
        </button>
      </div>

      {selectedPet && (
        <>
          {activeTab === 'overview' && (
            <>
              {overdueEvents.length > 0 && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-900">Есть событие, которое стоит проверить</p>
                    <p className="text-sm text-amber-700">Мягко напоминаем: {overdueEvents.length} не отмечено выполненным.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="flex-shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full bg-white text-amber-700 border border-amber-200 text-sm font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Посмотреть
                  </button>
                </div>
              )}
              {events.length === 0 ? (
                <DiaryEmpty petName={selectedPet.name} onAdd={() => openAddModal(new Date())} />
              ) : (
                <>
                  {overviewGrid}
                  <p className="mt-4 text-sm text-gray-500 lg:hidden">
                    Откройте «Календарь» или «Список» для просмотра по датам.
                  </p>
                </>
              )}
            </>
          )}

          {(activeTab === 'calendar' || activeTab === 'list') && (
            <div className="w-full max-w-none">
              {activeTab === 'calendar' && (
                <SimpleCalendar
                  events={events}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onAddEventClick={handleCalendarAddEvent}
                  onUpdateEvent={updateEvent}
                  onDeleteRequest={setDeleteConfirmId}
                />
              )}
              {activeTab === 'list' && (
                <div className="card">
                  <h2 className="section-title mb-4">Все события ({events.length})</h2>
                  {events.length === 0 ? (
                    <DiaryEmpty petName={selectedPet.name} onAdd={() => openAddModal(new Date())} />
                  ) : (
                    <div className="space-y-8">
                      {groupedEventsForList.map(([key, dayEvents]) => (
                        <div key={key}>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            {formatDate(dayEvents[0].date)}
                          </h3>
                          <div className="space-y-3">
                            {dayEvents.map((event) => {
                              const meta = isWeightEvent(event) ? WEIGHT_META : getEventTypeMeta(event.type)
                              const Icon = meta.icon
                              const isPast = new Date(event.date) < new Date()
                              return (
                                <div
                                  key={event.id}
                                  className={`p-4 rounded-xl border-2 transition-all ${
                                    event.completed
                                      ? 'border-gray-200 bg-gray-50 opacity-60'
                                      : isPast
                                        ? 'border-gray-300 bg-gray-50'
                                        : 'border-gray-200'
                                  }`}
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                    <div
                                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                      style={{ backgroundColor: meta.bgColor }}
                                    >
                                      <Icon className="w-6 h-6" style={{ color: meta.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3
                                        className={`font-medium ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                      >
                                        {event.title}
                                      </h3>
                                      <p className="text-sm text-gray-500 mt-1">
                                        {getDaysUntil(event.date)}
                                      </p>
                                      {event.description ? (
                                        <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 mt-4">
                                    <button
                                      type="button"
                                      onClick={() => updateEvent(event.id, { completed: !event.completed })}
                                      className={`flex-1 min-h-[48px] rounded-xl text-sm font-semibold transition-colors ${
                                        event.completed
                                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                      }`}
                                    >
                                      {event.completed ? '✓ Выполнено' : 'Отметить выполненным'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(event.id)}
                                      className="flex-1 min-h-[48px] rounded-xl text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!addModalOpen && (
        <button
          type="button"
          className="lg:hidden fixed left-1/2 -translate-x-1/2 z-40 inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-[#fbba2d] px-6 py-3.5 text-sm font-semibold leading-tight text-[#522f81] min-h-[52px] pointer-events-auto transition-transform duration-200 active:scale-[0.98]"
          style={{
            bottom: 'calc(6.25rem + env(safe-area-inset-bottom, 0px))',
            boxShadow: fabCtaShadow,
          }}
          onClick={() => openAddModal(selectedDate)}
          aria-label="Записать событие"
        >
          + Событие
        </button>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={performDelete}
        title="Удалить событие?"
        message="Запись будет удалена из дневника. Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />

      <EventModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        petId={selectedPetId}
        defaultDate={selectedDate}
        onCreated={() => refetch()}
      />
    </div>
  )
}

export default HealthDiary
