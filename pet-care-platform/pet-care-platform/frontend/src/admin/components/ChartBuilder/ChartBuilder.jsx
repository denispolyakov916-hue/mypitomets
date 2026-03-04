import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';

import Canvas from './Canvas';

import { useOptimizedChartData } from '../../../hooks/useOptimizedChartData';
import { useMetricsLibrary } from '../../../hooks/useMetricsLibrary';

import adminApi, { adminAPI } from '../../utils/api';

const RUSSIAN_LABELS = {
  users_total: 'Всего пользователей', users_new: 'Новые пользователи', users_active: 'Активные пользователи',
  pets_total: 'Всего питомцев', pets_dogs: 'Собаки', pets_cats: 'Кошки',
  orders_total: 'Всего заказов', orders_revenue: 'Выручка', orders_avg_check: 'Средний чек',
  products_total: 'Всего товаров', products_in_stock: 'В наличии',
  courses_total: 'Всего курсов', courses_enrollments: 'Записи на курсы',
  date: 'Дата', pet_species: 'Вид питомца', product_category: 'Категория товара',
  order_status: 'Статус заказа', user_role: 'Роль пользователя',
  course_category: 'Категория курса', course_level: 'Уровень курса',
};

const X_AXIS_DIMENSIONS = {
  time: { name: '📅 Время', description: 'Временные измерения', options: [
    { id: 'date', name: 'По дате', icon: '📅', description: 'Группировка по дням' },
    { id: 'week', name: 'По неделям', icon: '📆', description: 'Группировка по неделям' },
    { id: 'month', name: 'По месяцам', icon: '🗓️', description: 'Группировка по месяцам' },
  ]},
  pets: { name: '🐾 Питомцы', description: 'Измерения по питомцам', options: [
    { id: 'pet_species', name: 'Вид питомца', icon: '🐾', description: 'Собаки, кошки и др.' },
    { id: 'pet_breed', name: 'Порода', icon: '🏷️', description: 'По породам питомцев' },
    { id: 'pet_age_group', name: 'Возрастная группа', icon: '📊', description: 'Щенок, взрослый, пожилой' },
  ]},
  products: { name: '🛒 Товары', description: 'Измерения по товарам', options: [
    { id: 'product_category', name: 'Категория товара', icon: '📦', description: 'По категориям товаров' },
    { id: 'product_brand', name: 'Бренд', icon: '🏢', description: 'По брендам' },
  ]},
  orders: { name: '📋 Заказы', description: 'Измерения по заказам', options: [
    { id: 'order_status', name: 'Статус заказа', icon: '📋', description: 'По статусам заказов' },
    { id: 'payment_method', name: 'Способ оплаты', icon: '💳', description: 'По способам оплаты' },
  ]},
  users: { name: '👥 Пользователи', description: 'Измерения по пользователям', options: [
    { id: 'user_city', name: 'Город', icon: '🏙️', description: 'По городам пользователей' },
    { id: 'user_registration_source', name: 'Источник регистрации', icon: '🔗', description: 'Откуда пришли' },
  ]},
  courses: { name: '🎓 Курсы', description: 'Измерения по курсам', options: [
    { id: 'course_category', name: 'Категория курса', icon: '🎓', description: 'По категориям курсов' },
    { id: 'course_level', name: 'Уровень курса', icon: '📈', description: 'Начальный, продвинутый' },
  ]}
};

const CHART_TEMPLATES = [
  { id: 'users_growth', name: 'Рост пользователей', icon: '📈', description: 'Динамика регистраций', type: 'line', metrics: ['users_total', 'users_active'], timeRange: '30d' },
  { id: 'revenue_analysis', name: 'Анализ выручки', icon: '💰', description: 'Финансовые показатели', type: 'area', metrics: ['orders_revenue', 'orders_avg_check'], timeRange: '30d' },
  { id: 'orders_overview', name: 'Обзор заказов', icon: '📦', description: 'Статистика заказов', type: 'bar', metrics: ['orders_total'], timeRange: '30d' },
  { id: 'pets_distribution', name: 'Распределение питомцев', icon: '🐾', description: 'По видам животных', type: 'pie', metrics: ['pets_dogs', 'pets_cats'], timeRange: '30d' },
  { id: 'products_stock', name: 'Товары на складе', icon: '🏷️', description: 'Наличие товаров', type: 'bar', metrics: ['products_total', 'products_in_stock'], timeRange: '7d' },
];

const METRIC_CATEGORIES = {
  users: { name: '👥 Пользователи', description: 'Статистика пользователей', metrics: [
    { id: 'users_total', name: 'Новые регистрации', icon: '👥', description: 'Кол-во новых пользователей за период' },
    { id: 'users_new', name: 'Новые пользователи', icon: '➕', description: 'Количество новых регистраций' },
    { id: 'users_active', name: 'Активные пользователи', icon: '🟢', description: 'Пользователи с входом за период' },
  ]},
  finance: { name: '💰 Финансы', description: 'Экономические показатели', metrics: [
    { id: 'orders_revenue', name: 'Выручка', icon: '💰', description: 'Общая сумма заказов' },
    { id: 'orders_avg_check', name: 'Средний чек', icon: '🧾', description: 'Средняя сумма заказа' },
    { id: 'orders_total', name: 'Количество заказов', icon: '📦', description: 'Общее число заказов' },
  ]},
  pets: { name: '🐾 Питомцы', description: 'Данные о питомцах', metrics: [
    { id: 'pets_total', name: 'Всего питомцев', icon: '🐾', description: 'Общее количество питомцев' },
    { id: 'pets_dogs', name: 'Собаки', icon: '🐕', description: 'Количество собак' },
    { id: 'pets_cats', name: 'Кошки', icon: '🐈', description: 'Количество кошек' },
  ]},
  products: { name: '🏷️ Товары', description: 'Каталог товаров', metrics: [
    { id: 'products_total', name: 'Всего товаров', icon: '🏷️', description: 'Количество товаров в каталоге' },
    { id: 'products_in_stock', name: 'В наличии', icon: '✅', description: 'Товары в наличии' },
  ]},
  education: { name: '🎓 Обучение', description: 'Курсы и записи', metrics: [
    { id: 'courses_total', name: 'Всего курсов', icon: '🎓', description: 'Количество курсов' },
    { id: 'courses_enrollments', name: 'Записи на курсы', icon: '📝', description: 'Записей на курсы' },
  ]}
};

const CHART_TYPES = [
  { id: 'line', name: 'Линия', icon: '📈' }, { id: 'bar', name: 'Столбцы', icon: '📊' },
  { id: 'area', name: 'Область', icon: '🏔️' }, { id: 'scatter', name: 'Точки', icon: '⬤' },
  { id: 'pie', name: 'Круг', icon: '◐' },
];

const TIME_RANGES = [
  { id: '7d', name: '7 дней' }, { id: '30d', name: '30 дней' },
  { id: '90d', name: '90 дней' }, { id: '1y', name: '1 год' },
];

const LINE_STYLES = [
  { id: 'solid', name: 'Сплошная', preview: '━━━━' }, { id: 'dashed', name: 'Пунктир', preview: '╌╌╌╌' },
  { id: 'dotted', name: 'Точки', preview: '····' }, { id: 'dashdot', name: 'Штрих-точка', preview: '─·─·' },
];

const CURVE_TYPES = [
  { id: 'smooth', name: 'Сглаженная' }, { id: 'linear', name: 'Прямая' }, { id: 'step', name: 'Ступенчатая' },
];

const POINT_TYPES = [
  { id: 'circle', name: 'Круг', symbol: '●' }, { id: 'square', name: 'Квадрат', symbol: '■' },
  { id: 'triangle', name: 'Треугольник', symbol: '▲' }, { id: 'diamond', name: 'Ромб', symbol: '◆' },
  { id: 'none', name: 'Без точек', symbol: '—' },
];

const COLOR_PALETTES = {
  default: { name: 'Стандартная', colors: ['#C86BFA', '#22c55e', '#f59e0b', '#ef4444', '#C86BFA'] },
  ocean: { name: 'Океан', colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16'] },
  sunset: { name: 'Закат', colors: ['#f97316', '#ef4444', '#ec4899', '#d946ef', '#C86BFA'] },
  forest: { name: 'Лес', colors: ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  mono: { name: 'Монохром', colors: ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db'] },
};

const LEGEND_POSITIONS = [
  { id: 'top', name: 'Сверху' }, { id: 'bottom', name: 'Снизу' },
  { id: 'right', name: 'Справа' }, { id: 'left', name: 'Слева' }, { id: 'none', name: 'Скрыть' },
];

const getRussianLabel = (id) => RUSSIAN_LABELS[id] || id;

const ChartBuilder = ({ initialConfig, onSave, onClose }) => {
  const canvasRef = useRef(null);

  const [chartName, setChartName] = useState(initialConfig?.name || '');
  const [chartType, setChartType] = useState(initialConfig?.type || 'line');
  const [timeRange, setTimeRange] = useState('30d');
  const [groupBy, setGroupBy] = useState('day');
  const [charts, setCharts] = useState([]);
  const [expandedChartId, setExpandedChartId] = useState(null);
  const [chartSearchQuery, setChartSearchQuery] = useState('');
  const [xAxisDimension, setXAxisDimension] = useState('date');
  const [expandedXCategory, setExpandedXCategory] = useState('time');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedMetrics = useMemo(() => charts.filter(c => c.metric).map(c => c.metric), [charts]);

  const [metricStyles, setMetricStyles] = useState({});
  const [legendLabels, setLegendLabels] = useState({});

  const [styleConfig, setStyleConfig] = useState({
    colorPalette: 'default',
    grid: { show: true, color: '#e5e7eb', style: 'dashed', opacity: 0.5, xLines: true, yLines: true },
    legend: { show: true, position: 'top', fontSize: 12, itemSpacing: 20 },
    xAxis: { label: '', rotation: 0, fontSize: 12, showLine: true, showTicks: true, minIndex: '', maxIndex: '' },
    yAxis: { label: '', min: '', max: '', format: 'auto', fontSize: 12, showLine: true, showTicks: true, gridLines: 5 },
    animation: true, showTooltips: true,
  });

  const [exportSettings, setExportSettings] = useState({ width: 1920, height: 1080, format: 'png', transparentBg: false });

  const allMetrics = useMemo(() => {
    const metrics = [];
    Object.entries(METRIC_CATEGORIES).forEach(([catId, cat]) => { cat.metrics.forEach(m => { metrics.push({ ...m, category: catId }); }); });
    return metrics;
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allMetrics.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
  }, [searchQuery, allMetrics]);

  const currentXDimension = useMemo(() => {
    for (const cat of Object.values(X_AXIS_DIMENSIONS)) {
      const found = cat.options.find(o => o.id === xAxisDimension);
      if (found) return found;
    }
    return { id: 'date', name: 'По дате', icon: '📅' };
  }, [xAxisDimension]);

  const isTimeBased = ['date', 'week', 'month'].includes(xAxisDimension);

  const config = useMemo(() => ({
    type: chartType, metrics: selectedMetrics.map(m => m.id), xField: xAxisDimension,
    dimension: xAxisDimension, timeRange: isTimeBased ? timeRange : null,
    groupBy: isTimeBased ? groupBy : xAxisDimension, filters: {}
  }), [chartType, selectedMetrics, xAxisDimension, timeRange, groupBy, isTimeBased]);

  const fullStyleConfig = useMemo(() => ({
    ...styleConfig, metricStyles, legendLabels, russianLabels: RUSSIAN_LABELS,
    colors: COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors,
    xAxisDimension, currentXDimension,
  }), [styleConfig, metricStyles, legendLabels, xAxisDimension, currentXDimension]);

  const { data, loading: dataLoading, refetch, error: dataError } = useOptimizedChartData(config);

  const addChart = useCallback(() => {
    if (charts.length >= 5) return;
    const newChart = { id: `chart_${Date.now()}`, metric: null, style: { lineStyle: 'solid', curveType: 'smooth', lineWidth: 2, pointType: 'circle' } };
    setCharts(prev => [...prev, newChart]);
    setExpandedChartId(newChart.id);
  }, [charts.length]);

  const removeChart = useCallback((chartId) => {
    setCharts(prev => prev.filter(c => c.id !== chartId));
    if (expandedChartId === chartId) setExpandedChartId(null);
  }, [expandedChartId]);

  const setChartMetric = useCallback((chartId, metric) => {
    const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
    const chartIndex = charts.findIndex(c => c.id === chartId);
    setCharts(prev => prev.map(c => c.id === chartId ? { ...c, metric } : c));
    if (metric && !metricStyles[metric.id]) {
      setMetricStyles(prev => ({ ...prev, [metric.id]: { color: colors[chartIndex % colors.length], lineStyle: 'solid', curveType: 'smooth', lineWidth: 2, pointType: 'circle', pointSize: 4, fillOpacity: 0.1 } }));
      setLegendLabels(prev => ({ ...prev, [metric.id]: metric.name || getRussianLabel(metric.id) }));
    }
    setExpandedChartId(null);
    setChartSearchQuery('');
  }, [charts, styleConfig.colorPalette, metricStyles]);

  const updateChartStyle = useCallback((chartId, key, value) => {
    setCharts(prev => prev.map(c => c.id === chartId ? { ...c, style: { ...c.style, [key]: value } } : c));
  }, []);

  useEffect(() => {
    const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
    selectedMetrics.forEach((metric, index) => {
      if (!metricStyles[metric.id]) {
        setMetricStyles(prev => ({ ...prev, [metric.id]: { color: colors[index % colors.length], lineStyle: 'solid', curveType: 'smooth', lineWidth: 2, pointType: 'circle', pointSize: 4, fillOpacity: 0.1 } }));
      }
      if (!legendLabels[metric.id]) {
        setLegendLabels(prev => ({ ...prev, [metric.id]: metric.name || getRussianLabel(metric.id) }));
      }
    });
  }, [selectedMetrics, styleConfig.colorPalette]);

  const toggleMetric = useCallback((metric) => {
    const chartWithMetric = charts.find(c => c.metric?.id === metric.id);
    if (chartWithMetric) removeChart(chartWithMetric.id);
  }, [charts, removeChart]);

  const updateMetricStyle = useCallback((metricId, key, value) => { setMetricStyles(prev => ({ ...prev, [metricId]: { ...prev[metricId], [key]: value } })); }, []);
  const updateLegendLabel = useCallback((metricId, label) => { setLegendLabels(prev => ({ ...prev, [metricId]: label })); }, []);
  const updateGridConfig = useCallback((key, value) => { setStyleConfig(prev => ({ ...prev, grid: { ...prev.grid, [key]: value } })); }, []);
  const updateLegendConfig = useCallback((key, value) => { setStyleConfig(prev => ({ ...prev, legend: { ...prev.legend, [key]: value } })); }, []);
  const updateYAxisConfig = useCallback((key, value) => { setStyleConfig(prev => ({ ...prev, yAxis: { ...prev.yAxis, [key]: value } })); }, []);
  const updateXAxisConfig = useCallback((key, value) => { setStyleConfig(prev => ({ ...prev, xAxis: { ...prev.xAxis, [key]: value } })); }, []);

  const handleSave = async () => {
    if (!chartName.trim()) { setError('Введите название'); return; }
    if (selectedMetrics.length === 0) { setError('Выберите метрики'); return; }
    setIsLoading(true); setError(null);
    try {
      await adminAPI.chartBuilder.createChartConfig({ name: chartName, chart_type: chartType, config: { metrics: selectedMetrics.map(m => m.id), timeRange, groupBy, style: styleConfig, metricStyles, legendLabels } });
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); onSave?.();
    } catch (err) { setError(err.response?.data?.error || 'Ошибка сохранения'); }
    finally { setIsLoading(false); }
  };

  const handleExport = async (format) => {
    if (!canvasRef.current) return;
    try {
      if (format === 'png') await canvasRef.current.exportToPNG(exportSettings);
      else if (format === 'svg') canvasRef.current.exportToSVG();
      else if (format === 'csv') canvasRef.current.exportToCSV();
    } catch (err) { setError(`Ошибка экспорта: ${err.message}`); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-gray-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link to="/admin-panel/analytics" className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm no-underline transition-all duration-200 hover:bg-gray-200 hover:text-gray-800">← Назад</Link>
          <input type="text" value={chartName} onChange={(e) => setChartName(e.target.value)} placeholder="Название графика..." className="text-lg font-semibold text-gray-800 border-none bg-transparent px-3 py-1.5 rounded-md min-w-[280px] focus:outline-none focus:bg-gray-100" />
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && <span className="text-emerald-600 text-sm font-medium px-3 py-1.5 bg-emerald-50 rounded-md">✓ Сохранено</span>}
          <button className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleExport('png')} disabled={!selectedMetrics.length || dataLoading}>📥 Экспорт</button>
          <button className="flex items-center gap-1.5 px-4 py-2.5 border-none rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSave} disabled={isLoading || !selectedMetrics.length}>{isLoading ? '⏳' : '💾'} Сохранить</button>
        </div>
      </div>

      {(error || dataError) && (
        <div className="flex justify-between items-center px-5 py-3 bg-red-50 border-b border-red-200 text-red-600 text-sm">
          <span>⚠️ {error || dataError}</span>
          <button onClick={() => setError(null)} className="bg-transparent border-none text-red-600 cursor-pointer text-base p-1">✕</button>
        </div>
      )}

      <div className="grid grid-cols-[240px_1fr_280px] gap-px flex-1 bg-gray-200 overflow-hidden">
        {/* Left Panel - Templates */}
        <div className="bg-white flex flex-col overflow-hidden max-h-full min-w-[220px]">
          <div className="flex justify-between items-center px-3 py-2.5 border-b border-gray-200 bg-[#fafafa]">
            <h3 className="text-xs font-semibold text-gray-800 m-0">📋 Шаблоны</h3>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 flex flex-col gap-1.5 scrollbar-thin">
            {CHART_TEMPLATES.map(template => (
              <button
                key={template.id}
                className="flex items-center gap-2.5 w-full p-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-left transition-all duration-200 hover:border-primary-500 hover:bg-slate-50 hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(200,107,250,0.1)]"
                onClick={() => {
                  setChartType(template.type);
                  setTimeRange(template.timeRange);
                  const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
                  const metricsToAdd = template.metrics.map(mId => {
                    for (const cat of Object.values(METRIC_CATEGORIES)) { const found = cat.metrics.find(m => m.id === mId); if (found) return found; }
                    return null;
                  }).filter(Boolean);
                  const newCharts = metricsToAdd.map((metric, idx) => ({ id: `chart_${Date.now()}_${idx}`, metric, style: { lineStyle: 'solid', curveType: 'smooth', lineWidth: 2, pointType: 'circle' } }));
                  setCharts(newCharts);
                  const newStyles = {}; const newLabels = {};
                  metricsToAdd.forEach((metric, idx) => {
                    newStyles[metric.id] = { color: colors[idx % colors.length], lineStyle: 'solid', curveType: 'smooth', lineWidth: 2, pointType: 'circle', pointSize: 4, fillOpacity: 0.1 };
                    newLabels[metric.id] = metric.name;
                  });
                  setMetricStyles(newStyles); setLegendLabels(newLabels);
                }}
              >
                <div className="text-xl shrink-0">{template.icon}</div>
                <div className="flex-1 flex flex-col gap-px min-w-0">
                  <span className="text-xs font-semibold text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">{template.name}</span>
                  <span className="text-[10px] text-gray-500">{template.description}</span>
                </div>
                <span className="text-sm opacity-60">{CHART_TYPES.find(t => t.id === template.type)?.icon}</span>
              </button>
            ))}
          </div>

          <div className="text-center text-[10px] text-gray-400 px-3 py-3 mx-2.5 mb-2.5 bg-gray-100 rounded-md leading-snug">
            Выберите шаблон для быстрого старта или добавьте графики справа
          </div>
        </div>

        {/* Center - Chart */}
        <div className="bg-gray-50 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {TIME_RANGES.map(range => (
                <button key={range.id} className={`px-3 py-1.5 border-none rounded-md cursor-pointer text-[13px] transition-all duration-200 ${timeRange === range.id ? 'bg-white text-gray-800 font-medium shadow-sm' : 'bg-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`} onClick={() => setTimeRange(range.id)} disabled={!isTimeBased}>{range.name}</button>
              ))}
            </div>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-primary-500" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} disabled={!isTimeBased}>
              <option value="day">По дням</option><option value="week">По неделям</option><option value="month">По месяцам</option>
            </select>
            <button className="px-3 py-2 border border-gray-200 rounded-lg bg-white cursor-pointer text-base transition-all duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" onClick={refetch} disabled={dataLoading || !selectedMetrics.length}>{dataLoading ? '⏳' : '🔄'}</button>
          </div>

          <div className="flex-1 p-4 min-h-[350px] flex items-center justify-center">
            {selectedMetrics.length === 0 ? (
              <div className="text-center p-10">
                <div className="text-5xl mb-4 opacity-60">📊</div>
                <h4 className="text-lg font-semibold text-gray-700 m-0 mb-2">Выберите метрики</h4>
                <p className="text-sm text-gray-500 m-0">Раскройте категорию слева и выберите показатели</p>
              </div>
            ) : (
              <Canvas ref={canvasRef} config={config} data={data} loading={dataLoading} styleConfig={fullStyleConfig} selectedMetrics={selectedMetrics} />
            )}
          </div>

          {data?.length > 0 && (
            <div className="flex gap-4 px-4 py-2.5 bg-white border-t border-gray-200 text-xs text-gray-500">
              <span>📈 {data.length} точек</span>
              <span>⏱️ {TIME_RANGES.find(r => r.id === timeRange)?.name}</span>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="bg-white flex flex-col overflow-hidden min-w-[280px] max-w-[320px]">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 flex flex-col gap-1.5 scrollbar-thin">

            <button className="w-full px-4 py-3 border-none rounded-[10px] bg-gradient-to-br from-primary-500 to-primary-600 text-white text-[13px] font-semibold cursor-pointer transition-all duration-200 mb-2 shadow-[0_2px_8px_rgba(200,107,250,0.25)] hover:from-primary-600 hover:to-primary-700 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(200,107,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={addChart} disabled={charts.length >= 5}>
              ➕ Добавить график ({charts.length}/5)
            </button>

            <div className="flex flex-col gap-1.5 max-h-[calc(100vh-500px)] min-h-[200px] overflow-y-auto mb-3 pr-1 scrollbar-thin">
              {charts.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-gray-400 text-center bg-gray-50 rounded-[10px] border-2 border-dashed border-gray-200">
                  <span className="text-[32px] mb-2 opacity-50">📊</span>
                  <span>Добавьте график для начала</span>
                </div>
              ) : (
                charts.map((chart, idx) => {
                  const colors = COLOR_PALETTES[styleConfig.colorPalette]?.colors || COLOR_PALETTES.default.colors;
                  const chartColor = chart.metric ? (metricStyles[chart.metric.id]?.color || colors[idx % colors.length]) : colors[idx % colors.length];
                  const isExpanded = expandedChartId === chart.id;
                  const style = metricStyles[chart.metric?.id] || {};

                  return (
                    <div key={chart.id} className={`bg-white rounded-[10px] border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${isExpanded ? 'shadow-[0_4px_16px_rgba(0,0,0,0.1)]' : ''}`} style={{ borderLeftWidth: '4px', borderLeftColor: chartColor }}>
                      <div className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors duration-200 hover:bg-gray-100 ${isExpanded ? 'bg-[#f0f4f8] border-b border-gray-200' : 'bg-[#fafafa]'}`} onClick={() => setExpandedChartId(isExpanded ? null : chart.id)}>
                        <div className="w-3.5 h-3.5 rounded shrink-0" style={{ background: chartColor }}></div>
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          {chart.metric ? (
                            <>
                              <span className="text-sm shrink-0">{chart.metric.icon}</span>
                              <span className="text-xs font-semibold text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">{legendLabels[chart.metric?.id] || chart.metric.name}</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">График #{idx + 1}</span>
                          )}
                        </div>
                        <span className={`text-[10px] transition-transform duration-200 ${isExpanded ? 'text-primary-500' : 'text-gray-400'}`}>{isExpanded ? '▼' : '▶'}</span>
                        <button className="bg-transparent border-none text-gray-400 cursor-pointer text-lg leading-none px-1.5 py-1 rounded transition-all duration-200 hover:text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); removeChart(chart.id); }}>×</button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 bg-gray-50">
                          {/* Metric Selection */}
                          <div className="mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.3px]">📊 Метрика (Ось Y)</div>
                            <input type="text" placeholder="🔍 Поиск..." value={chartSearchQuery} onChange={(e) => setChartSearchQuery(e.target.value)} className="w-full px-2.5 py-2 border border-gray-300 rounded-md text-[11px] bg-white mb-2 focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_2px_rgba(200,107,250,0.1)]" />
                            <div className="flex flex-wrap gap-1">
                              {(chartSearchQuery ? allMetrics.filter(m => m.name.toLowerCase().includes(chartSearchQuery.toLowerCase())) : allMetrics).slice(0, 8).map(metric => {
                                const isActive = chart.metric?.id === metric.id;
                                const alreadyUsed = charts.some(c => c.metric?.id === metric.id && c.id !== chart.id);
                                return (
                                  <button key={metric.id} className={`px-2.5 py-1.5 border rounded-2xl bg-white text-[10px] cursor-pointer transition-all duration-200 whitespace-nowrap ${isActive ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-primary-500 hover:bg-sky-50'} ${alreadyUsed ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => !alreadyUsed && setChartMetric(chart.id, metric)} disabled={alreadyUsed}>
                                    {metric.icon} {metric.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {chart.metric && (
                            <>
                              {/* Line Settings */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.3px]">〰️ Линия</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] text-gray-500">Тип</label>
                                    <select value={style.lineStyle || 'solid'} onChange={(e) => updateMetricStyle(chart.metric.id, 'lineStyle', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500">{LINE_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] text-gray-500">Сглаживание</label>
                                    <select value={style.curveType || 'smooth'} onChange={(e) => updateMetricStyle(chart.metric.id, 'curveType', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500">{CURVE_TYPES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] text-gray-500">Толщина: {style.lineWidth || 2}px</label>
                                    <input type="range" min="1" max="8" value={style.lineWidth || 2} onChange={(e) => updateMetricStyle(chart.metric.id, 'lineWidth', parseInt(e.target.value))} className="w-full cursor-pointer h-1" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] text-gray-500">Цвет</label>
                                    <input type="color" value={style.color || chartColor} onChange={(e) => updateMetricStyle(chart.metric.id, 'color', e.target.value)} className="w-full h-7 border border-gray-200 rounded cursor-pointer p-0.5" />
                                  </div>
                                </div>
                              </div>

                              {/* Points */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.3px]">
                                  <span>● Точки</span>
                                  <label className="relative inline-block w-8 h-[18px]">
                                    <input type="checkbox" checked={style.showPoints !== false} onChange={(e) => updateMetricStyle(chart.metric.id, 'showPoints', e.target.checked)} className="opacity-0 w-0 h-0 peer" />
                                    <span className="absolute cursor-pointer inset-0 bg-gray-300 rounded-full transition-colors duration-200 before:content-[''] before:absolute before:h-3.5 before:w-3.5 before:left-0.5 before:bottom-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 before:shadow-sm peer-checked:bg-primary-500 peer-checked:before:translate-x-3.5"></span>
                                  </label>
                                </div>
                                {style.showPoints !== false && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] text-gray-500">Форма</label>
                                      <select value={style.pointType || 'circle'} onChange={(e) => updateMetricStyle(chart.metric.id, 'pointType', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500">{POINT_TYPES.map(p => <option key={p.id} value={p.id}>{p.symbol} {p.name}</option>)}</select>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <label className="text-[10px] text-gray-500">Размер: {style.pointSize || 4}px</label>
                                      <input type="range" min="2" max="12" value={style.pointSize || 4} onChange={(e) => updateMetricStyle(chart.metric.id, 'pointSize', parseInt(e.target.value))} className="w-full cursor-pointer h-1" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Y-Axis */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.3px]">📏 Ось Y</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col gap-0.5"><label className="text-[10px] text-gray-500">Масштаб</label><select value={style.yAxisScale || 'auto'} onChange={(e) => updateMetricStyle(chart.metric.id, 'yAxisScale', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500"><option value="auto">Авто</option><option value="linear">Линейный</option><option value="log">Логарифм</option><option value="manual">Ручной</option></select></div>
                                  <div className="flex flex-col gap-0.5"><label className="text-[10px] text-gray-500">Формат</label><select value={style.yFormat || 'auto'} onChange={(e) => updateMetricStyle(chart.metric.id, 'yFormat', e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500"><option value="auto">Авто</option><option value="integer">Целые</option><option value="decimal">Десятичные</option><option value="currency">₽ Валюта</option><option value="percent">% Проценты</option><option value="compact">Компактный (K/M)</option></select></div>
                                  {style.yAxisScale === 'manual' && (<><div className="flex flex-col gap-0.5"><label className="text-[10px] text-gray-500">Минимум</label><input type="number" value={style.yMin || ''} onChange={(e) => updateMetricStyle(chart.metric.id, 'yMin', e.target.value)} placeholder="Авто" className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500" /></div><div className="flex flex-col gap-0.5"><label className="text-[10px] text-gray-500">Максимум</label><input type="number" value={style.yMax || ''} onChange={(e) => updateMetricStyle(chart.metric.id, 'yMax', e.target.value)} placeholder="Авто" className="px-2 py-1.5 border border-gray-200 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500" /></div></>)}
                                  <div className="flex flex-col gap-0.5"><label className="text-[10px] text-gray-500">Делений: {style.yTicks || 5}</label><input type="range" min="2" max="10" value={style.yTicks || 5} onChange={(e) => updateMetricStyle(chart.metric.id, 'yTicks', parseInt(e.target.value))} className="w-full cursor-pointer h-1" /></div>
                                </div>
                              </div>

                              {/* Fill */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.3px]">
                                  <span>🎨 Заливка</span>
                                  <label className="relative inline-block w-8 h-[18px]">
                                    <input type="checkbox" checked={style.showFill === true} onChange={(e) => updateMetricStyle(chart.metric.id, 'showFill', e.target.checked)} className="opacity-0 w-0 h-0 peer" />
                                    <span className="absolute cursor-pointer inset-0 bg-gray-300 rounded-full transition-colors duration-200 before:content-[''] before:absolute before:h-3.5 before:w-3.5 before:left-0.5 before:bottom-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 before:shadow-sm peer-checked:bg-primary-500 peer-checked:before:translate-x-3.5"></span>
                                  </label>
                                </div>
                                {style.showFill && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-500">Прозрачность: {Math.round((style.fillOpacity || 0.1) * 100)}%</label>
                                    <input type="range" min="5" max="80" value={(style.fillOpacity || 0.1) * 100} onChange={(e) => updateMetricStyle(chart.metric.id, 'fillOpacity', parseInt(e.target.value) / 100)} className="w-full cursor-pointer h-1" />
                                  </div>
                                )}
                              </div>

                              {/* Legend Label */}
                              <div className="mb-0">
                                <div className="text-[11px] font-semibold text-gray-700 mb-2 uppercase tracking-[0.3px]">🏷️ Подпись</div>
                                <input type="text" value={legendLabels[chart.metric.id] || ''} onChange={(e) => updateLegendLabel(chart.metric.id, e.target.value)} placeholder={chart.metric.name} className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-xs bg-white focus:outline-none focus:border-primary-500" />
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
            <div className="flex items-center gap-3 py-2 my-1 text-gray-500 text-[10px] font-semibold uppercase tracking-wider before:content-[''] before:flex-1 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gray-300 before:to-transparent after:content-[''] after:flex-1 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gray-300 after:to-transparent">
              <span>Настройки полотна</span>
            </div>

            {/* Canvas Settings */}
            <div className="bg-[#f0f4f8] rounded-[10px] p-3 border border-gray-300 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-700">📝 Название графика</label>
                <input type="text" value={styleConfig.title || ''} onChange={(e) => setStyleConfig(prev => ({ ...prev, title: e.target.value }))} placeholder="Мой график" className="w-full px-2.5 py-2 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:border-primary-500" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-700">📈 Тип диаграммы</label>
                <div className="flex gap-1">
                  {CHART_TYPES.map(type => (
                    <button key={type.id} className={`flex-1 py-2.5 px-1.5 border-2 rounded-lg bg-white cursor-pointer text-lg transition-all duration-200 flex justify-center ${chartType === type.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-400'}`} onClick={() => setChartType(type.id)} title={type.name}>{type.icon}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-700">🎨 Цветовая схема</label>
                <div className="flex gap-1">
                  {Object.entries(COLOR_PALETTES).map(([id, palette]) => (
                    <button key={id} className={`flex-1 flex gap-px p-1 border-2 rounded-md bg-white cursor-pointer transition-all duration-200 ${styleConfig.colorPalette === id ? 'border-primary-500' : 'border-gray-200 hover:border-gray-400'}`} onClick={() => setStyleConfig(prev => ({ ...prev, colorPalette: id }))} title={palette.name}>
                      {palette.colors.slice(0, 4).map((c, i) => <span key={i} className="flex-1 h-3.5 rounded-sm" style={{ background: c }}></span>)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-700">📏 Ось X — Группировка</label>
                <select className="w-full px-2.5 py-2 border border-gray-300 rounded-md text-xs bg-white cursor-pointer focus:outline-none focus:border-primary-500" value={xAxisDimension} onChange={(e) => setXAxisDimension(e.target.value)}>
                  {Object.entries(X_AXIS_DIMENSIONS).map(([catId, category]) => (
                    <optgroup key={catId} label={category.name}>{category.options.map(option => <option key={option.id} value={option.id}>{option.icon} {option.name}</option>)}</optgroup>
                  ))}
                </select>
                <div className="flex gap-1.5 items-center mt-1.5">
                  <input type="text" value={styleConfig.xAxis.label} onChange={(e) => updateXAxisConfig('label', e.target.value)} placeholder="Название оси" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white min-w-0 focus:outline-none focus:border-primary-500" />
                  <input type="number" value={styleConfig.xAxis.rotation} onChange={(e) => updateXAxisConfig('rotation', parseInt(e.target.value) || 0)} placeholder="Угол°" className="px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white focus:outline-none focus:border-primary-500" style={{ width: '60px' }} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-700">📐 Ось Y — Общие значения</label>
                <div className="flex gap-1.5 items-center mt-1.5">
                  <input type="text" value={styleConfig.yAxis.label} onChange={(e) => updateYAxisConfig('label', e.target.value)} placeholder="Название оси" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white min-w-0 focus:outline-none focus:border-primary-500" />
                  <select value={styleConfig.yAxis.format} onChange={(e) => updateYAxisConfig('format', e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white cursor-pointer focus:outline-none focus:border-primary-500"><option value="auto">Авто</option><option value="integer">123</option><option value="currency">₽</option><option value="percent">%</option><option value="compact">K/M</option></select>
                </div>
                <div className="flex gap-1.5 items-center mt-1.5">
                  <input type="number" value={styleConfig.yAxis.min} onChange={(e) => updateYAxisConfig('min', e.target.value)} placeholder="Мин" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white min-w-0 focus:outline-none focus:border-primary-500" />
                  <span className="text-gray-400 text-xs">—</span>
                  <input type="number" value={styleConfig.yAxis.max} onChange={(e) => updateYAxisConfig('max', e.target.value)} placeholder="Макс" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white min-w-0 focus:outline-none focus:border-primary-500" />
                </div>
              </div>

              {/* Grid */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-700">📐 Сетка</label>
                  <label className="relative inline-block w-8 h-[18px]">
                    <input type="checkbox" checked={styleConfig.grid.show} onChange={(e) => updateGridConfig('show', e.target.checked)} className="opacity-0 w-0 h-0 peer" />
                    <span className="absolute cursor-pointer inset-0 bg-gray-300 rounded-full transition-colors duration-200 before:content-[''] before:absolute before:h-3.5 before:w-3.5 before:left-0.5 before:bottom-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 before:shadow-sm peer-checked:bg-primary-500 peer-checked:before:translate-x-3.5"></span>
                  </label>
                </div>
                {styleConfig.grid.show && (
                  <div className="mt-2 p-2 bg-white rounded-md border border-gray-200">
                    <div className="flex gap-1.5 items-center mt-1.5">
                      <input type="color" value={styleConfig.grid.color} onChange={(e) => updateGridConfig('color', e.target.value)} className="w-8 h-7 border-none rounded cursor-pointer p-0.5 shrink-0" />
                      <select value={styleConfig.grid.style} onChange={(e) => updateGridConfig('style', e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-[11px] bg-white cursor-pointer focus:outline-none focus:border-primary-500"><option value="solid">━━━</option><option value="dashed">╌╌╌</option><option value="dotted">····</option></select>
                      <input type="range" min="10" max="100" value={styleConfig.grid.opacity * 100} onChange={(e) => updateGridConfig('opacity', parseInt(e.target.value) / 100)} className="flex-1 cursor-pointer h-1" />
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer"><input type="checkbox" checked={styleConfig.grid.xLines} onChange={(e) => updateGridConfig('xLines', e.target.checked)} className="cursor-pointer w-3.5 h-3.5" /> Верт.</label>
                      <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer"><input type="checkbox" checked={styleConfig.grid.yLines} onChange={(e) => updateGridConfig('yLines', e.target.checked)} className="cursor-pointer w-3.5 h-3.5" /> Гориз.</label>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-700">🏷️ Легенда</label>
                  <label className="relative inline-block w-8 h-[18px]">
                    <input type="checkbox" checked={styleConfig.legend.show} onChange={(e) => updateLegendConfig('show', e.target.checked)} className="opacity-0 w-0 h-0 peer" />
                    <span className="absolute cursor-pointer inset-0 bg-gray-300 rounded-full transition-colors duration-200 before:content-[''] before:absolute before:h-3.5 before:w-3.5 before:left-0.5 before:bottom-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 before:shadow-sm peer-checked:bg-primary-500 peer-checked:before:translate-x-3.5"></span>
                  </label>
                </div>
                {styleConfig.legend.show && (
                  <div className="mt-2 p-2 bg-white rounded-md border border-gray-200">
                    <div className="flex gap-1">
                      {LEGEND_POSITIONS.filter(p => p.id !== 'none').map(pos => (
                        <button key={pos.id} className={`flex-1 py-2 px-1 border rounded text-[11px] font-medium cursor-pointer transition-all duration-200 ${styleConfig.legend.position === pos.id ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'}`} onClick={() => updateLegendConfig('position', pos.id)} title={pos.name}>{pos.name.charAt(0)}</button>
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
