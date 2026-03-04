import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../../../utils/virtualization';

const PerformanceMonitor = ({ isVisible, onClose, performanceStats, recommendations }) => {
  const [stats, setStats] = useState({});
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    if (performanceStats) setStats(performanceStats);
    if (recommendations) setRecs(recommendations);
  }, [performanceStats, recommendations]);

  if (!isVisible) return null;

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
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
      if (value > 1000000) return `${(value / 1000000).toFixed(2)}M${unit}`;
      else if (value > 1000) return `${(value / 1000).toFixed(2)}K${unit}`;
      else return `${value.toFixed(2)}${unit}`;
    }
    return value;
  };

  const formatTime = (ms) => ms < 1000 ? `${ms.toFixed(2)}ms` : `${(ms / 1000).toFixed(2)}s`;

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-500';
      case 'low': return 'bg-green-50 border-emerald-500';
      default: return 'bg-secondary-100 border-secondary-500';
    }
  };

  const getSeverityTextColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'low': return 'text-emerald-700';
      default: return 'text-secondary-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] max-w-[800px] w-[90%] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
          <h3 className="m-0 text-lg font-semibold text-primary-800">Мониторинг производительности</h3>
          <button className="w-8 h-8 border-none bg-gray-100 rounded-full cursor-pointer text-lg flex items-center justify-center transition-colors duration-200 hover:bg-gray-200" onClick={onClose}>×</button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Показатели производительности</h4>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              {stats.renderTime && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl w-10 text-center">⚡</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">Время рендеринга</div>
                    <div className="text-lg font-semibold text-primary-800 mb-0.5">{formatTime(stats.renderTime.average)}</div>
                    <div className="text-xs text-gray-400">Мин: {formatTime(stats.renderTime.min)} | Макс: {formatTime(stats.renderTime.max)}</div>
                  </div>
                </div>
              )}
              {stats.dataProcessingTime && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl w-10 text-center">🔄</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">Обработка данных</div>
                    <div className="text-lg font-semibold text-primary-800 mb-0.5">{formatTime(stats.dataProcessingTime.average)}</div>
                    <div className="text-xs text-gray-400">Мин: {formatTime(stats.dataProcessingTime.min)} | Макс: {formatTime(stats.dataProcessingTime.max)}</div>
                  </div>
                </div>
              )}
              {stats.fps && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl w-10 text-center">🎯</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">FPS</div>
                    <div className="text-lg font-semibold text-primary-800 mb-0.5">{Math.round(stats.fps.average)}</div>
                    <div className="text-xs text-gray-400">Мин: {Math.round(stats.fps.min)} | Макс: {Math.round(stats.fps.max)}</div>
                  </div>
                </div>
              )}
              {stats.memoryUsage && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl w-10 text-center">💾</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">Использование памяти</div>
                    <div className="text-lg font-semibold text-primary-800 mb-0.5">{formatValue(stats.memoryUsage.average, 'B')}</div>
                    <div className="text-xs text-gray-400">Текущая: {formatValue(stats.memoryUsage.current, 'B')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {recs.length > 0 && (
            <div className="mb-6">
              <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Рекомендации по оптимизации</h4>
              <div className="flex flex-col gap-3">
                {recs.map((rec, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-md border ${getSeverityBg(rec.severity)}`}>
                    <div className="px-2 py-0.5 rounded-xl text-[11px] font-semibold text-white uppercase tracking-wider" style={{ backgroundColor: getSeverityColor(rec.severity) }}>
                      {getSeverityLabel(rec.severity)}
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${getSeverityTextColor(rec.severity)}`}>{rec.type.toUpperCase()}</div>
                      <div className={`text-sm leading-snug ${getSeverityTextColor(rec.severity)}`}>{rec.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h4 className="m-0 mb-4 text-base font-semibold text-gray-700">Системная информация</h4>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              {[
                { label: 'Виртуализация:', value: 'Активна' },
                { label: 'Web Workers:', value: typeof Worker !== 'undefined' ? 'Поддерживаются' : 'Не поддерживаются' },
                { label: 'Кэширование:', value: 'In-memory cache' },
                { label: 'D3.js версия:', value: '7.x' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-md">
                  <span className="text-sm text-gray-500 font-medium">{item.label}</span>
                  <span className="text-sm text-primary-800 font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-200">
            <button
              className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:border-gray-400"
              onClick={() => { performanceMonitor.clear(); setStats({}); setRecs([]); }}
            >
              Очистить метрики
            </button>
            <button
              className="px-5 py-2.5 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 border-none bg-primary-500 text-white hover:bg-primary-600"
              onClick={() => {
                const perfStats = performanceMonitor.getStats();
                const recommendations = performanceMonitor.getOptimizationRecommendations();
                console.log('Performance Stats:', perfStats);
                console.log('Optimization Recommendations:', recommendations);
                const data = { timestamp: new Date().toISOString(), stats: perfStats, recommendations };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `performance-report-${Date.now()}.json`; a.click();
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
