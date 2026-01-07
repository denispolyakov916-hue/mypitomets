import React, { useState } from 'react';

// Styles
import './LayerManager.css';

const LayerManager = ({ layers, onAdd, onUpdate, onRemove }) => {
  const [newLayerType, setNewLayerType] = useState('line');

  // Доступные типы слоев
  const layerTypes = [
    { value: 'line', label: 'Линейный график', icon: '📈' },
    { value: 'bar', label: 'Столбчатая диаграмма', icon: '📊' },
    { value: 'scatter', label: 'Точечная диаграмма', icon: '📍' },
    { value: 'area', label: 'Диаграмма с областями', icon: '🌊' },
  ];

  // Обработчики
  const handleAddLayer = () => {
    onAdd(newLayerType);
    setNewLayerType('line'); // Сброс к умолчанию
  };

  const handleLayerToggle = (layerId, visible) => {
    onUpdate(layerId, { visible });
  };

  const handleLayerPropertyChange = (layerId, property, value) => {
    onUpdate(layerId, { [property]: value });
  };

  const handleMoveLayer = (layerId, direction) => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    // Меняем местами zIndex
    const currentLayer = layers[currentIndex];
    const targetLayer = layers[newIndex];

    onUpdate(currentLayer.id, { zIndex: targetLayer.zIndex });
    onUpdate(targetLayer.id, { zIndex: currentLayer.zIndex });
  };

  // Получение цвета для превью
  const getLayerColor = (layer) => {
    if (layer.style?.stroke) return layer.style.stroke;
    if (layer.style?.fill) return layer.style.fill;
    return '#3b82f6';
  };

  // Получение иконки типа слоя
  const getLayerTypeIcon = (type) => {
    const typeInfo = layerTypes.find(t => t.value === type);
    return typeInfo?.icon || '📊';
  };

  return (
    <div className="layer-manager">
      <div className="layer-header">
        <h3>Слои графика</h3>
        <span className="layer-count">{layers?.length || 0}</span>
      </div>

      {/* Добавление нового слоя */}
      <div className="add-layer-section">
        <div className="add-layer-controls">
          <select
            value={newLayerType}
            onChange={(e) => setNewLayerType(e.target.value)}
            className="layer-type-select"
          >
            {layerTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          <button
            className="add-layer-btn"
            onClick={handleAddLayer}
          >
            + Добавить слой
          </button>
        </div>
      </div>

      {/* Список слоев */}
      <div className="layers-list">
        {(!layers || layers.length === 0) ? (
          <div className="empty-layers">
            <div className="empty-icon">🎨</div>
            <h4>Нет слоев</h4>
            <p>Добавьте слои для создания графика</p>
          </div>
        ) : (
          layers
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
            .map((layer, index) => (
              <div key={layer.id} className="layer-item">
                {/* Заголовок слоя */}
                <div className="layer-header-row">
                  <div className="layer-info">
                    <div
                      className="layer-color"
                      style={{ backgroundColor: getLayerColor(layer) }}
                    />
                    <span className="layer-icon">{getLayerTypeIcon(layer.type)}</span>
                    <span className="layer-name">
                      {layer.type === 'line' && 'Линейный график'}
                      {layer.type === 'bar' && 'Столбчатая диаграмма'}
                      {layer.type === 'scatter' && 'Точечная диаграмма'}
                      {layer.type === 'area' && 'Диаграмма с областями'}
                    </span>
                  </div>

                  <div className="layer-actions">
                    <button
                      className={`visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
                      onClick={() => handleLayerToggle(layer.id, !layer.visible)}
                      title={layer.visible ? 'Скрыть слой' : 'Показать слой'}
                    >
                      {layer.visible ? '👁️' : '🙈'}
                    </button>

                    <button
                      className="move-btn"
                      onClick={() => handleMoveLayer(layer.id, 'up')}
                      disabled={index === 0}
                      title="Переместить выше"
                    >
                      ↑
                    </button>

                    <button
                      className="move-btn"
                      onClick={() => handleMoveLayer(layer.id, 'down')}
                      disabled={index === layers.length - 1}
                      title="Переместить ниже"
                    >
                      ↓
                    </button>

                    <button
                      className="remove-btn"
                      onClick={() => onRemove(layer.id)}
                      title="Удалить слой"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Настройки слоя */}
                <div className="layer-settings">
                  <div className="setting-group">
                    <label>Цвет:</label>
                    <input
                      type="color"
                      value={getLayerColor(layer)}
                      onChange={(e) => handleLayerPropertyChange(
                        layer.id,
                        'style',
                        { ...layer.style, stroke: e.target.value, fill: e.target.value }
                      )}
                    />
                  </div>

                  {(layer.type === 'line' || layer.type === 'area') && (
                    <div className="setting-group">
                      <label>Толщина линии:</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={layer.style?.strokeWidth || 2}
                        onChange={(e) => handleLayerPropertyChange(
                          layer.id,
                          'style',
                          { ...layer.style, strokeWidth: parseInt(e.target.value) }
                        )}
                      />
                      <span className="value-display">{layer.style?.strokeWidth || 2}px</span>
                    </div>
                  )}

                  {layer.type === 'scatter' && (
                    <div className="setting-group">
                      <label>Размер точек:</label>
                      <input
                        type="range"
                        min="2"
                        max="20"
                        value={layer.style?.radius || 4}
                        onChange={(e) => handleLayerPropertyChange(
                          layer.id,
                          'style',
                          { ...layer.style, radius: parseInt(e.target.value) }
                        )}
                      />
                      <span className="value-display">{layer.style?.radius || 4}px</span>
                    </div>
                  )}

                  <div className="setting-group">
                    <label>Прозрачность:</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={layer.style?.opacity || 1}
                      onChange={(e) => handleLayerPropertyChange(
                        layer.id,
                        'style',
                        { ...layer.style, opacity: parseFloat(e.target.value) }
                      )}
                    />
                    <span className="value-display">{Math.round((layer.style?.opacity || 1) * 100)}%</span>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Информация о порядке слоев */}
      {layers && layers.length > 1 && (
        <div className="layer-order-info">
          <p>🎨 <strong>Порядок слоев:</strong> верхние слои отображаются поверх нижних</p>
        </div>
      )}
    </div>
  );
};

export default LayerManager;
