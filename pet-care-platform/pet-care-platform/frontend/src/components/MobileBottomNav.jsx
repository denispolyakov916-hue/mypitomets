/**
 * Нижняя панель на мобильных: те же подписи и состав меню, что на десктопе (Navbar),
 * с выезжающей снизу панелью. Для гостей — CTA по центру над таблеткой; чат с Пуфом — в PuffSupportWidget (Layout).
 */

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, ShoppingCart, LogIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { usePets } from '../hooks/usePets'
import { buildNavPetsDropdown, staticDropdownNavItems } from '../nav/dropdownNavConfig'

const pillShadow =
  '0 8px 24px rgba(82, 47, 129, 0.35), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)'

function MobileBottomNav() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { pets } = usePets()
  const [openSheetId, setOpenSheetId] = useState(null)

  const navPetsDropdown = useMemo(() => buildNavPetsDropdown(pets), [pets])
  const dropdownNavItems = useMemo(
    () => [navPetsDropdown, ...staticDropdownNavItems],
    [navPetsDropdown]
  )

  const loginTo = isAuthenticated
    ? '/profile'
    : `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`

  const showGuestStrip =
    !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register'

  const isLinkActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const isNavItemActive = (nav) => {
    if (nav.items) return nav.items.some((item) => isLinkActive(item.to))
    return false
  }

  useEffect(() => {
    if (!openSheetId) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenSheetId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openSheetId])

  const openNav = dropdownNavItems.find((n) => n.id === openSheetId)

  /** Низ «хрома»: таблетка 4.5rem + узкая полоска CTA гостя ~2.75rem + safe-area */
  const bottomChromeOffset = showGuestStrip
    ? 'calc(4.5rem + 2.75rem + env(safe-area-inset-bottom, 0px))'
    : 'calc(4.5rem + env(safe-area-inset-bottom, 0px))'

  return (
    <>
      <div className="mobile-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-[50070] flex flex-col pointer-events-none">
        {showGuestStrip && (
          <div className="pointer-events-auto flex justify-center px-2 pb-1.5">
            <Link
              to="/register"
              className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#fbba2d] via-[#fccf4d] to-[#fbba2d] px-4 py-2 text-center text-xs font-semibold leading-tight text-[#522f81] shadow-[0_4px_16px_rgba(251,186,45,0.4)] transition-transform active:scale-[0.98]"
            >
              Начать бесплатно
            </Link>
          </div>
        )}

        <nav
          className="pointer-events-auto mx-auto flex w-full max-w-[min(100vw-1rem,560px)] min-w-0 items-stretch gap-0 rounded-full border border-white/10 bg-primary-700 px-1 py-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
          style={{ boxShadow: pillShadow }}
          aria-label="Основная навигация"
        >
          <NavLink
            to="/"
            end
            className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 pl-1 pr-0.5"
            aria-label="На главную"
          >
            <img
              src="/landing/logo-pitometsplus.png"
              alt=""
              className="mx-auto h-6 w-6 object-contain sm:h-7 sm:w-7"
              width={28}
              height={28}
            />
          </NavLink>

          <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dropdownNavItems.map((nav) => {
              const active = isNavItemActive(nav)
              const isOpen = openSheetId === nav.id
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setOpenSheetId((id) => (id === nav.id ? null : nav.id))}
                  className={`flex shrink-0 flex-col items-center justify-center gap-0 px-1.5 py-1 text-[10px] font-semibold leading-tight transition-colors sm:px-2 sm:text-[11px] ${
                    active || isOpen ? 'text-accent-400' : 'text-white/85'
                  }`}
                  aria-expanded={isOpen}
                  aria-controls={`mobile-sheet-${nav.id}`}
                >
                  <span className="flex max-w-[4.25rem] flex-col items-center gap-0.5 sm:max-w-[5rem]">
                    <span className="line-clamp-2 text-center">{nav.label}</span>
                    <ChevronDown
                      className={`h-3 w-3 shrink-0 opacity-80 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium sm:text-[11px] ${
                isActive ? 'text-accent-400 bg-white/10' : 'text-white/70'
              }`
            }
          >
            <ShoppingCart className="mx-auto h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
            <span className="max-w-[3rem] truncate text-center leading-[1.1]">Корзина</span>
          </NavLink>

          <NavLink
            to={loginTo}
            className={({ isActive }) =>
              `flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium sm:text-[11px] ${
                isActive && !isAuthenticated ? 'text-accent-400 bg-white/10' : 'text-white/70'
              }`
            }
          >
            <LogIn className="mx-auto h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
            <span className="max-w-[3.5rem] truncate text-center leading-[1.1]">
              {isAuthenticated ? 'Профиль' : 'Вход'}
            </span>
          </NavLink>
        </nav>
      </div>

      {/* Та же вложенность пунктов, что в дропдауне десктопа — выезжающая панель */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {openNav && (
              <motion.div
                key={openNav.id}
                className="pointer-events-auto fixed inset-x-0 top-0 z-[50080] md:hidden"
                style={{ bottom: bottomChromeOffset }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/45"
                  aria-label="Закрыть меню"
                  onClick={() => setOpenSheetId(null)}
                />
                <motion.div
                  id={`mobile-sheet-${openNav.id}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`mobile-sheet-title-${openNav.id}`}
                  className="absolute left-0 right-0 max-h-[min(56vh,420px)] overflow-y-auto rounded-t-2xl border border-white/15 bg-primary-700 px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
                  style={{
                    bottom: 0,
                    boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
                  }}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    id={`mobile-sheet-title-${openNav.id}`}
                    className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/55"
                  >
                    {openNav.sectionTitle}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-2">
                    {openNav.items.map((item) => {
                      const Icon = item.icon
                      const isPlaceholder = item.placeholder === true
                      if (isPlaceholder) {
                        return (
                          <div
                            key={item.label}
                            className="flex items-center gap-3 px-4 py-3 text-white/55"
                          >
                            <Icon className="h-5 w-5 shrink-0 text-accent-400/70" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium">{item.label}</span>
                              <span className="block text-xs text-white/45">{item.description}</span>
                            </span>
                            <span className="text-xs">Скоро</span>
                          </div>
                        )
                      }
                      return (
                        <Link
                          key={item.to + item.label}
                          to={item.to}
                          onClick={() => setOpenSheetId(null)}
                          className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                            isLinkActive(item.to)
                              ? 'bg-white/15 text-white'
                              : 'text-white/95 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-accent-400">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{item.label}</span>
                            <span className="block text-xs text-white/60">{item.description}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                        </Link>
                      )
                    })}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

export default MobileBottomNav
