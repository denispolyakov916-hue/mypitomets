import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

const Sidebar = ({ isOpen, onClose, desktop = false }) => {
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const isCourseCreator = user?.role === 'course_creator';

  // Группируем навигацию по категориям
  const allGroups = [
    {
      title: 'Главное',
      adminOnly: true,
      items: [
        {
          name: 'Дашборд',
          href: '/admin-panel/dashboard',
          icon: '📊',
          current: location.pathname === '/admin-panel/dashboard' || location.pathname === '/admin-panel'
        }
      ]
    },
    {
      title: 'Аналитика',
      adminOnly: true,
      items: [
        {
          name: 'Обзор аналитики',
          href: '/admin-panel/analytics',
          icon: '📈',
          current: location.pathname === '/admin-panel/analytics'
        },
        {
          name: 'Конструктор',
          href: '/admin-panel/analytics/builder',
          icon: '✨',
          current: location.pathname === '/admin-panel/analytics/builder',
          highlight: true
        }
      ]
    },
    {
      title: 'Управление',
      items: [
        {
          name: 'Пользователи',
          href: '/admin-panel/users',
          icon: '👥',
          current: location.pathname === '/admin-panel/users',
          adminOnly: true,
        },
        {
          name: 'Питомцы',
          href: '/admin-panel/pets',
          icon: '🐾',
          current: location.pathname === '/admin-panel/pets',
          adminOnly: true,
        },
        {
          name: 'Товары',
          href: '/admin-panel/products',
          icon: '📦',
          current: location.pathname === '/admin-panel/products',
          adminOnly: true,
        },
        {
          name: 'Заказы',
          href: '/admin-panel/orders',
          icon: '🛒',
          current: location.pathname.startsWith('/admin-panel/orders'),
          adminOnly: true,
        },
        {
          name: 'Курсы',
          href: '/admin-panel/courses',
          icon: '🎓',
          current: location.pathname === '/admin-panel/courses'
        }
      ]
    }
  ];

  const navigationGroups = isCourseCreator
    ? allGroups
        .filter(g => !g.adminOnly)
        .map(g => ({ ...g, items: g.items.filter(i => !i.adminOnly) }))
        .filter(g => g.items.length > 0)
    : allGroups;

  const renderNavigation = (onClick = null) => (
    <>
      {navigationGroups.map((group, groupIndex) => (
        <div key={group.title} className={groupIndex > 0 ? 'mt-4' : ''}>
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {group.title}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClick}
                className={`
                  flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${item.current
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : item.highlight 
                      ? 'text-primary-600 hover:bg-primary-50 hover:text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <span className="mr-3 text-base flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.name}</span>
                {item.highlight && !item.current && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-primary-100 text-primary-600 rounded-full">
                    NEW
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  // Для десктопной версии
  if (desktop) {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className="flex items-center h-16 px-4 bg-gradient-to-r from-primary-700 to-primary-600">
          <h1 className="text-lg font-bold text-white">🐾 Питомец+</h1>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {renderNavigation()}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            v0.3.0
          </div>
        </div>
      </div>
    );
  }

  // Для мобильной версии
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose}></div>
        </div>
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center h-16 px-4 bg-gradient-to-r from-primary-700 to-primary-600">
            <h1 className="text-lg font-bold text-white">🐾 Питомец+</h1>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {renderNavigation(onClose)}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <div className="text-xs text-gray-400 text-center">
              v0.3.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
