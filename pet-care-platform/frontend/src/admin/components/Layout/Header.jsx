import React, { useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { useAuthStore } from '../../../store/authStore';

// Components
import NotificationCenter from '../Notifications/NotificationCenter';

const Header = ({ onMenuClick }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, logout: adminLogout } = useAdminStore();
  const { logout: authLogout } = useAuthStore();

  const handleLogout = async () => {
    try {
      adminLogout();
      await authLogout();
      window.location.href = '/admin-panel/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Левая часть - кнопка меню для мобильных */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Правая часть - пользователь и действия */}
        <div className="flex items-center space-x-4">
          {/* Уведомления */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9a5 5 0 00-5-5H7a5 5 0 00-5 5v8a5 5 0 005 5h5m0 0v-3a3 3 0 013-3h3m0 0l3-3m-3 3l-3-3" />
            </svg>
            {/* Индикатор непрочитанных уведомлений */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Профиль пользователя */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.email || 'Администратор'}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role === 'admin' ? 'Администратор' : user?.role === 'course_creator' ? 'Создатель курсов' : 'Пользователь'}
              </div>
            </div>

            {/* Аватар */}
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
            </div>

            {/* Меню пользователя */}
            <div className="relative">
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="Выйти"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Центр уведомлений */}
      <NotificationCenter
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
};

export default Header;
