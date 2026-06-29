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

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PawPrint, Phone, Mail, ChevronRight, Package, LogOut, Pencil, CreditCard } from 'lucide-react'
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
import ProfileVerification from '../../components/ProfileVerification'

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

import { formatPrice } from '../../utils/format'

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
  shipped: { label: 'Отправлен', class: 'bg-primary-100 text-primary-700' },
  partially_delivered: { label: 'Частично доставлен', class: 'bg-primary-100 text-primary-700' },
  delivered: { label: 'Доставлен', class: 'bg-green-100 text-green-700' },
}

/**
 * Компонент страницы профиля
 */
function Profile() {
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Состояние
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [returns, setReturns] = useState([])
  const [returnsLoading, setReturnsLoading] = useState(false)
  const [selectedPetFilter, setSelectedPetFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(() =>
    (tabFromUrl === 'courses' || tabFromUrl === 'orders' || tabFromUrl === 'returns') ? tabFromUrl : 'profile'
  )
  // Синхронизация вкладки с URL при переходе по ссылке с ?tab=
  useEffect(() => {
    if (tabFromUrl === 'courses' || tabFromUrl === 'orders' || tabFromUrl === 'returns') {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:render', message: 'Profile render state', data: { isLoading, hasProfile: !!profile, hasError: !!error }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {})
  }
  // #endregion
  const [editForm, setEditForm] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isDetailsMenuOpen, setIsDetailsMenuOpen] = useState(false)
  const [ordersPetFilterId, setOrdersPetFilterId] = useState(null)
  const detailsMenuRef = useRef(null)

  /**
   * Загрузка профиля из API
   */
  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const data = await getProfile()
      setProfile(data)
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:fetchProfile:ok', message: 'getProfile succeeded', data: { hasData: !!data, hasUser: !!data?.user }, timestamp: Date.now(), hypothesisId: 'H5' }) }).catch(() => {})
      }
      // #endregion
      // Инициализируем курсы из профиля (для обратной совместимости)
      if (data.courses) {
        setCourses(data.courses)
      }
    } catch (err) {
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:fetchProfile:err', message: 'getProfile failed', data: { errMsg: err?.message }, timestamp: Date.now(), hypothesisId: 'H5' }) }).catch(() => {})
      }
      // #endregion
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
    if ((activeTab === 'courses' || activeTab === 'profile') && profile) {
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

  /**
   * Закрытие меню «Подробнее» при клике вне
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (detailsMenuRef.current && !detailsMenuRef.current.contains(e.target)) {
        setIsDetailsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Состояние загрузки
  if (isLoading) {
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:loading', message: 'Profile returning PageLoader', data: { isLoading: true }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {})
    }
    // #endregion
    return <PageLoader />
  }
  
  // Состояние ошибки
  if (error || !profile) {
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:error', message: 'Profile returning error state', data: { error: error || null, hasProfile: !!profile }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {})
    }
    // #endregion
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Профиль не найден'}</p>
          <button onClick={fetchProfile} className="btn-primary">
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }
  
  let userFromProfile, pets, orders, user, petsList, ordersList, latestOrders, defaultPetId, missingFields, remindersCount
  try {
    userFromProfile = profile?.user
    pets = profile?.pets
    orders = profile?.orders
    user = userFromProfile && typeof userFromProfile === 'object' ? userFromProfile : { email: '', first_name: '', last_name: '', city: '', default_address: '' }
    petsList = Array.isArray(pets) ? pets : []
    ordersList = Array.isArray(orders) ? orders : []
    latestOrders = [...ordersList]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 3)
    defaultPetId = petsList[0]?.id || null
    const requiredFields = ['first_name', 'phone', 'default_address']
    missingFields = requiredFields.filter((field) => !editForm?.[field])
    remindersCount = 0
  } catch (e) {
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:catch', message: 'Profile compute error', data: { err: String(e?.message), stack: String(e?.stack).slice(0, 300) }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {})
    }
    setError(e?.message || 'Ошибка отображения профиля')
    return (
      <div className="page-container">
        <div className="card text-center py-12">
          <p className="text-red-600 mb-4">{e?.message || 'Ошибка отображения профиля'}</p>
          <button onClick={fetchProfile} className="btn-primary">Попробовать снова</button>
        </div>
      </div>
    )
  }

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7656/ingest/14f0adf8-11a2-412b-b35d-bf6c67c26733', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '76e6a3' }, body: JSON.stringify({ sessionId: '76e6a3', location: 'Profile.jsx:main', message: 'Profile returning main content', data: { hasProfile: true, activeTab }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {})
  }
  // #endregion

  /** Заказы с учётом фильтра по питомцу: только заказы, в которых есть позиции для выбранного питомца */
  const ordersFilteredByPet = !ordersPetFilterId
    ? latestOrders
    : [...ordersList]
        .filter(order => (order.items || []).some(item => item && item.pet && String(item.pet.id) === String(ordersPetFilterId)))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 3)

  return (
    <div className="page-container w-full max-w-none flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[60vh] text-gray-900 overflow-visible">
      {/* Боковое меню слева (на мобильных — после шапки профиля и контента) */}
      <aside className="order-2 lg:order-none lg:w-72 flex-shrink-0 flex flex-col gap-4">
        {/* Карточка «Личный кабинет» — только десктоп; на мобильных блок приветствия и оплата в шапке */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
          <h2 className="text-xl font-bold text-gray-900">Личный кабинет</h2>
          <p className="text-sm text-gray-600 mt-1">{user.email}</p>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-5 h-5 flex-shrink-0 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Способ оплаты</span>
              </div>
              <Link
                to="/settings"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
              >
                {profile?.user?.default_payment_method ? 'Изменить' : 'Настроить'}
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {profile?.user?.default_payment_method || 'Не указан'}
            </p>
          </div>
        </div>
        <div className="bg-amber-50/80 rounded-2xl shadow-sm border border-amber-200/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-gray-900">Поддержка 24/7</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">+7 (800) 123-45-67</p>
          <a
            href="mailto:support@pitomec.ru"
            className="flex items-center justify-center gap-2 bg-secondary-400 hover:bg-secondary-500 text-white font-medium py-2.5 px-4 rounded-full shadow-sm transition-colors w-full"
          >
            <Mail className="w-4 h-4" />
            Написать
          </a>
        </div>
      </aside>

      {/* Основная область: шапка + контент (на мобильных — первым на странице) */}
      <div className="order-1 lg:order-none flex-1 min-w-0 flex flex-col gap-6 lg:gap-8 overflow-visible">
        <header className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 flex-shrink-0">
                {getInitials(user)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900">
                  {user.first_name ? `Привет, ${user.first_name}!` : 'Личный кабинет'}
                </h1>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 text-sm font-medium bg-secondary-400 hover:bg-secondary-500 text-white py-2.5 px-4 rounded-full shadow-sm transition-colors"
              >
                <Package className="w-5 h-5" aria-hidden />
                Заказы
                <ChevronRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link
                to="/pet-id"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 py-2.5 px-4 rounded-full border border-gray-200 hover:border-gray-300 bg-white transition-colors"
              >
                <PawPrint className="w-5 h-5" />
                Питомцы
              </Link>
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 px-4 rounded-full transition-colors"
              >
                <Pencil className="w-4 h-4" aria-hidden />
                Редактировать
              </Link>
              <button
                type="button"
                onClick={async () => { await logout(); navigate('/'); }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-800 bg-accent-400 hover:brightness-110 py-2.5 px-4 rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden />
                Выйти
              </button>
            </div>
          </div>
          {/* Способ оплаты — только мобильная версия (в блоке с приветствием) */}
          <div className="mt-4 pt-4 border-t border-gray-100 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-5 h-5 flex-shrink-0 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Способ оплаты</span>
              </div>
              <Link
                to="/settings"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
              >
                {profile?.user?.default_payment_method ? 'Изменить' : 'Настроить'}
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {profile?.user?.default_payment_method || 'Не указан'}
            </p>
          </div>
        </header>

        <RemindersWidget limit={3} />

        {/* Контент */}
        <div className="flex-1 min-w-0 min-h-[400px] w-full overflow-visible">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 gap-6 lg:gap-8 overflow-visible items-stretch">
            <ProfileVerification user={user} onUpdated={fetchProfile} />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5 relative min-h-0 flex flex-col" ref={detailsMenuRef}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Последние заказы</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDetailsMenuOpen(prev => !prev)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 py-1.5 px-3 rounded-lg hover:bg-primary-50"
                  >
                    Подробнее
                  </button>
                  {isDetailsMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('profile'); setIsDetailsMenuOpen(false) }}
                        className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'profile' ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Главная
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsDetailsMenuOpen(false); navigate('/orders') }}
                        className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'orders' ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Заказы
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('returns'); setIsDetailsMenuOpen(false) }}
                        className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'returns' ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Возвраты
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {ordersList.length === 0 ? (
                <div className="text-center py-6 flex-1 flex flex-col justify-center">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-gray-600 mb-4">Пока нет заказов</p>
                  <Link to="/shop" className="inline-flex items-center gap-2 bg-secondary-400 hover:bg-secondary-500 text-white font-medium py-2.5 px-4 rounded-full">
                    Перейти в магазин
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setOrdersPetFilterId(null)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${!ordersPetFilterId ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'}`}
                    >
                      Все
                    </button>
                    {petsList.slice(0, 4).map(pet => (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => setOrdersPetFilterId(pet.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${ordersPetFilterId === pet.id ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200'}`}
                      >
                        {pet.name}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3 flex-1 min-h-0 overflow-auto">
                    {ordersFilteredByPet.length === 0 && ordersPetFilterId ? (
                      <p className="text-sm text-gray-500 py-4 text-center">
                        Нет заказов для выбранного питомца
                      </p>
                    ) : (
                      ordersFilteredByPet.map(order => {
                        const status = statusLabels[order.status] || statusLabels.pending
                        return (
                          <div
                            key={order.id}
                            className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Заказ #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${status.class}`}>
                                {status.label}
                              </span>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatPrice(order.total_amount)}
                              </p>
                              <Link
                                to={`/orders/${order.id}`}
                                className="text-xs text-primary-600 hover:text-primary-700"
                              >
                                Подробнее →
                              </Link>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            <Card className="p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900">🎓 Курсы</h3>
                  <Link
                    to="/profile?tab=courses"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Все →
                  </Link>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                {coursesLoading ? (
                  <div className="animate-pulse flex-1">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded" />
                      ))}
                    </div>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8 flex-1 flex flex-col justify-center">
                    <span className="text-4xl block mb-3">📚</span>
                    <p className="text-gray-600 mb-4">Нет приобретённых курсов</p>
                    <Link to="/courses">
                      <Button variant="primary" size="sm" className="inline-flex items-center gap-1">
                        Смотреть каталог →
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 flex-1 min-h-0 overflow-auto">
                      {courses.slice(0, 3).map(item => (
                        <Link
                          key={item.course.id}
                          to={`/courses/${item.course.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg transition-colors bg-gray-50 hover:bg-gray-100"
                        >
                          <span className="text-2xl flex-shrink-0">
                            {item.course.pet_type === 'dog' ? '🐕' : item.course.pet_type === 'cat' ? '🐱' : '📚'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.course.title}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                              <span className={item.progress >= 100 ? 'text-green-600 font-medium' : ''}>
                                {item.progress}%
                              </span>
                              {item.pet && (
                                <>
                                  <span>•</span>
                                  <span>🐾 {item.pet.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
                      <Link to="/courses">
                        <Button variant="ghost" size="sm">
                          Каталог курсов
                        </Button>
                      </Link>
                      <Link to="/profile?tab=courses">
                        <Button variant="secondary" size="sm">
                          Все курсы
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
                </div>
              </Card>

          </div>
        )}

        {/* При открытой вкладке Заказы/Курсы/Возвраты — компактная шапка с «Подробнее» для переключения */}
        {activeTab !== 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 mb-4 relative" ref={detailsMenuRef}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Последние заказы</h3>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDetailsMenuOpen(prev => !prev)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 py-1.5 px-3 rounded-lg hover:bg-primary-50"
                >
                  Подробнее
                </button>
                {isDetailsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('profile'); setIsDetailsMenuOpen(false) }}
                      className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'profile' ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Главная
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsDetailsMenuOpen(false); navigate('/orders') }}
                      className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'orders' ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Заказы
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('returns'); setIsDetailsMenuOpen(false) }}
                      className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'returns' ? 'bg-violet-100 text-violet-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      Возвраты
                    </button>
                  </div>
                )}
              </div>
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
                                item.progress >= 50 ? 'text-primary-600' : 'text-secondary-600'
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
                                item.progress >= 50 ? 'bg-primary-500' : 'bg-secondary-500'
                              }
                            />
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            Приобретён: {formatDate(item.purchased_at)}
                          </p>

                          {/* Кнопка обучения */}
                          <Button
                            variant="orange"
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
                    received: { label: 'Получено', class: 'bg-primary-100 text-primary-700' },
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
    </div>
  )
}

export default Profile
