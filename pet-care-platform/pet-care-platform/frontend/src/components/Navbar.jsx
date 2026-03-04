/**
 * Навигационная панель в стиле референса: форма «таблетки»,
 * собирательные кнопки с выпадающими меню (Питомцы, Магазин, Сервисы, Здоровье).
 * Цвета сайта сохранены (primary, accent).
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import HeaderCounters from './HeaderCounters'
import {
  ChevronDown,
  Menu as MenuIcon,
  X,
  ShoppingBag,
  GraduationCap,
  Package,
  UtensilsCrossed,
  List,
  Stethoscope,
  FileHeart,
  Activity,
  ChevronRight,
  Coins,
} from 'lucide-react'

const XIcon = () => <X className="w-6 h-6" aria-hidden />

const ChevronDownIcon = ({ className = '' }) => (
  <ChevronDown className={`w-3.5 h-3.5 ${className}`} aria-hidden />
)

// Одна кнопка без дропдауна
const navPets = {
  id: 'pets',
  label: 'Питомцы',
  to: '/pet-id',
}

// Собирательные кнопки с дропдаунами. placeholder: true — заглушка «Скоро», иначе рабочий Link
const navShop = {
  id: 'shop',
  label: 'Магазин',
  sectionTitle: 'ПОКУПКИ',
  items: [
    { label: 'Магазин питания и аксессуаров', to: '/shop', description: 'товары для питомцев', icon: ShoppingBag },
    { label: 'Магазин курсов коррекции поведения', to: '/courses', description: 'курсы и обучение', icon: GraduationCap },
    { label: 'Заказы', to: '/orders', description: 'история заказов', icon: Package },
  ],
}

const navNutrition = {
  id: 'nutrition',
  label: 'Сервисы',
  sectionTitle: 'СЕРВИСЫ',
  items: [
    { label: 'Подбор корма', to: '/food-recommendation', description: 'рекомендации по корму', icon: UtensilsCrossed },
    { label: 'Подбор курсов', to: '/coming-soon?name=Подбор+курсов', description: 'курсы и обучение', icon: GraduationCap },
    { label: 'Список продуктов', to: '/coming-soon?name=Список+продуктов', description: 'каталог товаров', icon: List },
  ],
}

const navHealth = {
  id: 'health',
  label: 'Здоровье',
  sectionTitle: 'КОНТРОЛЬ',
  items: [
    { label: 'Дневник здоровья', to: '/health-diary', description: 'симптомы, самочувствие', icon: Stethoscope },
    { label: 'Медкарта', to: '/coming-soon?name=Медкарта', description: 'паспорта и здоровье питомцев', icon: FileHeart },
    { label: 'Активность', to: '/coming-soon?name=Активность', description: 'уровень активности', icon: Activity },
  ],
}

const dropdownNavItems = [navShop, navNutrition, navHealth]

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [dropdownPosition, setDropdownPosition] = useState(null)
  const dropdownRef = useRef(null)
  const dropdownPanelRef = useRef(null)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  const isLinkActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const isNavItemActive = (nav) => {
    if (nav.to) return isLinkActive(nav.to)
    if (nav.items) return nav.items.some((item) => isLinkActive(item.to))
    return false
  }

  const profileInitial = (() => {
    const name = user?.first_name || user?.email || ''
    return (name.charAt(0) || 'П').toUpperCase()
  })()

  const pillShadow = '0 8px 24px rgba(82, 47, 129, 0.35), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
  const profilePillShadow = '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)'

  // Позиция дропдауна под кнопкой (измеряем после монтирования ref)
  useEffect(() => {
    if (!openDropdownId) {
      setDropdownPosition(null)
      return
    }
    const measure = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect()
        setDropdownPosition({ top: rect.bottom + 4, left: rect.left })
      }
    }
    const t = setTimeout(measure, 0)
    const raf = requestAnimationFrame(measure)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [openDropdownId])

  useEffect(() => {
    if (!openDropdownId) return
    const handleClickOutside = (e) => {
      const inTrigger = dropdownRef.current && dropdownRef.current.contains(e.target)
      const inPanel = dropdownPanelRef.current && dropdownPanelRef.current.contains(e.target)
      if (!inTrigger && !inPanel) setOpenDropdownId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdownId])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] px-3 sm:px-4 md:px-5"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="rounded-full bg-primary-700 flex flex-col overflow-visible pb-0"
          style={{ boxShadow: pillShadow }}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-between gap-2 min-h-[56px] sm:min-h-[64px] px-3 sm:px-4 md:px-5 py-2.5">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="shrink-0 min-w-0">
            <Link to="/" className="flex items-center min-w-0" aria-label="ПИТОМЕЦПЛЮС — на главную">
              <img
                src="/landing/logo-pitometsplus.png"
                alt="ПИТОМЕЦПЛЮС"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain max-h-[40px]"
              />
            </Link>
          </motion.div>

          <nav className="hidden lg:flex items-center flex-1 min-w-0 overflow-visible justify-evenly gap-1">
            {/* Питомцы — одна ссылка */}
            <motion.div
              className="flex justify-center flex-1 min-w-0"
              whileHover={{ scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Link
                to={navPets.to}
                className="flex items-center gap-1 font-medium text-sm py-2 px-2.5 rounded-full whitespace-nowrap w-fit text-white hover:opacity-95"
                aria-current={isLinkActive(navPets.to) ? 'page' : undefined}
              >
                <motion.span
                  className="rounded-full py-2 px-2.5 -m-2 inline-flex items-center"
                  animate={{
                    backgroundColor: isLinkActive(navPets.to) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0)',
                  }}
                  transition={{ duration: 0.25 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  {navPets.label}
                  <ChevronDownIcon className="text-white/70 opacity-80 shrink-0 ml-0.5" />
                </motion.span>
              </Link>
            </motion.div>

            {/* Собирательные кнопки с дропдаунами */}
            {dropdownNavItems.map((nav) => {
              const isOpen = openDropdownId === nav.id
              const active = isNavItemActive(nav)
              const isHighlight = active || isOpen
              return (
                <div
                  key={nav.id}
                  ref={isOpen ? dropdownRef : undefined}
                  className="relative flex items-center justify-center flex-1 min-w-0"
                >
                  <motion.div
                    className="flex justify-center w-full"
                    whileHover={{ scale: 1.04 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenDropdownId((prev) => (prev === nav.id ? null : nav.id))}
                      className="flex items-center gap-1 font-medium text-sm py-2 px-2.5 rounded-full whitespace-nowrap w-fit text-white outline-none border-none cursor-pointer"
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      aria-controls={isOpen ? `nav-dropdown-${nav.id}` : undefined}
                    >
                      <motion.span
                        className="rounded-full py-2 px-2.5 -m-2 flex items-center gap-1"
                        animate={{
                          backgroundColor: isHighlight ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0)',
                        }}
                        transition={{ duration: 0.25 }}
                        whileHover={{ backgroundColor: isHighlight ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)' }}
                      >
                        {nav.label}
                        <motion.span
                          className="inline-flex shrink-0"
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDownIcon className="text-white/70 opacity-80" />
                        </motion.span>
                      </motion.span>
                    </button>
                  </motion.div>
                </div>
              )
            })}
          </nav>

          {/* Дропдаун через портал — не обрезается родителями */}
          {openDropdownId && dropdownPosition && (() => {
            const nav = dropdownNavItems.find((n) => n.id === openDropdownId)
            if (!nav) return null
            return createPortal(
              <div
                ref={dropdownPanelRef}
                id={`nav-dropdown-${nav.id}`}
                className="min-w-[280px] z-[9999]"
                role="menu"
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                }}
              >
                <motion.div
                  className="rounded-2xl bg-primary-700 border border-white/10 py-3 shadow-xl"
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="px-4 pb-2 text-[10px] uppercase tracking-wider text-white/60">
                    {nav.sectionTitle}
                  </div>
                  {nav.items.map((item, idx) => {
                    const Icon = item.icon
                    const isPlaceholder = item.placeholder === true
                    if (isPlaceholder) {
                      return (
                        <motion.div
                          key={item.label}
                          className="flex items-center gap-3 px-4 py-2.5 text-white/60 cursor-default"
                          role="menuitem"
                          aria-disabled="true"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * idx, duration: 0.18 }}
                        >
                          <span className="flex-shrink-0 text-accent-400/70">
                            <Icon className="w-5 h-5" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-sm">{item.label}</span>
                            <span className="block text-xs text-white/50">{item.description}</span>
                          </span>
                          <span className="text-xs text-white/50">Скоро</span>
                        </motion.div>
                      )
                    }
                    return (
                      <motion.div
                        key={item.to + item.label}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * idx, duration: 0.18 }}
                      >
                        <Link
                          to={item.to}
                          onClick={() => setOpenDropdownId(null)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white/95 hover:bg-white/10 transition-colors"
                          role="menuitem"
                        >
                        <span className="flex-shrink-0 text-accent-400">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium text-sm">{item.label}</span>
                          <span className="block text-xs text-white/60">{item.description}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" aria-hidden />
                        </Link>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>,
              document.body
            )
          })()}

          <motion.div
            className="flex items-center gap-2 md:gap-3 shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-1.5">
                <HeaderCounters variant="dark" compact />
              </div>
            )}

            {isAuthenticated ? (
              <Link
                to="/profile"
                className="hidden md:inline-flex items-center gap-2 rounded-full bg-primary-800 py-1.5 pl-2.5 pr-3 text-white font-medium text-sm hover:bg-primary-800/90 transition-colors shrink-0"
                style={{ boxShadow: profilePillShadow }}
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-400 text-primary-800 font-semibold text-xs">
                  {profileInitial}
                </span>
                <span className="whitespace-nowrap">Профиль</span>
              </Link>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="font-medium text-sm text-white/95 hover:text-white transition-colors py-1.5 px-2 rounded-full hover:bg-white/5"
                  aria-current={location.pathname === '/login' ? 'page' : undefined}
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="font-semibold text-primary-800 bg-accent-400 hover:brightness-110 py-1.5 px-4 rounded-full text-sm transition-all shrink-0"
                  aria-current={location.pathname === '/register' ? 'page' : undefined}
                >
                  Регистрация
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <span
                className="hidden md:inline-flex items-center gap-1.5 text-white/95 font-medium text-sm py-1.5 px-3 rounded-full bg-white/5"
                title="Ням-коины (заглушка)"
              >
                <Coins className="w-4 h-4 text-accent-400" aria-hidden />
                <span className="whitespace-nowrap">Ням-коины: 0</span>
              </span>
            )}

            <div className="flex md:hidden items-center gap-1.5">
              {isAuthenticated && <HeaderCounters variant="dark" compact />}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white rounded-full hover:bg-white/10 min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <XIcon /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </div>
          </motion.div>
          </div>
          {/* Градиентная линия под пунктами навигации */}
          <div
            className="h-0.5 rounded-b-full w-full flex-shrink-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(253,224,71,0.4) 20%, rgba(253,224,71,0.8) 50%, rgba(253,224,71,0.4) 80%, transparent 100%)',
            }}
            aria-hidden
          />
        </motion.div>
      </div>

      {/* Мобильное меню с собирательными блоками */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            className="md:hidden mt-2 mx-3 sm:mx-4 rounded-2xl bg-primary-700 py-4 px-4 border border-white/10"
            style={{ boxShadow: pillShadow }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
          <nav className="flex flex-col gap-0.5">
            <Link
              to={navPets.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`py-3 px-4 rounded-xl font-medium transition-colors ${isLinkActive(navPets.to) ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10'}`}
              aria-current={isLinkActive(navPets.to) ? 'page' : undefined}
            >
              {navPets.label}
            </Link>
            {dropdownNavItems.map((nav) => (
              <div key={nav.id} className="py-1">
                <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-white/60">
                  {nav.sectionTitle}
                </div>
                {nav.items.map((item) => {
                  const Icon = item.icon
                  const isPlaceholder = item.placeholder === true
                  if (isPlaceholder) {
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 py-3 px-4 rounded-xl text-white/60"
                      >
                        <span className="flex-shrink-0 text-accent-400/70">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-medium">{item.label}</span>
                          <span className="block text-sm text-white/50">{item.description}</span>
                        </span>
                        <span className="text-xs text-white/50">Скоро</span>
                      </div>
                    )
                  }
                  return (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${isLinkActive(item.to) ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10'}`}
                    >
                      <span className="flex-shrink-0 text-accent-400">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium">{item.label}</span>
                        <span className="block text-sm text-white/60">{item.description}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" aria-hidden />
                    </Link>
                  )
                })}
              </div>
            ))}
            {!isAuthenticated ? (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-3 px-4 rounded-xl font-medium text-white/90 hover:bg-white/10">
                  Вход
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="mt-2 py-3 px-5 rounded-full font-semibold text-primary-800 bg-accent-400 hover:brightness-110 inline-flex items-center justify-center">
                  Регистрация
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 py-3 px-4 rounded-xl text-white/90">
                <Coins className="w-5 h-5 text-accent-400 flex-shrink-0" aria-hidden />
                <span className="font-medium">Ням-коины: 0</span>
                <span className="text-xs text-white/50">(заглушка)</span>
              </div>
            )}
          </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navbar
