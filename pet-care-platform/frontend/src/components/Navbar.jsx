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
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import OrdersDropdown from './OrdersDropdown'
import HeaderCounters from './HeaderCounters'

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const services = [
  { id: 'pet-id', label: 'PetID' },
  { id: 'food-recommendation', label: 'Подбор корма' },
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
  const itemsCount = useCartStore(s => s.itemsCount)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isServicePage = services.some(service => location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`))

  // Примечание: автоматическое обновление количества товаров выполняется в HeaderCounters
  // для предотвращения дублирования запросов
  
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
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
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm">
            <Link
              to="/"
              className={`relative transition-all duration-300 whitespace-nowrap ${
                location.pathname === '/' ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
              }`}
              aria-current={location.pathname === '/' ? 'page' : undefined}
            >
              Главная
              {location.pathname === '/' && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
              )}
            </Link>

            {/* Services */}
            {services.map((service) => {
              const isActive = location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
              return (
                <Link
                  key={service.id}
                  to={`/${service.id}`}
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-white/80 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {service.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
                  )}
                </Link>
              )
            })}


            {isAuthenticated && (
              <>
                <Link
                  to="/orders"
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    location.pathname === '/orders' || location.pathname.startsWith('/orders/') ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                  aria-current={(location.pathname === '/orders' || location.pathname.startsWith('/orders/')) ? 'page' : undefined}
                >
                  Заказы
                  {(location.pathname === '/orders' || location.pathname.startsWith('/orders/')) && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
                  )}
                </Link>
                <Link
                  to="/profile"
                  className={`relative transition-all duration-300 whitespace-nowrap ${
                    location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'text-white font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                  aria-current={(location.pathname === '/profile' || location.pathname.startsWith('/profile/')) ? 'page' : undefined}
                >
                  Профиль
                  {(location.pathname === '/profile' || location.pathname.startsWith('/profile/')) && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"></span>
                  )}
                </Link>
              </>
            )}
          </nav>

          {/* Правая сторона - Авторизация и счётчики */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated && <HeaderCounters />}

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
                <Link
                  to="/login"
                  className="text-white/80 hover:text-white transition-all duration-300 relative group focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-600 rounded"
                  aria-current={location.pathname === '/login' ? 'page' : undefined}
                >
                  Вход
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/register"
                  className="bg-orange-500 text-white px-6 py-2.5 rounded-full hover:bg-orange-600 transition-all duration-300 font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-600"
                  aria-current={location.pathname === '/register' ? 'page' : undefined}
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
          
          {/* Кнопка мобильного меню */}
          <div className="flex lg:hidden items-center justify-center gap-3">
            {/* Мобильные счётчики (компактнее) */}
            {isAuthenticated && <HeaderCounters />}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-purple-600 rounded"
              aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="lg:hidden py-4 border-t border-purple-400/30 bg-gradient-to-b from-purple-600 to-purple-500">
            <nav className="flex flex-col gap-3">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                  location.pathname === '/' ? 'bg-white/20 text-white font-semibold' : 'text-white/90 hover:bg-white/10'
                }`}
                aria-current={location.pathname === '/' ? 'page' : undefined}
              >
                Главная
              </Link>

              {/* Mobile Services */}
              {services.map((service) => {
                const isActive = location.pathname === `/${service.id}` || location.pathname.startsWith(`/${service.id}/`)
                return (
                  <Link
                    key={service.id}
                    to={`/${service.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {service.label}
                  </Link>
                )
              })}


              {isAuthenticated && (
                <>
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === '/orders' || location.pathname.startsWith('/orders/') ? 'bg-white/20 text-white font-semibold' : 'text-white/90 hover:bg-white/10'
                    }`}
                    aria-current={(location.pathname === '/orders' || location.pathname.startsWith('/orders/')) ? 'page' : undefined}
                  >
                    Заказы
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-left px-4 py-2 rounded-lg transition-all duration-300 ${
                    location.pathname === '/profile' || location.pathname.startsWith('/profile/') ? 'bg-white/20 text-white font-semibold' : 'text-white/90 hover:bg-white/10'
                    }`}
                    aria-current={(location.pathname === '/profile' || location.pathname.startsWith('/profile/')) ? 'page' : undefined}
                  >
                    Профиль
                  </Link>
                </>
              )}

              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-white/90 hover:bg-white/10 hover:text-white text-left px-4 py-2 rounded-lg transition-all duration-300"
                    aria-current={location.pathname === '/login' ? 'page' : undefined}
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="bg-orange-500 text-white px-6 py-2.5 rounded-full hover:bg-orange-600 transition-all duration-300 mt-2 font-semibold shadow-lg"
                    aria-current={location.pathname === '/register' ? 'page' : undefined}
                  >
                    Регистрация
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="text-white/90 hover:bg-white/10 hover:text-white text-left px-4 py-2 rounded-lg transition-all duration-300"
                >
                  Выйти
                </button>
              )}
            </nav>
          </div>
        )}
    </header>
  )
}

export default Navbar
