import { Upload } from 'lucide-react';

const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";
const SELECT_STYLE = INPUT_STYLE + " cursor-pointer appearance-none pr-12";

export default function StepBasicInfo({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-3xl font-bold mb-2">Основные данные питомца</h3>
        <p className="text-sm text-gray-500">Заполните базовую информацию о вашем питомце</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Имя */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Имя питомца *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            className={INPUT_STYLE}
            placeholder="Например: Барсик"
          />
        </div>

        {/* Вид животного */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Вид животного *</label>
          <select
            value={formData.species}
            onChange={(e) => updateFormData('species', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="dog">Собака</option>
            <option value="cat">Кошка</option>
            <option value="bird">Птица</option>
            <option value="other">Другое</option>
          </select>
        </div>

        {/* Порода */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Порода</label>
          <input
            type="text"
            value={formData.breed}
            onChange={(e) => updateFormData('breed', e.target.value)}
            className={INPUT_STYLE}
            placeholder="Например: Лабрадор"
          />
        </div>

        {/* Пол */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Пол *</label>
          <select
            value={formData.gender}
            onChange={(e) => updateFormData('gender', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите пол</option>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
          </select>
        </div>

        {/* Дата рождения */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Дата рождения</label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => updateFormData('birthDate', e.target.value)}
            className={INPUT_STYLE}
          />
        </div>

        {/* Кастрация */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Кастрация / Стерилизация</label>
          <select
            value={formData.neutered}
            onChange={(e) => updateFormData('neutered', e.target.value)}
            className={SELECT_STYLE}
          >
            <option value="">Выберите</option>
            <option value="yes">Да</option>
            <option value="no">Нет</option>
            <option value="planned">Планируется</option>
          </select>
        </div>
      </div>

      {/* Фото */}
      <div>
        <label className="block text-sm text-gray-700 mb-2">Фотография питомца</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
          <Upload className="w-12 h-12 mx-auto text-purple-400 mb-2" />
          <p className="text-gray-700 text-sm mb-1">Нажмите для загрузки фото</p>
          <p className="text-gray-400 text-xs">PNG, JPG до 5MB</p>
        </div>
      </div>
    </div>
  );
}