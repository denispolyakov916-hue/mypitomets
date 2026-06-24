import { useState, useMemo, useRef } from 'react'
import { getEventTypeMeta } from '../../constants/eventTypes'

const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

function startOfWeekMonday(d) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/**
 * Календарь событий (сайдбар — в родителе HealthDiary).
 * На мобильных: неделя по умолчанию, переключение на месяц, свайп по сетке.
 */
function SimpleCalendar({
  events,
  selectedDate,
  onDateChange,
  onAddEventClick,
  onUpdateEvent,
  onDeleteRequest,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  /** 'week' | 'month' — только для визуала &lt; lg */
  const [mobileCalendarMode, setMobileCalendarMode] = useState('week')
  const [weekCursor, setWeekCursor] = useState(() => startOfWeekMonday(new Date()))
  const touchStartX = useRef(null)

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    const firstDayOfWeek = firstDay.getDay() || 7
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        events: [],
      })
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const cellDate = new Date(year, month, day)
      const dayEvents = events.filter(
        (event) =>
          event.date.getDate() === day &&
          event.date.getMonth() === month &&
          event.date.getFullYear() === year
      )

      days.push({
        date: cellDate,
        isCurrentMonth: true,
        events: dayEvents,
      })
    }

    const remainingCells = 42 - days.length
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        events: [],
      })
    }

    return days
  }

  const selectedDateEvents = useMemo(() => {
    return events.filter(
      (event) =>
        event.date.getDate() === selectedDate.getDate() &&
        event.date.getMonth() === selectedDate.getMonth() &&
        event.date.getFullYear() === selectedDate.getFullYear()
    )
  }, [events, selectedDate])

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const navigateWeek = (direction) => {
    setWeekCursor((prev) => addDays(prev, direction * 7))
  }

  const selectDate = (date) => {
    onDateChange(date)
    setWeekCursor(startOfWeekMonday(date))
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  const handleCalendarTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleCalendarTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    if (dx > 0) {
      if (mobileCalendarMode === 'week') navigateWeek(-1)
      else navigateMonth(-1)
    } else {
      if (mobileCalendarMode === 'week') navigateWeek(1)
      else navigateMonth(1)
    }
  }

  const getDaysUntil = (eventDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(eventDate)
    targetDate.setHours(0, 0, 0, 0)

    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return { text: 'Сегодня', urgent: true }
    if (diffDays === 1) return { text: 'Завтра', urgent: true }
    if (diffDays === -1) return { text: 'Вчера', urgent: false }
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} дн. назад`, urgent: false }
    return { text: `Через ${diffDays} дн.`, urgent: diffDays <= 7 }
  }

  const days = getDaysInMonth(currentMonth)
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ]

  const weekDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekCursor, i))
  }, [weekCursor])

  const weekRangeLabel = useMemo(() => {
    const end = addDays(weekCursor, 6)
    const sameMonth = weekCursor.getMonth() === end.getMonth()
    const opts = { day: 'numeric', month: 'short' }
    if (sameMonth) {
      return `${weekCursor.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} – ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${weekCursor.toLocaleDateString('ru-RU', opts)} – ${end.toLocaleDateString('ru-RU', { ...opts, year: 'numeric' })}`
  }, [weekCursor])

  const cellClassBase =
    'relative rounded-xl transition-colors flex flex-col items-center justify-start pt-1 lg:min-h-[60px] min-h-[76px] lg:p-2 p-1 text-sm border-2 border-transparent'

  const renderMonthGrid = () => (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((day) => (
          <div key={day} className="p-1 lg:p-2 text-center text-xs lg:text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isSelected = selectedDate.toDateString() === day.date.toDateString()
          const isToday = new Date().toDateString() === day.date.toDateString()
          const hasEvents = day.events.length > 0

          return (
            <button
              type="button"
              key={index}
              onClick={() => selectDate(day.date)}
              className={`
                ${cellClassBase}
                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isSelected ? 'bg-primary-100 border-primary-500' : 'hover:bg-gray-50 active:bg-gray-100'}
                ${isToday && !isSelected ? 'bg-blue-50 border-blue-300' : ''}
                ${hasEvents ? 'font-semibold' : ''}
              `}
            >
              <span className={isToday ? 'text-blue-600 font-bold' : ''}>{day.date.getDate()}</span>
              {hasEvents && (
                <span
                  className="mt-auto mb-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary-500/90 text-[10px] font-bold text-white flex items-center justify-center"
                  aria-label={`Событий: ${day.events.length}`}
                >
                  {day.events.length > 9 ? '9+' : day.events.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )

  const renderWeekRow = () => (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((d) => (
          <div key={d} className="p-1 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((dayDate) => {
          const isSelected = selectedDate.toDateString() === dayDate.toDateString()
          const isToday = new Date().toDateString() === dayDate.toDateString()
          const dayEvents = events.filter(
            (event) =>
              event.date.getDate() === dayDate.getDate() &&
              event.date.getMonth() === dayDate.getMonth() &&
              event.date.getFullYear() === dayDate.getFullYear()
          )
          const hasEvents = dayEvents.length > 0

          return (
            <button
              type="button"
              key={dayDate.toISOString()}
              onClick={() => selectDate(dayDate)}
              className={`
                ${cellClassBase} min-h-[88px]
                ${isSelected ? 'bg-primary-100 border-primary-500' : 'hover:bg-gray-50 active:bg-gray-100'}
                ${isToday && !isSelected ? 'bg-blue-50 border-blue-300' : ''}
              `}
            >
              <span className={`text-base ${isToday ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                {dayDate.getDate()}
              </span>
              {hasEvents && (
                <span className="mt-auto mb-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary-500/90 text-[10px] font-bold text-white flex items-center justify-center">
                  {dayEvents.length > 9 ? '9+' : dayEvents.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )

  const toggleEventCompletion = (eventId) => {
    const event = events.find((ev) => ev.id === eventId)
    if (event) {
      onUpdateEvent(eventId, { completed: !event.completed })
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="card touch-pan-y"
        onTouchStart={handleCalendarTouchStart}
        onTouchEnd={handleCalendarTouchEnd}
      >
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">
            <span className="lg:hidden">{mobileCalendarMode === 'week' ? weekRangeLabel : `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}</span>
            <span className="hidden lg:inline">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex lg:hidden rounded-lg bg-gray-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMobileCalendarMode('week')}
                className={`px-2.5 py-1.5 rounded-md ${mobileCalendarMode === 'week' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}
              >
                Неделя
              </button>
              <button
                type="button"
                onClick={() => setMobileCalendarMode('month')}
                className={`px-2.5 py-1.5 rounded-md ${mobileCalendarMode === 'month' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}
              >
                Месяц
              </button>
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => (mobileCalendarMode === 'week' ? navigateWeek(-1) : navigateMonth(-1))}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Назад"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => (mobileCalendarMode === 'week' ? navigateWeek(1) : navigateMonth(1))}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Вперёд"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Следующий месяц"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">{renderMonthGrid()}</div>
        <div className="lg:hidden">{mobileCalendarMode === 'week' ? renderWeekRow() : renderMonthGrid()}</div>
      </div>

      <div className="card mt-6 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">
            События на {selectedDate.toLocaleDateString('ru-RU')}
          </h3>
          <button
            type="button"
            onClick={onAddEventClick}
            className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
          >
            <PlusIcon className="w-4 h-4" />
            Добавить событие
          </button>
        </div>

        {selectedDateEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📅</div>
            <p>На эту дату нет запланированных событий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDateEvents.map((event) => {
              const eventType = getEventTypeMeta(event.type)
              const Icon = eventType.icon
              const daysInfo = getDaysUntil(event.date)

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border-l-4 ${event.completed ? 'bg-gray-50 opacity-75' : 'bg-white'}`}
                  style={{ borderLeftColor: eventType.color }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="shrink-0"><Icon className="w-5 h-5" style={{ color: eventType.color }} /></span>
                      <div className="min-w-0">
                        <h4 className={`font-medium ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {event.title}
                        </h4>
                        {event.description ? <p className="text-sm text-gray-600 mt-1">{event.description}</p> : null}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: eventType.bgColor, color: eventType.color }}
                          >
                            {eventType.label}
                          </span>
                          <span className={`text-xs ${daysInfo.urgent ? 'text-accent-600 font-medium' : 'text-gray-500'}`}>
                            {daysInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => toggleEventCompletion(event.id)}
                        className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                          event.completed
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {event.completed ? '✓ Выполнено' : 'Отметить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRequest(event.id)}
                        className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleCalendar
