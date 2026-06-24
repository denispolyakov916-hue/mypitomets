/**
 * Дневник здоровья питомца с календарём и вкладками Обзор / Календарь / Список
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePets } from '../../hooks/usePets'
import { useToastStore } from '../../store/toastStore'
import { PageLoader } from '../../components/Loader'
import SimpleCalendar from './SimpleCalendar'
import { ConfirmModal } from '../../components/ui/Modal'
import EventModal from '../../components/events/EventModal'
import { Button } from '../../components/ui/Button'
import { usePetEvents } from '../../hooks/usePetEvents'
import { updateCalendarEvent, deleteCalendarEvent, getPetCalendarEvents } from '../../api/calendar'
import { migrateDiaryEventsToBackend } from '../../utils/migrateDiaryToBackend'
import { EVENT_TYPES, EVENT_TYPE_OPTIONS, getEventTypeMeta } from '../../constants/eventTypes'

/** Тень как у мобильной кнопки «Начать бесплатно» (MobileBottomNav) */
const fabCtaShadow =
  'inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1), 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)'

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

/** Дата (Date|строка) → 'YYYY-MM-DD' для backend. */
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
  const updateEvent = (eventId, updates) => {
    if (updates && typeof updates.completed === 'boolean') {
      return updates.completed
        ? completeEvent(eventId)
        : updateCalendarEvent(eventId, { status: 'scheduled' }).then(() => refetch())
    }
    return refetch()
  }

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

  const openAddModal = (date = selectedDate) => {
    if (date instanceof Date) setSelectedDate(date)
    setAddModalOpen(true)
  }
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
      .filter((event) => event.type === 'vet' && new Date(event.date) < now)
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
          <div className="text-5xl mb-4">🐾</div>
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
    `shrink-0 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
      activeTab === id ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
    }`

  /** Блоки обзора (без карточки питомца — выбор уже в чипах / select) */
  const sidebarCards = selectedPet ? (
    <>
      {lastVetVisit && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🩺</span>
            <h3 className="font-semibold text-blue-900 text-sm">Последний визит к ветеринару</h3>
          </div>
          <p className="text-blue-800 text-sm">{lastVetVisit.title}</p>
          <p className="text-blue-600 text-xs mt-1">{formatDate(lastVetVisit.date)}</p>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>📅</span> Ближайшие события
        </h3>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет запланированных событий</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const meta = getEventTypeMeta(event.type)
              const Icon = meta.icon
              return (
                <div key={event.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.bgColor }}
                  >
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">{getDaysUntil(event.date)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>📊</span> Статистика
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {EVENT_TYPE_OPTIONS.map((info) => {
            const Icon = info.icon
            return (
              <div key={info.value} className="p-2 rounded-lg text-center" style={{ backgroundColor: info.bgColor }}>
                <Icon className="w-5 h-5 mx-auto mb-0.5" style={{ color: info.color }} />
                <div className="text-lg font-bold" style={{ color: info.color }}>
                  {eventStats[info.value] || 0}
                </div>
                <div className="text-xs text-gray-600">{info.shortLabel}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card bg-primary-50 border-primary-200">
        <h3 className="font-semibold text-primary-900 mb-2 text-sm">💡 Совет</h3>
        <p className="text-primary-800 text-xs">
          Регулярно обновляйте дневник, чтобы не забыть важные даты прививок и осмотров
        </p>
      </div>
    </>
  ) : null

  const overviewContent = selectedPet ? (
    <div className="space-y-4 lg:hidden">
      <div className="flex flex-col gap-3">
        <Button type="button" variant="primary" className="w-full min-h-[48px] text-base" onClick={() => openAddModal(selectedDate)}>
          + Записать событие
        </Button>
        <p className="text-sm text-gray-600 text-center">Быстро добавить визит, прививку или напоминание</p>
      </div>
      {sidebarCards}
    </div>
  ) : null

  const overviewDesktop = selectedPet ? (
    <div className="hidden lg:block space-y-4">
      <Button type="button" variant="primary" className="min-h-[44px]" onClick={() => openAddModal(selectedDate)}>
        + Записать событие
      </Button>
      {sidebarCards}
    </div>
  ) : null

  return (
    <div className="page-container animate-fadeIn pb-24 lg:pb-8 relative">
      <div className="mb-6">
        <h1 className="page-title mb-0">Дневник здоровья</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Календарь и история событий для питомцев</p>
      </div>

      {/* Выбор питомца — как в фильтре магазина (ShopFilters) */}
      <div className="card mb-4 lg:mb-6">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-base">
              <span className="text-primary-600" aria-hidden>
                🐾
              </span>
              Мои питомцы
            </h3>
          </div>
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-0.5 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
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
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto mb-6 scrollbar-thin">
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
              {overviewContent}
              {overviewDesktop}
            </>
          )}

          {activeTab === 'overview' && (
            <p className="mt-4 text-sm text-gray-500 lg:hidden">
              Откройте вкладки «Календарь» или «Список» для детального просмотра и редактирования по датам.
            </p>
          )}

          {(activeTab === 'calendar' || activeTab === 'list') && (
            <div className="w-full max-w-none">
              {activeTab === 'calendar' && (
                <SimpleCalendar
                  events={events}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onAddEventClick={() => openAddModal(selectedDate)}
                  onUpdateEvent={updateEvent}
                  onDeleteRequest={(id) => setDeleteConfirmId(id)}
                />
              )}
              {activeTab === 'list' && (
                <div className="card">
                  <h2 className="section-title mb-4">Все события ({events.length})</h2>
                  {events.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">📅</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет событий</h3>
                      <p className="text-gray-600 mb-4">Добавьте первое событие для {selectedPet.name}</p>
                      <Button type="button" variant="primary" onClick={() => openAddModal(new Date())}>
                        Добавить событие
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {groupedEventsForList.map(([key, dayEvents]) => (
                        <div key={key}>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            {formatDate(dayEvents[0].date)}
                          </h3>
                          <div className="space-y-3">
                            {dayEvents.map((event) => {
                              const meta = getEventTypeMeta(event.type)
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
