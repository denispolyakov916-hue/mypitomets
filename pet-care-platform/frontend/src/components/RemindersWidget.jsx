/**
 * Виджет напоминаний для личного кабинета
 * 
 * Показывает предстоящие напоминания по уходу за питомцами
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getUpcomingReminders, completeReminder } from '../api/reminders'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { ButtonLoader } from './Loader'

/**
 * Иконки категорий напоминаний
 */
const categoryIcons = {
  feeding: '🍖',
  medication: '💊',
  vaccination: '💉',
  vet_visit: '🏥',
  grooming: '✂️',
  walk: '🚶',
  training: '🎓',
  hygiene: '🛁',
  other: '📋',
}

/**
 * Форматирование даты
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Завтра'
  }
  
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  })
}

/**
 * Форматирование времени
 */
const formatTime = (timeString) => {
  if (!timeString) return ''
  return timeString.slice(0, 5) // HH:MM
}

/**
 * Компонент карточки напоминания
 */
const ReminderCard = ({ reminder, onComplete }) => {
  const [isCompleting, setIsCompleting] = useState(false)
  
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await onComplete(reminder.id)
    } finally {
      setIsCompleting(false)
    }
  }
  
  const icon = categoryIcons[reminder.category] || '📋'
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
      reminder.is_overdue 
        ? 'bg-red-50 border border-red-200' 
        : reminder.is_upcoming 
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-gray-50 hover:bg-gray-100'
    }`}>
      <span className="text-2xl">{icon}</span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{reminder.title}</p>
          {reminder.is_overdue && (
            <Badge variant="danger" className="text-xs">Просрочено</Badge>
          )}
          {reminder.is_upcoming && !reminder.is_overdue && (
            <Badge variant="warning" className="text-xs">Скоро</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>🐾 {reminder.pet_name}</span>
          <span>•</span>
          <span>{formatDate(reminder.reminder_date)}</span>
          {reminder.reminder_time && (
            <>
              <span>•</span>
              <span>{formatTime(reminder.reminder_time)}</span>
            </>
          )}
        </div>
      </div>
      
      <Button
        variant={reminder.is_overdue ? 'danger' : 'success'}
        size="sm"
        onClick={handleComplete}
        disabled={isCompleting}
        className="flex-shrink-0"
      >
        {isCompleting ? <ButtonLoader /> : '✓'}
      </Button>
    </div>
  )
}

/**
 * Виджет напоминаний
 */
function RemindersWidget({ limit = 5 }) {
  const [reminders, setReminders] = useState([])
  const [overdueCount, setOverdueCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  /**
   * Загрузка напоминаний из API
   */
  const fetchReminders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getUpcomingReminders(limit)
      setReminders(data.reminders || [])
      setOverdueCount(data.overdue_count || 0)
    } catch (err) {
      setError(err.message || 'Не удалось загрузить напоминания')
    } finally {
      setIsLoading(false)
    }
  }, [limit])
  
  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])
  
  const handleComplete = async (reminderId) => {
    try {
      await completeReminder(reminderId)
      // Обновляем список
      setReminders(prev => prev.filter(r => r.id !== reminderId))
    } catch (err) {
      console.error('Ошибка при выполнении напоминания:', err)
    }
  }
  
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-600 text-center">{error}</p>
        <Button onClick={fetchReminders} variant="secondary" className="mt-4 w-full">
          Попробовать снова
        </Button>
      </Card>
    )
  }
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">🔔 Напоминания</h3>
          {overdueCount > 0 && (
            <Badge variant="danger">{overdueCount} просрочено</Badge>
          )}
        </div>
        <Link 
          to="/reminders" 
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Все →
        </Link>
      </div>
      
      {reminders.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl block mb-3">✨</span>
          <p className="text-gray-600 mb-4">Нет предстоящих напоминаний</p>
          <Link to="/reminders/new">
            <Button variant="primary" size="sm">
              Создать напоминание
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(reminder => (
            <ReminderCard 
              key={reminder.id} 
              reminder={reminder} 
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
      
      {reminders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <Link to="/reminders/new">
            <Button variant="ghost" size="sm">
              + Добавить
            </Button>
          </Link>
          <Link to="/reminders">
            <Button variant="secondary" size="sm">
              Все напоминания
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}

export default RemindersWidget

