/**
 * Нижняя панель на мобильных: «таблетка» с разделами сайта, подписи под иконками.
 * Избранное / вишлист / корзина — в MobileRightActionsRail; ням-коины — в MobileHomeStrip.
 */

import { useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  PawPrint,
  ShoppingBag,
  GraduationCap,
  UtensilsCrossed,
  Stethoscope,
  User,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const pillShadow =
  '0 10px 28px rgba(0, 0, 0, 0.14), 0 3px 10px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 -2px 6px rgba(0, 0, 0, 0.12)'

const ctaVolumeShadow =
  'inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1), 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)'

/** Подписи из двух слов — на двух строках, чтобы не наезжали в узкой панели */
const TWO_WORD_NAV_LABELS = new Set(['Мои питомцы', 'Подбор питания', 'Дневник здоровья'])

function NavItemLabel({ text }) {
  const base =
    'w-full max-w-full px-0.5 text-center text-[9px] font-semibold leading-[1.12] sm:text-[10px]'
  if (TWO_WORD_NAV_LABELS.has(text)) {
    const [w1, w2] = text.split(/\s+/)
    return (
      <span className={`${base} flex flex-col items-center gap-0`}>
        <span className="block w-full break-words">{w1}</span>
        <span className="block w-full break-words">{w2}</span>
      </span>
    )
  }
  return <span className={`${base} truncate`}>{text}</span>
}

function MobileBottomNav() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refreshCount = useCartStore((s) => s.refreshCount)

  const loginTo = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`

  const showGuestStrip =
    !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register'

  useEffect(() => {
    if (isAuthenticated) refreshCount()
  }, [isAuthenticated, refreshCount])

  const itemBase =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-0.5 transition-colors'

  const itemColors = (active) =>
    active ? 'text-[#F0EB93]' : 'text-white/90 hover:text-white'

  const sectionIcon = (active) =>
    `mx-auto h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${active ? 'text-[#F0EB93]' : 'text-accent-400'}`

  const utilIcon = (active) =>
    `h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${active ? 'text-[#F0EB93]' : 'text-white'}`

  const navRowClass =
    'flex min-h-[4rem] w-full min-w-0 items-stretch gap-0 px-1.5 py-1 sm:min-h-[4.25rem] sm:px-2 sm:py-1'

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
        className="pointer-events-auto relative w-full max-w-[min(98vw,42rem)] min-w-0 rounded-full border border-black/10 bg-primary-700 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] shadow-none"
        style={{ boxShadow: pillShadow }}
        aria-label="Основная навигация"
      >
        <div className={navRowClass}>
          <NavLink to="/shop" className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <ShoppingBag className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Магазин" />
              </>
            )}
          </NavLink>

          <NavLink to="/courses" className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <GraduationCap className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Курсы" />
              </>
            )}
          </NavLink>

          <NavLink to="/pet-id" className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}>
            {({ isActive }) => (
              <>
                <PawPrint className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Мои питомцы" />
              </>
            )}
          </NavLink>

          <NavLink
            to="/food-recommendation"
            className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
          >
            {({ isActive }) => (
              <>
                <UtensilsCrossed className={sectionIcon(isActive)} strokeWidth={2} aria-hidden />
                <NavItemLabel text="Подбор питания" />
              </>
            )}
          </NavLink>

          <NavLink
            to="/health-diary"
            className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
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
              className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
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
              className={({ isActive }) => `${itemBase} ${itemColors(isActive)}`}
            >
              {({ isActive }) => (
                <>
                  <User className={`mx-auto ${utilIcon(isActive)}`} strokeWidth={1.75} aria-hidden />
                  <NavItemLabel text="Вход" />
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  )
}

export default MobileBottomNav
