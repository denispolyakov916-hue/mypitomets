import React, { useState } from 'react';

const LayerManager = ({ layers, onAdd, onUpdate, onRemove }) => {
  const [newLayerType, setNewLayerType] = useState('line');

  const layerTypes = [
    { value: 'line', label: 'Линейный график', icon: '📈' },
    { value: 'bar', label: 'Столбчатая диаграмма', icon: '📊' },
    { value: 'scatter', label: 'Точечная диаграмма', icon: '📍' },
    { value: 'area', label: 'Диаграмма с областями', icon: '🌊' },
  ];

  const handleAddLayer = () => { onAdd(newLayerType); setNewLayerType('line'); };
  const handleLayerToggle = (layerId, visible) => { onUpdate(layerId, { visible }); };
  const handleLayerPropertyChange = (layerId, property, value) => { onUpdate(layerId, { [property]: value }); };

  const handleMoveLayer = (layerId, direction) => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= layers.length) return;
    const currentLayer = layers[currentIndex];
    const targetLayer = layers[newIndex];
    onUpdate(currentLayer.id, { zIndex: targetLayer.zIndex });
    onUpdate(targetLayer.id, { zIndex: currentLayer.zIndex });
  };

  const getLayerColor = (layer) => layer.style?.stroke || layer.style?.fill || '#3b82f6';
  const getLayerTypeIcon = (type) => layerTypes.find(t => t.value === type)?.icon || '📊';

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200">
        <h3 className="m-0 text-lg font-semibold text-slate-800">Слои графика</h3>
        <span className="bg-blue-500 text-white px-2 py-0.5 rounded-xl text-xs font-semibold">{layers?.length || 0}</span>
      </div>

      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex gap-3 items-center">
          <select value={newLayerType} onChange={(e) => setNewLayerType(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]">
            {layerTypes.map(type => <option key={type.value} value={type.value}>{type.icon} {type.label}</option>)}
          </select>
          <button className="px-4 py-2 bg-emerald-500 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-emerald-600" onClick={handleAddLayer}>+ Добавить слой</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {(!layers || layers.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center text-gray-500">
            <div className="text-5xl mb-4 opacity-50">🎨</div>
            <h4 className="m-0 mb-2 text-base font-semibold text-gray-700">Нет слоев</h4>
            <p className="m-0 text-sm">Добавьте слои для создания графика</p>
          </div>
        ) : (
          layers.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map((layer, index) => (
            <div key={layer.id} className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)]" style={{ backgroundColor: getLayerColor(layer) }} />
                  <span className="text-base">{getLayerTypeIcon(layer.type)}</span>
                  <span className="font-semibold text-slate-800">
                    {layer.type === 'line' && 'Линейный график'}
                    {layer.type === 'bar' && 'Столбчатая диаграмма'}
                    {layer.type === 'scatter' && 'Точечная диаграмма'}
                    {layer.type === 'area' && 'Диаграмма с областями'}
                  </span>
                </div>
                <div className="flex gap-1 items-center">
                  <button className={`w-7 h-7 border-none rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-200 ${layer.visible ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'} hover:opacity-80`} onClick={() => handleLayerToggle(layer.id, !layer.visible)} title={layer.visible ? 'Скрыть слой' : 'Показать слой'}>
                    {layer.visible ? '👁️' : '🙈'}
                  </button>
                  <button className="w-7 h-7 border border-gray-300 rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-200 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleMoveLayer(layer.id, 'up')} disabled={index === 0} title="Переместить выше">↑</button>
                  <button className="w-7 h-7 border border-gray-300 rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-200 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => handleMoveLayer(layer.id, 'down')} disabled={index === layers.length - 1} title="Переместить ниже">↓</button>
                  <button className="w-7 h-7 border-none rounded cursor-pointer text-sm flex items-center justify-center transition-all duration-200 bg-red-500 text-white hover:bg-red-600" onClick={() => onRemove(layer.id)} title="Удалить слой">×</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Цвет:</label>
                  <input type="color" value={getLayerColor(layer)} onChange={(e) => handleLayerPropertyChange(layer.id, 'style', { ...layer.style, stroke: e.target.value, fill: e.target.value })} className="w-10 h-8 border-none rounded cursor-pointer" />
                </div>
                {(layer.type === 'line' || layer.type === 'area') && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Толщина линии:</label>
                    <input type="range" min="1" max="10" value={layer.style?.strokeWidth || 2} onChange={(e) => handleLayerPropertyChange(layer.id, 'style', { ...layer.style, strokeWidth: parseInt(e.target.value) })} className="w-full h-1 cursor-pointer" />
                    <span className="text-xs text-gray-700 font-semibold text-center mt-1">{layer.style?.strokeWidth || 2}px</span>
                  </div>
                )}
                {layer.type === 'scatter' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Размер точек:</label>
                    <input type="range" min="2" max="20" value={layer.style?.radius || 4} onChange={(e) => handleLayerPropertyChange(layer.id, 'style', { ...layer.style, radius: parseInt(e.target.value) })} className="w-full h-1 cursor-pointer" />
                    <span className="text-xs text-gray-700 font-semibold text-center mt-1">{layer.style?.radius || 4}px</span>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Прозрачность:</label>
                  <input type="range" min="0.1" max="1" step="0.1" value={layer.style?.opacity || 1} onChange={(e) => handleLayerPropertyChange(layer.id, 'style', { ...layer.style, opacity: parseFloat(e.target.value) })} className="w-full h-1 cursor-pointer" />
                  <span className="text-xs text-gray-700 font-semibold text-center mt-1">{Math.round((layer.style?.opacity || 1) * 100)}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {layers && layers.length > 1 && (
        <div className="mx-5 mb-4 p-3 bg-amber-100 rounded-md border border-amber-500">
          <p className="m-0 text-xs text-amber-800">🎨 <strong>Порядок слоев:</strong> верхние слои отображаются поверх нижних</p>
        </div>
      )}
    </div>
  );
};

export default LayerManager;
