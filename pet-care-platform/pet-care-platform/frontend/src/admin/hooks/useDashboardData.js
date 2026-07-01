import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../utils/api';
import { devLog } from '../utils/logger';

export const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false); // Защита от повторных вызовов

  const fetchData = async () => {
    // Защита от повторных вызовов
    if (hasFetched.current && data !== null) {
      return;
    }

    try {
      hasFetched.current = true;
      setLoading(true);
      setError(null);

      // Используем доступные API эндпоинты с Promise.allSettled для устойчивости
      const responses = await Promise.allSettled([
        adminAPI.stats.summary(),
        adminAPI.users.list({ page_size: 5 }), // Последние 5 пользователей
        adminAPI.pets.list({ page_size: 5 }),  // Последние 5 питомцев
        adminAPI.analytics.topProducts(8), // Реальный топ по продажам
        adminAPI.orders.list({ page_size: 5 }), // Последние 5 заказов
      ]);

      const [summaryResponse, usersResponse, petsResponse, topProductsResponse, ordersResponse] = responses;

      // Формируем данные для дашборда из доступных API
      setData({
        overview: {
          users: (summaryResponse.status === 'fulfilled' && summaryResponse.value.data?.summary?.users) || 0,
          pets: (summaryResponse.status === 'fulfilled' && summaryResponse.value.data?.summary?.pets) || 0,
          products: (summaryResponse.status === 'fulfilled' && summaryResponse.value.data?.summary?.products) || 0,
          orders_today: (summaryResponse.status === 'fulfilled' && summaryResponse.value.data?.summary?.orders_today) || 0,
          revenue_today: (summaryResponse.status === 'fulfilled' && summaryResponse.value.data?.summary?.revenue_today) || 0,
        },
        top_products: (topProductsResponse.status === 'fulfilled' && (
          topProductsResponse.value.data?.products ||
          topProductsResponse.value.data?.results
        )) || [],
        recent_orders: (ordersResponse.status === 'fulfilled' && ordersResponse.value.data?.results) || [],
        pets_by_species: [], // Заглушка - аналитика по видам не реализована
        recent_users: (usersResponse.status === 'fulfilled' && usersResponse.value.data?.results) || [],
        recent_pets: (petsResponse.status === 'fulfilled' && petsResponse.value.data?.results) || [],
        recent_reviews: [], // Заглушка, можно добавить позже
      });
    } catch (err) {
      hasFetched.current = false; // Сбрасываем при ошибке для возможности повтора
      devLog.error('[Dashboard] Fetch error:', err);
      setError(err.response?.data?.detail || err.message || 'Ошибка загрузки данных дашборда');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Запускаем только один раз

  const refetch = () => {
    hasFetched.current = false; // Сбрасываем флаг для повторной загрузки
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
};
