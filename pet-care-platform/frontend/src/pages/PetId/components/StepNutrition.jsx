import { CustomCheckbox } from '../../../components/ui/CustomCheckbox';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer";
const TEXTAREA_STYLE = INPUT_STYLE + " resize-none";

const FLAVORS = ['Курица', 'Говядина', 'Рыба', 'Индейка', 'Ягненок', 'Кролик'];

export default function StepNutrition({ formData, updateFormData, toggleArrayValue }) {
  // Инициализируем массив пользовательских вкусов, если он не существует
  const customFlavors = formData.customFlavors || [];
  
  const handleCustomFlavorChange = (index, value) => {
    const newCustomFlavors = [...customFlavors];
    newCustomFlavors[index] = value;

    // Обновляем массив пользовательских вкусов
    updateFormData('customFlavors', newCustomFlavors);

    // Если ввели текст в последнее поле, добавляем новое пустое поле
    if (value.trim() && index === customFlavors.length - 1) {
      updateFormData('customFlavors', [...newCustomFlavors, '']);
    }
  };

  const handleCustomFlavorBlur = () => {
    // Удаляем пустые поля, кроме последнего
    const filteredFlavors = customFlavors.filter((flavor, index) => {
      // Оставляем непустые поля
      if (flavor && flavor.trim()) return true;
      // Оставляем последнее пустое поле
      return index === customFlavors.length - 1;
    });
    
    // Если после фильтрации не осталось ни одного поля, добавляем пустое
    const finalFlavors = filteredFlavors.length === 0 ? [''] : filteredFlavors;
    
    updateFormData('customFlavors', finalFlavors);
  };


  // Фильтруем пустые поля, но оставляем хотя бы одно для ввода
  const visibleCustomFlavors = customFlavors.length === 0 ? [''] : customFlavors;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-3xl font-bold mb-2">Питание и предпочтения</h3>
        <p className="text-sm text-gray-500">Информация о рационе и пищевых предпочтениях</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Тип питания</label>
          <select
            value={formData.dietType}
            onChange={(e) => updateFormData('dietType', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите тип</option>
            <option value="dry">Сухой корм</option>
            <option value="wet">Влажный корм</option>
            <option value="mixed">Смешанное питание</option>
            <option value="raw">Натуральное питание</option>
            <option value="home">Домашняя еда</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Частота кормлений</label>
          <select
            value={formData.feedingFrequency}
            onChange={(e) => updateFormData('feedingFrequency', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите частоту</option>
            <option value="1">1 раз в день</option>
            <option value="2">2 раза в день</option>
            <option value="3">3 раза в день</option>
            <option value="free">Свободный доступ</option>
          </select>
        </div>
      </div>

      {/* Любимые вкусы - множественный выбор */}
      <div>
        <label className="block text-sm text-gray-700 mb-3">Любимые вкусы</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FLAVORS.map((flavor) => (
            <label
              key={flavor}
              className="flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
            >
              <CustomCheckbox
                checked={formData.favoriteFlavors.includes(flavor)}
                onChange={() => toggleArrayValue('favoriteFlavors', flavor)}
              />
              <span className="text-sm text-gray-700">{flavor}</span>
            </label>
          ))}
          
          {/* Динамические поля для пользовательских вкусов */}
          {visibleCustomFlavors.map((flavor, index) => (
            <div key={index} className="p-3 bg-white border-none rounded-xl transition-all">
              <input
                type="text"
                value={flavor || ''}
                onChange={(e) => handleCustomFlavorChange(index, e.target.value)}
                onBlur={handleCustomFlavorBlur}
                className={`${INPUT_STYLE} text-center placeholder:text-purple-300 placeholder:text-center`}
                placeholder={index === 0 ? "+ Другое" : "+ Еще вкус"}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Исключаемые ингреденты */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Исключаемые ингреденты</label>
        <textarea
          value={formData.excludedIngredients}
          onChange={(e) => updateFormData('excludedIngredients', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Например: соя, кукуруза, пшеница"
        />
      </div>

      {/* Аллергии */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Аллергии / Непереносимости</label>
        <textarea
          value={formData.allergies}
          onChange={(e) => updateFormData('allergies', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Опишите известные аллергии"
        />
      </div>

      {/* Чувствительное пищеварение */}
      <label className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100 transition-all">
        <CustomCheckbox
          checked={formData.sensitiveBelly}
          onChange={() => updateFormData('sensitiveBelly', !formData.sensitiveBelly)}
        />
        <span className="text-sm text-gray-700">Чувствительное пищеварение</span>
      </label>

      {/* Добавки / Витамины */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Добавки / Витамины</label>
        <textarea
          value={formData.vitamins}
          onChange={(e) => updateFormData('vitamins', e.target.value)}
          className={TEXTAREA_STYLE}
          rows={3}
          placeholder="Например: Omega-3, пробиотики"
        />
      </div>
    </div>
  );
}