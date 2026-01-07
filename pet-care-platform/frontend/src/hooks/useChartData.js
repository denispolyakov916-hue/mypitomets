/**
 * Хук для загрузки данных графика из API
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin/utils/api.js';

export function useChartData(config) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!config || !config.metrics || config.metrics.length === 0) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Подготавливаем запрос
      const requestData = {
        config: {
          metrics: config.metrics,
          dimensions: config.dimensions || [],
          filters: config.filters || {},
          limit: config.limit || 10000
        },
        data_limit: config.limit || 10000
      };

      console.log('[ChartData] Fetching data:', requestData);

      const response = await adminApi.post('/analytics/constructor/data/', requestData);

      console.log('[ChartData] Response:', response.data);

      if (response.data && response.data.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (err) {
      console.error('[ChartData] Error:', err);

      const errorMessage = err.response?.data?.error ||
                          err.message ||
                          'Ошибка загрузки данных';

      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Автоматическая загрузка при изменении конфигурации
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
