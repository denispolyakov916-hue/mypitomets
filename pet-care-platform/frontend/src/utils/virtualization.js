/**
 * Система виртуализации для больших датасетов в конструкторе графиков
 *
 * Реализует:
 * - Ленивую загрузку данных
 * - Виртуализацию видимых элементов
 * - Агрегацию данных для больших наборов
 * - Прогрессивный рендеринг
 */

class DataVirtualizer {
  constructor(options = {}) {
    this.maxVisiblePoints = options.maxVisiblePoints || 1000;
    this.chunkSize = options.chunkSize || 100;
    this.aggregationThreshold = options.aggregationThreshold || 5000;
    this.cache = new Map();
  }

  /**
   * Виртуализация данных для графика
   */
  virtualizeData(data, config, viewport = null) {
    if (!data || data.length === 0) return { data: [], metadata: {} };

    const startTime = performance.now();

    // Для малых датасетов возвращаем как есть
    if (data.length <= this.maxVisiblePoints) {
      return {
        data,
        metadata: {
          virtualized: false,
          originalSize: data.length,
          processingTime: performance.now() - startTime
        }
      };
    }

    // Для больших датасетов применяем виртуализацию
    let virtualizedData;
    let metadata = {
      virtualized: true,
      originalSize: data.length,
      processingTime: 0,
      method: 'none'
    };

    // Определяем метод виртуализации
    if (this.shouldAggregate(data, config)) {
      virtualizedData = this.aggregateData(data, config);
      metadata.method = 'aggregation';
    } else if (viewport) {
      virtualizedData = this.viewportFilter(data, viewport, config);
      metadata.method = 'viewport';
    } else {
      virtualizedData = this.sampleData(data, config);
      metadata.method = 'sampling';
    }

    metadata.virtualizedSize = virtualizedData.length;
    metadata.processingTime = performance.now() - startTime;

    return { data: virtualizedData, metadata };
  }

  /**
   * Определяет, нужно ли агрегировать данные
   */
  shouldAggregate(data, config) {
    return data.length > this.aggregationThreshold &&
           (config.type === 'line' || config.type === 'area');
  }

  /**
   * Агрегация данных для больших временных рядов
   */
  aggregateData(data, config) {
    const xField = config.axes.x?.field;
    const yField = config.axes.y?.[0]?.field;

    if (!xField || !yField) return data;

    // Группируем по времени (если X - временная ось)
    const timeBased = config.axes.x.type === 'time';

    if (timeBased) {
      // Агрегация по временным интервалам
      return this.aggregateByTime(data, xField, yField, config);
    } else {
      // Агрегация по категориям
      return this.aggregateByCategory(data, xField, yField, config);
    }
  }

  /**
   * Агрегация по времени
   */
  aggregateByTime(data, xField, yField, config) {
    // Определяем временной интервал для агрегации
    const timeRange = d3.extent(data, d => new Date(d[xField]));
    const totalHours = (timeRange[1] - timeRange[0]) / (1000 * 60 * 60);

    let intervalHours;
    if (totalHours > 24 * 30) { // > 30 дней
      intervalHours = 24; // 1 день
    } else if (totalHours > 24 * 7) { // > 7 дней
      intervalHours = 6; // 6 часов
    } else if (totalHours > 24) { // > 1 день
      intervalHours = 1; // 1 час
    } else {
      intervalHours = 0.25; // 15 минут
    }

    // Группируем данные по интервалам
    const grouped = d3.rollup(
      data,
      values => ({
        [xField]: new Date(Math.floor(new Date(values[0][xField]).getTime() / (intervalHours * 60 * 60 * 1000)) * (intervalHours * 60 * 60 * 1000)),
        [yField]: d3.mean(values, d => +d[yField]),
        count: values.length,
        aggregated: true
      }),
      d => Math.floor(new Date(d[xField]).getTime() / (intervalHours * 60 * 60 * 1000))
    );

    return Array.from(grouped.values());
  }

  /**
   * Агрегация по категориям
   */
  aggregateByCategory(data, xField, yField, config) {
    // Группируем по категориям и вычисляем среднее
    const grouped = d3.rollup(
      data,
      values => ({
        [xField]: values[0][xField],
        [yField]: d3.mean(values, d => +d[yField]),
        count: values.length,
        aggregated: true
      }),
      d => d[xField]
    );

    return Array.from(grouped.values());
  }

  /**
   * Фильтрация данных по видимой области viewport
   */
  viewportFilter(data, viewport, config) {
    const { xMin, xMax, yMin, yMax } = viewport;
    const xField = config.axes.x?.field;
    const yField = config.axes.y?.[0]?.field;

    if (!xField || !yField) return data;

    return data.filter(d => {
      const x = config.axes.x.type === 'time' ? new Date(d[xField]).getTime() : +d[xField];
      const y = +d[yField];

      return x >= xMin && x <= xMax && y >= yMin && y <= yMax;
    });
  }

  /**
   * Выборка данных (простое прореживание)
   */
  sampleData(data, config) {
    const step = Math.ceil(data.length / this.maxVisiblePoints);
    const sampled = [];

    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }

    // Всегда включаем последний элемент
    if (data.length > 0 && sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1]);
    }

    return sampled;
  }

  /**
   * Прогрессивная загрузка данных
   */
  async loadProgressively(data, config, onChunk, onComplete) {
    const chunks = this.chunkData(data, this.chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const virtualizedChunk = this.virtualizeData(chunk, config);

      // Имитируем асинхронную обработку
      await new Promise(resolve => setTimeout(resolve, 10));

      onChunk(virtualizedChunk, i, chunks.length);

      // Даем браузеру время на рендеринг
      if (i % 5 === 0) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }

    onComplete();
  }

  /**
   * Разделение данных на чанки
   */
  chunkData(data, size) {
    const chunks = [];
    for (let i = 0; i < data.length; i += size) {
      chunks.push(data.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Получение статистики виртуализации
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      maxVisiblePoints: this.maxVisiblePoints,
      chunkSize: this.chunkSize,
      aggregationThreshold: this.aggregationThreshold
    };
  }
}

/**
 * Web Worker для тяжелых вычислений
 */
class ChartWorker {
  constructor() {
    this.worker = null;
    this.initWorker();
  }

  initWorker() {
    // Создаем blob с кодом worker'а
    const workerCode = `
      self.onmessage = function(e) {
        const { action, data, config } = e.data;

        try {
          switch (action) {
            case 'aggregate':
              const result = aggregateData(data, config);
              self.postMessage({ success: true, result });
              break;

            case 'calculateStats':
              const stats = calculateStatistics(data, config);
              self.postMessage({ success: true, result: stats });
              break;

            case 'findOutliers':
              const outliers = findOutliers(data, config);
              self.postMessage({ success: true, result: outliers });
              break;

            default:
              self.postMessage({ success: false, error: 'Unknown action' });
          }
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };

      function aggregateData(data, config) {
        // Агрегация данных (упрощенная версия)
        const grouped = {};
        data.forEach(item => {
          const key = item[config.groupBy];
          if (!grouped[key]) {
            grouped[key] = { count: 0, sum: 0, values: [] };
          }
          grouped[key].count++;
          grouped[key].sum += item[config.valueField] || 0;
          grouped[key].values.push(item);
        });

        return Object.entries(grouped).map(([key, group]) => ({
          [config.groupBy]: key,
          [config.valueField]: group.sum / group.count,
          count: group.count
        }));
      }

      function calculateStatistics(data, config) {
        const values = data.map(d => d[config.valueField]).filter(v => !isNaN(v));
        return {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: calculateMedian(values),
          std: calculateStd(values)
        };
      }

      function findOutliers(data, config) {
        const values = data.map(d => d[config.valueField]).filter(v => !isNaN(v));
        const stats = calculateStatistics(data, config);

        const threshold = stats.std * 2; // 2 стандартных отклонения
        return data.filter(d =>
          Math.abs(d[config.valueField] - stats.mean) > threshold
        );
      }

      function calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      }

      function calculateStd(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  /**
   * Выполнение задачи в worker'е
   */
  async run(action, data, config) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const handleMessage = (e) => {
        this.worker.removeEventListener('message', handleMessage);
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ action, data, config });
    });
  }

  /**
   * Завершение работы worker'а
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Система мониторинга производительности
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: [],
      dataProcessingTime: [],
      memoryUsage: [],
      fps: []
    };
    this.maxSamples = 100;
    this.lastFrameTime = performance.now();
  }

  /**
   * Измерение времени рендеринга
   */
  measureRenderTime(callback) {
    const start = performance.now();
    const result = callback();
    const duration = performance.now() - start;

    this.addMetric('renderTime', duration);
    return result;
  }

  /**
   * Измерение времени обработки данных
   */
  measureDataProcessing(callback) {
    const start = performance.now();
    const result = callback();
    const duration = performance.now() - start;

    this.addMetric('dataProcessingTime', duration);
    return result;
  }

  /**
   * Измерение FPS
   */
  measureFPS() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    const fps = 1000 / delta;

    this.addMetric('fps', fps);
    this.lastFrameTime = now;
  }

  /**
   * Измерение использования памяти
   */
  measureMemoryUsage() {
    if (performance.memory) {
      const memory = performance.memory;
      this.addMetric('memoryUsage', memory.usedJSHeapSize);
    }
  }

  /**
   * Добавление метрики
   */
  addMetric(type, value) {
    if (!this.metrics[type]) return;

    this.metrics[type].push({
      value,
      timestamp: Date.now()
    });

    // Ограничиваем количество сэмплов
    if (this.metrics[type].length > this.maxSamples) {
      this.metrics[type].shift();
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    const stats = {};

    Object.keys(this.metrics).forEach(type => {
      const values = this.metrics[type].map(m => m.value);
      if (values.length === 0) return;

      stats[type] = {
        current: values[values.length - 1],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });

    return stats;
  }

  /**
   * Получение рекомендаций по оптимизации
   */
  getOptimizationRecommendations() {
    const stats = this.getStats();
    const recommendations = [];

    if (stats.renderTime && stats.renderTime.average > 50) {
      recommendations.push({
        type: 'render',
        message: 'Время рендеринга слишком высокое. Рассмотрите виртуализацию данных.',
        severity: 'high'
      });
    }

    if (stats.dataProcessingTime && stats.dataProcessingTime.average > 100) {
      recommendations.push({
        type: 'processing',
        message: 'Время обработки данных высокое. Используйте Web Workers.',
        severity: 'medium'
      });
    }

    if (stats.fps && stats.fps.average < 30) {
      recommendations.push({
        type: 'fps',
        message: 'Низкий FPS. Оптимизируйте анимации и рендеринг.',
        severity: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Очистка метрик
   */
  clear() {
    Object.keys(this.metrics).forEach(type => {
      this.metrics[type] = [];
    });
  }
}

// Экспорт классов
export { DataVirtualizer, ChartWorker, PerformanceMonitor };

// Создание глобальных экземпляров
export const dataVirtualizer = new DataVirtualizer({
  maxVisiblePoints: 2000,
  chunkSize: 200,
  aggregationThreshold: 10000
});

export const chartWorker = new ChartWorker();
export const performanceMonitor = new PerformanceMonitor();
