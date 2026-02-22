import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';

/**
 * Виджет предупреждений о рисках здоровья породы
 * 
 * Показывает:
 * - Генетические риски породы
 * - Уровень тяжести
 * - Рекомендации по профилактике
 * - Скрининговые обследования
 */
const HealthRiskAlertsWidget = ({ breedId, petAge }) => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | high | medium

  useEffect(() => {
    if (breedId) {
      loadRisks();
    }
  }, [breedId, filter]);

  const loadRisks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') {
        params.severity = filter;
      }

      const response = await api.get(`/pets/breeds/${breedId}/health-risks/`, { params });
      setRisks(response.data.risks || []);
    } catch (err) {
      console.error('Error loading health risks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBorderColor = (severity) => {
    if (severity === 'medium') return 'border-amber-500';
    if (severity === 'low') return 'border-blue-500';
    return 'border-red-500';
  };

  const getSeverityBadgeClasses = (severity) => {
    const base = 'py-1 px-3 rounded-full text-xs font-semibold';
    if (severity === 'high') return `${base} bg-red-50 text-red-600`;
    if (severity === 'medium') return `${base} bg-yellow-100 text-yellow-800`;
    return `${base} bg-cyan-100 text-cyan-800`;
  };

  if (!breedId) {
    return (
      <div className="bg-white rounded-xl p-10 text-center text-gray-500">
        <p>Добавьте породу в профиль для просмотра рисков здоровья</p>
      </div>
    );
  }

  if (loading) {
    return <div className="bg-white rounded-xl p-10 text-center text-gray-500">Загрузка рисков...</div>;
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <div className="flex flex-col items-start gap-3 md:flex-row md:justify-between md:items-center mb-5 pb-4 border-b-2 border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800">⚕️ Риски здоровья породы</h3>
        <div className="flex gap-2">
          <button
            className={`py-1.5 px-4 border rounded-full text-[13px] cursor-pointer transition-all duration-200 ${
              filter === 'all'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setFilter('all')}
          >
            Все
          </button>
          <button
            className={`py-1.5 px-4 border rounded-full text-[13px] cursor-pointer transition-all duration-200 ${
              filter === 'high'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setFilter('high')}
          >
            Высокие
          </button>
          <button
            className={`py-1.5 px-4 border rounded-full text-[13px] cursor-pointer transition-all duration-200 ${
              filter === 'medium'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setFilter('medium')}
          >
            Средние
          </button>
        </div>
      </div>

      {risks.length === 0 ? (
        <div className="p-10 text-center text-green-600 text-base font-medium">
          <p>✓ Нет выявленных генетических рисков</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {risks.map((risk, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl bg-gray-50 border-l-4 transition-all duration-200 hover:shadow-md hover:translate-x-1 ${getRiskBorderColor(risk.severity)}`}
            >
              <div className="mb-4">
                <div className="flex flex-col items-start gap-2 mb-2 md:flex-row md:justify-between md:items-center">
                  <h4 className="text-base font-semibold text-gray-800">{risk.condition_name}</h4>
                  <span className={getSeverityBadgeClasses(risk.severity)}>
                    {risk.severity === 'high' && '⚠️ Высокий'}
                    {risk.severity === 'medium' && '⚡ Средний'}
                    {risk.severity === 'low' && 'ℹ️ Низкий'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-[13px] text-gray-500 md:flex-row md:gap-3">
                  <span className="font-semibold text-red-500">{risk.prevalence_percent}%</span>
                  <span className="py-0.5 px-2 bg-white rounded text-xs">{risk.affected_system}</span>
                </div>
              </div>

              {risk.age_of_onset && (
                <div className="my-3 p-2.5 bg-white rounded-md text-[13px] text-gray-600">
                  <strong className="text-gray-800">Возраст проявления:</strong> {risk.age_of_onset}
                  {petAge && (
                    <span className={`ml-2 font-semibold ${petAge >= parseAge(risk.age_of_onset) ? 'text-red-500' : 'text-green-600'}`}>
                      {petAge >= parseAge(risk.age_of_onset) ? ' (возраст риска!)' : ' (пока рано)'}
                    </span>
                  )}
                </div>
              )}

              <div className="my-3 p-3 bg-white rounded-md text-sm">
                <strong className="block mb-1.5 text-gray-800 text-[13px]">Профилактика:</strong>
                <p className="m-0 text-gray-600 leading-normal">{risk.prevention}</p>
              </div>

              <div className="my-3 p-3 bg-white rounded-md text-sm">
                <strong className="block mb-1.5 text-gray-800 text-[13px]">Рекомендуемые обследования:</strong>
                <p className="m-0 text-gray-600 leading-normal">{risk.screening}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const parseAge = (ageStr) => {
  if (!ageStr) return 0;
  const match = ageStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

export default HealthRiskAlertsWidget;
