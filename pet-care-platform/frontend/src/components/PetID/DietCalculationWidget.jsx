import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';

/**
 * Виджет расчета персонального рациона
 * 
 * Показывает:
 * - Дневную потребность в калориях
 * - Расчет БЖУ (белки, жиры, углеводы)
 * - Частоту кормлений
 * - Размер порций
 */
const DietCalculationWidget = ({ petId }) => {
  const [diet, setDiet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDiet();
  }, [petId]);

  const loadDiet = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pets/${petId}/diet-calculation/`);
      setDiet(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка расчета рациона');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center bg-white rounded-xl text-base">Загрузка...</div>;
  }

  if (error) {
    return <div className="p-10 text-center bg-white rounded-xl text-base text-red-600">⚠️ {error}</div>;
  }

  if (!diet) {
    return null;
  }

  const { calories, macros, portions, recommendations } = diet;

  return (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <div className="mb-6 pb-4 border-b-2 border-gray-100">
        <h3 className="mb-2 text-xl font-semibold text-gray-800">Персональный рацион</h3>
        {diet.breed && <span className="text-sm text-gray-400">{diet.breed}</span>}
      </div>

      {/* Калории */}
      <div className="mb-6">
        <h4 className="mb-4 text-base font-semibold text-gray-800">Дневная потребность в калориях</h4>
        <div className="p-5 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl text-white">
          <div className="flex items-baseline mb-3">
            <span className="text-5xl font-bold">{calories.der}</span>
            <span className="text-lg ml-2 opacity-90">ккал/день</span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="flex justify-between text-sm opacity-95">
              <span>Базовый метаболизм (RER):</span>
              <span>{calories.rer} ккал</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h5 className="mt-3 mb-2 text-sm font-semibold text-gray-600">Учтенные факторы:</h5>
          <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mt-3">
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-md text-[13px]">
              <span className="text-gray-500">Возраст</span>
              <span className="font-semibold text-gray-800">×{calories.factors.age}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-md text-[13px]">
              <span className="text-gray-500">Активность</span>
              <span className="font-semibold text-gray-800">×{calories.factors.activity}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-md text-[13px]">
              <span className="text-gray-500">Стерилизация</span>
              <span className="font-semibold text-gray-800">×{calories.factors.neutered}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-md text-[13px]">
              <span className="text-gray-500">Вес</span>
              <span className="font-semibold text-gray-800">×{calories.factors.weight_adjustment}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3 bg-white rounded-md text-[13px]">
              <span className="text-gray-500">Порода</span>
              <span className="font-semibold text-gray-800">×{calories.factors.breed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* БЖУ */}
      <div className="mb-6">
        <h4 className="mb-4 text-base font-semibold text-gray-800">Белки, жиры, углеводы</h4>
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <div className="p-5 rounded-xl text-center transition-transform duration-200 hover:-translate-y-1 bg-gradient-to-br from-pink-300 to-rose-500 text-white">
            <div className="text-[32px] mb-2">🥩</div>
            <div className="text-sm font-medium opacity-90 mb-2">Белки</div>
            <div className="text-[28px] font-bold mb-1">{macros.protein.grams} г</div>
            <div className="text-base font-semibold opacity-90 mb-1">{macros.protein.percent}%</div>
            <div className="text-[13px] opacity-80">{macros.protein.calories} ккал</div>
          </div>

          <div className="p-5 rounded-xl text-center transition-transform duration-200 hover:-translate-y-1 bg-gradient-to-br from-blue-400 to-cyan-400 text-white">
            <div className="text-[32px] mb-2">🥑</div>
            <div className="text-sm font-medium opacity-90 mb-2">Жиры</div>
            <div className="text-[28px] font-bold mb-1">{macros.fat.grams} г</div>
            <div className="text-base font-semibold opacity-90 mb-1">{macros.fat.percent}%</div>
            <div className="text-[13px] opacity-80">{macros.fat.calories} ккал</div>
          </div>

          <div className="p-5 rounded-xl text-center transition-transform duration-200 hover:-translate-y-1 bg-gradient-to-br from-green-400 to-teal-300 text-white">
            <div className="text-[32px] mb-2">🌾</div>
            <div className="text-sm font-medium opacity-90 mb-2">Углеводы</div>
            <div className="text-[28px] font-bold mb-1">{macros.carbs.grams} г</div>
            <div className="text-base font-semibold opacity-90 mb-1">{macros.carbs.percent}%</div>
            <div className="text-[13px] opacity-80">{macros.carbs.calories} ккал</div>
          </div>
        </div>
      </div>

      {/* Порции */}
      <div className="mb-6">
        <h4 className="mb-4 text-base font-semibold text-gray-800">Режим кормления</h4>
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Количество кормлений:</span>
            <span className="text-base font-semibold text-blue-500">{portions.meals_per_day} раза в день</span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Время кормлений:</span>
            <span className="text-base font-semibold text-primary-500">{portions.feeding_times.join(', ')}</span>
          </div>
          <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">Порция за раз:</span>
            <span className="text-base font-semibold text-red-500">{portions.portion_per_meal_calories} ккал</span>
          </div>
        </div>
      </div>

      {/* Рекомендации */}
      {recommendations && recommendations.notes && recommendations.notes.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-4 text-base font-semibold text-gray-800">Важные заметки</h4>
          <ul className="pl-5 list-disc marker:text-blue-500">
            {recommendations.notes.map((note, idx) => (
              <li key={idx} className="my-2 text-sm text-gray-600 leading-normal">{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DietCalculationWidget;
