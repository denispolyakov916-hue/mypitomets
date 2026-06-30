import React, { useState, useMemo, useRef, useEffect } from 'react';

/**
 * Боковая панель выбора метрик для конструктора графиков.
 *
 * Props:
 *  - metrics:        массив метрик { id, name, display_name, category, data_type, units?, description? }
 *  - categories:     массив категорий { id, name, count }
 *  - selectedMetrics:массив выбранных метрик (тех же объектов)
 *  - onMetricAdd(metric)      — добавить метрику (передаётся объект метрики)
 *  - onMetricRemove(metricId) — убрать метрику (передаётся id)
 *  - onDragStart(e, metric)   — начало перетаскивания метрики (опционально)
 *  - onSearch(query)          — debounced-уведомление о поиске (опционально)
 *  - onRetry()                — повтор загрузки при ошибке (опционально)
 *  - loading, error           — состояния загрузки/ошибки
 */
const MetricsPanel = ({
  metrics = [],
  categories = [],
  selectedMetrics = [],
  onMetricAdd,
  onMetricRemove,
  onDragStart,
  onSearch,
  onRetry,
  loading = false,
  error = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Debounced внешний колбэк поиска. Первый рендер пропускаем, чтобы не
  // дёргать onSearch на монтировании.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!onSearch) return undefined;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }
    const handle = setTimeout(() => onSearch(searchQuery), 150);
    return () => clearTimeout(handle);
  }, [searchQuery, onSearch]);

  const selectedIds = useMemo(
    () => new Set(selectedMetrics.map((m) => m.id)),
    [selectedMetrics]
  );

  // В основном списке показываем ещё не выбранные метрики, отфильтрованные по
  // активной вкладке-категории и строке поиска.
  const availableMetrics = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return metrics.filter((m) => {
      if (selectedIds.has(m.id)) return false;
      if (activeCategory !== 'all' && m.category !== activeCategory) return false;
      if (!q) return true;
      return (
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    });
  }, [metrics, selectedIds, activeCategory, searchQuery]);

  // Уникальные типы данных — выводим как легенду (по одному бейджу на тип).
  const dataTypes = useMemo(() => {
    const seen = [];
    metrics.forEach((m) => {
      if (m.data_type && !seen.includes(m.data_type)) seen.push(m.data_type);
    });
    return seen;
  }, [metrics]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
        <h3 className="m-0 text-lg font-semibold text-primary-800">Метрики</h3>
        <span className="bg-primary-500 text-white px-2 py-0.5 rounded-xl text-xs font-semibold">
          {availableMetrics.length}
        </span>
      </div>

      <SearchBox
        value={searchQuery}
        disabled={loading}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <DataTypeLegend dataTypes={dataTypes} />

      <div className="flex-1 overflow-y-auto px-5 pb-3">
        <MetricsList
          loading={loading}
          error={error}
          onRetry={onRetry}
          metrics={availableMetrics}
          onMetricAdd={onMetricAdd}
          onDragStart={onDragStart}
        />
      </div>

      <SelectedMetricsSection
        selectedMetrics={selectedMetrics}
        onMetricRemove={onMetricRemove}
      />
    </div>
  );
};

const SearchBox = ({ value, disabled, onChange, onClear }) => (
  <div className="relative mx-5 my-4">
    <input
      type="text"
      placeholder="Поиск метрик..."
      aria-label="Поиск метрик"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full py-2.5 pl-4 pr-10 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(200,107,250,0.1)] disabled:opacity-60 disabled:cursor-not-allowed"
    />
    {value ? (
      <button
        type="button"
        aria-label="Очистить"
        onClick={onClear}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-none bg-gray-200 text-gray-600 cursor-pointer flex items-center justify-center text-sm hover:bg-gray-300"
      >
        ×
      </button>
    ) : (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">
        🔍
      </span>
    )}
  </div>
);

const CategoryTabs = ({ categories, activeCategory, onSelect }) => {
  const tabClass = (selected) =>
    `px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors duration-200 ${
      selected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
    }`;
  return (
    <div className="flex flex-wrap gap-1.5 mx-5 mb-3" role="tablist" aria-label="Категории метрик">
      <button
        type="button"
        role="tab"
        aria-selected={activeCategory === 'all'}
        onClick={() => onSelect('all')}
        className={tabClass(activeCategory === 'all')}
      >
        Все
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={activeCategory === category.id}
          onClick={() => onSelect(category.id)}
          className={tabClass(activeCategory === category.id)}
        >
          {category.name} ({category.count})
        </button>
      ))}
    </div>
  );
};

const DataTypeLegend = ({ dataTypes }) => {
  if (dataTypes.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mx-5 mb-3 text-[11px] text-gray-400">
      <span>Типы данных:</span>
      {dataTypes.map((type) => (
        <span key={type} className="px-2 py-0.5 rounded bg-slate-100 text-gray-500 font-medium">
          {type}
        </span>
      ))}
    </div>
  );
};

const MetricsList = ({ loading, error, onRetry, metrics, onMetricAdd, onDragStart }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-primary-500 rounded-full animate-spin" />
        <span className="text-sm">Загрузка метрик...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <span className="text-3xl">⚠️</span>
        <p className="m-0 text-sm font-semibold text-gray-700">Ошибка загрузки метрик</p>
        <p className="m-0 text-xs text-gray-500">{error}</p>
        <button
          type="button"
          onClick={() => onRetry && onRetry()}
          className="mt-1 px-4 py-2 rounded-md border-none bg-primary-500 text-white text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-primary-600"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
        <span className="text-3xl">🔍</span>
        <span className="text-sm">Метрики не найдены</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {metrics.map((metric) => (
        <MetricItem
          key={metric.id}
          metric={metric}
          onAdd={onMetricAdd}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
};

const SelectedMetricsSection = ({ selectedMetrics, onMetricRemove }) => {
  if (selectedMetrics.length === 0) return null;
  return (
    <div className="mx-5 mb-5 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <h4 className="m-0 mb-3 text-sm font-semibold text-gray-700">
        Выбранные метрики ({selectedMetrics.length})
      </h4>
      <div className="flex flex-col gap-2">
        {selectedMetrics.map((metric) => (
          <div
            key={metric.id}
            className="metric-item selected flex items-center justify-between px-3 py-2 bg-white rounded-md border border-emerald-500"
          >
            <span className="text-[13px] text-gray-700">{metric.name}</span>
            <button
              type="button"
              aria-label="Убрать"
              onClick={() => onMetricRemove && onMetricRemove(metric.id)}
              className="w-5 h-5 rounded-full border-none bg-red-500 text-white cursor-pointer text-sm font-bold flex items-center justify-center transition-colors duration-200 hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MetricItem = ({ metric, onAdd, onDragStart }) => (
  <div
    className="metric-item flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all duration-200 hover:border-primary-500 hover:shadow-[0_2px_4px_rgba(200,107,250,0.1)]"
    onClick={() => onAdd && onAdd(metric)}
  >
    <span
      data-testid="drag-handle"
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, metric)}
      onClick={(e) => e.stopPropagation()}
      title="Перетащите метрику"
      aria-hidden="true"
      className="select-none text-gray-300 cursor-grab text-base leading-none"
    >
      ⠿
    </span>

    <div className="flex-1 min-w-0">
      <div className="font-semibold text-primary-800 mb-1 truncate">{metric.name}</div>
      <div className="text-xs text-gray-500 mb-1.5 leading-snug">
        {metric.description || 'Нет описания'}
      </div>
      {metric.units && (
        <div className="flex gap-2 text-[11px] text-gray-400">
          <span>{metric.units}</span>
        </div>
      )}
    </div>

    <span
      className="ml-1 w-7 h-7 shrink-0 rounded-full bg-primary-500 text-white text-sm font-bold flex items-center justify-center"
      aria-hidden="true"
    >
      +
    </span>
  </div>
);

export default MetricsPanel;
