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
import { getUserCourses } from '../../api/courses'
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
  const [selectedPetFilter, setSelectedPetFilter] = useState('')
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
   * Загрузка курсов при переключении на вкладку курсов или изменении фильтра
   */
  useEffect(() => {
    if (activeTab === 'courses' && profile) {
      fetchCourses()
    }
  }, [activeTab, selectedPetFilter, profile])
  
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
            { id: 'pets', label: 'Питомцы', count: pets.length },
            { id: 'orders', label: 'Заказы', count: orders.length },
            { id: 'courses', label: 'Курсы', count: courses.length },
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
      </div>
    </div>
  )
}

export default Profile
