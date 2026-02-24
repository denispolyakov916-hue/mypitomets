import React, { useState } from 'react';

const ChartTypeSelector = ({ currentType, onTypeChange, onConfigChange, config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxIdRef = React.useRef(`chart-type-listbox-${Math.random().toString(36).slice(2)}`);

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
  const typeIndexMap = chartTypes.reduce((acc, type, index) => {
    acc[type.id] = index;
    return acc;
  }, {});

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
        return { ...baseConfig, style: { ...baseConfig.style, interpolation: 'monotone', showDots: true } };
      case 'bar':
        return { ...baseConfig, style: { ...baseConfig.style, barWidth: 'auto', spacing: 0.1 } };
      case 'scatter':
        return { ...baseConfig, style: { ...baseConfig.style, dotRadius: 4, showRegression: false } };
      case 'bubble':
        return { ...baseConfig, style: { ...baseConfig.style, minRadius: 5, maxRadius: 25, colorPalette: 'viridis' } };
      case 'area':
        return { ...baseConfig, style: { ...baseConfig.style, fillOpacity: 0.3, showBaseline: true } };
      case 'combo':
        return { ...baseConfig, style: { ...baseConfig.style, combineMethod: 'overlay', yAxisCount: 2 } };
      case 'heatmap':
        return { ...baseConfig, style: { ...baseConfig.style, colorScheme: 'RdYlBu', showValues: false } };
      case 'candlestick':
        return { ...baseConfig, style: { ...baseConfig.style, bullColor: '#22c55e', bearColor: '#ef4444', wickColor: '#374151' } };
      default:
        return baseConfig;
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = currentType ? typeIndexMap[currentType] : -1;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, currentType]);

  const moveActiveIndex = (delta) => {
    if (chartTypes.length === 0) return;
    setActiveIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      const next = base + delta;
      if (next < 0) return chartTypes.length - 1;
      if (next >= chartTypes.length) return 0;
      return next;
    });
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">Тип графика:</label>
        <div
          className="flex items-center gap-2 py-2.5 px-3 bg-white border border-gray-300 rounded-md cursor-pointer transition-all duration-200 hover:border-primary-500 hover:shadow-[0_0_0_3px_rgba(200,107,250,0.1)]"
          onClick={() => setIsOpen(!isOpen)}
          role="combobox"
          tabIndex={0}
          aria-expanded={isOpen}
          aria-controls={listboxIdRef.current}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxIdRef.current}-opt-${activeIndex}` : undefined
          }
          aria-haspopup="listbox"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen) setIsOpen(true); moveActiveIndex(1); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen) setIsOpen(true); moveActiveIndex(-1); return; }
            if (e.key === 'Home') { e.preventDefault(); if (chartTypes.length > 0) setActiveIndex(0); return; }
            if (e.key === 'End') { e.preventDefault(); if (chartTypes.length > 0) setActiveIndex(chartTypes.length - 1); return; }
            if (e.key === 'Enter' && isOpen && activeIndex >= 0) { e.preventDefault(); handleTypeSelect(chartTypes[activeIndex].id); return; }
            if (e.key === 'Escape' && isOpen) { e.preventDefault(); setIsOpen(false); }
          }}
        >
          <span className="text-base">{currentChartType?.icon}</span>
          <span className="flex-1 font-medium text-primary-800">{currentChartType?.name || 'Выберите тип'}</span>
          <span className={`text-xs text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[1000]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-[1001] max-h-[500px] overflow-y-auto" id={listboxIdRef.current} role="listbox">
            {Object.entries(groupedTypes).map(([category, types]) => (
              <div key={category} className="border-b border-slate-100 last:border-b-0">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h4 className="m-0 text-xs font-bold text-gray-500 uppercase tracking-wider">{categoryLabels[category]}</h4>
                </div>

                <div className="py-2">
                  {types.map(type => (
                    <div
                      key={type.id}
                      id={`${listboxIdRef.current}-opt-${typeIndexMap[type.id]}`}
                      role="option"
                      aria-selected={activeIndex === typeIndexMap[type.id]}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-200 border-l-[3px] border-l-transparent hover:bg-slate-50 ${
                        activeIndex === typeIndexMap[type.id] ? '!bg-primary-50 !border-l-primary-500' : ''
                      } ${type.id === currentType ? '!bg-emerald-50 !border-l-emerald-500' : ''}`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <div className="text-2xl w-8 text-center">{type.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-primary-800 mb-0.5">{type.name}</div>
                        <div className="text-xs text-gray-500 mb-1 leading-snug">{type.description}</div>
                        <div className="text-[11px] text-gray-400 italic">
                          Лучше всего для: {type.bestFor.join(', ')}
                        </div>
                      </div>
                      {type.id === currentType && (
                        <div className="text-emerald-500 text-base font-bold">✓</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {currentChartType && (
        <div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-200">
          <div className="text-sm text-gray-700 mb-2">{currentChartType.description}</div>
          <div className="text-xs text-gray-500">
            <strong className="text-gray-700">Рекомендуется для:</strong> {currentChartType.bestFor.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartTypeSelector;
