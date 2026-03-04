/**
 * Оптимизированный хук для работы с данными графика
 *
 * Использует:
 * - Кэширование результатов
 * - Debounce для предотвращения лишних запросов
 * - Обработку ошибок
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../admin/utils/api';

// Простой in-memory кэш
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key, value) {
  cache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL
  });
}

export function useOptimizedChartData(config) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState(null);
  const abortControllerRef = useRef(null);

  // Ключ для кэширования
  const getCacheKey = useCallback((config) => {
    return `chart_data_${JSON.stringify({
      metrics: config.metrics,
      dimension: config.dimension,
      timeRange: config.timeRange,
      groupBy: config.groupBy,
      filters: config.filters
    })}`;
  }, []);

  const fetchData = useCallback(async () => {
    // Проверяем наличие необходимых данных для запроса
    const hasMetrics = config?.metrics?.length > 0;

    if (!config || !hasMetrics) {
      setData(null);
      setMetadata(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(10);
    setMetadata(null);

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Проверяем кэш
      const cacheKey = getCacheKey(config);
      const cachedData = getCached(cacheKey);

      if (cachedData) {
        setData(cachedData.data);
        setMetadata({ ...cachedData.metadata, cache_hit: true });
        setProgress(100);
        setLoading(false);
        return;
      }

      setProgress(30);

      // Подготавливаем запрос
      const requestData = {
        config: {
          metrics: config.metrics,
          dimension: config.dimension || 'date', // Измерение для группировки (ось X)
          xField: config.xField || config.dimension || 'date',
          timeRange: config.timeRange || '30d',
          groupBy: config.groupBy || 'day',
          filters: config.filters || {},
          limit: config.limit || 10000
        },
        data_limit: config.limit || 10000
      };

      setProgress(50);

      const response = await adminApi.post('admin/analytics/constructor/data/', requestData, {
        signal: abortControllerRef.current.signal
      });

      setProgress(80);

      if (response.data && response.data.data) {
        const rawData = response.data.data;
        
        setData(rawData);
        setMetadata({
          ...response.data.metadata,
          dataSize: rawData.length,
          cache_hit: false
        });

        // Кэшируем результат
        setCache(cacheKey, {
          data: rawData,
          metadata: response.data.metadata
        });
      } else {
        setData([]);
        setMetadata({ error: 'No data returned' });
      }

    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }

      console.error('[OptimizedChartData] Error:', err);

      const errorMessage = err.response?.data?.error ||
        err.response?.data?.metadata?.error ||
        err.message ||
        'Ошибка загрузки данных';

      setError(errorMessage);
      setData(null);
      setMetadata(null);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [config, getCacheKey]);

  // Автоматическая загрузка при изменении конфигурации с debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300); // Debounce 300ms

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    progress,
    metadata,
    refetch: fetchData
  };
}
