import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';

// Components
import Canvas from './Canvas';

// Hooks
import { useOptimizedChartData } from '../../../hooks/useOptimizedChartData';
import { useMetricsLibrary } from '../../../hooks/useMetricsLibrary';

// Utils
import adminApi, { adminAPI } from '../../utils/api';

// Styles
import './ChartBuilder.css';

// Русские названия для полей
const RUSSIAN_LABELS = {
  users_total: 'Всего пользователей',
  users_new: 'Новые пользователи',
  users_active: 'Активные пользователи',
  pets_total: 'Всего питомцев',
  pets_dogs: 'Собаки',
  pets_cats: 'Кошки',
  orders_total: 'Всего заказов',
  orders_revenue: 'Выручка',
  orders_avg_check: 'Средний чек',
  products_total: 'Всего товаров',
  products_in_stock: 'В наличии',
  courses_total: 'Всего курсов',
  courses_enrollments: 'Записи на курсы',
  date: 'Дата',
  pet_species: 'Вид питомца',
  product_category: 'Категория товара',
  order_status: 'Статус заказа',
  user_role: 'Роль пользователя',
  course_category: 'Категория курса',
  course_level: 'Уровень курса',
};

// Доступные измерения для оси X (группировка данных)
const X_AXIS_DIMENSIONS = {
  time: {
    name: '📅 Время',
    description: 'Временные измерения',
    options: [
      { id: 'date', name: 'По дате', icon: '📅', description: 'Группировка по дням' },
      { id: 'week', name: 'По неделям', icon: '📆', description: 'Группировка по неделям' },
      { id: 'month', name: 'По месяцам', icon: '🗓️', description: 'Группировка по месяцам' },
    ]
  },
  pets: {
    name: '🐾 Питомцы',
    description: 'Измерения по питомцам',
    options: [
      { id: 'pet_species', name: 'Вид питомца', icon: '🐾', description: 'Собаки, кошки и др.' },
      { id: 'pet_breed', name: 'Порода', icon: '🏷️', description: 'По породам питомцев' },
      { id: 'pet_age_group', name: 'Возрастная группа', icon: '📊', description: 'Щенок, взрослый, пожилой' },
    ]
  },
  products: {
    name: '🛒 Товары',
    description: 'Измерения по товарам',
    options: [
      { id: 'product_category', name: 'Категория товара', icon: '📦', description: 'По категориям товаров' },
      { id: 'product_brand', name: 'Бренд', icon: '🏢', description: 'По брендам' },
    ]
  },
  orders: {
    name: '📋 Заказы',
    description: 'Измерения по заказам',
    options: [
      { id: 'order_status', name: 'Статус заказа', icon: '📋', description: 'По статусам заказов' },
      { id: 'payment_method', name: 'Способ оплаты', icon: '💳', description: 'По способам оплаты' },
    ]
  },
  users: {
    name: '👥 Пользователи',
    description: 'Измерения по пользователям',
    options: [
      { id: 'user_city', name: 'Город', icon: '🏙️', description: 'По городам пользователей' },
      { id: 'user_registration_source', name: 'Источник регистрации', icon: '🔗', description: 'Откуда пришли' },
    ]
  },
  courses: {
    name: '🎓 Курсы',
    description: 'Измерения по курсам',
    options: [
      { id: 'course_category', name: 'Категория курса', icon: '🎓', description: 'По категориям курсов' },
      { id: 'course_level', name: 'Уровень курса', icon: '📈', description: 'Начальный, продвинутый' },
    ]
  }
};

// Шаблоны графиков для быстрого старта
const CHART_TEMPLATES = [
  {
    id: 'users_growth',
    name: 'Рост пользователей',
    icon: '📈',
    description: 'Динамика регистраций',
    type: 'line',
    metrics: ['users_total', 'users_active'],
    timeRange: '30d',
  },
  {
    id: 'revenue_analysis',
    name: 'Анализ выручки',
    icon: '💰',
    description: 'Финансовые показатели',
    type: 'area',
    metrics: ['orders_revenue', 'orders_avg_check'],
    timeRange: '30d',
  },
  {
    id: 'orders_overview',
    name: 'Обзор заказов',
    icon: '📦',
    description: 'Статистика заказов',
    type: 'bar',
    metrics: ['orders_total'],
    timeRange: '30d',
  },
  {
    id: 'pets_distribution',
    name: 'Распределение питомцев',
    icon: '🐾',
    description: 'По видам животных',
    type: 'pie',
    metrics: ['pets_dogs', 'pets_cats'],
    timeRange: '30d',
  },
  {
    id: 'products_stock',
    name: 'Товары на складе',
    icon: '🏷️',
    description: 'Наличие товаров',
    type: 'bar',
    metrics: ['products_total', 'products_in_stock'],
    timeRange: '7d',
  },
];

// Категории метрик с группировкой
const METRIC_CATEGORIES = {
  users: {
    name: '👥 Пользователи',
    description: 'Статистика пользователей',
    metrics: [
      { id: 'users_total', name: 'Новые регистрации', icon: '👥', description: 'Кол-во новых пользователей за период' },
      { id: 'users_new', name: 'Новые пользователи', icon: '➕', description: 'Количество новых регистраций' },
      { id: 'users_active', name: 'Активные пользователи', icon: '🟢', description: 'Пользователи с входом за период' },
    ]
  },
  finance: {
    name: '💰 Финансы',
    description: 'Экономические показатели',
    metrics: [
      { id: 'orders_revenue', name: 'Выручка', icon: '💰', description: 'Общая сумма заказов' },
      { id: 'orders_avg_check', name: 'Средний чек', icon: '🧾', description: 'Средняя сумма заказа' },
      { id: 'orders_total', name: 'Количество заказов', icon: '📦', description: 'Общее число заказов' },
    ]
  },
  pets: {
    name: '🐾 Питомцы',
    description: 'Данные о питомцах',
    metrics: [
      { id: 'pets_total', name: 'Всего питомцев', icon: '🐾', description: 'Общее количество питомцев' },
      { id: 'pets_dogs', name: 'Собаки', icon: '🐕', description: 'Количество собак' },
      { id: 'pets_cats', name: 'Кошки', icon: '🐈', description: 'Количество кошек' },
    ]
  },
  products: {
    name: '🏷️ Товары',
    description: 'Каталог товаров',
    metrics: [
      { id: 'products_total', name: 'Всего товаров', icon: '🏷️', description: 'Количество товаров в каталоге' },
      { id: 'products_in_stock', name: 'В наличии', icon: '✅', description: 'Товары в наличии' },
    ]
  },
  education: {
    name: '🎓 Обучение',
    description: 'Курсы и записи',
    metrics: [
      { id: 'courses_total', name: 'Всего курсов', icon: '🎓', description: 'Количество курсов' },
      { id: 'courses_enrollments', name: 'Записи на курсы', icon: '📝', description: 'Записей на курсы' },
    ]
  }
};

// Типы графиков
const CHART_TYPES = [
  { id: 'line', name: 'Линия', icon: '📈' },
  { id: 'bar', name: 'Столбцы', icon: '📊' },
  { id: 'area', name: 'Область', icon: '🏔️' },
  { id: 'scatter', name: 'Точки', icon: '⬤' },
  { id: 'pie', name: 'Круг', icon: '◐' },
];

// Периоды
const TIME_RANGES = [
  { id: '7d', name: '7 дней' },
  { id: '30d', name: '30 дней' },
  { id: '90d', name: '90 дней' },
  { id: '1y', name: '1 год' },
];

// Типы линий
const LINE_STYLES = [
  { id: 'solid', name: 'Сплошная', preview: '━━━━' },
  { id: 'dashed', name: 'Пунктир', preview: '╌╌╌╌' },
  { id: 'dotted', name: 'Точки', preview: '····' },
  { id: 'dashdot', name: 'Штрих-точка', preview: '─·─·' },
];

// Типы кривых
const CURVE_TYPES = [
  { id: 'smooth', name: 'Сглаженная' },
  { id: 'linear', name: 'Прямая' },
  { id: 'step', name: 'Ступенчатая' },
];

// Типы точек
const POINT_TYPES = [
  { id: 'circle', name: 'Круг', symbol: '●' },
  { id: 'square', name: 'Квадрат', symbol: '■' },
  { id: 'triangle', name: 'Треугольник', symbol: '▲' },
  { id: 'diamond', name: 'Ромб', symbol: '◆' },
  { id: 'none', name: 'Без точек', symbol: '—' },
];

// Цветовые палитры
const COLOR_PALETTES = {
  default: { name: 'Стандартная', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] },
  ocean: { name: 'Океан', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16'] },
  sunset: { name: 'Закат', colors: ['#f97316', '#ef4444', '#ec4899', '#d946ef', '#a855f7'] },
  forest: { name: 'Лес', colors: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  mono: { name: 'Монохром', colors: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db'] },
};

// Позиции легенды
const LEGEND_POSITIONS = [
  { id: 'top', name: 'Сверху' },
  { id: 'bottom', name: 'Снизу' },
  { id: 'right', name: 'Справа' },
  { id: 'left', name: 'Слева' },
  { id: 'none', name: 'Скрыть' },
];

const getRussianLabel = (id) => RUSSIAN_LABELS[id] || id;

const ChartBuilder = ({ initialConfig, onSave, onClose }) => {
  const canvasRef = useRef(null);

  // Core state
  const [chartName, setChartName] = useState(initialConfig?.name || '');
  const [chartType, setChartType] = useState(initialConfig?.type || 'line');
  const [timeRange, setTimeRange] = useState('30d');
  const [groupBy, setGroupBy] = useState('day');
  
  // Charts state - массив графиков, каждый график имеет свою метрику
  const [charts, setCharts] = useState([]);
  const [expandedChartId, setExpandedChartId] = useState(null); // Развернутый график для выбора метрики
  const [chartSearchQuery, setChartSearchQuery] = useState(''); // Поиск для конкретного графика
  
  // Axis data selection
  const [xAxisDimension, setXAxisDimension] = useState('date'); // Измерение для оси X
  const [expandedXCategory, setExpandedXCategory] = useState('time'); // Раскрытая категория измерений X

  // UI state
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Computed: selected metrics from charts
  const selectedMetrics = useMemo(() => {
    return charts.filter(c => c.metric).map(c => c.metric);
  }, [charts]);

  // Style settings per metric
  const [metricStyles, setMetricStyles] = useState({});
  const [legendLabels, setLegendLabels] = useState({});

  // Global style config (moved up before functions that use it)
  const [styleConfig, setStyleConfig] = useState({
    // Цветовая палитра
    colorPalette: 'default',
    // Сетка
    grid: {
      show: true,
      color: '#e5e7eb',
      style: 'dashed', // solid, dashed, dotted
      opacity: 0.5,
      xLines: true,
      yLines: true,
    },
    // Легенда
    legend: {
      show: true,
      position: 'top',
      fontSize: 12,
      itemSpacing: 20,
    },
    // Ось X
    xAxis: {
      label: '',
      rotation: 0,
      fontSize: 12,
      showLine: true,
      showTicks: true,
      minIndex: '', // Индекс начальной точки данных
      maxIndex: '', // Индекс конечной точки данных
    },
    // Ось Y
    yAxis: {
      label: '',
      min: '',
      max: '',
      format: 'auto', // auto, integer, decimal, currency, percent
      fontSize: 12,
      showLine: true,
      showTicks: true,
      gridLines: 5,
    },
    // Анимация
    animation: true,
    // Тултипы
    showTooltips: true,
  });

  // Export settings
  const [exportSettings, setExportSettings] = useState({
    width: 1920,
    height: 1080,
    format: 'png',
    transparentBg: false,
  });

  // Get all metrics from categories
  const allMetrics = useMemo(() => {
    const metrics = [];
    Object.entries(METRIC_CATEGORIES).forEach(([catId, cat]) => {
      cat.metrics.forEach(m => {
        metrics.push({ ...m, category: catId });
      });
    });
    return metrics;
  }, []);

  // Filter metrics by search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allMetrics.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, allMetrics]);

  // Get current X dimension info
  const currentXDimension = useMemo(() => {
    for (const cat of Object.values(X_AXIS_DIMENSIONS)) {
      const found = cat.options.find(o => o.id === xAxisDimension);
      if (found) return found;
    }
    return { id: 'date', name: 'По дате', icon: '📅' };
  }, [xAxisDimension]);

  // Check if X axis is time-based
  const isTimeBased = ['date', 'week', 'month'].includes(xAxisDimension);

  // Build config for data fetching
  const config = useMemo(() => ({
    type: chartType,
    metrics: selectedMetrics.map(m => m.id),
    xField: xAxisDimension,
    dimension: xAxisDimension, // Измерение для группировки
    timeRange: isTimeBased ? timeRange : null,
    groupBy: isTimeBased ? groupBy : xAxisDimension,
    filters: {}
  }), [chartType, selectedMetrics, xAxisDimension, timeRange, groupBy, isTimeBased]);

  // Full style config for Canvas
  const fullStyleConfig = useMemo(() => ({
    ...styleConfig,
    metricStyles,
    legendLabels,
    russianLabels: RUSSIAN_LABELS,
    colors: COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors,
    xAxisDimension,
    currentXDimension,
  }), [styleConfig, metricStyles, legendLabels, xAxisDimension, currentXDimension]);

  const { data, loading: dataLoading, refetch, error: dataError } = useOptimizedChartData(config);

  // Add new chart
  const addChart = useCallback(() => {
    if (charts.length >= 5) return;
    const newChart = {
      id: `chart_${Date.now()}`,
      metric: null,
      style: {
        lineStyle: 'solid',
        curveType: 'smooth',
        lineWidth: 2,
        pointType: 'circle',
      }
    };
    setCharts(prev => [...prev, newChart]);
    setExpandedChartId(newChart.id);
  }, [charts.length]);

  // Remove chart
  const removeChart = useCallback((chartId) => {
    setCharts(prev => prev.filter(c => c.id !== chartId));
    if (expandedChartId === chartId) setExpandedChartId(null);
  }, [expandedChartId]);

  // Set metric for chart
  const setChartMetric = useCallback((chartId, metric) => {
    const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
    const chartIndex = charts.findIndex(c => c.id === chartId);
    
    setCharts(prev => prev.map(c => 
      c.id === chartId ? { ...c, metric } : c
    ));
    
    // Initialize style for new metric
    if (metric && !metricStyles[metric.id]) {
      setMetricStyles(prev => ({
        ...prev,
        [metric.id]: {
          color: colors[chartIndex % colors.length],
          lineStyle: 'solid',
          curveType: 'smooth',
          lineWidth: 2,
          pointType: 'circle',
          pointSize: 4,
          fillOpacity: 0.1,
        }
      }));
      setLegendLabels(prev => ({
        ...prev,
        [metric.id]: metric.name || getRussianLabel(metric.id)
      }));
    }
    
    setExpandedChartId(null);
    setChartSearchQuery('');
  }, [charts, styleConfig.colorPalette, metricStyles]);

  // Update chart style
  const updateChartStyle = useCallback((chartId, key, value) => {
    setCharts(prev => prev.map(c => 
      c.id === chartId ? { ...c, style: { ...c.style, [key]: value } } : c
    ));
  }, []);

  // Initialize metric styles when added
  useEffect(() => {
    const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
    selectedMetrics.forEach((metric, index) => {
      if (!metricStyles[metric.id]) {
        setMetricStyles(prev => ({
          ...prev,
          [metric.id]: {
            color: colors[index % colors.length],
            lineStyle: 'solid',
            curveType: 'smooth',
            lineWidth: 2,
            pointType: 'circle',
            pointSize: 4,
            fillOpacity: 0.1,
          }
        }));
      }
      if (!legendLabels[metric.id]) {
        setLegendLabels(prev => ({
          ...prev,
          [metric.id]: metric.name || getRussianLabel(metric.id)
        }));
      }
    });
  }, [selectedMetrics, styleConfig.colorPalette]);

  // Handlers - remove chart by metric
  const toggleMetric = useCallback((metric) => {
    const chartWithMetric = charts.find(c => c.metric?.id === metric.id);
    if (chartWithMetric) {
      removeChart(chartWithMetric.id);
    }
  }, [charts, removeChart]);

  const updateMetricStyle = useCallback((metricId, key, value) => {
    setMetricStyles(prev => ({
      ...prev,
      [metricId]: { ...prev[metricId], [key]: value }
    }));
  }, []);

  const updateLegendLabel = useCallback((metricId, label) => {
    setLegendLabels(prev => ({ ...prev, [metricId]: label }));
  }, []);

  const updateGridConfig = useCallback((key, value) => {
    setStyleConfig(prev => ({
      ...prev,
      grid: { ...prev.grid, [key]: value }
    }));
  }, []);

  const updateLegendConfig = useCallback((key, value) => {
    setStyleConfig(prev => ({
      ...prev,
      legend: { ...prev.legend, [key]: value }
    }));
  }, []);

  const updateYAxisConfig = useCallback((key, value) => {
    setStyleConfig(prev => ({
      ...prev,
      yAxis: { ...prev.yAxis, [key]: value }
    }));
  }, []);

  const updateXAxisConfig = useCallback((key, value) => {
    setStyleConfig(prev => ({
      ...prev,
      xAxis: { ...prev.xAxis, [key]: value }
    }));
  }, []);

  const handleSave = async () => {
    if (!chartName.trim()) { setError('Введите название'); return; }
    if (selectedMetrics.length === 0) { setError('Выберите метрики'); return; }

    setIsLoading(true);
    setError(null);

    try {
      await adminAPI.chartBuilder.createChartConfig({
        name: chartName,
        chart_type: chartType,
        config: { metrics: selectedMetrics.map(m => m.id), timeRange, groupBy, style: styleConfig, metricStyles, legendLabels }
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      onSave?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!canvasRef.current) return;
    try {
      if (format === 'png') await canvasRef.current.exportToPNG(exportSettings);
      else if (format === 'svg') canvasRef.current.exportToSVG();
      else if (format === 'csv') canvasRef.current.exportToCSV();
    } catch (err) {
      setError(`Ошибка экспорта: ${err.message}`);
    }
  };

  return (
    <div className="chart-builder">
      {/* Header */}
      <div className="cb-header">
        <div className="cb-header-left">
          <Link to="/admin-panel/analytics" className="cb-back-btn">← Назад</Link>
          <input
            type="text"
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            placeholder="Название графика..."
            className="cb-title-input"
          />
        </div>
        <div className="cb-header-right">
          {showSuccess && <span className="cb-success-msg">✓ Сохранено</span>}
          <button className="cb-btn cb-btn-secondary" onClick={() => handleExport('png')} disabled={!selectedMetrics.length || dataLoading}>
            📥 Экспорт
          </button>
          <button className="cb-btn cb-btn-primary" onClick={handleSave} disabled={isLoading || !selectedMetrics.length}>
            {isLoading ? '⏳' : '💾'} Сохранить
          </button>
        </div>
      </div>

      {(error || dataError) && (
        <div className="cb-error">
          <span>⚠️ {error || dataError}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="cb-content">
        {/* Left Panel - Templates */}
        <div className="cb-panel cb-panel-left">
          <div className="cb-panel-header">
            <h3>📋 Шаблоны</h3>
          </div>

          <div className="cb-templates-list">
            {CHART_TEMPLATES.map(template => (
              <button
                key={template.id}
                className="cb-template-card"
                onClick={() => {
                  // Apply template - create charts with metrics
                  setChartType(template.type);
                  setTimeRange(template.timeRange);
                  const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
                  const metricsToAdd = template.metrics.map(mId => {
                    for (const cat of Object.values(METRIC_CATEGORIES)) {
                      const found = cat.metrics.find(m => m.id === mId);
                      if (found) return found;
                    }
                    return null;
                  }).filter(Boolean);
                  
                  // Create charts with these metrics
                  const newCharts = metricsToAdd.map((metric, idx) => ({
                    id: `chart_${Date.now()}_${idx}`,
                    metric,
                    style: {
                      lineStyle: 'solid',
                      curveType: 'smooth',
                      lineWidth: 2,
                      pointType: 'circle',
                    }
                  }));
                  setCharts(newCharts);
                  
                  // Initialize styles
                  const newStyles = {};
                  const newLabels = {};
                  metricsToAdd.forEach((metric, idx) => {
                    newStyles[metric.id] = {
                      color: colors[idx % colors.length],
                      lineStyle: 'solid',
                      curveType: 'smooth',
                      lineWidth: 2,
                      pointType: 'circle',
                      pointSize: 4,
                      fillOpacity: 0.1,
                    };
                    newLabels[metric.id] = metric.name;
                  });
                  setMetricStyles(newStyles);
                  setLegendLabels(newLabels);
                }}
              >
                <div className="cb-template-icon">{template.icon}</div>
                <div className="cb-template-info">
                  <span className="cb-template-name">{template.name}</span>
                  <span className="cb-template-desc">{template.description}</span>
                </div>
                <span className="cb-template-type">{CHART_TYPES.find(t => t.id === template.type)?.icon}</span>
              </button>
            ))}
          </div>

          <div className="cb-templates-hint">
            Выберите шаблон для быстрого старта или добавьте графики справа
          </div>
        </div>

        {/* Center - Chart */}
        <div className="cb-panel cb-panel-center">
          {/* Controls */}
          <div className="cb-controls">
            <div className="cb-time-controls">
              {TIME_RANGES.map(range => (
                <button
                  key={range.id}
                  className={`cb-time-btn ${timeRange === range.id ? 'active' : ''}`}
                  onClick={() => setTimeRange(range.id)}
                  disabled={!isTimeBased}
                >
                  {range.name}
                </button>
              ))}
            </div>

            <select 
              className="cb-select" 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              disabled={!isTimeBased}
            >
              <option value="day">По дням</option>
              <option value="week">По неделям</option>
              <option value="month">По месяцам</option>
            </select>

            <button className="cb-refresh" onClick={refetch} disabled={dataLoading || !selectedMetrics.length}>
              {dataLoading ? '⏳' : '🔄'}
            </button>
          </div>

          {/* Canvas */}
          <div className="cb-canvas">
            {selectedMetrics.length === 0 ? (
              <div className="cb-empty-state">
                <div className="cb-empty-icon">📊</div>
                <h4>Выберите метрики</h4>
                <p>Раскройте категорию слева и выберите показатели</p>
              </div>
            ) : (
              <Canvas
                ref={canvasRef}
                config={config}
                data={data}
                loading={dataLoading}
                styleConfig={fullStyleConfig}
                selectedMetrics={selectedMetrics}
              />
            )}
          </div>

          {data?.length > 0 && (
            <div className="cb-info">
              <span>📈 {data.length} точек</span>
              <span>⏱️ {TIME_RANGES.find(r => r.id === timeRange)?.name}</span>
            </div>
          )}
        </div>

        {/* Right Panel - Settings (Single Scroll Menu) */}
        <div className="cb-panel cb-panel-right">
          <div className="cb-settings-scroll">
            
            {/* Add Chart Button - Top */}
            <button 
              className="cb-add-chart-top"
              onClick={addChart}
              disabled={charts.length >= 5}
            >
              ➕ Добавить график ({charts.length}/5)
            </button>

            {/* Individual Charts */}
            <div className="cb-charts-individual">
              {charts.length === 0 ? (
                <div className="cb-no-charts">
                  <span className="cb-no-charts-icon">📊</span>
                  <span>Добавьте график для начала</span>
                </div>
              ) : (
                charts.map((chart, idx) => {
                  const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
                  const chartColor = chart.metric ? (metricStyles[chart.metric.id]?.color || colors[idx % colors.length]) : colors[idx % colors.length];
                  const isExpanded = expandedChartId === chart.id;
                  const style = metricStyles[chart.metric?.id] || {};
                  
                  return (
                    <div key={chart.id} className={`cb-chart-full ${isExpanded ? 'expanded' : ''}`} style={{ '--chart-color': chartColor }}>
                      {/* Chart Header */}
                      <div className="cb-chart-full-header" onClick={() => setExpandedChartId(isExpanded ? null : chart.id)}>
                        <div className="cb-chart-full-color" style={{ background: chartColor }}></div>
                        <div className="cb-chart-full-title">
                          {chart.metric ? (
                            <>
                              <span className="cb-chart-full-icon">{chart.metric.icon}</span>
                              <span className="cb-chart-full-name">{legendLabels[chart.metric?.id] || chart.metric.name}</span>
                            </>
                          ) : (
                            <span className="cb-chart-full-empty">График #{idx + 1}</span>
                          )}
                        </div>
                        <span className="cb-chart-full-arrow">{isExpanded ? '▼' : '▶'}</span>
                        <button 
                          className="cb-chart-full-remove" 
                          onClick={(e) => { e.stopPropagation(); removeChart(chart.id); }}
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* Expanded Settings */}
                      {isExpanded && (
                        <div className="cb-chart-full-body">
                          
                          {/* Metric Selection (Y-Axis Data) */}
                          <div className="cb-section">
                            <div className="cb-section-header">📊 Метрика (Ось Y)</div>
                            <input
                              type="text"
                              placeholder="🔍 Поиск..."
                              value={chartSearchQuery}
                              onChange={(e) => setChartSearchQuery(e.target.value)}
                              className="cb-section-search"
                            />
                            <div className="cb-metric-grid">
                              {(chartSearchQuery 
                                ? allMetrics.filter(m => m.name.toLowerCase().includes(chartSearchQuery.toLowerCase()))
                                : allMetrics
                              ).slice(0, 8).map(metric => {
                                const isActive = chart.metric?.id === metric.id;
                                const alreadyUsed = charts.some(c => c.metric?.id === metric.id && c.id !== chart.id);
                                return (
                                  <button
                                    key={metric.id}
                                    className={`cb-metric-chip ${isActive ? 'active' : ''} ${alreadyUsed ? 'used' : ''}`}
                                    onClick={() => !alreadyUsed && setChartMetric(chart.id, metric)}
                                    disabled={alreadyUsed}
                                  >
                                    {metric.icon} {metric.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {chart.metric && (
                            <>
                              {/* Line Settings */}
                              <div className="cb-section">
                                <div className="cb-section-header">〰️ Линия</div>
                                <div className="cb-section-grid">
                                  <div className="cb-field">
                                    <label>Тип</label>
                                    <select
                                      value={style.lineStyle || 'solid'}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'lineStyle', e.target.value)}
                                    >
                                      {LINE_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="cb-field">
                                    <label>Сглаживание</label>
                                    <select
                                      value={style.curveType || 'smooth'}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'curveType', e.target.value)}
                                    >
                                      {CURVE_TYPES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="cb-field">
                                    <label>Толщина: {style.lineWidth || 2}px</label>
                                    <input
                                      type="range"
                                      min="1"
                                      max="8"
                                      value={style.lineWidth || 2}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'lineWidth', parseInt(e.target.value))}
                                    />
                                  </div>
                                  <div className="cb-field">
                                    <label>Цвет</label>
                                    <input
                                      type="color"
                                      value={style.color || chartColor}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'color', e.target.value)}
                                      className="cb-color-full"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Points Settings */}
                              <div className="cb-section">
                                <div className="cb-section-header">
                                  <span>● Точки</span>
                                  <label className="cb-toggle-sm">
                                    <input
                                      type="checkbox"
                                      checked={style.showPoints !== false}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'showPoints', e.target.checked)}
                                    />
                                    <span className="cb-toggle-slider-sm"></span>
                                  </label>
                                </div>
                                {style.showPoints !== false && (
                                  <div className="cb-section-grid">
                                    <div className="cb-field">
                                      <label>Форма</label>
                                      <select
                                        value={style.pointType || 'circle'}
                                        onChange={(e) => updateMetricStyle(chart.metric.id, 'pointType', e.target.value)}
                                      >
                                        {POINT_TYPES.map(p => <option key={p.id} value={p.id}>{p.symbol} {p.name}</option>)}
                                      </select>
                                    </div>
                                    <div className="cb-field">
                                      <label>Размер: {style.pointSize || 4}px</label>
                                      <input
                                        type="range"
                                        min="2"
                                        max="12"
                                        value={style.pointSize || 4}
                                        onChange={(e) => updateMetricStyle(chart.metric.id, 'pointSize', parseInt(e.target.value))}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Y-Axis Settings */}
                              <div className="cb-section">
                                <div className="cb-section-header">📏 Ось Y</div>
                                <div className="cb-section-grid">
                                  <div className="cb-field">
                                    <label>Масштаб</label>
                                    <select
                                      value={style.yAxisScale || 'auto'}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'yAxisScale', e.target.value)}
                                    >
                                      <option value="auto">Авто</option>
                                      <option value="linear">Линейный</option>
                                      <option value="log">Логарифм</option>
                                      <option value="manual">Ручной</option>
                                    </select>
                                  </div>
                                  <div className="cb-field">
                                    <label>Формат</label>
                                    <select
                                      value={style.yFormat || 'auto'}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'yFormat', e.target.value)}
                                    >
                                      <option value="auto">Авто</option>
                                      <option value="integer">Целые</option>
                                      <option value="decimal">Десятичные</option>
                                      <option value="currency">₽ Валюта</option>
                                      <option value="percent">% Проценты</option>
                                      <option value="compact">Компактный (K/M)</option>
                                    </select>
                                  </div>
                                  {style.yAxisScale === 'manual' && (
                                    <>
                                      <div className="cb-field">
                                        <label>Минимум</label>
                                        <input
                                          type="number"
                                          value={style.yMin || ''}
                                          onChange={(e) => updateMetricStyle(chart.metric.id, 'yMin', e.target.value)}
                                          placeholder="Авто"
                                        />
                                      </div>
                                      <div className="cb-field">
                                        <label>Максимум</label>
                                        <input
                                          type="number"
                                          value={style.yMax || ''}
                                          onChange={(e) => updateMetricStyle(chart.metric.id, 'yMax', e.target.value)}
                                          placeholder="Авто"
                                        />
                                      </div>
                                    </>
                                  )}
                                  <div className="cb-field">
                                    <label>Делений: {style.yTicks || 5}</label>
                                    <input
                                      type="range"
                                      min="2"
                                      max="10"
                                      value={style.yTicks || 5}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'yTicks', parseInt(e.target.value))}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Fill Settings */}
                              <div className="cb-section">
                                <div className="cb-section-header">
                                  <span>🎨 Заливка</span>
                                  <label className="cb-toggle-sm">
                                    <input
                                      type="checkbox"
                                      checked={style.showFill === true}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'showFill', e.target.checked)}
                                    />
                                    <span className="cb-toggle-slider-sm"></span>
                                  </label>
                                </div>
                                {style.showFill && (
                                  <div className="cb-section-row">
                                    <label>Прозрачность: {Math.round((style.fillOpacity || 0.1) * 100)}%</label>
                                    <input
                                      type="range"
                                      min="5"
                                      max="80"
                                      value={(style.fillOpacity || 0.1) * 100}
                                      onChange={(e) => updateMetricStyle(chart.metric.id, 'fillOpacity', parseInt(e.target.value) / 100)}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Legend Label */}
                              <div className="cb-section">
                                <div className="cb-section-header">🏷️ Подпись</div>
                                <input
                                  type="text"
                                  value={legendLabels[chart.metric.id] || ''}
                                  onChange={(e) => updateLegendLabel(chart.metric.id, e.target.value)}
                                  placeholder={chart.metric.name}
                                  className="cb-legend-input-full"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Divider */}
            <div className="cb-panel-divider">
              <span>Настройки полотна</span>
            </div>

            {/* Canvas Settings */}
            <div className="cb-canvas-settings">
              
              {/* Chart Title */}
              <div className="cb-canvas-field">
                <label>📝 Название графика</label>
                <input
                  type="text"
                  value={styleConfig.title || ''}
                  onChange={(e) => setStyleConfig(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Мой график"
                  className="cb-canvas-input"
                />
              </div>

              {/* Chart Type */}
              <div className="cb-canvas-field">
                <label>📈 Тип диаграммы</label>
                <div className="cb-canvas-types">
                  {CHART_TYPES.map(type => (
                    <button
                      key={type.id}
                      className={`cb-canvas-type ${chartType === type.id ? 'active' : ''}`}
                      onClick={() => setChartType(type.id)}
                      title={type.name}
                    >
                      {type.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="cb-canvas-field">
                <label>🎨 Цветовая схема</label>
                <div className="cb-canvas-palettes">
                  {Object.entries(COLOR_PALETTES).map(([id, palette]) => (
                    <button
                      key={id}
                      className={`cb-canvas-palette ${styleConfig.colorPalette === id ? 'active' : ''}`}
                      onClick={() => setStyleConfig(prev => ({ ...prev, colorPalette: id }))}
                      title={palette.name}
                    >
                      {palette.colors.slice(0, 4).map((c, i) => (
                        <span key={i} style={{ background: c }}></span>
                      ))}
                    </button>
                  ))}
                </div>
              </div>

              {/* X-Axis Dimension */}
              <div className="cb-canvas-field">
                <label>📏 Ось X — Группировка</label>
                <select 
                  className="cb-canvas-select"
                  value={xAxisDimension}
                  onChange={(e) => setXAxisDimension(e.target.value)}
                >
                  {Object.entries(X_AXIS_DIMENSIONS).map(([catId, category]) => (
                    <optgroup key={catId} label={category.name}>
                      {category.options.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.icon} {option.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="cb-canvas-row">
                  <input
                    type="text"
                    value={styleConfig.xAxis.label}
                    onChange={(e) => updateXAxisConfig('label', e.target.value)}
                    placeholder="Название оси"
                    className="cb-canvas-input-sm"
                  />
                  <input
                    type="number"
                    value={styleConfig.xAxis.rotation}
                    onChange={(e) => updateXAxisConfig('rotation', parseInt(e.target.value) || 0)}
                    className="cb-canvas-input-sm"
                    placeholder="Угол°"
                    style={{ width: '60px' }}
                  />
                </div>
              </div>

              {/* Global Y-Axis */}
              <div className="cb-canvas-field">
                <label>📐 Ось Y — Общие значения</label>
                <div className="cb-canvas-row">
                  <input
                    type="text"
                    value={styleConfig.yAxis.label}
                    onChange={(e) => updateYAxisConfig('label', e.target.value)}
                    placeholder="Название оси"
                    className="cb-canvas-input-sm"
                  />
                  <select
                    value={styleConfig.yAxis.format}
                    onChange={(e) => updateYAxisConfig('format', e.target.value)}
                    className="cb-canvas-select-sm"
                  >
                    <option value="auto">Авто</option>
                    <option value="integer">123</option>
                    <option value="currency">₽</option>
                    <option value="percent">%</option>
                    <option value="compact">K/M</option>
                  </select>
                </div>
                <div className="cb-canvas-row">
                  <input
                    type="number"
                    value={styleConfig.yAxis.min}
                    onChange={(e) => updateYAxisConfig('min', e.target.value)}
                    placeholder="Мин"
                    className="cb-canvas-input-sm"
                  />
                  <span className="cb-sep">—</span>
                  <input
                    type="number"
                    value={styleConfig.yAxis.max}
                    onChange={(e) => updateYAxisConfig('max', e.target.value)}
                    placeholder="Макс"
                    className="cb-canvas-input-sm"
                  />
                </div>
              </div>

              {/* Grid Settings */}
              <div className="cb-canvas-field cb-canvas-toggle-field">
                <div className="cb-canvas-toggle-header">
                  <label>📐 Сетка</label>
                  <label className="cb-toggle-sm">
                    <input
                      type="checkbox"
                      checked={styleConfig.grid.show}
                      onChange={(e) => updateGridConfig('show', e.target.checked)}
                    />
                    <span className="cb-toggle-slider-sm"></span>
                  </label>
                </div>
                {styleConfig.grid.show && (
                  <div className="cb-canvas-sub">
                    <div className="cb-canvas-row">
                      <input
                        type="color"
                        value={styleConfig.grid.color}
                        onChange={(e) => updateGridConfig('color', e.target.value)}
                        className="cb-canvas-color"
                      />
                      <select
                        value={styleConfig.grid.style}
                        onChange={(e) => updateGridConfig('style', e.target.value)}
                        className="cb-canvas-select-sm"
                      >
                        <option value="solid">━━━</option>
                        <option value="dashed">╌╌╌</option>
                        <option value="dotted">····</option>
                      </select>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={styleConfig.grid.opacity * 100}
                        onChange={(e) => updateGridConfig('opacity', parseInt(e.target.value) / 100)}
                        className="cb-canvas-range"
                      />
                    </div>
                    <div className="cb-canvas-checks">
                      <label><input type="checkbox" checked={styleConfig.grid.xLines} onChange={(e) => updateGridConfig('xLines', e.target.checked)} /> Верт.</label>
                      <label><input type="checkbox" checked={styleConfig.grid.yLines} onChange={(e) => updateGridConfig('yLines', e.target.checked)} /> Гориз.</label>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend Settings */}
              <div className="cb-canvas-field cb-canvas-toggle-field">
                <div className="cb-canvas-toggle-header">
                  <label>🏷️ Легенда</label>
                  <label className="cb-toggle-sm">
                    <input
                      type="checkbox"
                      checked={styleConfig.legend.show}
                      onChange={(e) => updateLegendConfig('show', e.target.checked)}
                    />
                    <span className="cb-toggle-slider-sm"></span>
                  </label>
                </div>
                {styleConfig.legend.show && (
                  <div className="cb-canvas-sub">
                    <div className="cb-legend-positions">
                      {LEGEND_POSITIONS.filter(p => p.id !== 'none').map(pos => (
                        <button
                          key={pos.id}
                          className={`cb-legend-pos ${styleConfig.legend.position === pos.id ? 'active' : ''}`}
                          onClick={() => updateLegendConfig('position', pos.id)}
                          title={pos.name}
                        >
                          {pos.name.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;
