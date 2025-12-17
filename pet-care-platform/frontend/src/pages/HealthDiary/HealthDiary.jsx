/**
 * Компонент дневника здоровья питомца
 * 
 * Базовая версия с возможностью:
 * - Выбора питомца
 * - Просмотра истории записей
 * - Добавления записей
 * - Календаря прививок
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePets } from '../../hooks/usePets'
import { PageLoader } from '../../components/Loader'

/**
 * Компонент страницы HealthDiary
 */
function HealthDiary() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { pets, isLoading: petsLoading } = usePets()
  
  const [selectedPetId, setSelectedPetId] = useState(null)
  const [entries, setEntries] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEntry, setNewEntry] = useState({
    type: 'note',
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: ''
  })
  
  /**
   * Проверка аутентификации
   */
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated])
  
  /**
   * Автовыбор первого питомца
   */
  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])
  
  /**
   * Загрузка записей для выбранного питомца
   */
  useEffect(() => {
    if (selectedPetId) {
      // В базовой версии используем localStorage
      const storedEntries = localStorage.getItem(`health_diary_${selectedPetId}`)
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries))
      } else {
        setEntries([])
      }
    }
  }, [selectedPetId])
  
  /**
   * Добавление записи
   */
  const handleAddEntry = (e) => {
    e.preventDefault()
    
    const entry = {
      id: Date.now(),
      petId: selectedPetId,
      ...newEntry,
      createdAt: new Date().toISOString()
    }
    
    const updatedEntries = [entry, ...entries]
    setEntries(updatedEntries)
    localStorage.setItem(`health_diary_${selectedPetId}`, JSON.stringify(updatedEntries))
    
    setNewEntry({
      type: 'note',
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: ''
    })
    setShowAddForm(false)
  }
  
  /**
   * Удаление записи
   */
  const handleDeleteEntry = (entryId) => {
    if (!confirm('Удалить запись?')) return
    
    const updatedEntries = entries.filter(e => e.id !== entryId)
    setEntries(updatedEntries)
    localStorage.setItem(`health_diary_${selectedPetId}`, JSON.stringify(updatedEntries))
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
  
  const typeLabels = {
    note: { label: 'Заметка', color: 'bg-blue-100 text-blue-700' },
    vaccine: { label: 'Прививка', color: 'bg-green-100 text-green-700' },
    illness: { label: 'Болезнь', color: 'bg-red-100 text-red-700' },
    checkup: { label: 'Осмотр', color: 'bg-purple-100 text-purple-700' },
    medication: { label: 'Лечение', color: 'bg-orange-100 text-orange-700' }
  }
  
  return (
    <div className="page-container animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Дневник здоровья</h1>
          <p className="text-gray-600 mt-1">
            История визитов, прививок и состояния здоровья
          </p>
        </div>
        
        <Link to="/profile" className="btn-secondary">
          Вернуться в профиль
        </Link>
      </div>
      
      {/* Выбор питомца */}
      <div className="card mb-6">
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
      
      {selectedPet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Записи */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Записи ({entries.length})
              </h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-primary"
              >
                {showAddForm ? 'Отмена' : 'Добавить запись'}
              </button>
            </div>
            
            {/* Форма добавления */}
            {showAddForm && (
              <form onSubmit={handleAddEntry} className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Новая запись</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Тип</label>
                      <select
                        value={newEntry.type}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value }))}
                        className="input"
                        required
                      >
                        <option value="note">Заметка</option>
                        <option value="vaccine">Прививка</option>
                        <option value="illness">Болезнь</option>
                        <option value="checkup">Осмотр</option>
                        <option value="medication">Лечение</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="label">Дата</label>
                      <input
                        type="date"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="label">Название</label>
                    <input
                      type="text"
                      value={newEntry.title}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                      className="input"
                      placeholder="Например: Прививка от бешенства"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">Описание</label>
                    <textarea
                      value={newEntry.description}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                      className="input min-h-[100px]"
                      placeholder="Дополнительная информация..."
                    />
                  </div>
                  
                  <button type="submit" className="btn-primary w-full">
                    Сохранить запись
                  </button>
                </div>
              </form>
            )}
            
            {/* Список записей */}
            {entries.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Нет записей
                </h3>
                <p className="text-gray-600">
                  Добавьте первую запись о здоровье {selectedPet.name}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map(entry => {
                  const typeInfo = typeLabels[entry.type] || typeLabels.note
                  return (
                    <div key={entry.id} className="card">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${typeInfo.color} mb-2`}>
                            {typeInfo.label}
                          </span>
                          <h3 className="font-semibold text-gray-900">{entry.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(entry.date).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                      {entry.description && (
                        <p className="text-gray-600 text-sm whitespace-pre-line">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Информация о питомце */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Информация</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Питомец:</span>
                  <p className="text-gray-900 font-medium">{selectedPet.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Вид:</span>
                  <p className="text-gray-900">{selectedPet.species === 'dog' ? 'Собака' : 'Кошка'}</p>
                </div>
                {selectedPet.breed && (
                  <div>
                    <span className="text-gray-500">Порода:</span>
                    <p className="text-gray-900">{selectedPet.breed}</p>
                  </div>
                )}
              </div>
            </div>
            
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

