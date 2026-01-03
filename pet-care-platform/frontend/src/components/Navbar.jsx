/**
 * Компонент навигационной панели
 *
 * Главная навигационная шапка с:
 * - Логотипом/ссылкой бренда
 * - Основными ссылками навигации
 * - Меню пользователя (вход/выход)
 * - Иконкой корзины с количеством товаров
 * - Адаптивным мобильным меню
 *
 * Использует authStore для состояния аутентификации.
 * Использует cartStore для количества товаров в корзине.
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import OrdersDropdown from './OrdersDropdown'

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const services = [

  { id: 'pet-id', label: 'PetID' },  // ← Добавить
  { id: 'shop', label: 'Магазин' },
  { id: 'courses', label: 'Курсы' },
  { id: 'health-diary', label: 'Дневник здоровья' },
];

/**
 * Компонент Navbar с адаптивным дизайном
 *
 * Функции:
 * - Десктоп (xl+): полное горизонтальное меню
 * - Планшеты/Мобайл (md+): бургер-меню с выезжающей панелью
 * - Мобайл (<md): бургер-меню с выезжающей панелью
 * - Подсветка активных ссылок
 * - Бейдж корзины с количеством товаров
 */
function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()
  const { itemsCount } = useCartStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)

  const isServicePage = services.some(service => location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`))
  
  /**
   * Обработчик выхода
   * Выполняет выход и перенаправляет на главную
   */
  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMobileMenuOpen(false)
  }
  
  /**
   * Проверка активности ссылки
   * @param {string} path - Путь для проверки
   * @returns {boolean} True если текущий маршрут совпадает
   */
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }
  
  
  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 backdrop-blur-xl shadow-lg z-50 border-b border-purple-400/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Логотип и бренд */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-500 to-orange-500 p-2 rounded-xl shadow-lg">
                <span className="text-2xl">🐾</span>
              </div>
              <span className="text-2xl bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent font-bold">
                Питомец+
              </span>
            </Link>
          </div>
          
          {/* Десктопная навигация */}
          <nav className="hidden xl:flex items-center gap-4 xl:gap-6 text-sm">
            <button
              onClick={() => navigate('/')}
              className={`relative transition-all duration-300 whitespace-nowrap ${
                location.pathname === '/' ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
              }`}
            >
              Главная
              {location.pathname === '/' && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
              )}
            </button>

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesDropdownOpen(true)}
              onMouseLeave={() => setServicesDropdownOpen(false)}
            >
              <button
                className={`relative transition-all duration-300 flex items-center gap-1 ${
                  isServicePage ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                }`}
              >
                Наши сервисы
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${servicesDropdownOpen ? 'rotate-180' : ''}`}
                  style={{ color: 'white' }}
                />
                {isServicePage && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
                )}
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {servicesDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                  >
                    {services.map((service, index) => (
                      <motion.button
                        key={service.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          navigate(`/${service.id}`)
                          setServicesDropdownOpen(false)
                        }}
                        className={`group w-full text-left px-6 py-4 transition-all duration-300 ${
                          location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
                            ? 'bg-gradient-to-r from-purple-100 to-orange-100'
                            : 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-orange-100 hover:pl-8'
                        }`}
                      >
                        <span className={`transition-colors duration-300 ${
                          location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500'
                            : 'text-gray-700 group-hover:text-purple-600'
                        }`}>
                          {service.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated && (
              <>
                <button
                  onClick={() => navigate('/orders')}
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    location.pathname === '/orders' || location.pathname.startsWith('/orders/') ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Заказы
                  {(location.pathname === '/orders' || location.pathname.startsWith('/orders/')) && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Профиль
                  {(location.pathname === '/profile' || location.pathname.startsWith('/profile/')) && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
                  )}
                </button>
              </>
            )}
          </nav>

          {/* Правая сторона - Авторизация и корзина */}
          <div className="hidden xl:flex items-center gap-3">
            {/* Иконка корзины */}
            {isAuthenticated && (
              <>
                <Link
                  to="/cart"
                  className="relative p-2 text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {itemsCount > 9 ? '9+' : itemsCount}
                    </span>
                  )}
                </Link>
                {/* Заказы */}
                <OrdersDropdown />
              </>
            )}

            {/* Кнопки авторизации */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-white/80 hover:text-white transition-all duration-300 relative group"
              >
                Выйти
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 group-hover:w-full transition-all duration-300"></span>
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="text-white/80 hover:text-white transition-all duration-300 relative group"
                >
                  Вход
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 group-hover:w-full transition-all duration-300"></span>
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-white text-purple-600 px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-white/30 hover:scale-105 transition-all duration-300 font-semibold"
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>
          
          {/* Кнопка мобильного меню */}
          <div className="flex xl:hidden items-center justify-center gap-2">
            {/* Мобильная корзина */}
            {isAuthenticated && (
              <>
                <Link
                  to="/cart"
                  className="relative p-2 text-white/80 hover:text-white transition-colors flex-shrink-0"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                      {itemsCount > 9 ? '9+' : itemsCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white flex-shrink-0"
            >
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-4 border-t border-white/20 bg-purple-700/95 backdrop-blur-sm">
            <nav className="flex flex-col gap-3">
              <button
                onClick={() => {
                  navigate('/')
                  setMobileMenuOpen(false)
                }}
                className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                  location.pathname === '/' ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                Главная
              </button>

              {/* Mobile Services Accordion */}
              <div>
                <button
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-between ${
                    isServicePage ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <span>Наши сервисы</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {mobileServicesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pt-2 space-y-2">
                        {services.map((service) => (
                          <button
                            key={service.id}
                            onClick={() => {
                              navigate(`/${service.id}`)
                              setMobileMenuOpen(false)
                              setMobileServicesOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                              location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
                                ? 'bg-white/20 text-white'
                                : 'text-white/70 hover:bg-white/10 hover:text-white/90'
                            }`}
                          >
                            <span className="text-sm">{service.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      navigate('/orders')
                      setMobileMenuOpen(false)
                    }}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                      location.pathname === '/orders' || location.pathname.startsWith('/orders/') ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    Заказы
                  </button>
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setMobileMenuOpen(false)
                    }}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                      location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'bg-white/20 text-white font-semibold' : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    Профиль
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  isAuthenticated ? handleLogout() : navigate('/login')
                  setMobileMenuOpen(false)
                }}
                className="text-white/80 hover:bg-white/10 hover:text-white text-left px-4 py-2 rounded-lg transition-all duration-300"
              >
                {isAuthenticated ? 'Выйти' : 'Вход'}
              </button>
              {!isAuthenticated && (
                <button
                  onClick={() => {
                    navigate('/register')
                    setMobileMenuOpen(false)
                  }}
                  className="bg-white text-purple-600 px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-white/30 transition-all duration-300 mt-2 font-semibold"
                >
                  Регистрация
                </button>
              )}
            </nav>
          </div>
        )}
    </header>
  )
}

export default Navbar
