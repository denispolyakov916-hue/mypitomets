import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/api';

export const useAnalytics = (autoRefresh = false, refreshInterval = 300000) => { // 5 минут
  const [salesData, setSalesData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [petsData, setPetsData] = useState(null);
  const [ordersData, setOrdersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Формирование данных продаж из трендов
  const formatSalesData = useCallback((salesTrendsData) => {
    console.log('[Analytics] Formatting sales data:', salesTrendsData);

    // Используем реальные данные трендов из API
    if (salesTrendsData && salesTrendsData.labels && salesTrendsData.datasets) {
      console.log('[Analytics] Using real sales trends data');
      return salesTrendsData;
    }

    // Fallback на пустые данные, если API вернул null
    console.log('[Analytics] Using fallback empty data');
    return {
      labels: [],
      datasets: [
        {
          label: 'Выручка (₽)',
          data: [],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
        {
          label: 'Заказы',
          data: [],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
        }
      ]
    };
  }, []);

  // Формирование данных пользователей из списка
  const formatUsersData = useCallback((users) => {
    // Простой график - показываем количество пользователей
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active !== false).length;
    const staffUsers = users.filter(u => u.is_staff).length;

    return {
      labels: ['Всего', 'Активных', 'Администраторов'],
      datasets: [{
        label: 'Пользователи',
        data: [totalUsers, activeUsers, staffUsers],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
      }]
    };
  }, []);

  // Формирование данных питомцев по видам
  const formatPetsData = useCallback((pets) => {
    // Группируем питомцев по видам
    const speciesCount = pets.reduce((acc, pet) => {
      const species = pet.species || 'other';
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(speciesCount);
    const data = Object.values(speciesCount);
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)'
    ];

    return {
      labels: labels.map(s => s === 'dog' ? 'Собаки' : s === 'cat' ? 'Кошки' : 'Другие'),
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
      }]
    };
  }, []);

  // Формирование данных заказов по статусам
  const formatOrdersData = useCallback((orders) => {
    // Группируем заказы по статусам
    const statusCount = orders.reduce((acc, order) => {
      const status = order.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusLabels = {
      pending: 'Ожидает',
      processing: 'В обработке',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      cancelled: 'Отменён',
      expired: 'Истёк'
    };

    const labels = Object.keys(statusCount).map(s => statusLabels[s] || s);
    const data = Object.values(statusCount);
    const colors = [
      'rgba(245, 158, 11, 0.8)',   // pending - желтый
      'rgba(59, 130, 246, 0.8)',   // processing - синий
      'rgba(139, 92, 246, 0.8)',   // shipped - фиолетовый
      'rgba(16, 185, 129, 0.8)',   // delivered - зеленый
      'rgba(239, 68, 68, 0.8)',    // cancelled - красный
      'rgba(107, 114, 128, 0.8)'   // expired - серый
    ];

    return {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
      }]
    };
  }, []);

  // Загрузка всех данных из доступных API
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Analytics] Loading data from available APIs...');

      // Используем правильные API эндпоинты
      const [salesTrendsResponse, usersResponse, petsResponse, ordersResponse] = await Promise.allSettled([
        adminAPI.analytics.sales_trends({ period: selectedPeriod }),
        adminAPI.users.list({ page_size: 100 }), // Берем больше для анализа
        adminAPI.pets.list({ page_size: 100 }),
        adminAPI.orders.list({ page_size: 100 })
      ]);

      const salesTrends = salesTrendsResponse.status === 'fulfilled' ? salesTrendsResponse.value.data : null;
      const users = usersResponse.status === 'fulfilled' ? usersResponse.value.data?.results || [] : [];
      const pets = petsResponse.status === 'fulfilled' ? petsResponse.value.data?.results || [] : [];
      const orders = ordersResponse.status === 'fulfilled' ? ordersResponse.value.data?.results || [] : [];

      // Формируем данные для графиков только если есть данные
      if (salesTrends) {
        console.log('[Analytics] Sales trends data received:', salesTrends);
        setSalesData(formatSalesData(salesTrends));
      } else {
        console.log('[Analytics] No sales trends data received');
        setSalesData(formatSalesData(null)); // Устанавливаем пустые данные
      }

      if (users.length > 0) {
        setUsersData(formatUsersData(users));
      }

      if (pets.length > 0) {
        setPetsData(formatPetsData(pets));
      }

      if (orders.length > 0) {
        setOrdersData(formatOrdersData(orders));
      }

      setLastUpdate(new Date());
      console.log('[Analytics] Data loaded from API');

      // Если все запросы провалились - показываем ошибку
      if (salesTrendsResponse.status === 'rejected' &&
          usersResponse.status === 'rejected' &&
          petsResponse.status === 'rejected' &&
          ordersResponse.status === 'rejected') {
        setError('Не удалось загрузить данные аналитики. Проверьте подключение к серверу.');
      }
    } catch (err) {
      hasFetched.current = false;
      setError('Ошибка загрузки аналитических данных');
      console.error('[Analytics] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [formatSalesData, formatUsersData, formatPetsData, formatOrdersData, selectedPeriod]);

  // Автообновление
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadAllData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadAllData]);

  // Начальная загрузка
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Ручное обновление
  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // Обновление периода (перезагружаем данные)
  const updatePeriod = useCallback(async (period) => {
    console.log('[Analytics] Period update requested:', period);
    setSelectedPeriod(period); // Сохраняем новый период
    await loadAllData();
  }, [loadAllData]);

  return {
    // Данные
    salesData,
    usersData,
    petsData,
    ordersData,

    // Состояние
    loading,
    error,
    lastUpdate,

    // Методы
    refresh: loadAllData,
    updatePeriod
  };
};
