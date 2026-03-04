import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// Components
import Dashboard from './Dashboard';
import AnalyticsDashboard from '../Analytics/AnalyticsDashboard';

// Hooks
import { useAdminAuth } from '../../hooks/useAdminAuth';

const DashboardSelector = () => {
  const { user, isCourseCreator } = useAdminAuth();

  if (isCourseCreator) {
    return <Navigate to="/admin-panel/courses" replace />;
  }
  const [dashboardType, setDashboardType] = useState('overview');

  // Определяем доступные дашборды в зависимости от роли
  const getAvailableDashboards = (user) => {
    const dashboards = [
      {
        key: 'overview',
        label: 'Обзор',
        description: 'Основные метрики и быстрые действия',
        component: Dashboard,
        roles: ['admin', 'manager', 'staff']
      },
      {
        key: 'analytics',
        label: 'Расширенная аналитика',
        description: 'Детальные графики и drill-down анализ',
        component: AnalyticsDashboard,
        roles: ['admin', 'manager']
      }
    ];

    if (!user) return [];

    const userRole = user.role === 'admin' ? 'admin' : (user.role === 'course_creator' ? 'manager' : 'staff');

    return dashboards.filter(dashboard => dashboard.roles.includes(userRole));
  };

  const availableDashboards = getAvailableDashboards(user);

  // Выбираем первый доступный дашборд по умолчанию
  useEffect(() => {
    if (availableDashboards.length > 0 && !availableDashboards.find(d => d.key === dashboardType)) {
      setDashboardType(availableDashboards[0].key);
    }
  }, [availableDashboards, dashboardType]);

  const currentDashboard = availableDashboards.find(d => d.key === dashboardType);

  if (availableDashboards.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Доступ запрещен</h2>
          <p className="text-gray-600">У вас нет прав доступа к админ-панели.</p>
        </div>
      </div>
    );
  }

  if (availableDashboards.length === 1) {
    // Если только один дашборд доступен, показываем его без селектора
    const DashboardComponent = availableDashboards[0].component;
    return <DashboardComponent />;
  }

  const DashboardComponent = currentDashboard?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Селектор дашборда */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">Админ-панель</h1>

              <nav className="flex space-x-8">
                {availableDashboards.map((dashboard) => (
                  <button
                    key={dashboard.key}
                    onClick={() => setDashboardType(dashboard.key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      dashboardType === dashboard.key
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {dashboard.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Информация о пользователе */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'Администратор' : user?.role === 'course_creator' ? 'Создатель курсов' : 'Пользователь'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Содержимое дашборда */}
      <main className="flex-1">
        {DashboardComponent && <DashboardComponent />}
      </main>
    </div>
  );
};

export default DashboardSelector;
