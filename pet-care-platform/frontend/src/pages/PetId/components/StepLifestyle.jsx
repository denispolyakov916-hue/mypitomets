import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";
const TEXTAREA_STYLE = INPUT_STYLE + " resize-none";

const HOUSING_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'house', label: 'Частный дом' },
  { value: 'cottage', label: 'Дача/Коттедж' },
  { value: 'other', label: 'Другое' }
];

const WALK_FREQUENCY_OPTIONS = [
  { value: 'none', label: 'Не гуляем' },
  { value: '1', label: '1 раз в день' },
  { value: '2', label: '2 раза в день' },
  { value: '3', label: '3 раза в день' },
  { value: 'multiple', label: 'Несколько раз в день' }
];

const WALK_DURATION_OPTIONS = [
  { value: '15', label: '15 минут' },
  { value: '30', label: '30 минут' },
  { value: '60', label: '1 час' },
  { value: '90', label: '1.5 часа' },
  { value: '120', label: '2 часа' },
  { value: 'more', label: 'Больше 2 часов' }
];

export default function StepLifestyle({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-lg font-medium mb-2">Образ жизни</h3>
        <p className="text-sm text-gray-500">Расскажите об условиях проживания и распорядке дня</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Тип жилья */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Тип жилья</label>
          <select
            value={formData.housingType}
            onChange={(e) => updateFormData('housingType', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите тип</option>
            {HOUSING_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Наличие двора */}
        <div className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
          <CustomCheckbox
            checked={formData.hasYard}
            onChange={() => updateFormData('hasYard', !formData.hasYard)}
          />
          <span className="text-sm text-gray-700">Есть двор/участок</span>
        </div>
      </div>

      {/* Другие питомцы */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Другие питомцы в доме</label>
        <textarea
          value={formData.otherPets}
          onChange={(e) => updateFormData('otherPets', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Опишите других животных в доме (порода, возраст, характер)"
        />
      </div>

      {/* Наличие детей */}
      <label className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100 transition-all">
        <CustomCheckbox
          checked={formData.hasChildren}
          onChange={() => updateFormData('hasChildren', !formData.hasChildren)}
        />
        <span className="text-sm text-gray-700">В доме есть дети</span>
      </label>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Частота прогулок */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Частота прогулок</label>
          <select
            value={formData.walkFrequency}
            onChange={(e) => updateFormData('walkFrequency', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите частоту</option>
            {WALK_FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Длительность прогулок */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Длительность прогулки</label>
          <select
            value={formData.walkDuration}
            onChange={(e) => updateFormData('walkDuration', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите длительность</option>
            {WALK_DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
