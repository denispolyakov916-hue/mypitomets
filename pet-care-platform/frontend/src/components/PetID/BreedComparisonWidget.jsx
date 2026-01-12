import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';
import './BreedComparisonWidget.css';

/**
 * Виджет сравнения параметров питомца с эталоном породы
 * 
 * Показывает:
 * - Анализ веса (норма/избыток/недостаток)
 * - Анализ активности
 * - Риски здоровья породы
 * - Рекомендации
 */
const BreedComparisonWidget = ({ petId }) => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadComparison();
  }, [petId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pets/${petId}/breed-comparison/`);
      setComparison(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="breed-comparison-widget loading">
        <div className="spinner"></div>
        <p>Загрузка сравнения...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="breed-comparison-widget error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  if (!comparison || comparison.error) {
    return (
      <div className="breed-comparison-widget no-breed">
        <p>Добавьте породу в профиль для персонализированных рекомендаций</p>
      </div>
    );
  }

  const { weight_analysis, activity_analysis, health_risks, recommendations, overall_score } = comparison;

  return (
    <div className="breed-comparison-widget">
      <div className="widget-header">
        <h3>Сравнение с эталоном породы</h3>
        <div className={`overall-score score-${overall_score >= 80 ? 'good' : overall_score >= 60 ? 'medium' : 'low'}`}>
          <span className="score-value">{overall_score}</span>
          <span className="score-label">/100</span>
        </div>
      </div>

      {/* Анализ веса */}
      <div className="comparison-section weight-section">
        <h4>Вес</h4>
        <div className={`status-badge status-${weight_analysis.status}`}>
          {weight_analysis.status === 'normal' && '✓ Норма'}
          {weight_analysis.status === 'overweight' && '⚠️ Избыточный'}
          {weight_analysis.status === 'underweight' && '⚠️ Недостаточный'}
        </div>
        
        <div className="weight-info">
          <div className="weight-current">
            <span className="label">Текущий вес:</span>
            <span className="value">{weight_analysis.current_weight} кг</span>
          </div>
          <div className="weight-ideal">
            <span className="label">Идеально для породы:</span>
            <span className="value">{weight_analysis.ideal_min}-{weight_analysis.ideal_max} кг</span>
          </div>
        </div>
        
        <p className="message">{weight_analysis.message}</p>
        
        {weight_analysis.status !== 'normal' && (
          <div className="recommendation">
            <strong>Рекомендация:</strong> {weight_analysis.recommendation}
          </div>
        )}
      </div>

      {/* Анализ активности */}
      <div className="comparison-section activity-section">
        <h4>Активность</h4>
        <div className={`status-badge status-${activity_analysis.status}`}>
          {activity_analysis.status === 'normal' && '✓ Соответствует'}
          {activity_analysis.status === 'insufficient' && '⚠️ Недостаточная'}
          {activity_analysis.status === 'excessive' && '⚠️ Избыточная'}
        </div>
        
        <div className="activity-info">
          <div className="activity-current">
            <span className="label">Фактическая:</span>
            <span className="value">{activity_analysis.pet_activity}</span>
          </div>
          <div className="activity-breed">
            <span className="label">Требуется для породы:</span>
            <span className="value">{activity_analysis.breed_energy}</span>
          </div>
        </div>
        
        <p className="message">{activity_analysis.message}</p>
        
        {activity_analysis.status !== 'normal' && (
          <>
            <div className="recommendation">
              <strong>Рекомендация:</strong> {activity_analysis.recommendation}
            </div>
            {activity_analysis.risks && activity_analysis.risks.length > 0 && (
              <div className="risks-list">
                <strong>Возможные риски:</strong>
                <ul>
                  {activity_analysis.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Риски здоровья */}
      {health_risks && health_risks.length > 0 && (
        <div className="comparison-section health-risks-section">
          <h4>Генетические риски породы</h4>
          <div className="risks-grid">
            {health_risks.slice(0, 3).map((risk, idx) => (
              <div key={idx} className={`risk-card severity-${risk.severity}`}>
                <div className="risk-header">
                  <span className="risk-name">{risk.condition}</span>
                  <span className="risk-prevalence">{risk.prevalence}%</span>
                </div>
                <div className="risk-system">{risk.affected_system}</div>
                <div className="risk-prevention">
                  <strong>Профилактика:</strong> {risk.prevention}
                </div>
                {risk.priority === 'urgent' && (
                  <div className="risk-urgent">
                    🚨 {risk.message}
                  </div>
                )}
              </div>
            ))}
          </div>
          {health_risks.length > 3 && (
            <button className="show-more-btn" onClick={() => {}}>
              Показать все {health_risks.length} рисков
            </button>
          )}
        </div>
      )}

      {/* Рекомендации */}
      {recommendations && (
        <div className="comparison-section recommendations-section">
          <h4>Рекомендации</h4>
          
          {recommendations.priority && recommendations.priority.length > 0 && (
            <div className="priority-recommendations">
              <h5>⚡ Приоритетные</h5>
              {recommendations.priority.map((rec, idx) => (
                <div key={idx} className="priority-card">
                  <strong>{rec.message}</strong>
                  <ul>
                    {rec.actions.map((action, aidx) => (
                      <li key={aidx}>{action}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          
          {recommendations.products && recommendations.products.length > 0 && (
            <div className="product-recommendations">
              <h5>🛒 Рекомендуемые товары</h5>
              <ul>
                {recommendations.products.map((product, idx) => (
                  <li key={idx}>{product}</li>
                ))}
              </ul>
            </div>
          )}
          
          {recommendations.courses && recommendations.courses.length > 0 && (
            <div className="course-recommendations">
              <h5>🎓 Рекомендуемые курсы</h5>
              <ul>
                {recommendations.courses.map((course, idx) => (
                  <li key={idx}>{course}</li>
                ))}
              </ul>
            </div>
          )}
          
          {recommendations.vet_visits && recommendations.vet_visits.length > 0 && (
            <div className="vet-recommendations">
              <h5>🏥 Рекомендуемые обследования</h5>
              <ul>
                {recommendations.vet_visits.map((visit, idx) => (
                  <li key={idx}>{visit}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BreedComparisonWidget;

