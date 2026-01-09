const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";

const SIZE_OPTIONS = [
  { value: 'small', label: 'Маленький (до 10 кг)' },
  { value: 'medium', label: 'Средний (10-25 кг)' },
  { value: 'large', label: 'Крупный (более 25 кг)' },
];

const BODY_TYPE_OPTIONS = [
  { value: 'slim', label: 'Недостаточный вес' },
  { value: 'normal', label: 'Идеальный вес' },
  { value: 'overweight', label: 'Избыточный вес' },
  { value: 'obese', label: 'Ожирение' }
];

const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'low', label: 'Низкий (менее 30 мин/день)' },
  { value: 'moderate', label: 'Средний (30-60 мин/день)' },
  { value: 'high', label: 'Высокий (1-2 часа/день)' },
  { value: 'very_high', label: 'Очень высокий (более 2 часов/день)' }
];

export default function StepPhysical({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-3xl font-bold mb-2">Физические параметры</h3>
        <p className="text-sm text-gray-500">Данные о весе, размере и активности питомца</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Текущий вес */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Текущий вес (кг)</label>
          <input
            type="number"
            value={formData.currentWeight}
            onChange={(e) => updateFormData('currentWeight', e.target.value)}
            className={INPUT_STYLE}
            placeholder="0"
            step="1"
            min="0"
          />
        </div>

        {/* Идеальный вес */}

        {/* Размер */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Размер</label>
          <select
            value={formData.size}
            onChange={(e) => updateFormData('size', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите размер</option>
            {SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Тип телосложения */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Тип телосложения</label>
          <select
            value={formData.bodyType}
            onChange={(e) => updateFormData('bodyType', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите тип</option>
            {BODY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Уровень активности - на всю ширину */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Уровень активности</label>
        <select
          value={formData.activityLevel}
          onChange={(e) => updateFormData('activityLevel', e.target.value)}
          className={SELECT_STYLE}
        >
          <option value="">Выберите уровень активности</option>
          {ACTIVITY_LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}












