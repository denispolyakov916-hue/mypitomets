import React, { useState } from 'react';

// Styles
import './ChartStyleConfigurator.css';

const ChartStyleConfigurator = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState('general');

  const handleStyleChange = (category, property, value) => {
    const newConfig = { ...config };
    if (!newConfig.style) newConfig.style = {};

    if (category === 'canvas') {
      newConfig.canvas = { ...newConfig.canvas, [property]: value };
    } else {
      newConfig.style = { ...newConfig.style, [property]: value };
    }

    onChange(newConfig);
  };

  const handleLegendChange = (property, value) => {
    const newConfig = { ...config };
    newConfig.legend = { ...newConfig.legend, [property]: value };
    onChange(newConfig);
  };

  const handleInteractionChange = (property, value) => {
    const newConfig = { ...config };
    newConfig.interaction = { ...newConfig.interaction, [property]: value };
    onChange(newConfig);
  };

  // Цветовые палитры
  const colorPalettes = [
    { name: 'Default', colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'] },
    { name: 'Blues', colors: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'] },
    { name: 'Reds', colors: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626'] },
    { name: 'Greens', colors: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e'] },
    { name: 'Purples', colors: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7'] }
  ];

  // Темы оформления
  const themes = [
    {
      name: 'Light',
      canvas: { background: '#ffffff' },
      style: { gridColor: '#e2e8f0', textColor: '#374151' }
    },
    {
      name: 'Dark',
      canvas: { background: '#1e293b' },
      style: { gridColor: '#334155', textColor: '#cbd5e1' }
    },
    {
      name: 'Minimal',
      canvas: { background: '#ffffff' },
      style: { gridColor: '#f1f5f9', textColor: '#64748b' }
    }
  ];

  const applyTheme = (theme) => {
    const newConfig = {
      ...config,
      canvas: { ...config.canvas, ...theme.canvas },
      style: { ...config.style, ...theme.style }
    };
    onChange(newConfig);
  };

  return (
    <div className="chart-style-configurator">
      <div className="style-tabs">
        <button
          className={`style-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Общие
        </button>
        <button
          className={`style-tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          Цвета
        </button>
        <button
          className={`style-tab ${activeTab === 'legend' ? 'active' : ''}`}
          onClick={() => setActiveTab('legend')}
        >
          Легенда
        </button>
        <button
          className={`style-tab ${activeTab === 'interaction' ? 'active' : ''}`}
          onClick={() => setActiveTab('interaction')}
        >
          Интерактивность
        </button>
      </div>

      <div className="style-content">
        {/* Общие настройки */}
        {activeTab === 'general' && (
          <div className="style-section">
            <h4>Общие настройки</h4>

            <div className="setting-group">
              <label>Тема оформления:</label>
              <div className="theme-buttons">
                {themes.map(theme => (
                  <button
                    key={theme.name}
                    className="theme-btn"
                    onClick={() => applyTheme(theme)}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label>Фон графика:</label>
              <input
                type="color"
                value={config.canvas?.background || '#ffffff'}
                onChange={(e) => handleStyleChange('canvas', 'background', e.target.value)}
              />
            </div>

            <div className="setting-group">
              <label>Цвет сетки:</label>
              <input
                type="color"
                value={config.style?.gridColor || '#e2e8f0'}
                onChange={(e) => handleStyleChange('style', 'gridColor', e.target.value)}
              />
            </div>

            <div className="setting-group">
              <label>Цвет текста:</label>
              <input
                type="color"
                value={config.style?.textColor || '#374151'}
                onChange={(e) => handleStyleChange('style', 'textColor', e.target.value)}
              />
            </div>

            <div className="setting-group">
              <label>Показывать сетку:</label>
              <input
                type="checkbox"
                checked={config.style?.showGrid !== false}
                onChange={(e) => handleStyleChange('style', 'showGrid', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Закругленные углы:</label>
              <input
                type="checkbox"
                checked={config.style?.roundedCorners || false}
                onChange={(e) => handleStyleChange('style', 'roundedCorners', e.target.checked)}
              />
            </div>
          </div>
        )}

        {/* Настройки цветов */}
        {activeTab === 'colors' && (
          <div className="style-section">
            <h4>Цветовые палитры</h4>

            {colorPalettes.map(palette => (
              <div key={palette.name} className="palette-group">
                <div className="palette-name">{palette.name}</div>
                <div className="palette-colors">
                  {palette.colors.map((color, index) => (
                    <div
                      key={index}
                      className="palette-color"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <button
                  className="apply-palette-btn"
                  onClick={() => handleStyleChange('style', 'colorPalette', palette.colors)}
                >
                  Применить
                </button>
              </div>
            ))}

            <div className="setting-group">
              <label>Пользовательские цвета:</label>
              <div className="custom-colors">
                {(config.style?.customColors || []).map((color, index) => (
                  <input
                    key={index}
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...(config.style?.customColors || [])];
                      newColors[index] = e.target.value;
                      handleStyleChange('style', 'customColors', newColors);
                    }}
                  />
                ))}
                <button
                  className="add-color-btn"
                  onClick={() => {
                    const newColors = [...(config.style?.customColors || []), '#3b82f6'];
                    handleStyleChange('style', 'customColors', newColors);
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Настройки легенды */}
        {activeTab === 'legend' && (
          <div className="style-section">
            <h4>Настройки легенды</h4>

            <div className="setting-group">
              <label>Показывать легенду:</label>
              <input
                type="checkbox"
                checked={config.legend?.show !== false}
                onChange={(e) => handleLegendChange('show', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Положение:</label>
              <select
                value={config.legend?.position || 'top-right'}
                onChange={(e) => handleLegendChange('position', e.target.value)}
              >
                <option value="top-left">Сверху слева</option>
                <option value="top-right">Сверху справа</option>
                <option value="bottom-left">Снизу слева</option>
                <option value="bottom-right">Снизу справа</option>
                <option value="center-left">По центру слева</option>
                <option value="center-right">По центру справа</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Ориентация:</label>
              <select
                value={config.legend?.orientation || 'vertical'}
                onChange={(e) => handleLegendChange('orientation', e.target.value)}
              >
                <option value="vertical">Вертикальная</option>
                <option value="horizontal">Горизонтальная</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Размер символов:</label>
              <input
                type="range"
                min="8"
                max="20"
                value={config.legend?.fontSize || 12}
                onChange={(e) => handleLegendChange('fontSize', parseInt(e.target.value))}
              />
              <span className="value-display">{config.legend?.fontSize || 12}px</span>
            </div>
          </div>
        )}

        {/* Настройки интерактивности */}
        {activeTab === 'interaction' && (
          <div className="style-section">
            <h4>Интерактивные возможности</h4>

            <div className="setting-group">
              <label>Показывать подсказки (tooltips):</label>
              <input
                type="checkbox"
                checked={config.interaction?.tooltip !== false}
                onChange={(e) => handleInteractionChange('tooltip', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Масштабирование (zoom):</label>
              <input
                type="checkbox"
                checked={config.interaction?.zoom !== false}
                onChange={(e) => handleInteractionChange('zoom', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Перемещение (pan):</label>
              <input
                type="checkbox"
                checked={config.interaction?.pan !== false}
                onChange={(e) => handleInteractionChange('pan', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Выделение данных:</label>
              <input
                type="checkbox"
                checked={config.interaction?.selection || false}
                onChange={(e) => handleInteractionChange('selection', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Анимации переходов:</label>
              <input
                type="checkbox"
                checked={config.interaction?.animations !== false}
                onChange={(e) => handleInteractionChange('animations', e.target.checked)}
              />
            </div>

            <div className="setting-group">
              <label>Скорость анимации (мс):</label>
              <input
                type="number"
                min="100"
                max="2000"
                value={config.interaction?.animationDuration || 300}
                onChange={(e) => handleInteractionChange('animationDuration', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartStyleConfigurator;
