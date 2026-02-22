import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';

/**
 * Страница детальной информации о породе
 */
const BreedDetailPage = () => {
  const { slug } = useParams();
  const [breed, setBreed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBreed = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/pets/breeds/${slug}/`);
        setBreed(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.status === 404 ? 'Порода не найдена' : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    fetchBreed();
  }, [slug]);

  const getLevelLabel = (level) => {
    const labels = {
      very_low: 'Очень низкий',
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      very_high: 'Очень высокий',
    };
    return labels[level] || level;
  };

  const getLevelColor = (level) => {
    const colors = {
      very_low: 'bg-blue-100 text-blue-700',
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-accent-100 text-accent-700',
      very_high: 'bg-red-100 text-red-700',
    };
    return colors[level] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-xl p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{error}</h2>
          <Link to="/breeds" className="text-indigo-600 hover:text-indigo-800">
            ← Вернуться к списку пород
          </Link>
        </div>
      </div>
    );
  }

  if (!breed) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className={`${breed.species === 'dog' ? 'bg-gradient-to-r from-amber-500 to-accent-500' : 'bg-gradient-to-r from-primary-500 to-pink-500'} text-white py-12`}>
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/breeds" className="text-white/80 hover:text-white mb-4 inline-block">
            ← Все породы
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-4xl mb-2 block">
                {breed.species === 'dog' ? '🐕' : '🐈'}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold">{breed.name}</h1>
              {breed.name_en && (
                <p className="text-white/80 text-lg mt-1">{breed.name_en}</p>
              )}
              {breed.origin_country && (
                <p className="text-white/70 mt-2">Страна: {breed.origin_country}</p>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              {breed.hypoallergenic && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  Гипоаллергенная
                </span>
              )}
              {breed.apartment_friendly && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  Для квартиры
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Описание */}
        {breed.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="section-title mb-3">О породе</h2>
            <p className="text-gray-600 leading-relaxed">{breed.description}</p>
          </div>
        )}

        {/* Основные характеристики */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="section-title">Основные характеристики</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Вес</p>
              <p className="font-semibold text-lg">{breed.weight_min}-{breed.weight_max} кг</p>
            </div>
            {breed.height_min && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Рост</p>
                <p className="font-semibold text-lg">{breed.height_min}-{breed.height_max} см</p>
              </div>
            )}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Продолжительность жизни</p>
              <p className="font-semibold text-lg">{breed.lifespan_min}-{breed.lifespan_max} лет</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Размер</p>
              <p className="font-semibold text-lg capitalize">{breed.size_category}</p>
            </div>
          </div>
        </div>

        {/* Характер и поведение */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="section-title">Характер и поведение</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Энергичность</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.energy_level)}`}>
                {getLevelLabel(breed.energy_level)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Обучаемость</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.trainability)}`}>
                {getLevelLabel(breed.trainability)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Интеллект</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.intelligence)}`}>
                {getLevelLabel(breed.intelligence)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Потребность в нагрузках</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.exercise_needs)}`}>
                {getLevelLabel(breed.exercise_needs)}
              </span>
            </div>
          </div>
        </div>

        {/* Социальные характеристики */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="section-title">Социальные характеристики</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">К детям</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.friendliness_to_children)}`}>
                {getLevelLabel(breed.friendliness_to_children)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">К животным</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.friendliness_to_pets)}`}>
                {getLevelLabel(breed.friendliness_to_pets)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">К незнакомцам</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.friendliness_to_strangers)}`}>
                {getLevelLabel(breed.friendliness_to_strangers)}
              </span>
            </div>
          </div>
        </div>

        {/* Уход */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="section-title">Уход</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Груминг</span>
              <span className="text-gray-800 font-medium capitalize">{breed.grooming_frequency}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Линька</span>
              <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.shedding_level)}`}>
                {getLevelLabel(breed.shedding_level)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Тип шерсти</span>
              <span className="text-gray-800 font-medium capitalize">{breed.coat_type}</span>
            </div>
          </div>
        </div>

        {/* Здоровье */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="section-title">Здоровье</h2>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
            <span className="text-gray-700">Общий уровень риска</span>
            <span className={`px-3 py-1 rounded-full text-sm ${getLevelColor(breed.health_risk_level)}`}>
              {getLevelLabel(breed.health_risk_level)}
            </span>
          </div>
          
          {breed.health_risks && breed.health_risks.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-3">Типичные заболевания</h3>
              <div className="space-y-2">
                {breed.health_risks.map((risk, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">{risk.condition_name}</span>
                      <span className="text-sm text-red-600">Риск: {risk.prevalence_percent}%</span>
                    </div>
                    {risk.description && (
                      <p className="text-sm text-gray-600">{risk.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {breed.brachycephalic && (
              <span className="px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm">
                ⚠️ Брахицефал - требует особого внимания к дыханию
              </span>
            )}
          </div>
        </div>

        {/* Питание */}
        {breed.nutrition && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="section-title">Рекомендации по питанию</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-500 text-sm">Калории (взрослый)</p>
                <p className="font-semibold text-lg">{breed.nutrition.calories_per_kg_adult} ккал/кг</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-500 text-sm">Белок</p>
                <p className="font-semibold text-lg">{breed.nutrition.protein_min_percent}-{breed.nutrition.protein_max_percent}%</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-500 text-sm">Жиры</p>
                <p className="font-semibold text-lg">{breed.nutrition.fat_min_percent}-{breed.nutrition.fat_max_percent}%</p>
              </div>
            </div>
            {breed.nutrition.feeding_notes && (
              <p className="text-gray-600">{breed.nutrition.feeding_notes}</p>
            )}
          </div>
        )}

        {/* Кнопка действия */}
        <div className="text-center">
          <Link
            to="/pet-id"
            className="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Добавить питомца этой породы
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BreedDetailPage;

