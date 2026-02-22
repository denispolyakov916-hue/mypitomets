import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Components
import LineChart from '../Charts/LineChart';
import BarChart from '../Charts/BarChart';
import PieChart from '../Charts/PieChart';
import ComboChart from '../Charts/ComboChart';
import DrillDownModal from './DrillDownModal';

// Hooks
import { useAnalytics } from '../../hooks/useAnalytics';

const AnalyticsDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [drillDownModal, setDrillDownModal] = useState({
    isOpen: false,
    type: null,
    title: ''
  });

  const {
    salesData,
    usersData,
    petsData,
    ordersData,
    loading,
    error,
    lastUpdate,
    updatePeriod
  } = useAnalytics(true, 300000); // Автообновление каждые 5 минут

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    updatePeriod(period);
  };

  const openDrillDown = (type, title) => {
    setDrillDownModal({
      isOpen: true,
      type,
      title
    });
  };

  const closeDrillDown = () => {
    setDrillDownModal({
      isOpen: false,
      type: null,
      title: ''
    });
  };

  const periodOptions = [
    { value: '7d', label: '7 дней' },
    { value: '30d', label: '30 дней' },
    { value: '90d', label: '90 дней' },
    { value: '1y', label: '1 год' }
  ];

  if (loading && !salesData) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок и настройки */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-sm text-gray-600 mt-1">
            Детальная аналитика платформы с drill-down возможностями
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Кнопка конструктора */}
          <Link
            to="/admin-panel/analytics/builder"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-primary-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-primary-700 transition-all shadow-sm"
          >
            <span className="mr-2">🎨</span>
            Конструктор графиков
          </Link>

          {/* Выбор периода */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Период:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Время последнего обновления */}
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </div>
          )}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Ошибка загрузки данных
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Тренды продаж */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {salesData ? (
              <ComboChart
                data={salesData}
                title="Тренды продаж и заказов"
                height={350}
                className="hover:shadow-lg transition-shadow duration-200"
              />
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Нет данных о продажах</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Регистрации пользователей */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {usersData ? (
              <BarChart
                data={usersData}
                title="Статистика пользователей"
                height={300}
                className="hover:shadow-lg transition-shadow duration-200"
              />
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">👥</div>
                  <p>Нет данных о пользователях</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Распределение питомцев */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {petsData ? (
              <PieChart
                data={petsData}
                title="Питомцы по видам"
                height={300}
                type="doughnut"
                showPercentages={true}
                className="hover:shadow-lg transition-shadow duration-200"
              />
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">🐾</div>
                  <p>Нет данных о питомцах</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Статусы заказов */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {ordersData ? (
              <PieChart
                data={ordersData}
                title="Заказы по статусам"
                height={300}
                showPercentages={true}
                className="hover:shadow-lg transition-shadow duration-200"
              />
            ) : (
              <div className="flex items-center justify-center h-72 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📦</div>
                  <p>Нет данных о заказах</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drill-down секция */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Drill-down аналитика</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => openDrillDown('sales_by_products', 'Продажи по товарам')}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Продажи по товарам</p>
                <p className="text-xs text-gray-500">Топ товаров</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => openDrillDown('sales_by_category', 'Продажи по категориям')}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-accent-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="bg-accent-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Продажи по категориям</p>
                <p className="text-xs text-gray-500">Корм, аптека, уход</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => openDrillDown('user_activity', 'Активность пользователей')}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Активность пользователей</p>
                <p className="text-xs text-gray-500">География и поведение</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => openDrillDown('orders_delivery_analysis', 'Анализ заказов')}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center">
              <div className="bg-primary-100 p-2 rounded-lg">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Анализ заказов</p>
                <p className="text-xs text-gray-500">Время доставки и возвраты</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Drill-down модальное окно */}
      <DrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={closeDrillDown}
        type={drillDownModal.type}
        title={drillDownModal.title}
        period={selectedPeriod}
      />
    </div>
  );
};

export default AnalyticsDashboard;
