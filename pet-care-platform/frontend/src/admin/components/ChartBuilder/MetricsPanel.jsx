import React, { useState, useMemo } from 'react';
import { toast } from 'react-toastify';

// Styles
import './MetricsPanel.css';

const MetricsPanel = ({ metrics, categories, selectedMetrics, onMetricAdd, onMetricRemove }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['users']));

  // Группировка метрик по категориям
  const groupedMetrics = useMemo(() => {
    const grouped = {};

    metrics.forEach(metric => {
      const category = metric.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(metric);
    });

    return grouped;
  }, [metrics]);

  // Фильтрация метрик
  const filteredMetrics = useMemo(() => {
    let filtered = metrics;

    // Фильтр по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (m.description && m.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [metrics, selectedCategory, searchQuery]);

  // Переключение видимости категории
  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Обработчик перетаскивания
  const handleDragStart = (e, metric) => {
    e.dataTransfer.setData('application/json', JSON.stringify(metric));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Проверка, выбрана ли метрика
  const isMetricSelected = (metricId) => {
    return selectedMetrics.some(m => m.id === metricId);
  };

  // Получение иконки категории
  const getCategoryIcon = (category) => {
    const icons = {
      users: '👥',
      pets: '🐾',
      orders: '🛒',
      courses: '📚',
      payments: '💳',
      reviews: '⭐'
    };
    return icons[category] || '📊';
  };

  // Получение названия категории
  const getCategoryName = (category) => {
    const names = {
      users: 'Пользователи',
      pets: 'Питомцы',
      orders: 'Заказы',
      courses: 'Курсы',
      payments: 'Платежи',
      reviews: 'Отзывы'
    };
    return names[category] || category;
  };

  return (
    <div className="metrics-panel">
      {/* Заголовок */}
      <div className="panel-header">
        <h3>Метрики</h3>
        <span className="metrics-count">{filteredMetrics.length}</span>
      </div>

      {/* Поиск */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск метрик..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      {/* Фильтр по категориям */}
      <div className="category-filter">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          <option value="all">Все категории</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {getCategoryIcon(category)} {getCategoryName(category)}
            </option>
          ))}
        </select>
      </div>

      {/* Список метрик */}
      <div className="metrics-list">
        {selectedCategory === 'all' ? (
          // Группировка по категориям
          Object.entries(groupedMetrics).map(([category, categoryMetrics]) => {
            const filteredCategoryMetrics = categoryMetrics.filter(m =>
              !searchQuery ||
              m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            if (filteredCategoryMetrics.length === 0) return null;

            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="category-group">
                <div
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="category-icon">{getCategoryIcon(category)}</span>
                  <span className="category-name">{getCategoryName(category)}</span>
                  <span className="category-count">({filteredCategoryMetrics.length})</span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>

                {isExpanded && (
                  <div className="category-metrics">
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
          // Плоский список для выбранной категории
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

      {/* Выбранные метрики */}
      {selectedMetrics.length > 0 && (
        <div className="selected-metrics">
          <h4>Выбранные метрики ({selectedMetrics.length})</h4>
          <div className="selected-list">
            {selectedMetrics.map(metric => (
              <div key={metric.id} className="selected-metric">
                <span className="metric-name">{metric.display_name || metric.name}</span>
                <button
                  className="remove-btn"
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

// Компонент отдельной метрики
const MetricItem = ({ metric, isSelected, onAdd, onRemove, onDragStart }) => {
  const handleClick = () => {
    if (isSelected) {
      onRemove();
    } else {
      onAdd();
    }
  };

  return (
    <div
      className={`metric-item ${isSelected ? 'selected' : ''}`}
      draggable={!isSelected}
      onDragStart={(e) => onDragStart(e, metric)}
      onClick={handleClick}
    >
      <div className="metric-info">
        <div className="metric-name">{metric.display_name || metric.name}</div>
        <div className="metric-description">
          {metric.description || 'Нет описания'}
        </div>
        <div className="metric-meta">
          <span className="metric-type">{metric.data_type}</span>
          {metric.units && <span className="metric-units">• {metric.units}</span>}
        </div>
      </div>

      <div className="metric-actions">
        {isSelected ? (
          <button className="action-btn remove" title="Удалить">
            ✓
          </button>
        ) : (
          <button className="action-btn add" title="Добавить">
            +
          </button>
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
