import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Styles
import './ExportPanel.css';

const ExportPanel = ({ config, data, onExport, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    format: 'png',
    width: 800,
    height: 600,
    includeLegend: true,
    transparentBg: false,
    quality: 90
  });

  // Обработчики
  const handleExport = async (format) => {
    if (disabled || !onExport) return;

    try {
      const settings = { ...exportSettings, format };
      await onExport(format, settings);
      setIsOpen(false);
      toast.success(`График экспортирован в ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Ошибка экспорта');
    }
  };

  const handleSettingChange = (key, value) => {
    setExportSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getFileSizeEstimate = () => {
    const { width, height, format } = exportSettings;
    const pixels = width * height;

    // Примерная оценка размера файла
    let sizeKB = 0;
    switch (format) {
      case 'png':
        sizeKB = Math.round(pixels * 4 / 1024); // RGBA
        break;
      case 'jpg':
      case 'jpeg':
        sizeKB = Math.round(pixels * 3 * (exportSettings.quality / 100) / 1024);
        break;
      case 'svg':
        sizeKB = Math.round(50); // SVG обычно меньше
        break;
      case 'pdf':
        sizeKB = Math.round(pixels * 3 / 1024 * 1.2);
        break;
      default:
        sizeKB = 100;
    }

    if (sizeKB < 1024) {
      return `~${sizeKB} KB`;
    } else {
      return `~${Math.round(sizeKB / 1024)} MB`;
    }
  };

  const formatOptions = [
    { value: 'png', label: 'PNG', description: 'Растровое изображение с прозрачностью' },
    { value: 'jpg', label: 'JPEG', description: 'Сжатое растровое изображение' },
    { value: 'svg', label: 'SVG', description: 'Векторное изображение' },
    { value: 'pdf', label: 'PDF', description: 'Документ для печати' },
  ];

  return (
    <div className="export-panel">
      <button
        className="export-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        📤 Экспорт
      </button>

      {isOpen && (
        <>
          <div className="export-overlay" onClick={() => setIsOpen(false)} />

          <div className="export-modal">
            <div className="export-header">
              <h3>Экспорт графика</h3>
              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="export-content">
              {/* Быстрый экспорт */}
              <div className="quick-export">
                <h4>Быстрый экспорт</h4>
                <div className="format-buttons">
                  {formatOptions.slice(0, 3).map(format => (
                    <button
                      key={format.value}
                      className="format-btn"
                      onClick={() => handleExport(format.value)}
                      title={format.description}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Расширенные настройки */}
              <div className="advanced-settings">
                <h4>Расширенные настройки</h4>

                <div className="setting-group">
                  <label>Размеры:</label>
                  <div className="size-inputs">
                    <input
                      type="number"
                      value={exportSettings.width}
                      onChange={(e) => handleSettingChange('width', parseInt(e.target.value))}
                      min="400"
                      max="4096"
                      placeholder="Ширина"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      value={exportSettings.height}
                      onChange={(e) => handleSettingChange('height', parseInt(e.target.value))}
                      min="300"
                      max="2160"
                      placeholder="Высота"
                    />
                    <span>px</span>
                  </div>
                </div>

                <div className="setting-group">
                  <label>Качество (для JPEG):</label>
                  <div className="quality-input">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={exportSettings.quality}
                      onChange={(e) => handleSettingChange('quality', parseInt(e.target.value))}
                    />
                    <span>{exportSettings.quality}%</span>
                  </div>
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportSettings.includeLegend}
                      onChange={(e) => handleSettingChange('includeLegend', e.target.checked)}
                    />
                    Включить легенду
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportSettings.transparentBg}
                      onChange={(e) => handleSettingChange('transparentBg', e.target.checked)}
                    />
                    Прозрачный фон
                  </label>
                </div>
              </div>

              {/* Предпросмотр и информация */}
              <div className="export-preview">
                <div className="preview-info">
                  <div className="info-item">
                    <span className="info-label">Формат:</span>
                    <span className="info-value">
                      {formatOptions.find(f => f.value === exportSettings.format)?.label}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Размер:</span>
                    <span className="info-value">
                      {exportSettings.width}×{exportSettings.height}px
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Примерный размер файла:</span>
                    <span className="info-value">{getFileSizeEstimate()}</span>
                  </div>
                </div>
              </div>

              {/* Действия */}
              <div className="export-actions">
                <button
                  className="export-btn primary"
                  onClick={() => handleExport(exportSettings.format)}
                >
                  Экспортировать как {formatOptions.find(f => f.value === exportSettings.format)?.label}
                </button>

                <button
                  className="export-btn secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportPanel;
