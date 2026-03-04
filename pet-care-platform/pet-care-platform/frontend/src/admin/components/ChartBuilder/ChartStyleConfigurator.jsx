import React, { useState } from 'react';

const ChartStyleConfigurator = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState('general');

  const handleStyleChange = (category, property, value) => {
    const newConfig = { ...config };
    if (!newConfig.style) newConfig.style = {};
    if (category === 'canvas') newConfig.canvas = { ...newConfig.canvas, [property]: value };
    else newConfig.style = { ...newConfig.style, [property]: value };
    onChange(newConfig);
  };

  const handleLegendChange = (property, value) => {
    onChange({ ...config, legend: { ...config.legend, [property]: value } });
  };

  const handleInteractionChange = (property, value) => {
    onChange({ ...config, interaction: { ...config.interaction, [property]: value } });
  };

  const colorPalettes = [
    { name: 'Default', colors: ['#C86BFA', '#ef4444', '#22c55e', '#f59e0b', '#C86BFA', '#06b6d4'] },
    { name: 'Blues', colors: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#C86BFA', '#522f81'] },
    { name: 'Reds', colors: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626'] },
    { name: 'Greens', colors: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'] },
    { name: 'Purples', colors: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#C86BFA'] }
  ];

  const themes = [
    { name: 'Light', canvas: { background: '#ffffff' }, style: { gridColor: '#e2e8f0', textColor: '#374151' } },
    { name: 'Dark', canvas: { background: '#1e293b' }, style: { gridColor: '#334155', textColor: '#cbd5e1' } },
    { name: 'Minimal', canvas: { background: '#ffffff' }, style: { gridColor: '#f1f5f9', textColor: '#64748b' } }
  ];

  const applyTheme = (theme) => {
    onChange({ ...config, canvas: { ...config.canvas, ...theme.canvas }, style: { ...config.style, ...theme.style } });
  };

  const tabClass = (tab) => `flex-1 px-4 py-2 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ${activeTab === tab ? 'bg-white text-primary-800 shadow-sm' : 'bg-transparent text-gray-500'}`;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex mx-5 my-4 bg-slate-50 rounded-lg p-1">
        <button className={tabClass('general')} onClick={() => setActiveTab('general')}>Общие</button>
        <button className={tabClass('colors')} onClick={() => setActiveTab('colors')}>Цвета</button>
        <button className={tabClass('legend')} onClick={() => setActiveTab('legend')}>Легенда</button>
        <button className={tabClass('interaction')} onClick={() => setActiveTab('interaction')}>Интерактивность</button>
      </div>

      <div className="flex-1 px-5 pb-5 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="mb-6">
            <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Общие настройки</h4>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Тема оформления:</label>
              <div className="flex gap-2 flex-wrap">
                {themes.map(theme => (
                  <button key={theme.name} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm cursor-pointer transition-all duration-200 hover:bg-gray-200 hover:border-gray-400" onClick={() => applyTheme(theme)}>{theme.name}</button>
                ))}
              </div>
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Фон графика:</label>
              <input type="color" value={config.canvas?.background || '#ffffff'} onChange={(e) => handleStyleChange('canvas', 'background', e.target.value)} className="w-[60px] h-8 border border-gray-300 rounded cursor-pointer" />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Цвет сетки:</label>
              <input type="color" value={config.style?.gridColor || '#e2e8f0'} onChange={(e) => handleStyleChange('style', 'gridColor', e.target.value)} className="w-[60px] h-8 border border-gray-300 rounded cursor-pointer" />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Цвет текста:</label>
              <input type="color" value={config.style?.textColor || '#374151'} onChange={(e) => handleStyleChange('style', 'textColor', e.target.value)} className="w-[60px] h-8 border border-gray-300 rounded cursor-pointer" />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Показывать сетку:</label>
              <input type="checkbox" checked={config.style?.showGrid !== false} onChange={(e) => handleStyleChange('style', 'showGrid', e.target.checked)} className="w-4 h-4 cursor-pointer" />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Закругленные углы:</label>
              <input type="checkbox" checked={config.style?.roundedCorners || false} onChange={(e) => handleStyleChange('style', 'roundedCorners', e.target.checked)} className="w-4 h-4 cursor-pointer" />
            </div>
          </div>
        )}

        {activeTab === 'colors' && (
          <div className="mb-6">
            <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Цветовые палитры</h4>
            {colorPalettes.map(palette => (
              <div key={palette.name} className="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-md">
                <div className="font-semibold text-gray-700 min-w-[80px]">{palette.name}</div>
                <div className="flex gap-1 flex-1">
                  {palette.colors.map((color, index) => (
                    <div key={index} className="w-5 h-5 rounded-sm border border-slate-200" style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
                <button className="px-3 py-1.5 bg-primary-500 text-white border-none rounded text-xs cursor-pointer transition-colors duration-200 hover:bg-primary-600" onClick={() => handleStyleChange('style', 'colorPalette', palette.colors)}>Применить</button>
              </div>
            ))}
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Пользовательские цвета:</label>
              <div className="flex gap-2 items-center flex-wrap">
                {(config.style?.customColors || []).map((color, index) => (
                  <input key={index} type="color" value={color} onChange={(e) => {
                    const newColors = [...(config.style?.customColors || [])];
                    newColors[index] = e.target.value;
                    handleStyleChange('style', 'customColors', newColors);
                  }} />
                ))}
                <button className="w-8 h-8 border border-gray-300 rounded bg-gray-50 cursor-pointer text-lg font-bold text-gray-500 transition-all duration-200 hover:bg-gray-200 hover:border-gray-400" onClick={() => handleStyleChange('style', 'customColors', [...(config.style?.customColors || []), '#C86BFA'])}>+</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'legend' && (
          <div className="mb-6">
            <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Настройки легенды</h4>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Показывать легенду:</label>
              <input type="checkbox" checked={config.legend?.show !== false} onChange={(e) => handleLegendChange('show', e.target.checked)} className="w-4 h-4 cursor-pointer" />
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Положение:</label>
              <select value={config.legend?.position || 'top-right'} onChange={(e) => handleLegendChange('position', e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white max-w-[200px]">
                <option value="top-left">Сверху слева</option>
                <option value="top-right">Сверху справа</option>
                <option value="bottom-left">Снизу слева</option>
                <option value="bottom-right">Снизу справа</option>
                <option value="center-left">По центру слева</option>
                <option value="center-right">По центру справа</option>
              </select>
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Ориентация:</label>
              <select value={config.legend?.orientation || 'vertical'} onChange={(e) => handleLegendChange('orientation', e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm bg-white max-w-[200px]">
                <option value="vertical">Вертикальная</option>
                <option value="horizontal">Горизонтальная</option>
              </select>
            </div>
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Размер символов:</label>
              <input type="range" min="8" max="20" value={config.legend?.fontSize || 12} onChange={(e) => handleLegendChange('fontSize', parseInt(e.target.value))} className="w-full h-1 cursor-pointer" />
              <span className="text-xs text-gray-700 font-semibold text-center mt-1">{config.legend?.fontSize || 12}px</span>
            </div>
          </div>
        )}

        {activeTab === 'interaction' && (
          <div className="mb-6">
            <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Интерактивные возможности</h4>
            {[
              { label: 'Показывать подсказки (tooltips):', key: 'tooltip', default: true },
              { label: 'Масштабирование (zoom):', key: 'zoom', default: true },
              { label: 'Перемещение (pan):', key: 'pan', default: true },
              { label: 'Выделение данных:', key: 'selection', default: false },
              { label: 'Анимации переходов:', key: 'animations', default: true },
            ].map(item => (
              <div key={item.key} className="mb-4 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{item.label}</label>
                <input type="checkbox" checked={item.default ? config.interaction?.[item.key] !== false : config.interaction?.[item.key] || false} onChange={(e) => handleInteractionChange(item.key, e.target.checked)} className="w-4 h-4 cursor-pointer" />
              </div>
            ))}
            <div className="mb-4 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Скорость анимации (мс):</label>
              <input type="number" min="100" max="2000" value={config.interaction?.animationDuration || 300} onChange={(e) => handleInteractionChange('animationDuration', parseInt(e.target.value))} className="px-2 py-1.5 border border-gray-300 rounded text-sm max-w-[100px]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartStyleConfigurator;
