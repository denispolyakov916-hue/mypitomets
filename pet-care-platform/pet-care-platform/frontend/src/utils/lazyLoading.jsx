/**
 * Система ленивой загрузки для оптимизации производительности
 *
 * Реализует:
 * - Ленивую загрузку компонентов React
 * - Предварительную загрузку критических компонентов
 * - Кэширование загруженных компонентов
 * - Отслеживание загрузки и ошибок
 */

import { lazy } from 'react';

// Кэш загруженных компонентов
const componentCache = new Map();

// Состояние загрузки компонентов
const loadingStates = new Map();

/**
 * Создает лениво загружаемый компонент с кэшированием
 */
export function createLazyComponent(importFunc, componentName = 'Component') {
  // Проверяем кэш
  if (componentCache.has(componentName)) {
    return componentCache.get(componentName);
  }

  const LazyComponent = lazy(() => {
    loadingStates.set(componentName, 'loading');

    return importFunc()
      .then(module => {
        loadingStates.set(componentName, 'loaded');
        return module;
      })
      .catch(error => {
        loadingStates.set(componentName, 'error');
        console.error(`Failed to load ${componentName}:`, error);
        throw error;
      });
  });

  // Кэшируем компонент
  componentCache.set(componentName, LazyComponent);

  return LazyComponent;
}

/**
 * Предварительная загрузка компонента
 */
export function preloadComponent(importFunc, componentName = 'Component') {
  if (componentCache.has(componentName) || loadingStates.get(componentName) === 'loading') {
    return Promise.resolve();
  }

  loadingStates.set(componentName, 'preloading');

  return importFunc()
    .then(module => {
      // Создаем ленивый компонент заранее
      const LazyComponent = lazy(() => Promise.resolve(module));
      componentCache.set(componentName, LazyComponent);
      loadingStates.set(componentName, 'preloaded');
    })
    .catch(error => {
      loadingStates.set(componentName, 'error');
      console.error(`Failed to preload ${componentName}:`, error);
      throw error;
    });
}

/**
 * Предварительная загрузка критических компонентов
 */
export function preloadCriticalComponents() {
  const criticalComponents = [
    {
      name: 'ChartBuilder',
      importFunc: () => import('../admin/components/ChartBuilder/ChartBuilder')
    },
    {
      name: 'Canvas',
      importFunc: () => import('../admin/components/ChartBuilder/Canvas')
    },
    {
      name: 'MetricsPanel',
      importFunc: () => import('../admin/components/ChartBuilder/MetricsPanel')
    },
    {
      name: 'AnalyticsDashboard',
      importFunc: () => import('../admin/components/Analytics/AnalyticsDashboard')
    }
  ];

  // Загружаем критические компоненты параллельно
  const preloadPromises = criticalComponents.map(({ name, importFunc }) =>
    preloadComponent(importFunc, name).catch(error => {
      console.warn(`Failed to preload critical component ${name}:`, error);
      return null; // Не прерываем загрузку других компонентов
    })
  );

  return Promise.allSettled(preloadPromises);
}

/**
 * Ленивая загрузка компонентов конструктора графиков
 */
export const LazyChartBuilder = createLazyComponent(
  () => import('../admin/components/ChartBuilder/ChartBuilder'),
  'ChartBuilder'
);

export const LazyCanvas = createLazyComponent(
  () => import('../admin/components/ChartBuilder/Canvas'),
  'Canvas'
);

export const LazyMetricsPanel = createLazyComponent(
  () => import('../admin/components/ChartBuilder/MetricsPanel'),
  'MetricsPanel'
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('../admin/components/Analytics/AnalyticsDashboard'),
  'AnalyticsDashboard'
);

/**
 * Отложенная загрузка не критических компонентов
 */
export function loadNonCriticalComponents() {
  const nonCriticalComponents = [
    {
      name: 'ChartTypeSelector',
      importFunc: () => import('../admin/components/ChartBuilder/ChartTypeSelector')
    },
    {
      name: 'ChartStyleConfigurator',
      importFunc: () => import('../admin/components/ChartBuilder/ChartStyleConfigurator')
    },
    {
      name: 'PerformanceMonitor',
      importFunc: () => import('../admin/components/ChartBuilder/PerformanceMonitor')
    }
  ];

  // Загружаем не критические компоненты с задержкой
  setTimeout(() => {
    nonCriticalComponents.forEach(({ name, importFunc }) => {
      preloadComponent(importFunc, name).catch(() => {
        // Игнорируем ошибки для не критических компонентов
      });
    });
  }, 2000); // Задержка 2 секунды
}

/**
 * Получение состояния загрузки компонента
 */
export function getComponentLoadingState(componentName) {
  return loadingStates.get(componentName) || 'not-loaded';
}

/**
 * Очистка кэша компонентов
 */
export function clearComponentCache() {
  componentCache.clear();
  loadingStates.clear();
}

/**
 * Получение статистики загрузки компонентов
 */
export function getLoadingStats() {
  const stats = {
    total: loadingStates.size,
    loaded: 0,
    loading: 0,
    error: 0,
    notLoaded: 0
  };

  for (const state of loadingStates.values()) {
    stats[state] = (stats[state] || 0) + 1;
  }

  return stats;
}

/**
 * HOC для компонентов с загрузкой
 */
export function withLoading(Component, loadingComponent = null) {
  return function WithLoadingComponent(props) {
    const state = getComponentLoadingState(Component.name || 'Unknown');

    if (state === 'loading' || state === 'preloading') {
      return loadingComponent || (
        <div className="component-loading">
          <div className="loading-spinner"></div>
          <span>Загрузка компонента...</span>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div className="component-error">
          <span>Ошибка загрузки компонента</span>
          <button onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Hook для отслеживания загрузки компонентов
 */
export function useComponentLoader() {
  const [stats, setStats] = React.useState(getLoadingStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(getLoadingStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
