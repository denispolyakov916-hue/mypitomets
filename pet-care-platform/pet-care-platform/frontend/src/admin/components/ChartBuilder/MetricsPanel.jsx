import React, { useState, useMemo } from 'react';
import { toast } from 'react-toastify';

const MetricsPanel = ({ metrics, categories, selectedMetrics, onMetricAdd, onMetricRemove }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['users']));

  const groupedMetrics = useMemo(() => {
    const grouped = {};
    metrics.forEach(metric => {
      const category = metric.category;
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(metric);
    });
    return grouped;
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    let filtered = metrics;
    if (selectedCategory !== 'all') filtered = filtered.filter(m => m.category === selectedCategory);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (m.description && m.description.toLowerCase().includes(query))
      );
    }
    return filtered;
  }, [metrics, selectedCategory, searchQuery]);

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) newExpanded.delete(category);
    else newExpanded.add(category);
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e, metric) => {
    e.dataTransfer.setData('application/json', JSON.stringify(metric));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const isMetricSelected = (metricId) => selectedMetrics.some(m => m.id === metricId);

  const getCategoryIcon = (category) => {
    const icons = { users: '👥', pets: '🐾', orders: '🛒', courses: '📚', payments: '💳', reviews: '⭐' };
    return icons[category] || '📊';
  };

  const getCategoryName = (category) => {
    const names = { users: 'Пользователи', pets: 'Питомцы', orders: 'Заказы', courses: 'Курсы', payments: 'Платежи', reviews: 'Отзывы' };
    return names[category] || category;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
        <h3 className="m-0 text-lg font-semibold text-primary-800">Метрики</h3>
        <span className="bg-primary-500 text-white px-2 py-0.5 rounded-xl text-xs font-semibold">{filteredMetrics.length}</span>
      </div>

      <div className="relative mx-5 my-4">
        <input
          type="text"
          placeholder="Поиск метрик..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full py-2.5 pl-4 pr-10 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(200,107,250,0.1)]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">🔍</span>
      </div>

      <div className="mx-5 mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-primary-500"
        >
          <option value="all">Все категории</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {getCategoryIcon(category)} {getCategoryName(category)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {selectedCategory === 'all' ? (
          Object.entries(groupedMetrics).map(([category, categoryMetrics]) => {
            const filteredCategoryMetrics = categoryMetrics.filter(m =>
              !searchQuery ||
              m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            if (filteredCategoryMetrics.length === 0) return null;
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="mb-4">
                <div
                  className="flex items-center px-4 py-3 bg-slate-50 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-slate-100"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="text-base mr-2">{getCategoryIcon(category)}</span>
                  <span className="flex-1 font-semibold text-gray-700">{getCategoryName(category)}</span>
                  <span className="text-xs text-gray-500 mr-2">({filteredCategoryMetrics.length})</span>
                  <span className={`text-xs text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </div>

                {isExpanded && (
                  <div className="mt-2 ml-6">
                    {filteredCategoryMetrics.map(metric => (
                      <MetricItem
                        key={metric.id}
                        metric={metric}
                        isSelected={isMetricSelected(metric.id)}
                        onAdd={() => onMetricAdd(metric)}
                        onRemove={() => onMetricRemove(metric.id)}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          filteredMetrics.map(metric => (
            <MetricItem
              key={metric.id}
              metric={metric}
              isSelected={isMetricSelected(metric.id)}
              onAdd={() => onMetricAdd(metric)}
              onRemove={() => onMetricRemove(metric.id)}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>

      {selectedMetrics.length > 0 && (
        <div className="mx-5 mb-5 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="m-0 mb-3 text-sm font-semibold text-gray-700">Выбранные метрики ({selectedMetrics.length})</h4>
          <div className="flex flex-col gap-2">
            {selectedMetrics.map(metric => (
              <div key={metric.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-md border border-slate-200">
                <span className="text-[13px] text-gray-700">{metric.display_name || metric.name}</span>
                <button
                  className="w-5 h-5 rounded-full border-none bg-red-500 text-white cursor-pointer text-sm font-bold flex items-center justify-center transition-colors duration-200 hover:bg-red-600"
                  onClick={() => onMetricRemove(metric.id)}
                  title="Удалить"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricItem = ({ metric, isSelected, onAdd, onRemove, onDragStart }) => {
  const handleClick = () => {
    if (isSelected) onRemove();
    else onAdd();
  };

  return (
    <div
      className={`flex items-center px-4 py-3 mb-2 bg-white border rounded-lg cursor-pointer transition-all duration-200 hover:border-primary-500 hover:shadow-[0_2px_4px_rgba(200,107,250,0.1)] ${
        isSelected ? 'border-emerald-500 bg-green-50' : 'border-slate-200'
      }`}
      draggable={!isSelected}
      onDragStart={(e) => onDragStart(e, metric)}
      onClick={handleClick}
      style={{ cursor: !isSelected && metric ? 'grab' : 'pointer' }}
    >
      <div className="flex-1">
        <div className="font-semibold text-primary-800 mb-1">{metric.display_name || metric.name}</div>
        <div className="text-xs text-gray-500 mb-1.5 leading-snug">{metric.description || 'Нет описания'}</div>
        <div className="flex gap-2 text-[11px] text-gray-400">
          <span>{metric.data_type}</span>
          {metric.units && <span>• {metric.units}</span>}
        </div>
      </div>

      <div className="ml-3">
        {isSelected ? (
          <button className="w-7 h-7 rounded-full border-none bg-emerald-500 text-white cursor-pointer text-sm font-bold flex items-center justify-center transition-colors duration-200 hover:bg-emerald-600" title="Удалить">
            ✓
          </button>
        ) : (
          <button className="w-7 h-7 rounded-full border-none bg-primary-500 text-white cursor-pointer text-sm font-bold flex items-center justify-center transition-colors duration-200 hover:bg-primary-600" title="Добавить">
            +
          </button>
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
