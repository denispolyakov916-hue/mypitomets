import React, { useState, useEffect } from 'react';

// Styles
import './AxisConfigurator.css';

const AxisConfigurator = ({ axes, metrics, onChange }) => {
  const [activeAxis, setActiveAxis] = useState('x');
  const [axisConfig, setAxisConfig] = useState(axes || { x: null, y: [] });

  useEffect(() => {
    setAxisConfig(axes || { x: null, y: [] });
  }, [axes]);

  // Обработчики изменений
  const handleAxisMetricChange = (axisType, metricId) => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return;

    const newConfig = { ...axisConfig };

    if (axisType === 'x') {
      newConfig.x = {
        id: metric.id,
        field: metric.field_name,
        type: getAxisTypeForMetric(metric),
        label: metric.display_name || metric.name,
        format: getDefaultFormat(metric),
        ...newConfig.x
      };
    } else if (axisType === 'y') {
      // Для Y оси поддерживаем несколько метрик
      const existingIndex = newConfig.y.findIndex(axis => axis.id === metric.id);
      if (existingIndex >= 0) {
        // Обновляем существующую
        newConfig.y[existingIndex] = {
          ...newConfig.y[existingIndex],
          id: metric.id,
          field: metric.field_name,
          type: 'linear',
          label: metric.display_name || metric.name,
          aggregation: metric.default_aggregation,
          units: metric.units,
          color: newConfig.y[existingIndex].color || getDefaultColor(newConfig.y.length)
        };
      } else {
        // Добавляем новую
        newConfig.y.push({
          id: metric.id,
          field: metric.field_name,
          type: 'linear',
          label: metric.display_name || metric.name,
          aggregation: metric.default_aggregation,
          units: metric.units,
          color: getDefaultColor(newConfig.y.length)
        });
      }
    }

    setAxisConfig(newConfig);
    onChange(axisType, newConfig[axisType]);
  };

  const handleAxisPropertyChange = (axisType, property, value) => {
    const newConfig = { ...axisConfig };

    if (axisType === 'x') {
      newConfig.x = { ...newConfig.x, [property]: value };
    } else if (axisType === 'y') {
      // Для Y оси обновляем все метрики
      newConfig.y = newConfig.y.map(axis => ({
        ...axis,
        [property]: value
      }));
    }

    setAxisConfig(newConfig);
    onChange(axisType, newConfig[axisType]);
  };

  const handleYAxisPropertyChange = (axisIndex, property, value) => {
    const newConfig = { ...axisConfig };
    newConfig.y[axisIndex] = { ...newConfig.y[axisIndex], [property]: value };
    setAxisConfig(newConfig);
    onChange('y', newConfig.y);
  };

  const removeYAxis = (index) => {
    const newConfig = { ...axisConfig };
    newConfig.y.splice(index, 1);
    setAxisConfig(newConfig);
    onChange('y', newConfig.y);
  };

  // Вспомогательные функции
  function getAxisTypeForMetric(metric) {
    if (metric.data_type === 'date' || metric.data_type === 'datetime') {
      return 'time';
    } else if (metric.data_type === 'integer' || metric.data_type === 'decimal') {
      return 'linear';
    } else {
      return 'band';
    }
  }

  function getDefaultFormat(metric) {
    switch (metric.data_type) {
      case 'date':
        return '%d.%m.%Y';
      case 'datetime':
        return '%d.%m.%Y %H:%M';
      case 'decimal':
        return ',.2f';
      case 'integer':
        return ',';
      default:
        return null;
    }
  }

  function getDefaultColor(index) {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  }

  return (
    <div className="axis-configurator">
      <div className="config-header">
        <h3>Конфигурация осей</h3>
      </div>

      {/* Переключатель активной оси */}
      <div className="axis-tabs">
        <button
          className={`axis-tab ${activeAxis === 'x' ? 'active' : ''}`}
          onClick={() => setActiveAxis('x')}
        >
          Ось X
        </button>
        <button
          className={`axis-tab ${activeAxis === 'y' ? 'active' : ''}`}
          onClick={() => setActiveAxis('y')}
        >
          Ось Y ({axisConfig.y?.length || 0})
        </button>
      </div>

      {/* Конфигурация оси X */}
      {activeAxis === 'x' && (
        <div className="axis-config">
          <h4>Настройки оси X</h4>

          <div className="config-group">
            <label>Метрика:</label>
            <select
              value={axisConfig.x?.id || ''}
              onChange={(e) => handleAxisMetricChange('x', e.target.value)}
              className="metric-select"
            >
              <option value="">Выберите метрику</option>
              {metrics.map(metric => (
                <option key={metric.id} value={metric.id}>
                  {metric.display_name || metric.name}
                </option>
              ))}
            </select>
          </div>

          {axisConfig.x && (
            <>
              <div className="config-group">
                <label>Название оси:</label>
                <input
                  type="text"
                  value={axisConfig.x.label || ''}
                  onChange={(e) => handleAxisPropertyChange('x', 'label', e.target.value)}
                  placeholder="Название оси"
                />
              </div>

              <div className="config-group">
                <label>Тип шкалы:</label>
                <select
                  value={axisConfig.x.type || 'linear'}
                  onChange={(e) => handleAxisPropertyChange('x', 'type', e.target.value)}
                >
                  <option value="linear">Линейная</option>
                  <option value="time">Временная</option>
                  <option value="band">Категориальная</option>
                </select>
              </div>

              <div className="config-group">
                <label>Формат:</label>
                <input
                  type="text"
                  value={axisConfig.x.format || ''}
                  onChange={(e) => handleAxisPropertyChange('x', 'format', e.target.value)}
                  placeholder="d3-time-format или число"
                />
              </div>

              <div className="config-group">
                <label>Поворот подписей:</label>
                <input
                  type="number"
                  value={axisConfig.x.rotation || 0}
                  onChange={(e) => handleAxisPropertyChange('x', 'rotation', parseInt(e.target.value))}
                  min="-90"
                  max="90"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Конфигурация оси Y */}
      {activeAxis === 'y' && (
        <div className="axis-config">
          <h4>Настройки оси Y</h4>

          <div className="y-axis-list">
            {axisConfig.y && axisConfig.y.map((axis, index) => (
              <div key={axis.id} className="y-axis-item">
                <div className="y-axis-header">
                  <span className="axis-label">{axis.label}</span>
                  <button
                    className="remove-axis-btn"
                    onClick={() => removeYAxis(index)}
                    title="Удалить ось"
                  >
                    ×
                  </button>
                </div>

                <div className="y-axis-config">
                  <div className="config-row">
                    <div className="config-group">
                      <label>Метрика:</label>
                      <select
                        value={axis.id}
                        onChange={(e) => handleAxisMetricChange('y', e.target.value)}
                        className="metric-select"
                      >
                        {metrics.map(metric => (
                          <option key={metric.id} value={metric.id}>
                            {metric.display_name || metric.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="config-group">
                      <label>Агрегация:</label>
                      <select
                        value={axis.aggregation || 'count'}
                        onChange={(e) => handleYAxisPropertyChange(index, 'aggregation', e.target.value)}
                      >
                        <option value="count">Количество</option>
                        <option value="sum">Сумма</option>
                        <option value="avg">Среднее</option>
                        <option value="min">Минимум</option>
                        <option value="max">Максимум</option>
                      </select>
                    </div>
                  </div>

                  <div className="config-row">
                    <div className="config-group">
                      <label>Цвет:</label>
                      <input
                        type="color"
                        value={axis.color || '#3b82f6'}
                        onChange={(e) => handleYAxisPropertyChange(index, 'color', e.target.value)}
                      />
                    </div>

                    <div className="config-group">
                      <label>Единицы:</label>
                      <input
                        type="text"
                        value={axis.units || ''}
                        onChange={(e) => handleYAxisPropertyChange(index, 'units', e.target.value)}
                        placeholder="шт, ₽, %"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!axisConfig.y || axisConfig.y.length === 0) && (
            <div className="empty-y-axes">
              <p>Нет настроенных осей Y</p>
              <p>Добавьте метрики из панели метрик</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AxisConfigurator;
