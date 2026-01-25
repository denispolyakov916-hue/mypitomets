/**
 * Хук для работы с библиотекой метрик
 */

import { useState, useEffect, useCallback } from 'react';
import adminApi from '../admin/utils/api';

// Fallback метрики если API недоступен
const DEFAULT_METRICS = [
  { id: 'users_total', name: 'Всего пользователей', category: 'users', data_type: 'integer', icon: '👥' },
  { id: 'users_new', name: 'Новые пользователи', category: 'users', data_type: 'integer', icon: '➕' },
  { id: 'users_active', name: 'Активные пользователи', category: 'users', data_type: 'integer', icon: '🟢' },
  { id: 'pets_total', name: 'Всего питомцев', category: 'pets', data_type: 'integer', icon: '🐾' },
  { id: 'pets_dogs', name: 'Собаки', category: 'pets', data_type: 'integer', icon: '🐕' },
  { id: 'pets_cats', name: 'Кошки', category: 'pets', data_type: 'integer', icon: '🐈' },
  { id: 'orders_total', name: 'Всего заказов', category: 'orders', data_type: 'integer', icon: '📦' },
  { id: 'orders_revenue', name: 'Выручка', category: 'orders', data_type: 'decimal', icon: '💰' },
  { id: 'orders_avg_check', name: 'Средний чек', category: 'orders', data_type: 'decimal', icon: '🧾' },
  { id: 'products_total', name: 'Всего товаров', category: 'products', data_type: 'integer', icon: '🏷️' },
  { id: 'products_in_stock', name: 'В наличии', category: 'products', data_type: 'integer', icon: '✅' },
  { id: 'courses_total', name: 'Всего курсов', category: 'courses', data_type: 'integer', icon: '🎓' },
  { id: 'courses_enrollments', name: 'Записей на курсы', category: 'courses', data_type: 'integer', icon: '📝' },
];

export function useMetricsLibrary() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка метрик
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.get('admin/analytics/metrics/');
      const metricsData = response.data.results || response.data.metrics || [];

      if (metricsData.length > 0) {
        // Добавляем иконки к загруженным метрикам
        const metricsWithIcons = metricsData.map(metric => {
          const defaultMetric = DEFAULT_METRICS.find(m => m.id === metric.id);
          return {
            ...metric,
            icon: metric.icon || defaultMetric?.icon || '📊',
            name: metric.name || metric.display_name || metric.id,
          };
        });
        
        setMetrics(metricsWithIcons);

        // Группировка по категориям
        const categoriesMap = {};
        metricsWithIcons.forEach(metric => {
          const category = metric.category;
          if (!categoriesMap[category]) {
            categoriesMap[category] = [];
          }
          categoriesMap[category].push(metric);
        });

        setCategories(categoriesMap);
      } else {
        // Используем fallback метрики
        setMetrics(DEFAULT_METRICS);
        
        const categoriesMap = {};
        DEFAULT_METRICS.forEach(metric => {
          const category = metric.category;
          if (!categoriesMap[category]) {
            categoriesMap[category] = [];
          }
          categoriesMap[category].push(metric);
        });
        setCategories(categoriesMap);
      }

    } catch (err) {
      console.error('[MetricsLibrary] Error loading metrics:', err);
      setError(err.message || 'Ошибка загрузки метрик');

      // Используем fallback метрики при ошибке
      setMetrics(DEFAULT_METRICS);
      const categoriesMap = {};
      DEFAULT_METRICS.forEach(metric => {
        const category = metric.category;
        if (!categoriesMap[category]) {
          categoriesMap[category] = [];
        }
        categoriesMap[category].push(metric);
      });
      setCategories(categoriesMap);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка при монтировании
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Поиск метрик
  const searchMetrics = useCallback((query, category = null) => {
    let filtered = metrics;

    // Фильтр по категории
    if (category) {
      filtered = filtered.filter(m => m.category === category);
    }

    // Поиск по названию и описанию
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(lowerQuery) ||
        m.id?.toLowerCase().includes(lowerQuery) ||
        (m.description && m.description.toLowerCase().includes(lowerQuery))
      );
    }

    return filtered;
  }, [metrics]);

  // Получение метрики по ID
  const getMetricById = useCallback((id) => {
    return metrics.find(m => m.id === id) || null;
  }, [metrics]);

  // Получение метрик по категории
  const getMetricsByCategory = useCallback((category) => {
    return categories[category] || [];
  }, [categories]);

  return {
    metrics,
    categories: Object.keys(categories),
    getMetricsByCategory,
    searchMetrics,
    getMetricById,
    loading,
    error,
    refetch: fetchMetrics
  };
}
