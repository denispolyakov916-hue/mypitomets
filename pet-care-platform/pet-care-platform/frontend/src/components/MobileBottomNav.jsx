/**
 * Нижняя панель на мобильных: одна «таблетка» — разделы как в референсе шапки,
 * иконки навигации золотистые (accent), утилиты белым контуром, подписи под иконками.
 * Для гостей — CTA «Начать бесплатно» над таблеткой.
 */

import { useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  PawPrint,
  ShoppingBag,
  GraduationCap,
  UtensilsCrossed,
  Stethoscope,
  ShoppingCart,
  User,
  Heart,
  Coins,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useFavoritesStore } from '../store/favoritesStore'

const pillShadow =
  '0 10px 28px rgba(0, 0, 0, 0.14), 0 3px 10px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 -2px 6px rgba(0, 0, 0, 0.12)'

const ctaVolumeShadow =
  'inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1), 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)'

/** Подписи из двух слов — на двух строках, чтобы не наезжали в узкой панели */
const TWO_WORD_NAV_LABELS = new Set(['Мои питомцы', 'Подбор корма', 'Дневник здоровья'])

function NavItemLabel({ text }) {
  const base = 'text-center text-[8px] font-semibold leading-[1.1] sm:text-[9px]'
  if (TWO_WORD_NAV_LABELS.has(text)) {
    const [w1, w2] = text.split(/\s+/)
    return (
      <span className={`${base} flex max-w-[3.4rem] flex-col items-center gap-0`}>
        <span className="block w-full">{w1}</span>
        <span className="block w-full">{w2}</span>
      </span>
    )
  }
  return <span className={`${base} max-w-[4.25rem] truncate`}>{text}</span>
}

function CounterDot({ value }) {
  if (!value || value <= 0) return null
  const text = value > 99 ? '99+' : value
  return (
    <span className="absolute -right-1 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white shadow-sm">
      {text}
    </span>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const itemsCount = useCartStore((s) => s.itemsCount)
  const refreshCount = useCartStore((s) => s.refreshCount)
  const favProductsLen = useFavoritesStore((s) => s.products.length)
  const favCoursesLen = useFavoritesStore((s) => s.courses.length)
  const favoritesCount = favProductsLen + favCoursesLen

  const loginTo = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`

  const showGuestStrip =
    !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register'

  useEffect(() => {
    if (isAuthenticated) refreshCount()
  }, [isAuthenticated, refreshCount])

  const itemBase =
    'flex min-w-0 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 px-0.5 transition-colors'

  const itemColors = (active) =>
    active ? 'text-[#F0EB93]' : 'text-white/90 hover:text-white'

  const sectionIcon = (active) =>
    `mx-auto h-5 w-5 shrink-0 ${active ? 'text-[#F0EB93]' : 'text-accent-400'}`

  const utilIcon = (active) =>
    `h-5 w-5 shrink-0 ${active ? 'text-[#F0EB93]' : 'text-white'}`

  const scrollRowClass =
    'flex min-h-[4.25rem] min-w-0 flex-nowrap items-stretch gap-0 overflow-x-auto py-1 pl-1.5 pr-1 scrollbar-thin [-webkit-overflow-scrolling:touch]'
  const scrollRowStyle = { scrollbarWidth: 'thin' }

  return (
    <div className="mobile-bottom-nav md:hidden fixed inset-x-0 z-[50070] flex w-full min-w-0 flex-col items-center pointer-events-none bg-transparent px-[3vw] bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      {showGuestStrip && (
        <div className="pointer-events-auto mb-2 flex w-full max-w-[min(92vw,28rem)] justify-center">
          <Link
            to="/register"
            className="inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-full border border-black/10 bg-[#fbba2d] px-5 py-2.5 text-center text-xs font-semibold leading-tight text-[#522f81] transition-transform duration-200 active:scale-[0.98]"
            style={{ boxShadow: ctaVolumeShadow }}
          >
            Начать бесплатно
          </Link>
        </div>
      )}

      <nav
        className="pointer-events-auto relative w-full max-w-[min(98vw,42rem)] min-w-0 rounded-full border border-black/10 bg-primary-700 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-none"
        style={{ boxShadow: pillShadow }}
        aria-label="Основная навигация"
      >
        <div className={scrollRowClass} style={scrollRowStyle}>
          <NavLink to="/shop" className={({ isActive }) => `${itemBase} w-[3.35rem] sm:w-[3.6rem] ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <ShoppingBag className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Магазин" />
              </>
            )}
          </NavLink>

          <NavLink to="/courses" className={({ isActive }) => `${itemBase} w-[3.35rem] sm:w-[3.6rem] ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <GraduationCap className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Курсы" />
              </>
            )}
          </NavLink>

          <NavLink to="/pet-id" className={({ isActive }) => `${itemBase} w-[3.35rem] sm:w-[3.6rem] ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <PawPrint className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Мои питомцы" />
              </>
            )}
          </NavLink>

          <NavLink
            to="/food-recommendation"
            className={({ isActive }) => `${itemBase} w-[3.35rem] sm:w-[3.6rem] ${itemColors(isActive)}`}
          >
            {({ isActive }) => (
              <>
                <UtensilsCrossed className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Подбор корма" />
              </>
            )}
          </NavLink>

          <NavLink
            to="/health-diary"
            className={({ isActive }) => `${itemBase} w-[3.35rem] sm:w-[3.6rem] ${itemColors(isActive)}`}
          >
            {({ isActive }) => (
              <>
                <Stethoscope className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Дневник здоровья" />
              </>
            )}
          </NavLink>

          {isAuthenticated ? (
            <NavLink
              to="/profile"
              className={({ isActive }) => `${itemBase} w-[2.85rem] ${itemColors(isActive)}`}
            >
              {({ isActive }) => (
                <>
                  <User className={`mx-auto ${utilIcon(isActive)}`} strokeWidth={1.75} aria-hidden />
                  <NavItemLabel text="Профиль" />
                </>
              )}
            </NavLink>
          ) : (
            <NavLink
              to={loginTo}
              className={({ isActive }) => `${itemBase} w-[2.85rem] ${itemColors(isActive)}`}
            >
              {({ isActive }) => (
                <>
                  <User className={`mx-auto ${utilIcon(isActive)}`} strokeWidth={1.75} aria-hidden />
                  <NavItemLabel text="Вход" />
                </>
              )}
            </NavLink>
          )}

          <NavLink
            to="/favorites"
            className={({ isActive }) => `${itemBase} w-[2.85rem] ${itemColors(isActive)}`}
          >
            {({ isActive }) => (
              <>
                <span className="relative mx-auto flex h-5 w-5 items-center justify-center">
                  <Heart className={utilIcon(isActive)} strokeWidth={1.75} aria-hidden />
                  <CounterDot value={favoritesCount} />
                </span>
                <NavItemLabel text="Избранное" />
              </>
            )}
          </NavLink>

          <NavLink to="/cart" className={({ isActive }) => `${itemBase} w-[2.85rem] ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <span className="relative mx-auto flex h-5 w-5 items-center justify-center">
                  <ShoppingCart className={utilIcon(isActive)} strokeWidth={1.75} aria-hidden />
                  <CounterDot value={itemsCount} />
                </span>
                <NavItemLabel text="Корзина" />
              </>
            )}
          </NavLink>

          {isAuthenticated ? (
            <div
              className={`${itemBase} w-[3.75rem] cursor-default text-white/90`}
              title="Ням-коины (заглушка)"
            >
              <Coins className="mx-auto h-5 w-5 shrink-0 text-accent-400" strokeWidth={2} aria-hidden />
              <span className="max-w-[5rem] text-center text-[7px] font-semibold leading-tight text-white/95 sm:text-[8px]">
                Ням-коины: 0
              </span>
            </div>
          ) : null}
        </div>
      </nav>
    </div>
  )
}

export default MobileBottomNav
