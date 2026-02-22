import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';

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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getStatusBadgeClasses = (status) => {
    if (status === 'normal') return 'inline-block py-1 px-3 rounded-full text-sm font-medium mb-3 bg-green-100 text-green-800';
    return 'inline-block py-1 px-3 rounded-full text-sm font-medium mb-3 bg-yellow-100 text-yellow-800';
  };

  const getRiskBorderColor = (severity) => {
    if (severity === 'medium') return 'border-amber-500';
    if (severity === 'low') return 'border-blue-500';
    return 'border-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md flex flex-col items-center justify-center min-h-[200px]">
        <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-500">Загрузка сравнения...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md">
        <p className="text-red-600">⚠️ {error}</p>
      </div>
    );
  }

  if (!comparison || comparison.error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-md">
        <p className="text-gray-500">Добавьте породу в профиль для персонализированных рекомендаций</p>
      </div>
    );
  }

  const { weight_analysis, activity_analysis, health_risks, recommendations, overall_score } = comparison;

  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800">Сравнение с эталоном породы</h3>
        <div className="flex items-baseline font-bold">
          <span className={`text-[32px] ${getScoreColor(overall_score)}`}>{overall_score}</span>
          <span className="text-base text-gray-400 ml-1">/100</span>
        </div>
      </div>

      {/* Анализ веса */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="mb-3 text-base font-semibold text-gray-800">Вес</h4>
        <div className={getStatusBadgeClasses(weight_analysis.status)}>
          {weight_analysis.status === 'normal' && '✓ Норма'}
          {weight_analysis.status === 'overweight' && '⚠️ Избыточный'}
          {weight_analysis.status === 'underweight' && '⚠️ Недостаточный'}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:gap-6 my-3">
          <div className="flex-1">
            <span className="block text-[13px] text-gray-500 mb-1">Текущий вес:</span>
            <span className="block text-lg font-semibold text-gray-800">{weight_analysis.current_weight} кг</span>
          </div>
          <div className="flex-1">
            <span className="block text-[13px] text-gray-500 mb-1">Идеально для породы:</span>
            <span className="block text-lg font-semibold text-gray-800">{weight_analysis.ideal_min}-{weight_analysis.ideal_max} кг</span>
          </div>
        </div>

        <p className="my-3 text-sm text-gray-600">{weight_analysis.message}</p>

        {weight_analysis.status !== 'normal' && (
          <div className="mt-3 p-3 bg-white border-l-4 border-blue-500 rounded text-sm">
            <strong className="text-gray-800">Рекомендация:</strong> {weight_analysis.recommendation}
          </div>
        )}
      </div>

      {/* Анализ активности */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="mb-3 text-base font-semibold text-gray-800">Активность</h4>
        <div className={getStatusBadgeClasses(activity_analysis.status)}>
          {activity_analysis.status === 'normal' && '✓ Соответствует'}
          {activity_analysis.status === 'insufficient' && '⚠️ Недостаточная'}
          {activity_analysis.status === 'excessive' && '⚠️ Избыточная'}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:gap-6 my-3">
          <div className="flex-1">
            <span className="block text-[13px] text-gray-500 mb-1">Фактическая:</span>
            <span className="block text-lg font-semibold text-gray-800">{activity_analysis.pet_activity}</span>
          </div>
          <div className="flex-1">
            <span className="block text-[13px] text-gray-500 mb-1">Требуется для породы:</span>
            <span className="block text-lg font-semibold text-gray-800">{activity_analysis.breed_energy}</span>
          </div>
        </div>

        <p className="my-3 text-sm text-gray-600">{activity_analysis.message}</p>

        {activity_analysis.status !== 'normal' && (
          <>
            <div className="mt-3 p-3 bg-white border-l-4 border-blue-500 rounded text-sm">
              <strong className="text-gray-800">Рекомендация:</strong> {activity_analysis.recommendation}
            </div>
            {activity_analysis.risks && activity_analysis.risks.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-100 rounded text-sm">
                <strong className="text-yellow-800">Возможные риски:</strong>
                <ul className="mt-2 pl-5">
                  {activity_analysis.risks.map((risk, idx) => (
                    <li key={idx} className="my-1 text-yellow-800">{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Риски здоровья */}
      {health_risks && health_risks.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="mb-3 text-base font-semibold text-gray-800">Генетические риски породы</h4>
          <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mt-4">
            {health_risks.slice(0, 3).map((risk, idx) => (
              <div key={idx} className={`p-4 bg-white rounded-lg border-l-4 ${getRiskBorderColor(risk.severity)}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800 text-sm">{risk.condition}</span>
                  <span className="text-sm font-semibold text-red-500">{risk.prevalence}%</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">{risk.affected_system}</div>
                <div className="text-[13px] text-gray-600 mt-2">
                  <strong className="block mb-1 text-gray-800">Профилактика:</strong> {risk.prevention}
                </div>
                {risk.priority === 'urgent' && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-[13px] text-red-600 font-medium">
                    🚨 {risk.message}
                  </div>
                )}
              </div>
            ))}
          </div>
          {health_risks.length > 3 && (
            <button
              className="mt-3 py-2 px-4 bg-white border border-gray-200 rounded-md cursor-pointer text-sm text-blue-500 transition-all duration-200 hover:bg-blue-500 hover:text-white hover:border-blue-500"
              onClick={() => {}}
            >
              Показать все {health_risks.length} рисков
            </button>
          )}
        </div>
      )}

      {/* Рекомендации */}
      {recommendations && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="mb-3 text-base font-semibold text-gray-800">Рекомендации</h4>

          {recommendations.priority && recommendations.priority.length > 0 && (
            <div className="mb-4">
              <h5 className="mb-3 text-[15px] font-semibold text-red-500">⚡ Приоритетные</h5>
              {recommendations.priority.map((rec, idx) => (
                <div key={idx} className="p-3 bg-red-50 border-l-[3px] border-red-500 rounded mb-3">
                  <strong className="block mb-2 text-red-700">{rec.message}</strong>
                  <ul className="pl-5">
                    {rec.actions.map((action, aidx) => (
                      <li key={aidx} className="my-1 text-sm text-gray-600">{action}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {recommendations.products && recommendations.products.length > 0 && (
            <div>
              <h5 className="mt-4 mb-3 text-[15px] font-semibold text-gray-800">🛒 Рекомендуемые товары</h5>
              <ul className="pl-5">
                {recommendations.products.map((product, idx) => (
                  <li key={idx} className="my-1.5 text-sm text-gray-600">{product}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.courses && recommendations.courses.length > 0 && (
            <div>
              <h5 className="mt-4 mb-3 text-[15px] font-semibold text-gray-800">🎓 Рекомендуемые курсы</h5>
              <ul className="pl-5">
                {recommendations.courses.map((course, idx) => (
                  <li key={idx} className="my-1.5 text-sm text-gray-600">{course}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.vet_visits && recommendations.vet_visits.length > 0 && (
            <div>
              <h5 className="mt-4 mb-3 text-[15px] font-semibold text-gray-800">🏥 Рекомендуемые обследования</h5>
              <ul className="pl-5">
                {recommendations.vet_visits.map((visit, idx) => (
                  <li key={idx} className="my-1.5 text-sm text-gray-600">{visit}</li>
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
