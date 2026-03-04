/**
 * Страница списка заказов
 *
 * Макет: левый сайдбар (профиль + обзор заказов), основная область с карточкой
 * «Обзор заказов» и карточками заказов в две колонки (инфо + итого).
 * Палитра: светлый фиолетовый и жёлтый, фоновый узор с лапками.
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PawPrint, Lock, ShoppingCart, Search, ChevronRight, LogOut } from 'lucide-react'
import { createPayment } from '../../api/payments'
import { getProfile } from '../../api/auth'
import { PageLoader } from '../../components/Loader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { useOrders } from '../../hooks/useOrders'
import OrderTimer from '../../components/OrderTimer'
import { formatPrice } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'

/**
 * Формат даты: «18 февраля 2026 г. в 22:44»
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const datePart = date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timePart = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${datePart} г. в ${timePart}`
}

/**
 * Короткая дата для заголовка: «18 февраля 2026»
 */
const formatOrderDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Статусы заказов
 */
const statusConfig = {
  pending: {
    label: 'Ожидает оплаты',
    class: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: '⏱'
  },
  expired: {
    label: 'Истёк срок оплаты',
    class: 'bg-red-100 text-red-800 border-red-200',
    icon: '✕'
  },
  processing: {
    label: 'В обработке',
    class: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: '↻'
  },
  partially_delivered: {
    label: 'Частично доставлен',
    class: 'bg-primary-100 text-primary-800 border-primary-200',
    icon: '✓'
  },
  shipped: {
    label: 'Отправлен',
    class: 'bg-primary-100 text-primary-800 border-primary-200',
    icon: '✓'
  },
  delivered: {
    label: 'Доставлен',
    class: 'bg-green-100 text-green-800 border-green-200',
    icon: '✓'
  },
  cancelled: {
    label: 'Отменён',
    class: 'bg-red-100 text-red-800 border-red-200',
    icon: '✕'
  }
}

/**
 * Фон с лапками (декоративный паттерн)
 */
function PawBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 8c-2 0-4 1.5-4 4 0 2 1 3 2 4l2 2 2-2c1-1 2-2 2-4 0-2.5-2-4-4-4zm-8 12c-2 0-4 1.5-4 4 0 2 1 3 2 4l2 2 2-2c1-1 2-2 2-4 0-2.5-2-4-4-4zm16 0c-2 0-4 1.5-4 4 0 2 1 3 2 4l2 2 2-2c1-1 2-2 2-4 0-2.5-2-4-4-4zm-4 8c-2 0-4 1.5-4 4 0 2 1 3 2 4l2 2 2-2c1-1 2-2 2-4 0-2.5-2-4-4-4zm8 0c-2 0-4 1.5-4 4 0 2 1 3 2 4l2 2 2-2c1-1 2-2 2-4 0-2.5-2-4-4-4z' fill='%23522f81'/%3E%3C/svg%3E")`
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' fill='%23eab308'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  )
}

/**
 * Левая колонка: карточка выбранного питомца / «Все заказы» + кнопки смены + Выйти
 */
function OrdersSidebar({ profile, selectedPetId, onSelectPet, onLogout }) {
  const user = profile?.user || {}
  const pets = profile?.pets || []
  const isAllOrders = selectedPetId === null
  const selectedPet = isAllOrders ? null : pets.find(p => p && p.id === selectedPetId) || pets[0]
  const displayName = isAllOrders ? 'Все заказы' : (selectedPet?.name || user?.first_name || 'Профиль')
  const avatarUrl = selectedPet?.photo || user?.avatar || null

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
      {/* Карточка: выбранный питомец или «Все заказы» */}
      <Card variant="default" padding="none" rounded="xl" className="overflow-hidden border border-primary-200/60">
        <div className="aspect-square w-full bg-amber-100 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <PawPrint className="w-20 h-20 text-amber-500/70" />
          )}
        </div>
        <div className="p-4">
          <p className="text-lg font-semibold text-primary-900 truncate">{displayName}</p>
          {/* Кнопки: Все заказы + по одной на каждого питомца */}
          <div className="mt-3 space-y-2">
            <Button
              variant={isAllOrders ? 'primary' : 'secondary'}
              size="sm"
              className="w-full justify-start"
              leftIcon={<PawPrint className="w-4 h-4" />}
              rightIcon={isAllOrders ? <ChevronRight className="w-4 h-4" /> : undefined}
              onClick={() => onSelectPet(null)}
            >
              Все заказы
            </Button>
            {pets.length > 0 && pets.map((pet) => (
              <Button
                key={pet.id}
                variant={selectedPetId === pet.id ? 'primary' : 'secondary'}
                size="sm"
                className="w-full justify-start"
                leftIcon={<PawPrint className="w-4 h-4" />}
                rightIcon={selectedPetId === pet.id ? <ChevronRight className="w-4 h-4" /> : undefined}
                onClick={() => onSelectPet(pet.id)}
              >
                {pet.name}
              </Button>
            ))}
            {pets.length === 0 && (
              <Button to="/profile" variant="secondary" size="sm" className="w-full" leftIcon={<PawPrint className="w-4 h-4" />} rightIcon={<ChevronRight className="w-4 h-4" />}>
                Мой профиль
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-gray-600 hover:text-gray-800"
        leftIcon={<LogOut className="w-4 h-4" />}
        onClick={onLogout}
      >
        Выйти
      </Button>
    </aside>
  )
}

/**
 * Карточка одного заказа по референсу: две колонки (инфо + Итого), кнопки
 */
/** Уникальные питомцы по заказу (из позиций с привязкой к питомцу) */
function getOrderPets(order) {
  const items = order.items || []
  const seen = new Set()
  const pets = []
  for (const item of items) {
    if (item?.pet?.id && !seen.has(item.pet.id)) {
      seen.add(item.pet.id)
      pets.push(item.pet)
    }
  }
  return pets
}

function OrderCard({ order, onOrderExpired, onRepeat, onTrack, collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const status = statusConfig[order.status] || statusConfig.pending
  const items = order.items || []
  const orderPets = getOrderPets(order)
  const coursesCount = items.filter(i => i.course_id).length
  const productsCount = items.filter(i => i.product_id).length
  const totalLabel = coursesCount && productsCount
    ? `Курсы (${coursesCount}) · Товары (${productsCount})`
    : coursesCount
      ? `Курсы (${coursesCount})`
      : `Товары (${productsCount})`

  const handleRepeat = (e) => {
    e.stopPropagation()
    onRepeat ? onRepeat(order) : navigate('/shop')
  }
  const handleTrack = (e) => {
    e.stopPropagation()
    onTrack ? onTrack(order) : navigate(`/orders/${order.id}`)
  }

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="warning"
        size="sm"
        leftIcon={<ShoppingCart className="w-4 h-4" />}
        onClick={handleRepeat}
      >
        Повторить заказ
      </Button>
      <Button
        variant="primary"
        size="sm"
        leftIcon={<Search className="w-4 h-4" />}
        onClick={handleTrack}
      >
        Отследить заказ
      </Button>
      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onToggleCollapse?.() }}>
        Скрыть
      </Button>
    </div>
  )

  if (collapsed) {
    return (
      <Card
        variant="filled"
        padding="md"
        rounded="xl"
        clickable
        onClick={onToggleCollapse}
        className="border border-primary-200/60"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Lock className="w-4 h-4 text-primary-600" />
            <span className="font-semibold text-primary-900">Заказ #{order.id.slice(0, 8).toUpperCase()}</span>
            {getOrderPets(order).length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                🐾 Для: {getOrderPets(order).map(p => p.name).join(', ')}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
              {status.icon} {status.label}
            </span>
          </div>
          <span className="font-bold text-primary-900">{formatPrice(order.total_amount)}</span>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="default" padding="none" rounded="xl" className="border border-primary-200/60 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Левая часть: дата, номер, инфо, курсы/товары, кнопки */}
        <div className="flex-1 p-6">
          <div className="flex items-center gap-2 text-primary-800 mb-4">
            <span className="font-medium">{formatOrderDate(order.created_at)}</span>
            <PawPrint className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Lock className="w-4 h-4 text-primary-600" />
                <span className="font-semibold text-primary-900">Заказ #{order.id.slice(0, 8).toUpperCase()}</span>
                {orderPets.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                    🐾 Для: {orderPets.map(p => p.name).join(', ')}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Оформлен {formatDate(order.created_at)}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${status.class}`}>
              {status.icon} {status.label}
            </span>
          </div>
          {order.status === 'pending' && order.expires_at && (
            <OrderTimer
              expiresAt={order.expires_at}
              onExpired={() => onOrderExpired?.(order.id)}
            />
          )}

          <div className="border-t border-primary-100 pt-4 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Информация</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><span className="text-gray-500">Номер заказа:</span> {order.id}</li>
              <li><span className="text-gray-500">Дата оформления:</span> {formatDate(order.created_at)}</li>
              <li><span className="text-gray-500">Статус:</span> <span className={status.class}>{status.label}</span></li>
            </ul>
          </div>

          <div className="flex items-center justify-between border-t border-primary-100 pt-4 mb-4">
            <span className="font-medium text-primary-900">{totalLabel}</span>
            <Link
              to={`/orders/${order.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              {formatPrice(order.total_amount)}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="md:hidden">{actionButtons}</div>
        </div>

        {/* Правая часть: Итого, К оплате, кнопки */}
        <div className="md:w-64 flex-shrink-0 bg-amber-50/80 border-t md:border-t-0 md:border-l border-amber-200/60 p-6 flex flex-col relative">
          <div className="absolute top-3 right-3 opacity-60">
            <PawPrint className="w-6 h-6 text-amber-600" />
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">К оплате</p>
            <p className="text-xl font-bold text-primary-900">{formatPrice(order.total_amount)}</p>
          </div>
          <div className="hidden md:flex flex-col gap-2 mt-auto">{actionButtons}</div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Страница заказов
 */
function Orders() {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const { orders, isLoading, error, refetch, handleOrderExpired } = useOrders()
  const [profile, setProfile] = useState(null)
  const [collapsedIds, setCollapsedIds] = useState(new Set())
  const [selectedPetId, setSelectedPetId] = useState(null) // null = все заказы, иначе id питомца

  /** Заказы с учётом выбранного питомца: только заказы, в которых есть позиции для этого питомца */
  const ordersFiltered =
    selectedPetId === null
      ? orders
      : orders.filter((order) =>
          (order.items || []).some(
            (item) => item?.pet && String(item.pet.id) === String(selectedPetId)
          )
        )

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const toggleCollapse = (orderId) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  if (isLoading) {
    return <PageLoader />
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen relative">
        <PawBackground />
        <div className="page-container py-8">
          <Card variant="default" padding="lg">
            <EmptyState
              icon="📦"
              title="Не удалось загрузить заказы"
              description={error}
              action={<Button onClick={refetch}>Попробовать снова</Button>}
            />
          </Card>
        </div>
      </div>
    )
  }

  const firstOrder = ordersFiltered.length ? ordersFiltered[0] : null

  return (
    <div className="min-h-screen relative">
      <PawBackground />
      <div className="page-container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <OrdersSidebar profile={profile} selectedPetId={selectedPetId} onSelectPet={setSelectedPetId} onLogout={handleLogout} />

          <main className="flex-1 min-w-0">
            {/* Карточка «Обзор заказов» */}
            <Card variant="default" padding="lg" rounded="xl" className="mb-6 border border-primary-200/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-primary-900">Обзор заказов</h1>
                  <p className="text-gray-600 mt-1">История всех ваших заказов</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    to="/profile?tab=returns"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Возвраты
                  </Button>
                  {firstOrder && (
                    <Button
                      variant="warning"
                      size="sm"
                      to={`/orders/${firstOrder.id}`}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      Подробнее
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {ordersFiltered.length === 0 ? (
              <Card variant="filled" padding="lg">
                <EmptyState
                  icon="📦"
                  title="У вас пока нет заказов"
                  description="Сделайте первый заказ в нашем магазине или приобретите обучающий курс"
                  size="lg"
                  action={
                    <Button to="/shop" variant="warning">
                      Перейти в магазин
                    </Button>
                  }
                  secondaryAction={
                    <Button to="/courses" variant="secondary">
                      Смотреть курсы
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {ordersFiltered.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOrderExpired={handleOrderExpired}
                    onRepeat={() => navigate('/shop')}
                    onTrack={() => navigate(`/orders/${order.id}`)}
                    collapsed={collapsedIds.has(order.id)}
                    onToggleCollapse={() => toggleCollapse(order.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Orders
