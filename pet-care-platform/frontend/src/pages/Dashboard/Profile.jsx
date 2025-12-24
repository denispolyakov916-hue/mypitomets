/**
 * Компонент страницы профиля
 * 
 * Личный кабинет пользователя с:
 * - Информацией об аккаунте
 * - Списком питомцев
 * - Историей заказов
 * - Приобретёнными курсами
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, updateProfile } from '../../api/auth'
import { getUserCourses } from '../../api/courses'
import { getReturns } from '../../api/shop'
import { useAuthStore } from '../../store/authStore'
import PetCard from '../../components/PetCard'
import { PageLoader } from '../../components/Loader'

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
 * Названия статусов заказов
 */
const statusLabels = {
  pending: { label: 'Ожидает', class: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'В обработке', class: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Отправлен', class: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Доставлен', class: 'bg-green-100 text-green-700' },
}

/**
 * Компонент страницы профиля
 */
function Profile() {
  const { logout } = useAuthStore()
  
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
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isSaving, setIsSaving] = useState(false)

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
   * Начать редактирование профиля
   */
  const startEditing = () => {
    if (profile?.user) {
      setEditForm({
        email: profile.user.email || '',
        first_name: profile.user.first_name || '',
        last_name: profile.user.last_name || '',
        phone: profile.user.phone || '',
        default_address: profile.user.default_address || '',
        bio: profile.user.bio || '',
        date_of_birth: profile.user.date_of_birth || '',
        city: profile.user.city || '',
        website: profile.user.website || '',
        email_notifications: profile.user.email_notifications ?? true,
        push_notifications: profile.user.push_notifications ?? true,
        order_notifications: profile.user.order_notifications ?? true,
        marketing_notifications: profile.user.marketing_notifications ?? false,
        preferred_pet_types: profile.user.preferred_pet_types || []
      })
      setIsEditing(true)
    }
  }

  /**
   * Отменить редактирование
   */
  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({})
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
      setIsEditing(false)
      setEditForm({})
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
            window.location.href = '/'
          }}
          className="btn-secondary"
        >
          Выйти из аккаунта
        </button>
      </div>
      
      {/* Информация об аккаунте */}
      <div className="card mb-8">
        <div className="flex justify-between items-start mb-4">
          <h2 className="section-title mb-0">Информация об аккаунте</h2>
          <Link to="/settings" className="btn-secondary text-sm">
            Редактировать профиль
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Email</span>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Дата регистрации</span>
            <p className="text-gray-900">{formatDate(user.created_at)}</p>
          </div>
          {user.first_name && (
            <div>
              <span className="text-sm text-gray-500">Имя</span>
              <p className="text-gray-900">{user.first_name} {user.last_name}</p>
            </div>
          )}
          {user.phone && (
            <div>
              <span className="text-sm text-gray-500">Телефон</span>
              <p className="text-gray-900">{user.phone}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Вкладки */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'profile', label: 'Профиль', count: 0 },
            { id: 'pets', label: 'Питомцы', count: pets.length },
            { id: 'orders', label: 'Заказы', count: orders.length },
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
          <div>
            <div className="card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Личные данные</h2>
                  <p className="text-gray-600 mt-1">Управляйте информацией о вашем аккаунте</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="btn-secondary"
                  >
                    Редактировать
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      className="btn-secondary"
                      disabled={isSaving}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={saveProfile}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                // Просмотр профиля
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900">{profile.user.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Имя</label>
                        <p className="text-gray-900">{profile.user.first_name || 'Не указано'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Фамилия</label>
                        <p className="text-gray-900">{profile.user.last_name || 'Не указано'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Телефон</label>
                        <p className="text-gray-900">{profile.user.phone || 'Не указано'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Дополнительная информация</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Дата рождения</label>
                        <p className="text-gray-900">
                          {profile.user.date_of_birth ? formatDate(profile.user.date_of_birth) : 'Не указано'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Город</label>
                        <p className="text-gray-900">{profile.user.city || 'Не указано'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Сайт</label>
                        <p className="text-gray-900">{profile.user.website || 'Не указано'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">О себе</label>
                        <p className="text-gray-900">{profile.user.bio || 'Не указано'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки уведомлений</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.user.email_notifications}
                          disabled
                          className="w-4 h-4 text-primary-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">Email уведомления</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.user.push_notifications}
                          disabled
                          className="w-4 h-4 text-primary-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">Push уведомления</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.user.order_notifications}
                          disabled
                          className="w-4 h-4 text-primary-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">Уведомления о заказах</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={profile.user.marketing_notifications}
                          disabled
                          className="w-4 h-4 text-primary-600"
                        />
                        <label className="ml-2 text-sm text-gray-700">Маркетинговые уведомления</label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Форма редактирования
                <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                        <input
                          type="text"
                          value={editForm.first_name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                        <input
                          type="text"
                          value={editForm.last_name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input
                          type="tel"
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Дополнительная информация</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
                        <input
                          type="date"
                          value={editForm.date_of_birth || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                        <input
                          type="text"
                          value={editForm.city || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
                        <input
                          type="url"
                          value={editForm.website || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">О себе</label>
                        <textarea
                          value={editForm.bio || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Настройки уведомлений</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.email_notifications}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email_notifications: e.target.checked }))}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">Email уведомления</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.push_notifications}
                          onChange={(e) => setEditForm(prev => ({ ...prev, push_notifications: e.target.checked }))}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">Push уведомления</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.order_notifications}
                          onChange={(e) => setEditForm(prev => ({ ...prev, order_notifications: e.target.checked }))}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">Уведомления о заказах</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editForm.marketing_notifications}
                          onChange={(e) => setEditForm(prev => ({ ...prev, marketing_notifications: e.target.checked }))}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <label className="ml-2 text-sm text-gray-700">Маркетинговые уведомления</label>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Вкладка питомцев */}
        {activeTab === 'pets' && (
          <div>
            {pets.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">🐾</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  У вас пока нет питомцев
                </h3>
                <p className="text-gray-600 mb-4">
                  Добавьте профиль вашего питомца
                </p>
                <Link to="/pets/new" className="btn-primary">
                  Добавить питомца
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pets.map(pet => (
                  <PetCard key={pet.id} pet={pet} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Вкладка заказов */}
        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
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
                  {orders.slice(0, 5).map(order => {
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
                {orders.length > 5 && (
                  <div className="mt-6 text-center">
                    <Link to="/orders" className="btn-secondary">
                      Показать все заказы ({orders.length})
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Вкладка курсов */}
        {activeTab === 'courses' && (
          <div>
            {/* Фильтр по питомцу */}
            {pets.length > 0 && (
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
                  {pets.map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species === 'dog' ? 'Собака' : pet.species === 'cat' ? 'Кошка' : pet.species})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
                  <div key={item.course.id} className="card">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-primary-50 rounded-lg flex items-center justify-center text-4xl flex-shrink-0">
                        {item.course.pet_type === 'dog' ? '🐕' : item.course.pet_type === 'cat' ? '🐱' : '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.course.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {item.course.description}
                        </p>
                        {/* Информация о питомце, если курс привязан к питомцу */}
                        {item.pet && (
                          <div className="mt-2 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                              <span>🐾</span>
                              Для: {item.pet.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">
                            Приобретён: {formatDate(item.purchased_at)}
                          </span>
                          <span className="text-xs text-primary-600 font-medium">
                            Прогресс: {item.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                          </div>
                        )}
                        {returnItem.admin_comment && (
                          <div className="bg-blue-50 rounded-lg p-3 mt-3">
                            <p className="text-sm font-medium text-blue-900 mb-1">Комментарий администратора:</p>
                            <p className="text-sm text-blue-700">{returnItem.admin_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
