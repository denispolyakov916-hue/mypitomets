import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";
const TEXTAREA_STYLE = INPUT_STYLE + " resize-none";

const DENTAL_HEALTH_OPTIONS = [
  { value: 'excellent', label: 'Отличное состояние' },
  { value: 'good', label: 'Хорошее состояние' },
  { value: 'fair', label: 'Удовлетворительное' },
  { value: 'poor', label: 'Плохое состояние' },
  { value: 'needs_attention', label: 'Требует внимания' }
];

export default function StepHealth({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-lg font-medium mb-2">Здоровье питомца</h3>
        <p className="text-sm text-gray-500">Информация о состоянии здоровья и медицинской истории</p>
      </div>

      {/* Хронические заболевания */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Хронические заболевания</label>
        <textarea
          value={formData.chronicConditions}
          onChange={(e) => updateFormData('chronicConditions', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Опишите хронические заболевания, аллергии или другие проблемы со здоровьем"
        />
      </div>

      {/* Вакцинации */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Вакцинации</label>
        <textarea
          value={formData.vaccinations}
          onChange={(e) => updateFormData('vaccinations', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Перечислите сделанные прививки и даты вакцинации"
        />
      </div>

      {/* Медикаменты */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Текущие медикаменты</label>
        <textarea
          value={formData.medications}
          onChange={(e) => updateFormData('medications', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Укажите принимаемые лекарства, витамины, добавки"
        />
      </div>

      {/* Здоровье зубов */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Здоровье зубов</label>
        <select
          value={formData.dentalHealth}
          onChange={(e) => updateFormData('dentalHealth', e.target.value)}
          className={SELECT_STYLE}
        >
          <option value="">Выберите состояние</option>
          {DENTAL_HEALTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Посещения ветеринара */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Последние посещения ветеринара</label>
        <textarea
          value={formData.vetVisits}
          onChange={(e) => updateFormData('vetVisits', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Опишите последние визиты к ветеринару, диагнозы, назначения"
        />
      </div>

      {/* Медицинские документы */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Медицинские документы</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-gray-700 text-sm mb-1">Загрузить медицинские документы</p>
          <p className="text-gray-400 text-xs">PDF, JPG, PNG до 10MB</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">Ветеринарные справки, анализы, рентгены и т.д.</p>
      </div>
    </div>
  );
}
