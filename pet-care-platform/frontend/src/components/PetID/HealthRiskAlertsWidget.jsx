import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';
import './HealthRiskAlertsWidget.css';

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

  if (!breedId) {
    return (
      <div className="health-risks-widget empty">
        <p>Добавьте породу в профиль для просмотра рисков здоровья</p>
      </div>
    );
  }

  if (loading) {
    return <div className="health-risks-widget loading">Загрузка рисков...</div>;
  }

  return (
    <div className="health-risks-widget">
      <div className="widget-header">
        <h3>⚕️ Риски здоровья породы</h3>
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Все
          </button>
          <button
            className={filter === 'high' ? 'active' : ''}
            onClick={() => setFilter('high')}
          >
            Высокие
          </button>
          <button
            className={filter === 'medium' ? 'active' : ''}
            onClick={() => setFilter('medium')}
          >
            Средние
          </button>
        </div>
      </div>

      {risks.length === 0 ? (
        <div className="no-risks">
          <p>✓ Нет выявленных генетических рисков</p>
        </div>
      ) : (
        <div className="risks-list">
          {risks.map((risk, idx) => (
            <div key={idx} className={`risk-card severity-${risk.severity}`}>
              <div className="risk-header">
                <div className="risk-title">
                  <h4>{risk.condition_name}</h4>
                  <span className={`severity-badge ${risk.severity}`}>
                    {risk.severity === 'high' && '⚠️ Высокий'}
                    {risk.severity === 'medium' && '⚡ Средний'}
                    {risk.severity === 'low' && 'ℹ️ Низкий'}
                  </span>
                </div>
                <div className="risk-stats">
                  <span className="prevalence">{risk.prevalence_percent}%</span>
                  <span className="system">{risk.affected_system}</span>
                </div>
              </div>

              {risk.age_of_onset && (
                <div className="risk-onset">
                  <strong>Возраст проявления:</strong> {risk.age_of_onset}
                  {petAge && (
                    <span className={`age-indicator ${petAge >= parseAge(risk.age_of_onset) ? 'risk' : 'safe'}`}>
                      {petAge >= parseAge(risk.age_of_onset) ? ' (возраст риска!)' : ' (пока рано)'}
                    </span>
                  )}
                </div>
              )}

              <div className="risk-prevention">
                <strong>Профилактика:</strong>
                <p>{risk.prevention}</p>
              </div>

              <div className="risk-screening">
                <strong>Рекомендуемые обследования:</strong>
                <p>{risk.screening}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Вспомогательная функция для парсинга возраста
const parseAge = (ageStr) => {
  if (!ageStr) return 0;
  const match = ageStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

export default HealthRiskAlertsWidget;

