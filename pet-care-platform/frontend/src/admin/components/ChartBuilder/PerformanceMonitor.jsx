import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../../utils/virtualization';

// Styles
import './PerformanceMonitor.css';

const PerformanceMonitor = ({ isVisible, onClose, performanceStats, recommendations }) => {
  const [stats, setStats] = useState({});
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    if (performanceStats) {
      setStats(performanceStats);
    }
    if (recommendations) {
      setRecs(recommendations);
    }
  }, [performanceStats, recommendations]);

  if (!isVisible) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Неизвестный';
    }
  };

  const formatValue = (value, unit = '') => {
    if (typeof value === 'number') {
      if (value > 1000000) {
        return `${(value / 1000000).toFixed(2)}M${unit}`;
      } else if (value > 1000) {
        return `${(value / 1000).toFixed(2)}K${unit}`;
      } else {
        return `${value.toFixed(2)}${unit}`;
      }
    }
    return value;
  };

  const formatTime = (ms) => {
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  };

  return (
    <div className="performance-monitor-overlay">
      <div className="performance-monitor-modal">
        <div className="monitor-header">
          <h3>Мониторинг производительности</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="monitor-content">
          {/* Статистика производительности */}
          <div className="stats-section">
            <h4>Показатели производительности</h4>

            <div className="stats-grid">
              {stats.renderTime && (
                <div className="stat-card">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-content">
                    <div className="stat-label">Время рендеринга</div>
                    <div className="stat-value">{formatTime(stats.renderTime.average)}</div>
                    <div className="stat-details">
                      Мин: {formatTime(stats.renderTime.min)} |
                      Макс: {formatTime(stats.renderTime.max)}
                    </div>
                  </div>
                </div>
              )}

              {stats.dataProcessingTime && (
                <div className="stat-card">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-content">
                    <div className="stat-label">Обработка данных</div>
                    <div className="stat-value">{formatTime(stats.dataProcessingTime.average)}</div>
                    <div className="stat-details">
                      Мин: {formatTime(stats.dataProcessingTime.min)} |
                      Макс: {formatTime(stats.dataProcessingTime.max)}
                    </div>
                  </div>
                </div>
              )}

              {stats.fps && (
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <div className="stat-label">FPS</div>
                    <div className="stat-value">{Math.round(stats.fps.average)}</div>
                    <div className="stat-details">
                      Мин: {Math.round(stats.fps.min)} |
                      Макс: {Math.round(stats.fps.max)}
                    </div>
                  </div>
                </div>
              )}

              {stats.memoryUsage && (
                <div className="stat-card">
                  <div className="stat-icon">💾</div>
                  <div className="stat-content">
                    <div className="stat-label">Использование памяти</div>
                    <div className="stat-value">{formatValue(stats.memoryUsage.average, 'B')}</div>
                    <div className="stat-details">
                      Текущая: {formatValue(stats.memoryUsage.current, 'B')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Рекомендации по оптимизации */}
          {recs.length > 0 && (
            <div className="recommendations-section">
              <h4>Рекомендации по оптимизации</h4>

              <div className="recommendations-list">
                {recs.map((rec, index) => (
                  <div key={index} className="recommendation-card">
                    <div
                      className="rec-severity"
                      style={{ backgroundColor: getSeverityColor(rec.severity) }}
                    >
                      {getSeverityLabel(rec.severity)}
                    </div>
                    <div className="rec-content">
                      <div className="rec-type">{rec.type.toUpperCase()}</div>
                      <div className="rec-message">{rec.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Системная информация */}
          <div className="system-section">
            <h4>Системная информация</h4>

            <div className="system-info">
              <div className="info-item">
                <span className="info-label">Виртуализация:</span>
                <span className="info-value">Активна</span>
              </div>

              <div className="info-item">
                <span className="info-label">Web Workers:</span>
                <span className="info-value">
                  {typeof Worker !== 'undefined' ? 'Поддерживаются' : 'Не поддерживаются'}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Кэширование:</span>
                <span className="info-value">In-memory cache</span>
              </div>

              <div className="info-item">
                <span className="info-label">D3.js версия:</span>
                <span className="info-value">7.x</span>
              </div>
            </div>
          </div>

          {/* Действия */}
          <div className="monitor-actions">
            <button
              className="action-btn secondary"
              onClick={() => {
                performanceMonitor.clear();
                setStats({});
                setRecs([]);
              }}
            >
              Очистить метрики
            </button>

            <button
              className="action-btn primary"
              onClick={() => {
                const perfStats = performanceMonitor.getStats();
                const recommendations = performanceMonitor.getOptimizationRecommendations();

                // Экспорт в консоль для отладки
                console.log('Performance Stats:', perfStats);
                console.log('Optimization Recommendations:', recommendations);

                // Можно добавить экспорт в файл
                const data = {
                  timestamp: new Date().toISOString(),
                  stats: perfStats,
                  recommendations
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-report-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Экспорт отчета
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
