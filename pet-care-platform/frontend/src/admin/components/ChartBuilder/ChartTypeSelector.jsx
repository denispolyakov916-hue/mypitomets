import React, { useState } from 'react';

// Styles
import './ChartTypeSelector.css';

const ChartTypeSelector = ({ currentType, onTypeChange, onConfigChange, config }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Доступные типы графиков
  const chartTypes = [
    {
      id: 'line',
      name: 'Линейный график',
      icon: '📈',
      description: 'Показывает тренды и изменения во времени',
      category: 'basic',
      bestFor: ['временные ряды', 'тренды', 'сравнение периодов']
    },
    {
      id: 'bar',
      name: 'Столбчатая диаграмма',
      icon: '📊',
      description: 'Сравнение значений между категориями',
      category: 'basic',
      bestFor: ['категории', 'сравнение', 'распределения']
    },
    {
      id: 'scatter',
      name: 'Точечная диаграмма',
      icon: '📍',
      description: 'Поиск корреляций между двумя переменными',
      category: 'advanced',
      bestFor: ['корреляции', 'кластеры', 'выбросы']
    },
    {
      id: 'bubble',
      name: 'Пузырьковая диаграмма',
      icon: '🫧',
      description: 'Трехмерные данные с размером и цветом',
      category: 'advanced',
      bestFor: ['многомерные данные', 'влияние размера', 'категоризация']
    },
    {
      id: 'area',
      name: 'Диаграмма с областями',
      icon: '🌊',
      description: 'Накопительные данные и объемы',
      category: 'basic',
      bestFor: ['накопление', 'объемы', 'части от целого']
    },
    {
      id: 'combo',
      name: 'Комбинированный график',
      icon: '🔄',
      description: 'Несколько типов графиков на одном холсте',
      category: 'advanced',
      bestFor: ['сложные данные', 'несколько метрик', 'сравнение типов']
    },
    {
      id: 'heatmap',
      name: 'Тепловая карта',
      icon: '🔥',
      description: 'Визуализация плотности и интенсивности',
      category: 'specialized',
      bestFor: ['плотность', 'интенсивность', 'матричные данные']
    },
    {
      id: 'candlestick',
      name: 'Свечной график',
      icon: '💰',
      description: 'Финансовые данные с ценами открытия/закрытия',
      category: 'specialized',
      bestFor: ['финансы', 'цены', 'волатильность']
    }
  ];

  const currentChartType = chartTypes.find(type => type.id === currentType);

  // Группировка по категориям
  const groupedTypes = chartTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {});

  const categoryLabels = {
    basic: 'Базовые',
    advanced: 'Продвинутые',
    specialized: 'Специализированные'
  };

  const handleTypeSelect = (typeId) => {
    onTypeChange(typeId);
    setIsOpen(false);

    // Автоматическая настройка конфигурации для типа графика
    const defaultConfig = getDefaultConfigForType(typeId);
    onConfigChange(defaultConfig);
  };

  const getDefaultConfigForType = (typeId) => {
    const baseConfig = {
      canvas: { width: 800, height: 400, margin: { top: 20, right: 30, bottom: 40, left: 50 } },
      style: {},
      legend: { show: true, position: 'top-right' },
      interaction: { tooltip: true, zoom: true, pan: true }
    };

    switch (typeId) {
      case 'line':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            interpolation: 'monotone',
            showDots: true
          }
        };

      case 'bar':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            barWidth: 'auto',
            spacing: 0.1
          }
        };

      case 'scatter':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            dotRadius: 4,
            showRegression: false
          }
        };

      case 'bubble':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            minRadius: 5,
            maxRadius: 25,
            colorPalette: 'viridis'
          }
        };

      case 'area':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            fillOpacity: 0.3,
            showBaseline: true
          }
        };

      case 'combo':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            combineMethod: 'overlay',
            yAxisCount: 2
          }
        };

      case 'heatmap':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            colorScheme: 'RdYlBu',
            showValues: false
          }
        };

      case 'candlestick':
        return {
          ...baseConfig,
          style: {
            ...baseConfig.style,
            bullColor: '#10b981',
            bearColor: '#ef4444',
            wickColor: '#374151'
          }
        };

      default:
        return baseConfig;
    }
  };

  return (
    <div className="chart-type-selector">
      <div className="selector-header">
        <label>Тип графика:</label>
        <div className="current-selection" onClick={() => setIsOpen(!isOpen)}>
          <span className="type-icon">{currentChartType?.icon}</span>
          <span className="type-name">{currentChartType?.name || 'Выберите тип'}</span>
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="selector-dropdown">
            {Object.entries(groupedTypes).map(([category, types]) => (
              <div key={category} className="type-category">
                <div className="category-header">
                  <h4>{categoryLabels[category]}</h4>
                </div>

                <div className="category-types">
                  {types.map(type => (
                    <div
                      key={type.id}
                      className={`type-option ${type.id === currentType ? 'selected' : ''}`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <div className="type-icon-large">{type.icon}</div>
                      <div className="type-info">
                        <div className="type-name">{type.name}</div>
                        <div className="type-description">{type.description}</div>
                        <div className="type-best-for">
                          Лучше всего для: {type.bestFor.join(', ')}
                        </div>
                      </div>
                      {type.id === currentType && (
                        <div className="selected-indicator">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Краткая информация о текущем типе */}
      {currentChartType && (
        <div className="current-type-info">
          <div className="info-description">{currentChartType.description}</div>
          <div className="info-best-for">
            <strong>Рекомендуется для:</strong> {currentChartType.bestFor.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartTypeSelector;
