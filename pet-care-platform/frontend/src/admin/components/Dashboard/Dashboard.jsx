import React, { useState, useEffect } from 'react';

// Components
import MetricCard from './MetricCard';
import QuickActions from './QuickActions';
import RecentOrders from './RecentOrders';
import TopProducts from './TopProducts';
import PetsBySpecies from './PetsBySpecies';
import RecentReviews from './RecentReviews';
import RecentUsers from './RecentUsers';
import RecentPets from './RecentPets';

// Hooks
import { useDashboardData } from '../../hooks/useDashboardData';

const Dashboard = () => {
  const { data, loading, error, refetch } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ошибка загрузки данных</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const overview = data?.overview || {};

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Панель управления</h1>
        <p className="text-gray-600 mt-1">Обзор ключевых метрик и управление платформой</p>
      </div>

      {/* Быстрые действия */}
      <QuickActions />

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Выручка сегодня"
          value={`${overview.revenue_today?.toLocaleString() || 0} ₽`}
          subtitle={`${overview.orders_today || 0} заказов`}
          icon="💰"
          color="success"
        />
        <MetricCard
          title="Заказы сегодня"
          value={overview.orders_today || 0}
          subtitle="За текущий день"
          icon="📦"
          color="warning"
        />
        <MetricCard
          title="Всего пользователей"
          value={overview.users || 0}
          subtitle="Зарегистрированных"
          icon="👥"
          color="primary"
        />
        <MetricCard
          title="Всего питомцев"
          value={overview.pets || 0}
          subtitle="В системе"
          icon="🐾"
          color="purple"
        />
      </div>

      {/* Дополнительные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Всего товаров"
          value={overview.products || 0}
          subtitle="В каталоге"
          icon="📦"
          color="primary"
        />
        <MetricCard
          title="Последние пользователи"
          value={data?.recent_users?.length || 0}
          subtitle="Недавно зарегистрированные"
          icon="👤"
          color="success"
        />
        <MetricCard
          title="Последние питомцы"
          value={data?.recent_pets?.length || 0}
          subtitle="Недавно добавленные"
          icon="🐕"
          color="warning"
        />
        <MetricCard
          title="Топ товаров"
          value={data?.top_products?.length || 0}
          subtitle="В дашборде"
          icon="🏆"
          color="purple"
        />
      </div>

      {/* Основной контент */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Последние заказы */}
        <div className="xl:col-span-2">
          <RecentOrders orders={data?.recent_orders || []} />
        </div>

        {/* Топ товаров */}
        <div>
          <TopProducts products={data?.top_products || []} />
        </div>
      </div>

      {/* Дополнительные секции */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentUsers users={data?.recent_users || []} />
        <RecentPets pets={data?.recent_pets || []} />
      </div>

      {/* Аналитические секции (заглушки) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PetsBySpecies speciesData={data?.pets_by_species || []} />
        <RecentReviews reviews={data?.recent_reviews || []} />
      </div>
    </div>
  );
};

export default Dashboard;
