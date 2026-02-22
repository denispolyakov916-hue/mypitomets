import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ExportPanel = ({ config, data, onExport, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    format: 'png', width: 800, height: 600, includeLegend: true, transparentBg: false, quality: 90
  });

  const handleExport = async (format) => {
    if (disabled || !onExport) return;
    try {
      await onExport(format, { ...exportSettings, format });
      setIsOpen(false);
      toast.success(`График экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Ошибка экспорта');
    }
  };

  const handleSettingChange = (key, value) => { setExportSettings(prev => ({ ...prev, [key]: value })); };

  const getFileSizeEstimate = () => {
    const { width, height, format } = exportSettings;
    const pixels = width * height;
    let sizeKB = 0;
    switch (format) {
      case 'png': sizeKB = Math.round(pixels * 4 / 1024); break;
      case 'jpg': case 'jpeg': sizeKB = Math.round(pixels * 3 * (exportSettings.quality / 100) / 1024); break;
      case 'svg': sizeKB = Math.round(50); break;
      case 'pdf': sizeKB = Math.round(pixels * 3 / 1024 * 1.2); break;
      default: sizeKB = 100;
    }
    return sizeKB < 1024 ? `~${sizeKB} KB` : `~${Math.round(sizeKB / 1024)} MB`;
  };

  const formatOptions = [
    { value: 'png', label: 'PNG', description: 'Растровое изображение с прозрачностью' },
    { value: 'jpg', label: 'JPEG', description: 'Сжатое растровое изображение' },
    { value: 'svg', label: 'SVG', description: 'Векторное изображение' },
    { value: 'pdf', label: 'PDF', description: 'Документ для печати' },
  ];

  return (
    <div className="relative">
      <button
        className="px-4 py-2 bg-blue-500 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 flex items-center gap-1.5 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        📤 Экспорт
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={() => setIsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] z-[1001] max-w-[500px] w-[90%] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
              <h3 className="m-0 text-lg font-semibold text-slate-800">Экспорт графика</h3>
              <button className="w-8 h-8 border-none bg-gray-100 rounded-full cursor-pointer text-lg flex items-center justify-center transition-colors duration-200 hover:bg-gray-200" onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h4 className="m-0 mb-3 text-sm font-semibold text-gray-700">Быстрый экспорт</h4>
                <div className="flex gap-2">
                  {formatOptions.slice(0, 3).map(format => (
                    <button key={format.value} className="flex-1 py-2.5 px-4 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 text-center hover:bg-gray-200 hover:border-gray-400 active:bg-gray-300" onClick={() => handleExport(format.value)} title={format.description}>{format.label}</button>
                  ))}
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="m-0 mb-4 text-sm font-semibold text-gray-700">Расширенные настройки</h4>
                <div className="mb-4">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">Размеры:</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={exportSettings.width} onChange={(e) => handleSettingChange('width', parseInt(e.target.value))} min="400" max="4096" placeholder="Ширина" className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" />
                    <span className="text-gray-500 font-medium">×</span>
                    <input type="number" value={exportSettings.height} onChange={(e) => handleSettingChange('height', parseInt(e.target.value))} min="300" max="2160" placeholder="Высота" className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500" />
                    <span className="text-gray-500 font-medium">px</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">Качество (для JPEG):</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="100" value={exportSettings.quality} onChange={(e) => handleSettingChange('quality', parseInt(e.target.value))} className="flex-1" />
                    <span>{exportSettings.quality}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={exportSettings.includeLegend} onChange={(e) => handleSettingChange('includeLegend', e.target.checked)} className="w-4 h-4 cursor-pointer" />
                    Включить легенду
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={exportSettings.transparentBg} onChange={(e) => handleSettingChange('transparentBg', e.target.checked)} className="w-4 h-4 cursor-pointer" />
                    Прозрачный фон
                  </label>
                </div>
              </div>

              <div className="mb-6 p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-medium">Формат:</span>
                    <span className="text-sm text-slate-800 font-semibold">{formatOptions.find(f => f.value === exportSettings.format)?.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-medium">Размер:</span>
                    <span className="text-sm text-slate-800 font-semibold">{exportSettings.width}×{exportSettings.height}px</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 font-medium">Примерный размер файла:</span>
                    <span className="text-sm text-slate-800 font-semibold">{getFileSizeEstimate()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => handleExport(exportSettings.format)}>
                  Экспортировать как {formatOptions.find(f => f.value === exportSettings.format)?.label}
                </button>
                <button className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:border-gray-400" onClick={() => setIsOpen(false)}>Отмена</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportPanel;
