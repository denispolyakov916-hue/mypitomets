import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose, desktop = false }) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Дашборд',
      href: '/admin-panel/dashboard',
      icon: '📊',
      current: location.pathname === '/admin-panel/dashboard' || location.pathname === '/admin-panel'
    },
    {
      name: 'Расширенная аналитика',
      href: '/admin-panel/analytics',
      icon: '📈',
      current: location.pathname === '/admin-panel/analytics'
    },
    {
      name: 'Пользователи',
      href: '/admin-panel/users',
      icon: '👥',
      current: location.pathname === '/admin-panel/users'
    },
    {
      name: 'Питомцы',
      href: '/admin-panel/pets',
      icon: '🐾',
      current: location.pathname === '/admin-panel/pets'
    },
    {
      name: 'Товары',
      href: '/admin-panel/products',
      icon: '📦',
      current: location.pathname === '/admin-panel/products'
    },
    {
      name: 'Заказы',
      href: '/admin-panel/orders',
      icon: '🛒',
      current: location.pathname.startsWith('/admin-panel/orders')
    },
    {
      name: 'Курсы',
      href: '/admin-panel/courses',
      icon: '🎓',
      current: location.pathname === '/admin-panel/courses'
    }
  ];

  // Для десктопной версии - всегда видимый sidebar без анимации
  if (desktop) {
    return (
      <div className="flex flex-col h-full bg-white shadow-lg">
        <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
          <h1 className="text-lg font-semibold">Питомец+ Админ</h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                ${item.current
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Питомец+ v0.3.0
          </div>
        </div>
      </div>
    );
  }

  // Для мобильной версии - overlay с анимацией
  return (
    <>
      {/* Overlay для мобильных */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose}></div>
        </div>
      )}

      {/* Мобильный sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
            <h1 className="text-lg font-semibold">Питомец+ Админ</h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                  ${item.current
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                onClick={onClose}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Питомец+ v0.3.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
