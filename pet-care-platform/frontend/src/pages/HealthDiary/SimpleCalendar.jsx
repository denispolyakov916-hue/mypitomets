import { useState, useMemo } from 'react'

/**
 * Компоненты иконок (замена heroicons)
 */
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

/**
 * Компонент простого календаря для управления событиями питомцев
 */
function SimpleCalendar({
  events,
  selectedDate,
  onDateChange,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  eventTypes,
  pet
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEvent, setNewEvent] = useState({
    type: 'other',
    title: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })

  /**
   * Получение дней месяца
   */
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Добавляем дни предыдущего месяца
    const firstDayOfWeek = firstDay.getDay() || 7 // 1-7 вместо 0-6
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        events: []
      })
    }

    // Добавляем дни текущего месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dayEvents = events.filter(event =>
        event.date.getDate() === day &&
        event.date.getMonth() === month &&
        event.date.getFullYear() === year
      )

      days.push({
        date,
        isCurrentMonth: true,
        events: dayEvents
      })
    }

    // Добавляем дни следующего месяца
    const remainingCells = 42 - days.length // 6 недель * 7 дней
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        events: []
      })
    }

    return days
  }

  /**
   * Фильтрация событий по выбранной дате
   */
  const selectedDateEvents = useMemo(() => {
    return events.filter(event => {
      return (
        event.date.getDate() === selectedDate.getDate() &&
        event.date.getMonth() === selectedDate.getMonth() &&
        event.date.getFullYear() === selectedDate.getFullYear()
      )
    })
  }, [events, selectedDate])

  /**
   * Получение ближайших событий
   */
  const upcomingEvents = useMemo(() => {
    return events
      .filter(event => event.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5)
  }, [events])

  /**
   * Получение последнего визита к ветеринару
   */
  const lastVetVisit = useMemo(() => {
    return events
      .filter(event => event.type === 'vet' && event.date < new Date())
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
  }, [events])

  /**
   * Навигация по месяцам
   */
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  /**
   * Выбор даты
   */
  const selectDate = (date) => {
    onDateChange(date)
  }

  /**
   * Добавление события
   */
  const handleAddEvent = (e) => {
    e.preventDefault()

    const eventData = {
      ...newEvent,
      date: new Date(newEvent.date),
      petId: pet.id
    }

    onAddEvent(eventData)

    setNewEvent({
      type: 'other',
      title: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
    setShowAddForm(false)
  }

  /**
   * Отметка события как выполненного
   */
  const toggleEventCompletion = (eventId) => {
    const event = events.find(e => e.id === eventId)
    if (event) {
      onUpdateEvent(eventId, { completed: !event.completed })
    }
  }

  /**
   * Расчет дней до события
   */
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

  /**
   * Статистика событий
   */
  const eventStats = useMemo(() => {
    const stats = {}
    Object.keys(eventTypes).forEach(type => {
      stats[type] = events.filter(event => event.type === type).length
    })
    return stats
  }, [events, eventTypes])

  const days = getDaysInMonth(currentMonth)
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Календарь */}
      <div className="lg:col-span-3">
        <div className="card">
          {/* Заголовок календаря */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Дни месяца */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isSelected = selectedDate.toDateString() === day.date.toDateString()
              const isToday = new Date().toDateString() === day.date.toDateString()
              const hasEvents = day.events.length > 0

              return (
                <button
                  key={index}
                  onClick={() => selectDate(day.date)}
                  className={`
                    relative p-2 text-sm min-h-[60px] transition-colors
                    ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    ${isSelected ? 'bg-primary-100 border-2 border-primary-500' : 'hover:bg-gray-50'}
                    ${isToday ? 'bg-blue-50 border border-blue-300' : ''}
                    ${hasEvents ? 'font-semibold' : ''}
                  `}
                >
                  <span className={`${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {day.date.getDate()}
                  </span>

                  {/* Индикаторы событий */}
                  {hasEvents && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                      {day.events.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: eventTypes[event.type]?.color }}
                        />
                      ))}
                      {day.events.length > 3 && (
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* События выбранного дня */}
        <div className="card mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              События на {selectedDate.toLocaleDateString('ru-RU')}
            </h3>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center gap-2"
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
              {selectedDateEvents.map(event => {
                const eventType = eventTypes[event.type] || eventTypes.other
                const daysInfo = getDaysUntil(event.date)

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border-l-4 ${event.completed ? 'bg-gray-50 opacity-75' : 'bg-white'}`}
                    style={{ borderLeftColor: eventType.color }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{eventType.icon}</span>
                        <div>
                          <h4 className={`font-medium ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {event.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: eventType.bgColor, color: eventType.color }}>
                              {eventType.label}
                            </span>
                            <span className={`text-xs ${daysInfo.urgent ? 'text-accent-600 font-medium' : 'text-gray-500'}`}>
                              {daysInfo.text}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleEventCompletion(event.id)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            event.completed
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {event.completed ? '✓ Выполнено' : 'Отметить'}
                        </button>
                        <button
                          onClick={() => onDeleteEvent(event.id)}
                          className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
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

          {/* Форма добавления события */}
          {showAddForm && (
            <form onSubmit={handleAddEvent} className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">Новое событие</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Тип события</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value }))}
                    className="input"
                    required
                  >
                    {Object.entries(eventTypes).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Дата</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Название</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="Название события"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="label">Описание</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="input min-h-[80px]"
                  placeholder="Дополнительная информация..."
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary">
                  Добавить событие
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Боковая панель */}
      <div className="space-y-6">
        {/* Последний визит к ветеринару */}
        {lastVetVisit && (
          <div className="card bg-red-50 border-red-200">
            <h3 className="font-semibold text-red-900 mb-2 text-sm flex items-center gap-2">
              🩺 Последний визит
            </h3>
            <div className="text-red-800 text-sm">
              <p className="font-medium">{lastVetVisit.title}</p>
              <p className="text-xs opacity-75">
                {lastVetVisit.date.toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        )}

        {/* Ближайшие события */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">📅 Ближайшие события</h3>

          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет предстоящих событий</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(event => {
                const eventType = eventTypes[event.type] || eventTypes.other
                const daysInfo = getDaysUntil(event.date)

                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg">{eventType.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {event.title}
                      </p>
                      <p className={`text-xs ${daysInfo.urgent ? 'text-accent-600 font-medium' : 'text-gray-500'}`}>
                        {daysInfo.text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Статистика */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Статистика</h3>

          <div className="space-y-3">
            {Object.entries(eventStats).map(([type, count]) => {
              const eventType = eventTypes[type] || eventTypes.other
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{eventType.icon}</span>
                    <span className="text-sm text-gray-600">{eventType.label}</span>
                  </div>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Информация о питомце */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">🐾 {pet.name}</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Вид:</span>
              <p className="text-gray-900">{pet.species === 'dog' ? 'Собака' : 'Кошка'}</p>
            </div>
            {pet.breed && (
              <div>
                <span className="text-gray-500">Порода:</span>
                <p className="text-gray-900">{pet.breed}</p>
              </div>
            )}
            {pet.date_of_birth && (
              <div>
                <span className="text-gray-500">Возраст:</span>
                <p className="text-gray-900">
                  {new Date().getFullYear() - new Date(pet.date_of_birth).getFullYear()} лет
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleCalendar
