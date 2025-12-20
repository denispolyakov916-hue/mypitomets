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
import { getProfile } from '../../api/auth'
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('pets')
  
  /**
   * Загрузка профиля при монтировании
   */
  useEffect(() => {
    fetchProfile()
  }, [])
  
  /**
   * Загрузка профиля из API
   */
  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getProfile()
      setProfile(data)
    } catch (err) {
      setError(err.message || 'Не удалось загрузить профиль')
    } finally {
      setIsLoading(false)
    }
  }
  
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
  
  const { user, pets, orders, courses } = profile
  
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
            { id: 'pets', label: 'Питомцы', count: pets.length },
            { id: 'orders', label: 'Заказы', count: orders.length },
            { id: 'courses', label: 'Курсы', count: courses.length },
          ].map(tab => (
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
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Содержимое вкладок */}
      <div className="animate-fadeIn">
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
              <div className="space-y-4">
                {orders.map(order => {
                  const status = statusLabels[order.status] || statusLabels.pending
                  return (
                    <div key={order.id} className="card">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">
                              Заказ #{order.id}
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
                          {order.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700">
                              {item.product_name} x {item.quantity} — {formatPrice(item.total)}
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-gray-500 mt-3">
                          Доставка: {order.shipping_address}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Вкладка курсов */}
        {activeTab === 'courses' && (
          <div>
            {courses.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  У вас пока нет курсов
                </h3>
                <p className="text-gray-600 mb-4">
                  Изучите наш каталог обучающих материалов
                </p>
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
      </div>
    </div>
  )
}

export default Profile
