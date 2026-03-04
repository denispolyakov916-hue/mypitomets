import React, { useState, useEffect } from 'react';

const AxisConfigurator = ({ axes, metrics, onChange }) => {
  const [activeAxis, setActiveAxis] = useState('x');
  const [axisConfig, setAxisConfig] = useState(axes || { x: null, y: [] });

  useEffect(() => {
    setAxisConfig(axes || { x: null, y: [] });
  }, [axes]);

  const handleAxisMetricChange = (axisType, metricId) => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return;
    const newConfig = { ...axisConfig };

    if (axisType === 'x') {
      newConfig.x = {
        id: metric.id, field: metric.field_name, type: getAxisTypeForMetric(metric),
        label: metric.display_name || metric.name, format: getDefaultFormat(metric), ...newConfig.x
      };
    } else if (axisType === 'y') {
      const existingIndex = newConfig.y.findIndex(axis => axis.id === metric.id);
      if (existingIndex >= 0) {
        newConfig.y[existingIndex] = {
          ...newConfig.y[existingIndex], id: metric.id, field: metric.field_name, type: 'linear',
          label: metric.display_name || metric.name, aggregation: metric.default_aggregation,
          units: metric.units, color: newConfig.y[existingIndex].color || getDefaultColor(newConfig.y.length)
        };
      } else {
        newConfig.y.push({
          id: metric.id, field: metric.field_name, type: 'linear',
          label: metric.display_name || metric.name, aggregation: metric.default_aggregation,
          units: metric.units, color: getDefaultColor(newConfig.y.length)
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
      newConfig.y = newConfig.y.map(axis => ({ ...axis, [property]: value }));
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

  function getAxisTypeForMetric(metric) {
    if (metric.data_type === 'date' || metric.data_type === 'datetime') return 'time';
    else if (metric.data_type === 'integer' || metric.data_type === 'decimal') return 'linear';
    else return 'band';
  }

  function getDefaultFormat(metric) {
    switch (metric.data_type) {
      case 'date': return '%d.%m.%Y';
      case 'datetime': return '%d.%m.%Y %H:%M';
      case 'decimal': return ',.2f';
      case 'integer': return ',';
      default: return null;
    }
  }

  function getDefaultColor(index) {
    const colors = ['#C86BFA', '#ef4444', '#22c55e', '#f59e0b', '#C86BFA', '#06b6d4'];
    return colors[index % colors.length];
  }

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-primary-500 focus:shadow-[0_0_0_3px_rgba(200,107,250,0.1)]";

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="px-5 py-4 border-b border-slate-200">
        <h3 className="m-0 text-lg font-semibold text-primary-800">Конфигурация осей</h3>
      </div>

      <div className="flex mx-5 my-4 bg-slate-50 rounded-lg p-1">
        <button className={`flex-1 px-4 py-2 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${activeAxis === 'x' ? 'bg-white text-primary-800 shadow-sm' : 'bg-transparent text-gray-500'}`} onClick={() => setActiveAxis('x')}>
          Ось X
        </button>
        <button className={`flex-1 px-4 py-2 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${activeAxis === 'y' ? 'bg-white text-primary-800 shadow-sm' : 'bg-transparent text-gray-500'}`} onClick={() => setActiveAxis('y')}>
          Ось Y ({axisConfig.y?.length || 0})
        </button>
      </div>

      {activeAxis === 'x' && (
        <div className="flex-1 p-5 overflow-y-auto">
          <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Настройки оси X</h4>
          <div className="mb-4">
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Метрика:</label>
            <select value={axisConfig.x?.id || ''} onChange={(e) => handleAxisMetricChange('x', e.target.value)} className={`${inputClasses} bg-gray-50`}>
              <option value="">Выберите метрику</option>
              {metrics.map(metric => <option key={metric.id} value={metric.id}>{metric.display_name || metric.name}</option>)}
            </select>
          </div>
          {axisConfig.x && (
            <>
              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Название оси:</label>
                <input type="text" value={axisConfig.x.label || ''} onChange={(e) => handleAxisPropertyChange('x', 'label', e.target.value)} placeholder="Название оси" className={inputClasses} />
              </div>
              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Тип шкалы:</label>
                <select value={axisConfig.x.type || 'linear'} onChange={(e) => handleAxisPropertyChange('x', 'type', e.target.value)} className={inputClasses}>
                  <option value="linear">Линейная</option>
                  <option value="time">Временная</option>
                  <option value="band">Категориальная</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Формат:</label>
                <input type="text" value={axisConfig.x.format || ''} onChange={(e) => handleAxisPropertyChange('x', 'format', e.target.value)} placeholder="d3-time-format или число" className={inputClasses} />
              </div>
              <div className="mb-4">
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Поворот подписей:</label>
                <input type="number" value={axisConfig.x.rotation || 0} onChange={(e) => handleAxisPropertyChange('x', 'rotation', parseInt(e.target.value))} min="-90" max="90" className={inputClasses} />
              </div>
            </>
          )}
        </div>
      )}

      {activeAxis === 'y' && (
        <div className="flex-1 p-5 overflow-y-auto">
          <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Настройки оси Y</h4>
          <div className="flex flex-col gap-4">
            {axisConfig.y && axisConfig.y.map((axis, index) => (
              <div key={axis.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-primary-800">{axis.label}</span>
                  <button className="w-6 h-6 rounded-full border-none bg-red-500 text-white cursor-pointer text-base font-bold flex items-center justify-center transition-colors duration-200 hover:bg-red-600" onClick={() => removeYAxis(index)} title="Удалить ось">×</button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Метрика:</label>
                      <select value={axis.id} onChange={(e) => handleAxisMetricChange('y', e.target.value)} className={`${inputClasses} bg-gray-50`}>
                        {metrics.map(metric => <option key={metric.id} value={metric.id}>{metric.display_name || metric.name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Агрегация:</label>
                      <select value={axis.aggregation || 'count'} onChange={(e) => handleYAxisPropertyChange(index, 'aggregation', e.target.value)} className={inputClasses}>
                        <option value="count">Количество</option>
                        <option value="sum">Сумма</option>
                        <option value="avg">Среднее</option>
                        <option value="min">Минимум</option>
                        <option value="max">Максимум</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Цвет:</label>
                      <input type="color" value={axis.color || '#C86BFA'} onChange={(e) => handleYAxisPropertyChange(index, 'color', e.target.value)} className={inputClasses} />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1.5 text-sm font-medium text-gray-700">Единицы:</label>
                      <input type="text" value={axis.units || ''} onChange={(e) => handleYAxisPropertyChange(index, 'units', e.target.value)} placeholder="шт, ₽, %" className={inputClasses} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(!axisConfig.y || axisConfig.y.length === 0) && (
            <div className="text-center py-10 px-5 text-gray-500">
              <p className="font-semibold text-gray-700 mb-2">Нет настроенных осей Y</p>
              <p className="m-0 text-sm">Добавьте метрики из панели метрик</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AxisConfigurator;
