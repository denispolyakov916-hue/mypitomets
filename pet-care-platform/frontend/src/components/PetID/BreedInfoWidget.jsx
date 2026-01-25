import React, { useState, useEffect } from 'react';
import api from '../../api/client';

/**
 * Виджет сравнения питомца с эталоном породы
 */
const BreedInfoWidget = ({ petId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!petId) return;
    
    const fetchComparison = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/pets/${petId}/breed-comparison/`);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [petId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center text-yellow-600">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data || !data.breed_standard) {
    return null;
  }

  const { pet, breed_standard, weight_analysis, activity_analysis, overall_score, recommendations, health_risks } = data;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal':
        return <span className="text-green-500">✓</span>;
      case 'overweight':
      case 'underweight':
      case 'insufficient':
      case 'excessive':
        return <span className="text-yellow-500">!</span>;
      default:
        return <span className="text-gray-400">?</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Заголовок с общим скором */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Анализ породы</h3>
            <p className="text-blue-100 text-sm">{breed_standard.name}</p>
          </div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getScoreColor(overall_score)} font-bold text-xl`}>
            {overall_score}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Анализ веса */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Вес</span>
            {getStatusIcon(weight_analysis?.status)}
          </div>
          <p className="text-sm text-gray-600">{weight_analysis?.message}</p>
          {weight_analysis?.status !== 'unknown' && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <span>Норма: {weight_analysis?.ideal_min} - {weight_analysis?.ideal_max} кг</span>
              {weight_analysis?.current_weight && (
                <span className="ml-2 font-medium">• Текущий: {weight_analysis?.current_weight} кг</span>
              )}
            </div>
          )}
        </div>

        {/* Анализ активности */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Активность</span>
            {getStatusIcon(activity_analysis?.status)}
          </div>
          <p className="text-sm text-gray-600">{activity_analysis?.message}</p>
        </div>

        {/* Рекомендации */}
        {recommendations && recommendations.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="font-medium text-gray-800">Рекомендации ({recommendations.length})</span>
              <svg
                className={`w-5 h-5 text-gray-500 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expanded && (
              <div className="mt-3 space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {rec.priority === 'high' ? 'Важно' : rec.priority === 'medium' ? 'Средне' : 'Низкий'}
                      </span>
                      <span className="ml-2 font-medium text-sm text-gray-800">{rec.title}</span>
                    </div>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                    {rec.actions && (
                      <ul className="mt-2 text-sm text-gray-500 space-y-1">
                        {rec.actions.slice(0, 3).map((action, i) => (
                          <li key={i} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Риски здоровья */}
        {health_risks && health_risks.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-800 mb-3">Риски здоровья породы</h4>
            <div className="space-y-2">
              {health_risks.slice(0, 3).map((risk, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-sm text-gray-700">{risk.condition_name}</span>
                  <span className="text-xs text-red-600">{risk.prevalence_percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BreedInfoWidget;

