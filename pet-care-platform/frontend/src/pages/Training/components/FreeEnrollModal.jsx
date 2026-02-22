/**
 * Модальное окно записи на бесплатный курс
 *
 * Выбор питомца, принятие условий и подтверждение записи.
 */

import { ButtonLoader } from '../../../components/Loader'

/**
 * Модальное окно для записи на бесплатный курс
 */
function FreeEnrollModal({
  course,
  pets,
  selectedPet,
  onSelectedPetChange,
  accepted,
  onAcceptedChange,
  isEnrolling,
  onEnroll,
  onClose,
}) {
  if (!course) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Оверлей */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Модальное окно */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fadeIn">
          {/* Заголовок */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Записаться на курс
              </h3>
              <p className="text-sm text-gray-500">
                {course.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Выбор питомца (если есть совместимые) */}
          {pets && pets.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Для какого питомца? (опционально)
              </label>
              <select
                value={selectedPet || ''}
                onChange={(e) => onSelectedPetChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Не выбран</option>
                {pets
                  .filter(pet => course.pet_type === 'all' || pet.species === course.pet_type)
                  .map(pet => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} ({pet.species === 'dog' ? '🐕 Собака' : '🐱 Кошка'})
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Условия использования */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <h4 className="font-medium text-amber-800 mb-2">Условия использования</h4>
            <p className="text-sm text-amber-700 mb-4">
              Записываясь на курс, вы подтверждаете, что понимаете и соглашаетесь с тем, 
              что мы не гарантируем стопроцентного результата. Результаты обучения зависят от 
              индивидуальных особенностей питомца, усердия в выполнении рекомендаций и других факторов.
              Курс предназначен для личного использования и не подлежит передаче третьим лицам.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => onAcceptedChange(e.target.checked)}
                className="mt-0.5 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                Я принимаю условия использования и понимаю, что доступ предоставляется сразу после записи
              </span>
            </label>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={onEnroll}
              disabled={!accepted || isEnrolling}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEnrolling ? (
                <>
                  <ButtonLoader />
                  Запись...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Записаться
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { FreeEnrollModal }
