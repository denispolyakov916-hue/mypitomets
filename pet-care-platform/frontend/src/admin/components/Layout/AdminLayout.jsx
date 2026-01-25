import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Components
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar для мобильных устройств */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Основной layout */}
      <div className="flex">
        {/* Боковая панель для десктопа */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30">
          <Sidebar
            isOpen={true}
            desktop={true} // Явно указываем, что это десктопная версия
          />
        </div>

        {/* Основной контент */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Заголовок */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Основной контент */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
