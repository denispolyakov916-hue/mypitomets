/**
 * Дневник здоровья питомца с интегрированным умным календарём
 * 
 * Функции:
 * - Умный календарь с событиями
 * - Выбор питомца
 * - Просмотр и добавление событий
 * - 5 типов событий: Ветеринар, День рождения, Прививка, Груминг, Другое
 * - Ближайшие события и статистика
 * - История записей
 */

import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePets } from '../../hooks/usePets'
import { PageLoader } from '../../components/Loader'
import SimpleCalendar from './SimpleCalendar'

/**
 * Типы событий с иконками и цветами
 */
const eventTypes = {
  vet: { icon: '🩺', label: 'Ветеринар', color: '#ef4444', bgColor: '#fee2e2' },
  birthday: { icon: '🎂', label: 'День рождения', color: '#f59e0b', bgColor: '#fef3c7' },
  vaccine: { icon: '💉', label: 'Прививка', color: '#10b981', bgColor: '#d1fae5' },
  grooming: { icon: '✂️', label: 'Груминг', color: '#8b5cf6', bgColor: '#e9d5ff' },
  other: { icon: '❤️', label: 'Другое', color: '#6b7280', bgColor: '#f3f4f6' }
}

/**
 * Компонент страницы HealthDiary
 */
function HealthDiary() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { pets, isLoading: petsLoading } = usePets()
  
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState('calendar') // 'calendar' или 'list'
  
  /**
   * Проверка аутентификации
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])
  
  /**
   * Автовыбор первого питомца
   */
  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])
  
  /**
   * Загрузка событий для выбранного питомца
   */
  useEffect(() => {
    if (selectedPetId) {
      loadEventsForPet(selectedPetId)
    }
  }, [selectedPetId])

  /**
   * Загрузка событий из localStorage (можно заменить на API)
   */
  const loadEventsForPet = (petId) => {
    try {
      const storedEvents = localStorage.getItem(`calendar_events_${petId}`)
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents).map(event => ({
          ...event,
          date: new Date(event.date)
        }))
        setEvents(parsedEvents)
      } else {
        // Генерация демо-данных для нового питомца
        generateDemoEvents(petId)
      }
    } catch (error) {
      console.warn('Ошибка загрузки событий:', error)
      setEvents([])
    }
  }

  /**
   * Генерация демо-событий для питомца
   */
  const generateDemoEvents = (petId) => {
    const pet = pets.find(p => p.id === petId)
    if (!pet) return

    const demoEvents = []
    const today = new Date()

    // День рождения
    if (pet.date_of_birth) {
      const birthDate = new Date(pet.date_of_birth)
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1)
      }
      demoEvents.push({
        id: `birthday_${petId}`,
        petId,
        type: 'birthday',
        title: `День рождения ${pet.name}`,
        date: thisYearBirthday,
        description: `Праздник дня рождения ${pet.name}!`,
        completed: false
      })
    }

    // Прививки (демо)
    const vaccineDate = new Date(today)
    vaccineDate.setDate(today.getDate() + 30)
    demoEvents.push({
      id: `vaccine_${petId}_1`,
      petId,
      type: 'vaccine',
      title: 'Прививка комплексная',
      date: vaccineDate,
      description: 'Ежегодная комплексная вакцинация',
      completed: false
    })

    // Ветеринар (демо)
    const vetDate = new Date(today)
    vetDate.setDate(today.getDate() + 60)
    demoEvents.push({
      id: `vet_${petId}_1`,
      petId,
      type: 'vet',
      title: 'Плановый осмотр',
      date: vetDate,
      description: 'Регулярный осмотр у ветеринара',
      completed: false
    })

    // Груминг (демо)
    const groomingDate = new Date(today)
    groomingDate.setDate(today.getDate() + 45)
    demoEvents.push({
      id: `grooming_${petId}_1`,
      petId,
      type: 'grooming',
      title: 'Уход за шерстью',
      date: groomingDate,
      description: 'Профессиональный груминг',
      completed: false
    })

    // Прошедшие события (демо)
    const pastVetDate = new Date(today)
    pastVetDate.setDate(today.getDate() - 30)
    demoEvents.push({
      id: `past_vet_${petId}`,
      petId,
      type: 'vet',
      title: 'Осмотр после болезни',
      date: pastVetDate,
      description: 'Контрольное посещение ветеринара',
      completed: true
    })

    setEvents(demoEvents)
    saveEventsToStorage(petId, demoEvents)
  }

  /**
   * Сохранение событий в localStorage
   */
  const saveEventsToStorage = (petId, eventsList) => {
    try {
      localStorage.setItem(`calendar_events_${petId}`, JSON.stringify(eventsList))
    } catch (error) {
      console.warn('Ошибка сохранения событий:', error)
    }
  }

  /**
   * Добавление нового события
   */
  const addEvent = (eventData) => {
    const newEvent = {
      id: Date.now().toString(),
      petId: selectedPetId,
      ...eventData,
      completed: false
    }

    const updatedEvents = [...events, newEvent]
    setEvents(updatedEvents)
    saveEventsToStorage(selectedPetId, updatedEvents)
  }

  /**
   * Обновление события
   */
  const updateEvent = (eventId, updates) => {
    const updatedEvents = events.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    )
    setEvents(updatedEvents)
    saveEventsToStorage(selectedPetId, updatedEvents)
  }

  /**
   * Удаление события
   */
  const deleteEvent = (eventId) => {
    if (!confirm('Удалить событие?')) return
    const updatedEvents = events.filter(event => event.id !== eventId)
    setEvents(updatedEvents)
    saveEventsToStorage(selectedPetId, updatedEvents)
  }

  /**
   * Вычисление ближайших событий
   */
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter(event => new Date(event.date) >= now && !event.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5)
  }, [events])

  /**
   * Вычисление последнего визита к ветеринару
   */
  const lastVetVisit = useMemo(() => {
    const now = new Date()
    return events
      .filter(event => event.type === 'vet' && new Date(event.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  }, [events])

  /**
   * Статистика по типам событий
   */
  const eventStats = useMemo(() => {
    const stats = {}
    Object.keys(eventTypes).forEach(type => {
      stats[type] = events.filter(e => e.type === type).length
    })
    return stats
  }, [events])

  /**
   * Форматирование даты
   */
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  /**
   * Вычисление дней до события
   */
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            У вас пока нет питомцев
          </h3>
          <p className="text-gray-600 mb-4">
            Добавьте профиль питомца, чтобы вести дневник здоровья
          </p>
          <Link to="/pets/new" className="btn-primary">
            Добавить питомца
          </Link>
        </div>
      </div>
    )
  }
  
  const selectedPet = pets.find(p => p.id === selectedPetId)
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Дневник здоровья</h1>
          <p className="text-gray-600 mt-1">
            Умный календарь и история событий для ваших питомцев
          </p>
        </div>

        <Link to="/profile" className="btn-secondary">
          Вернуться в профиль
        </Link>
      </div>
      
      {/* Выбор питомца */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="label mb-2">Выберите питомца</label>
            <select
              value={selectedPetId || ''}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="input max-w-md"
            >
              {pets.map(pet => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species === 'dog' ? 'Собака' : 'Кошка'})
                </option>
              ))}
            </select>
          </div>

          {/* Переключатель вида */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🗓️ Календарь
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Список
            </button>
          </div>
        </div>
      </div>

      {selectedPet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Основная область */}
          <div className="lg:col-span-2">
            {activeTab === 'calendar' ? (
              /* Умный календарь */
              <SimpleCalendar
                events={events}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onAddEvent={addEvent}
                onUpdateEvent={updateEvent}
                onDeleteEvent={deleteEvent}
                eventTypes={eventTypes}
                pet={selectedPet}
              />
            ) : (
              /* Список всех событий */
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Все события ({events.length})
                  </h2>
                </div>

                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📅</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Нет событий
                    </h3>
                    <p className="text-gray-600">
                      Добавьте первое событие для {selectedPet.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map(event => {
                        const typeInfo = eventTypes[event.type] || eventTypes.other
                        const isPast = new Date(event.date) < new Date()
                        
                        return (
                          <div
                            key={event.id}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              event.completed
                                ? 'border-gray-200 bg-gray-50 opacity-60'
                                : isPast
                                  ? 'border-gray-300 bg-gray-50'
                                  : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                style={{ backgroundColor: typeInfo.bgColor }}
                              >
                                {typeInfo.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className={`font-medium ${event.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {event.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {formatDate(event.date)} • {getDaysUntil(event.date)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateEvent(event.id, { completed: !event.completed })}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        event.completed
                                          ? 'bg-green-100 text-green-600'
                                          : 'bg-gray-100 text-gray-400 hover:text-green-600'
                                      }`}
                                      title={event.completed ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => deleteEvent(event.id)}
                                      className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                                      title="Удалить"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Боковая панель */}
          <div className="space-y-4">
            {/* Информация о питомце */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-2xl">
                  {selectedPet.species === 'dog' ? '🐕' : '🐱'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedPet.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedPet.species === 'dog' ? 'Собака' : 'Кошка'}
                    {selectedPet.breed && ` • ${selectedPet.breed}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Последний визит к ветеринару */}
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

            {/* Ближайшие события */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📅</span> Ближайшие события
              </h3>
              
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет запланированных событий</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => {
                    const typeInfo = eventTypes[event.type] || eventTypes.other
                    return (
                      <div key={event.id} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ backgroundColor: typeInfo.bgColor }}
                        >
                          {typeInfo.icon}
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

            {/* Статистика */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📊</span> Статистика
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(eventTypes).map(([type, info]) => (
                  <div
                    key={type}
                    className="p-2 rounded-lg text-center"
                    style={{ backgroundColor: info.bgColor }}
                  >
                    <div className="text-lg">{info.icon}</div>
                    <div className="text-lg font-bold" style={{ color: info.color }}>
                      {eventStats[type] || 0}
                    </div>
                    <div className="text-xs text-gray-600">{info.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Совет */}
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="font-semibold text-primary-900 mb-2 text-sm">💡 Совет</h3>
              <p className="text-primary-800 text-xs">
                Регулярно обновляйте дневник, чтобы не забыть важные даты прививок и осмотров
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HealthDiary
