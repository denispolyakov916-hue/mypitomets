/**
 * Компонент страницы профиля
 * 
 * Личный кабинет пользователя с:
 * - Информацией об аккаунте
 * - Списком питомцев
 * - Историей заказов
 * - Приобретёнными курсами
 * - Персонализированными рекомендациями
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProfile, updateProfile } from '../../api/auth'
import { getUserCourses } from '../../api/courses'
import { getReturns } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
import PetCard from '../../components/PetCard'
import { PageLoader } from '../../components/Loader'
import { Progress } from '../../components/ui/Progress'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import RemindersWidget from '../../components/RemindersWidget'
import FeedingPlanPreview from '../../components/Shop/FeedingPlanPreview'

/**
 * Форматирование даты в русскую локаль
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Форматирование цены с символом рубля
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(price)
}

/**
 * Инициалы пользователя для аватара
 */
const getInitials = (user) => {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  const source = name || user?.email || 'U'
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/**
 * Названия статусов заказов
 */
const statusLabels = {
  pending: { label: 'Ожидает', class: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'В обработке', class: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Отправлен', class: 'bg-purple-100 text-purple-700' },
  partially_delivered: { label: 'Частично доставлен', class: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Доставлен', class: 'bg-green-100 text-green-700' },
}

/**
 * Компонент страницы профиля
 */
function Profile() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  
  // Состояние
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [returns, setReturns] = useState([])
  const [returnsLoading, setReturnsLoading] = useState(false)
  const [selectedPetFilter, setSelectedPetFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [editForm, setEditForm] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState(null)

  /**
   * Загрузка профиля из API
   */
  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getProfile()
      setProfile(data)
      // Инициализируем курсы из профиля (для обратной совместимости)
      if (data.courses) {
        setCourses(data.courses)
      }
    } catch (err) {
      setError(err.message || 'Не удалось загрузить профиль')
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Загрузка курсов пользователя с фильтрацией по питомцу
   */
  const fetchCourses = async () => {
    setCoursesLoading(true)
    try {
      const petId = selectedPetFilter || null
      const response = await getUserCourses(petId)
      setCourses(response.courses || [])
    } catch (err) {
      console.error('Не удалось загрузить курсы:', err)
      setCourses([])
    } finally {
      setCoursesLoading(false)
    }
  }

  /**
   * Загрузка возвратов пользователя
   */
  const fetchReturns = async () => {
    setReturnsLoading(true)
    try {
      const response = await getReturns()
      setReturns(response.returns || [])
    } catch (err) {
      console.error('Не удалось загрузить возвраты:', err)
      setReturns([])
    } finally {
      setReturnsLoading(false)
    }
  }

  /**
   * Обновить поле формы
   */
  const updateField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  /**
   * Начать редактирование профиля
   */
  const initEditForm = (profileData) => {
    if (profileData?.user) {
      // Форматируем дату для input type="date" (YYYY-MM-DD)
      let formattedDate = ''
      if (profileData.user.date_of_birth) {
        const date = new Date(profileData.user.date_of_birth)
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0]
        }
      }
      
      setEditForm({
        email: profileData.user.email || '',
        first_name: profileData.user.first_name || '',
        last_name: profileData.user.last_name || '',
        phone: profileData.user.phone || '',
        default_address: profileData.user.default_address || '',
        bio: profileData.user.bio || '',
        date_of_birth: formattedDate,
        city: profileData.user.city || '',
        website: profileData.user.website || '',
        email_notifications: profileData.user.email_notifications ?? true,
        push_notifications: profileData.user.push_notifications ?? true,
        order_notifications: profileData.user.order_notifications ?? true,
        marketing_notifications: profileData.user.marketing_notifications ?? false,
        preferred_pet_types: profileData.user.preferred_pet_types || []
      })
      setHasChanges(false)
    }
  }

  /**
   * Отменить редактирование
   */
  const cancelChanges = () => {
    setHasChanges(false)
    initEditForm(profile)
  }

  /**
   * Сохранить изменения профиля
   */
  const saveProfile = async () => {
    setIsSaving(true)
    try {
      const updatedProfile = await updateProfile(editForm)
      setProfile(prev => ({
        ...prev,
        user: updatedProfile.user
      }))
      // Обновляем editForm с новыми данными
      initEditForm({ user: updatedProfile.user })
      setHasChanges(false)
      setIsEditingProfile(false)
    } catch (err) {
      setError(err.message || 'Не удалось сохранить профиль')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Загрузка профиля при монтировании
   */
  useEffect(() => {
    fetchProfile()
  }, [])

  /**
   * Инициализация формы редактирования при загрузке профиля
   */
  useEffect(() => {
    if (profile) {
      initEditForm(profile)
    }
  }, [profile])

  /**
   * Загрузка курсов при переключении на вкладку курсов или изменении фильтра
   */
  useEffect(() => {
    if (activeTab === 'courses' && profile) {
      fetchCourses()
    }
  }, [activeTab, selectedPetFilter, profile])

  /**
   * Загрузка возвратов при переключении на вкладку возвратов
   */
  useEffect(() => {
    if (activeTab === 'returns' && profile) {
      fetchReturns()
    }
  }, [activeTab, profile])

  // Состояние загрузки
  if (isLoading) {
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !profile) {
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-500 mb-4">{error || 'Профиль не найден'}</p>
          <button onClick={fetchProfile} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }
  
  const { user, pets, orders } = profile
  const petsList = Array.isArray(pets) ? pets : []
  const ordersList = Array.isArray(orders) ? orders : []
  const latestOrders = [...ordersList]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 2)
  const defaultPetId = petsList[0]?.id || null
  const activePetId = selectedPetId || defaultPetId
  const activePet = petsList.find(p => p.id === activePetId) || petsList[0]
  const requiredFields = ['first_name', 'phone', 'default_address']
  const missingFields = requiredFields.filter((field) => !editForm?.[field])
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="page-title mb-0">Личный кабинет</h1>
          <p className="text-gray-600 mt-1">{user.email}</p>
        </div>
        <button
          onClick={async () => {
            await logout()
            navigate('/')
          }}
          className="btn-secondary"
        >
          Выйти из аккаунта
        </button>
      </div>
      
      {/* Вкладки */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'profile', label: 'Профиль', count: 0 },
            { id: 'pets', label: 'Питомцы', count: petsList.length },
            { id: 'reminders', label: '🔔 Напоминания', count: 0 },
            { id: 'orders', label: 'Заказы', count: ordersList.length },
            { id: 'courses', label: 'Курсы', count: courses.length },
            { id: 'returns', label: 'Возвраты', count: returns.length },
          ].map(tab => {
            // Для вкладки курсов показываем актуальное количество
            const count = tab.id === 'courses' ? courses.length : tab.count
            return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
            )
          })}
        </nav>
      </div>
      
      {/* Содержимое вкладок */}
      <div className="animate-fadeIn">
        {/* Вкладка профиля */}
        {activeTab === 'profile' && profile?.user && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Центральная часть - премиальный дашборд */}
            <div className="xl:col-span-2 space-y-6">
              {/* Hero */}
              <div className="card bg-gradient-to-br from-primary-50 via-white to-secondary-50 border border-primary-100">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl font-bold text-primary-700">
                      {getInitials(user)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {user.first_name ? `Привет, ${user.first_name}!` : 'Личный кабинет'}
                      </h2>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to="/shop" className="btn-primary">
                      В магазин
                    </Link>
                    <Link to="/cart" className="btn-secondary">
                      Корзина
                    </Link>
                    <Link to="/pet-id" className="btn-secondary">
                      Питомцы
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500">Питомцы</p>
                    <p className="text-xl font-bold text-gray-900">{petsList.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500">Заказы</p>
                    <p className="text-xl font-bold text-gray-900">{ordersList.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500">Курсы</p>
                    <p className="text-xl font-bold text-gray-900">{courses.length}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500">Возвраты</p>
                    <p className="text-xl font-bold text-gray-900">{returns.length}</p>
                  </div>
                </div>
              </div>

              {/* Bento-сетка */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Питомцы */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Мои питомцы</h3>
                    <button
                      onClick={() => setActiveTab('pets')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Все →
                    </button>
                  </div>

                  {petsList.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-2">🐾</div>
                      <p className="text-gray-600 mb-4">Добавьте первого питомца</p>
                      <Link to="/pet-id" className="btn-primary">
                        Создать профиль
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {petsList.slice(0, 3).map(pet => {
                        const petEmoji = pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'
                        return (
                          <Link
                            key={pet.id}
                            to={`/pet-id/${pet.id}`}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl">{petEmoji}</span>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{pet.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {pet.breed_name || pet.breed || 'Порода не указана'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">Открыть →</span>
                          </Link>
                        )
                      })}
                      {petsList.length > 3 && (
                        <p className="text-xs text-gray-500">
                          и ещё {petsList.length - 3}...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Заказы */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Последние заказы</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Все →
                    </button>
                  </div>

                  {ordersList.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-4xl mb-2">📦</div>
                      <p className="text-gray-600 mb-4">Пока нет заказов</p>
                      <Link to="/shop" className="btn-primary">
                        Перейти в магазин
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {latestOrders.map(order => {
                        const status = statusLabels[order.status] || statusLabels.pending
                        return (
                          <Link
                            key={order.id}
                            to={`/orders/${order.id}`}
                            className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Заказ #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${status.class}`}>
                                {status.label}
                              </span>
                              <p className="text-sm font-semibold text-gray-900 mt-1">
                                {formatPrice(order.total_amount)}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Магазин */}
                <div className="card bg-gradient-to-br from-white to-primary-50 border border-primary-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Товары под питомцев</h3>
                    <Link to="/shop" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      Каталог →
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600">
                    Подбор по профилям питомцев и персональные рекомендации.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Link to="/shop" className="px-3 py-2 bg-white rounded-lg border border-gray-100 text-sm text-gray-700 hover:shadow-sm transition-all">
                      🍖 Корм и рацион
                    </Link>
                    <Link to="/shop" className="px-3 py-2 bg-white rounded-lg border border-gray-100 text-sm text-gray-700 hover:shadow-sm transition-all">
                      🧴 Уход и гигиена
                    </Link>
                    <Link to="/shop" className="px-3 py-2 bg-white rounded-lg border border-gray-100 text-sm text-gray-700 hover:shadow-sm transition-all">
                      🎾 Игрушки
                    </Link>
                    <Link to="/shop" className="px-3 py-2 bg-white rounded-lg border border-gray-100 text-sm text-gray-700 hover:shadow-sm transition-all">
                      💊 Аптека и витамины
                    </Link>
                  </div>
                  <div className="mt-4">
                    <Link to="/shop" className="btn-primary w-full text-center">
                      Перейти к покупкам
                    </Link>
                  </div>
                </div>

                {petsList.length > 0 && (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold text-gray-900">Подбор корма</h3>
                      <Link
                        to={`/food-recommendation?pet_id=${activePet?.id || ''}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Все →
                      </Link>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {petsList.map(pet => (
                        <button
                          key={pet.id}
                          onClick={() => setSelectedPetId(pet.id)}
                          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                            pet.id === activePetId
                              ? 'bg-primary-50 text-primary-700 border-primary-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {pet.name || 'Питомец'}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3">
                      <FeedingPlanPreview
                        petId={activePet?.id}
                        petName={activePet?.name}
                        limit={4}
                        withCard={false}
                      />
                    </div>
                  </div>
                )}

                {/* Напоминания */}
                <RemindersWidget limit={3} />
              </div>
            </div>

            {/* Правая часть - просмотр/редактирование профиля */}
            <div className="lg:col-span-1">
              {!isEditingProfile ? (
                <div className="space-y-4">
                  <div className="card sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Профиль</h2>
                        <p className="text-sm text-gray-600">Личные данные</p>
                      </div>
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        Редактировать
                      </button>
                    </div>

                    {missingFields.length > 0 && (
                      <div className="p-3 mb-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100">
                        Заполните профиль — так мы сможем лучше подобрать товары и доставку.
                      </div>
                    )}

                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500">Email:</span> {user.email || '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Имя:</span> {user.first_name || '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Фамилия:</span> {user.last_name || '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Телефон:</span> {user.phone || '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Город:</span> {user.city || '—'}
                      </div>
                      <div>
                        <span className="text-gray-500">Адрес:</span> {user.default_address || '—'}
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="card sticky top-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Редактировать профиль</h2>
                      <p className="text-sm text-gray-600 mt-1">Личные данные</p>
                    </div>
                    <div className="flex flex-col gap-2 animate-fadeIn">
                      <button
                        onClick={saveProfile}
                        disabled={isSaving}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      <button
                        onClick={() => {
                          cancelChanges()
                          setIsEditingProfile(false)
                        }}
                        className="btn-secondary text-sm px-4 py-2"
                        disabled={isSaving}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="space-y-4">
                    {/* Email (только для чтения) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    {/* Имя */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                      <input
                        type="text"
                        value={editForm.first_name || ''}
                        onChange={(e) => updateField('first_name', e.target.value)}
                        placeholder="Как к вам обращаться"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Фамилия */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                      <input
                        type="text"
                        value={editForm.last_name || ''}
                        onChange={(e) => updateField('last_name', e.target.value)}
                        placeholder="Ваша фамилия"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Телефон */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="+7 (999) 123-45-67"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Город */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                      <input
                        type="text"
                        value={editForm.city || ''}
                        onChange={(e) => updateField('city', e.target.value)}
                        placeholder="Для расчёта доставки"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Биография */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">О себе</label>
                      <textarea
                        value={editForm.bio || ''}
                        onChange={(e) => updateField('bio', e.target.value)}
                        placeholder="Расскажите о себе"
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Дата рождения */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
                      <input
                        type="date"
                        value={editForm.date_of_birth || ''}
                        onChange={(e) => updateField('date_of_birth', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Адрес по умолчанию */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Адрес доставки</label>
                      <input
                        type="text"
                        value={editForm.default_address || ''}
                        onChange={(e) => updateField('default_address', e.target.value)}
                        placeholder="Адрес для доставки"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Веб-сайт */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Веб-сайт</label>
                      <input
                        type="url"
                        value={editForm.website || ''}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                    </div>

                    {/* Уведомления */}
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Уведомления</h3>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Email уведомления</p>
                            <p className="text-xs text-gray-500">Важные сообщения о вашем аккаунте</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={editForm.email_notifications ?? true}
                            onChange={(e) => updateField('email_notifications', e.target.checked)}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Статус заказов</p>
                            <p className="text-xs text-gray-500">Уведомления об изменении статуса</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={editForm.order_notifications ?? true}
                            onChange={(e) => updateField('order_notifications', e.target.checked)}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Акции и новости</p>
                            <p className="text-xs text-gray-500">Скидки и специальные предложения</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={editForm.marketing_notifications ?? false}
                            onChange={(e) => updateField('marketing_notifications', e.target.checked)}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Вкладка питомцев */}
        {activeTab === 'pets' && (
          <div>
            {petsList.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">🐾</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  У вас пока нет питомцев
                </h3>
                <p className="text-gray-600 mb-4">
                  Добавьте профиль вашего питомца
                </p>
                <Link to="/pet-id" className="btn-primary">
                  Добавить питомца
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {petsList.map(pet => (
                  <PetCard key={pet.id} pet={pet} />
                ))}
              </div>)}
          </div>)}

        {/* Вкладка напоминаний */}
        {activeTab === 'reminders' && (
          <div>
            {petsList.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">🔔</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Добавьте питомца для создания напоминаний
                </h3>
                <p className="text-gray-600 mb-4">
                  Напоминания привязаны к профилям питомцев
                </p>
                <Link to="/pet-id" className="btn-primary">
                  Добавить питомца
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Напоминания по уходу
                  </h2>
                  <Link to="/reminders/new">
                    <Button variant="primary" size="sm">
                      + Создать напоминание
                    </Button>
                  </Link>
                </div>
                <RemindersWidget limit={10} />
              </div>)}
          </div>)}
        
        {/* Вкладка заказов */}
        {activeTab === 'orders' && (
          <div>
            {ordersList.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  У вас пока нет заказов
                </h3>
                <p className="text-gray-600 mb-4">
                  Сделайте первый заказ в нашем магазине
                </p>
                <Link to="/shop" className="btn-primary">
                  Перейти в магазин
                </Link>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <Link to="/orders" className="btn-primary inline-flex items-center gap-2">
                    <span>Посмотреть все заказы</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="space-y-4">
                  {ordersList.slice(0, 5).map(order => {
                    const status = statusLabels[order.status] || statusLabels.pending
                    return (
                      <Link 
                        key={order.id} 
                        to={`/orders/${order.id}`}
                        className="card block hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900">
                                Заказ #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${status.class}`}>
                                {status.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <span className="font-semibold text-lg text-gray-900">
                            {formatPrice(order.total_amount)}
                          </span>
                        </div>
                        
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Товары ({order.items.length}):
                          </p>
                          <ul className="space-y-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <li key={idx} className="text-sm text-gray-700">
                                {item.product_name || item.course_name} x {item.quantity} — {formatPrice(item.total)}
                              </li>
                            ))}
                            {order.items.length > 3 && (
                              <li className="text-sm text-gray-500">
                                и ещё {order.items.length - 3}...
                              </li>
                            )}
                          </ul>
                          {order.shipping_address && (
                            <p className="text-sm text-gray-500 mt-3">
                              Доставка: {order.shipping_address}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
                {ordersList.length > 5 && (
                  <div className="mt-6 text-center">
                    <Link to="/orders" className="btn-secondary">
                      Показать все заказы ({ordersList.length})
                    </Link>
                  </div>)}
              </div>)}
          </div>)}
        
        {/* Вкладка курсов */}
        {activeTab === 'courses' && (
          <div>
            {/* Фильтр по питомцу */}
            {petsList.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фильтр по питомцу
                </label>
                <select
                  value={selectedPetFilter}
                  onChange={(e) => setSelectedPetFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Все курсы</option>
                  {petsList.map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species === 'dog' ? 'Собака' : pet.species === 'cat' ? 'Кошка' : pet.species})
                    </option>
                  ))}
                </select>
              </div>)}
            
            {coursesLoading ? (
              <div className="card text-center py-12">
                <PageLoader />
              </div>
            ) : courses.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedPetFilter ? 'Нет курсов для выбранного питомца' : 'У вас пока нет курсов'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedPetFilter 
                    ? 'Попробуйте выбрать другого питомца или посмотрите все курсы'
                    : 'Изучите наш каталог обучающих материалов'}
                </p>
                {selectedPetFilter ? (
                  <button 
                    onClick={() => setSelectedPetFilter('')}
                    className="btn-secondary mr-2"
                  >
                    Показать все курсы
                  </button>
                ) : null}
                <Link to="/courses" className="btn-primary">
                  Смотреть курсы
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map(item => (
                  <Link 
                    key={item.course.id} 
                    to={`/courses/${item.course.id}`}
                    className="block"
                  >
                    <Card className="p-4 hover:shadow-lg transition-shadow h-full">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center text-4xl flex-shrink-0">
                          {item.course.pet_type === 'dog' ? '🐕' : item.course.pet_type === 'cat' ? '🐱' : '📚'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate mb-1">
                            {item.course.title}
                          </h3>
                          
                          {/* Информация о питомце */}
                          {item.pet && (
                            <Badge variant="primary" className="mb-2">
                              🐾 Для: {item.pet.name}
                            </Badge>
                          )}
                          
                          {/* Прогресс-бар */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">Прогресс</span>
                              <span className={`text-xs font-bold ${
                                item.progress >= 100 ? 'text-green-600' : 
                                item.progress >= 50 ? 'text-primary-600' : 'text-amber-600'
                              }`}>
                                {item.progress}%
                              </span>
                            </div>
                            <Progress 
                              value={item.progress} 
                              max={100}
                              className="h-2"
                              indicatorClassName={
                                item.progress >= 100 ? 'bg-green-500' : 
                                item.progress >= 50 ? 'bg-primary-500' : 'bg-amber-500'
                              }
                            />
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            Приобретён: {formatDate(item.purchased_at)}
                          </p>

                          {/* Кнопка обучения */}
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/training/courses/${item.course.id}/learn${item.pet ? `?pet_id=${item.pet.id}` : ''}`)
                            }}
                            className="mt-3 w-full"
                          >
                            {item.progress > 0 ? 'Продолжить обучение' : 'Начать обучение'}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Статус курса */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        {item.progress >= 100 ? (
                          <Badge variant="success">✓ Завершён</Badge>
                        ) : item.progress > 0 ? (
                          <Badge variant="info">В процессе</Badge>
                        ) : (
                          <Badge variant="secondary">Не начат</Badge>
                        )}
                        <span className="text-sm text-primary-600 font-medium">
                          Продолжить →
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>)}
          </div>)}

        {/* Вкладка возвратов */}
        {activeTab === 'returns' && (
          <div>
            {returnsLoading ? (
              <div className="card text-center py-12">
                <PageLoader />
              </div>
            ) : returns.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">🔄</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  У вас пока нет возвратов
                </h3>
                <p className="text-gray-600 mb-4">
                  Если возникнут проблемы с заказом, вы сможете оформить возврат
                </p>
                <Link to="/orders" className="btn-primary">
                  Посмотреть заказы
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {returns.map(returnItem => {
                  const statusLabels = {
                    requested: { label: 'Запрошено', class: 'bg-yellow-100 text-yellow-700' },
                    approved: { label: 'Одобрено', class: 'bg-blue-100 text-blue-700' },
                    rejected: { label: 'Отклонено', class: 'bg-red-100 text-red-700' },
                    received: { label: 'Получено', class: 'bg-purple-100 text-purple-700' },
                    refunded: { label: 'Возвращены средства', class: 'bg-green-100 text-green-700' },
                  }

                  const status = statusLabels[returnItem.status] || statusLabels.requested

                  return (
                    <div key={returnItem.id} className="card">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">
                              Возврат #{returnItem.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${status.class}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Создан: {formatDate(returnItem.requested_at)}
                          </p>
                        </div>
                        {returnItem.refund_amount > 0 && (
                          <span className="font-semibold text-lg text-green-600">
                            {formatPrice(returnItem.refund_amount)}
                          </span>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Причина: <span className="font-medium">{returnItem.reason_display}</span>
                        </p>
                        {returnItem.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            Описание: {returnItem.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mb-2">
                          Количество: {returnItem.quantity} шт.
                        </p>
                        {returnItem.order_item && (
                          <div className="bg-gray-50 rounded-lg p-3 mt-3">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {returnItem.order_item.product_name || returnItem.order_item.course_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Заказ #{returnItem.order_id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>)}
                        {returnItem.admin_comment && (
                          <div className="bg-blue-50 rounded-lg p-3 mt-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">Комментарий администратора:</p>
                            <p className="text-sm text-blue-700">{returnItem.admin_comment}</p>
                          </div>)}
                      </div>
                    </div>
                  )
                })}
              </div>)}
          </div>)}
      </div>
    </div>
  )
}

export default Profile
