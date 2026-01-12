import React, { useState, useEffect } from 'react';
import { api } from '../../api/axios';
import './DietCalculationWidget.css';

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
    return <div className="diet-widget loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="diet-widget error">⚠️ {error}</div>;
  }

  if (!diet) {
    return null;
  }

  const { calories, macros, portions, recommendations } = diet;

  return (
    <div className="diet-calculation-widget">
      <div className="widget-header">
        <h3>Персональный рацион</h3>
        {diet.breed && <span className="breed-name">{diet.breed}</span>}
      </div>

      {/* Калории */}
      <div className="diet-section calories-section">
        <h4>Дневная потребность в калориях</h4>
        <div className="calories-display">
          <div className="calories-main">
            <span className="calories-value">{calories.der}</span>
            <span className="calories-unit">ккал/день</span>
          </div>
          <div className="calories-details">
            <div className="calorie-item">
              <span className="label">Базовый метаболизм (RER):</span>
              <span className="value">{calories.rer} ккал</span>
            </div>
          </div>
        </div>
        
        <div className="factors-list">
          <h5>Учтенные факторы:</h5>
          <div className="factors-grid">
            <div className="factor">
              <span className="factor-name">Возраст</span>
              <span className="factor-value">×{calories.factors.age}</span>
            </div>
            <div className="factor">
              <span className="factor-name">Активность</span>
              <span className="factor-value">×{calories.factors.activity}</span>
            </div>
            <div className="factor">
              <span className="factor-name">Стерилизация</span>
              <span className="factor-value">×{calories.factors.neutered}</span>
            </div>
            <div className="factor">
              <span className="factor-name">Вес</span>
              <span className="factor-value">×{calories.factors.weight_adjustment}</span>
            </div>
            <div className="factor">
              <span className="factor-name">Порода</span>
              <span className="factor-value">×{calories.factors.breed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* БЖУ */}
      <div className="diet-section macros-section">
        <h4>Белки, жиры, углеводы</h4>
        <div className="macros-grid">
          <div className="macro-card protein">
            <div className="macro-icon">🥩</div>
            <div className="macro-name">Белки</div>
            <div className="macro-grams">{macros.protein.grams} г</div>
            <div className="macro-percent">{macros.protein.percent}%</div>
            <div className="macro-calories">{macros.protein.calories} ккал</div>
          </div>
          
          <div className="macro-card fat">
            <div className="macro-icon">🥑</div>
            <div className="macro-name">Жиры</div>
            <div className="macro-grams">{macros.fat.grams} г</div>
            <div className="macro-percent">{macros.fat.percent}%</div>
            <div className="macro-calories">{macros.fat.calories} ккал</div>
          </div>
          
          <div className="macro-card carbs">
            <div className="macro-icon">🌾</div>
            <div className="macro-name">Углеводы</div>
            <div className="macro-grams">{macros.carbs.grams} г</div>
            <div className="macro-percent">{macros.carbs.percent}%</div>
            <div className="macro-calories">{macros.carbs.calories} ккал</div>
          </div>
        </div>
      </div>

      {/* Порции */}
      <div className="diet-section portions-section">
        <h4>Режим кормления</h4>
        <div className="portions-info">
          <div className="portion-item meals">
            <span className="portion-label">Количество кормлений:</span>
            <span className="portion-value">{portions.meals_per_day} раза в день</span>
          </div>
          <div className="portion-item times">
            <span className="portion-label">Время кормлений:</span>
            <span className="portion-value">{portions.feeding_times.join(', ')}</span>
          </div>
          <div className="portion-item size">
            <span className="portion-label">Порция за раз:</span>
            <span className="portion-value">{portions.portion_per_meal_calories} ккал</span>
          </div>
        </div>
      </div>

      {/* Рекомендации */}
      {recommendations && recommendations.notes && recommendations.notes.length > 0 && (
        <div className="diet-section notes-section">
          <h4>Важные заметки</h4>
          <ul className="notes-list">
            {recommendations.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DietCalculationWidget;

