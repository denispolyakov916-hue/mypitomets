/**
 * Нижняя панель на мобильных: плавающая «таблетка» с иконкой сверху и подписью,
 * в духе макета (отступы от краёв экрана, мягкая тень).
 * Для гостей — CTA над таблеткой; чат с Пуфом — в PuffSupportWidget (Layout).
 */

import { useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  PawPrint,
  ShoppingBag,
  UtensilsCrossed,
  Stethoscope,
  ShoppingCart,
  User,
  LogIn,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const pillShadow =
  '0 14px 36px rgba(82, 47, 129, 0.32), 0 6px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'

function MobileBottomNav() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const itemsCount = useCartStore((s) => s.itemsCount)
  const refreshCount = useCartStore((s) => s.refreshCount)

  const loginTo = isAuthenticated
    ? '/profile'
    : `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`

  const showGuestStrip =
    !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register'

  useEffect(() => {
    if (isAuthenticated) refreshCount()
  }, [isAuthenticated, refreshCount])

  const itemBase =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors'

  const itemColors = (active) =>
    active ? 'text-[#F0EB93]' : 'text-white/90 hover:text-white'

  return (
    <div className="mobile-bottom-nav md:hidden fixed inset-x-0 z-[50070] flex w-full min-w-0 flex-col items-center pointer-events-none bg-transparent px-[4vw] bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      {showGuestStrip && (
        <div className="pointer-events-auto mb-2 flex w-full max-w-[min(92vw,28rem)] justify-center">
          <Link
            to="/register"
            className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#fbba2d] via-[#fccf4d] to-[#fbba2d] px-5 py-2 text-center text-xs font-semibold leading-tight text-[#522f81] shadow-[0_4px_16px_rgba(251,186,45,0.4)] transition-transform active:scale-[0.98]"
          >
            Начать бесплатно
          </Link>
        </div>
      )}

      <nav
        className="pointer-events-auto flex w-full max-w-[min(92vw,28rem)] min-h-[3.75rem] min-w-0 items-stretch gap-0 rounded-full border border-white/15 bg-primary-700 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-none"
        style={{ boxShadow: pillShadow }}
        aria-label="Основная навигация"
      >
        <NavLink
          to="/"
          end
          className={`${itemBase} max-w-[3rem] shrink-0 flex-none basis-[13%] sm:basis-[12%]`}
          aria-label="На главную"
        >
          <img
            src="/landing/logo-pitometsplus.png"
            alt=""
            className="mx-auto h-6 w-6 object-contain sm:h-7 sm:w-7"
            width={28}
            height={28}
          />
          <span className="sr-only">Главная</span>
        </NavLink>

        <NavLink
          to="/pet-id"
          className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
        >
          <PawPrint className="mx-auto h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          <span className="max-w-[4rem] truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            Питомцы
          </span>
        </NavLink>

        <NavLink
          to="/shop"
          className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
        >
          <ShoppingBag className="mx-auto h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          <span className="max-w-[4rem] truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            Магазин
          </span>
        </NavLink>

        <NavLink
          to="/food-recommendation"
          className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
        >
          <UtensilsCrossed className="mx-auto h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          <span className="max-w-[4rem] truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            Сервисы
          </span>
        </NavLink>

        <NavLink
          to="/health-diary"
          className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
        >
          <Stethoscope className="mx-auto h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          <span className="max-w-[4rem] truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            Здоровье
          </span>
        </NavLink>

        <NavLink
          to="/cart"
          className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
        >
          <span className="relative mx-auto flex h-5 w-5 shrink-0 items-center justify-center">
            <ShoppingCart className="h-5 w-5 opacity-95" strokeWidth={2} aria-hidden />
            {itemsCount > 0 ? (
              <span className="absolute -right-1.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white shadow-sm sm:text-[9px]">
                {itemsCount > 99 ? '99+' : itemsCount}
              </span>
            ) : null}
          </span>
          <span className="max-w-[3.25rem] truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            Корзина
          </span>
        </NavLink>

        <NavLink
          to={loginTo}
          className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
        >
          {isAuthenticated ? (
            <User className="mx-auto h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          ) : (
            <LogIn className="mx-auto h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          )}
          <span className="max-w-[3.5rem] truncate text-center text-[9px] font-semibold leading-tight sm:text-[10px]">
            {isAuthenticated ? 'Профиль' : 'Вход'}
          </span>
        </NavLink>
      </nav>
    </div>
  )
}

export default MobileBottomNav
