/**
 * Заголовок страницы курсов
 *
 * Название страницы, форма поиска и баннер персональной подборки.
 */

/**
 * Заголовок с поиском и информационным баннером
 */
function CourseHeader({ searchQuery, onSearchQueryChange, onSearch, filters, pets }) {
  return (
    <>
      <div className="mb-6">
        <h1 className="page-title mb-4">Обучающие курсы</h1>
      </div>

      {/* Поиск */}
      <form onSubmit={onSearch} className="flex gap-2 max-w-xl mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Поиск по названию курса..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        />
        <button type="submit" className="btn-primary px-6">
          Найти
        </button>
      </form>

      {/* Информация о персональной подборке */}
      {filters.personal === 'true' && pets && pets.length > 0 && (
        <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <p className="text-sm text-primary-800">
            <span className="font-medium">⭐ Персональная подборка</span>
            <span className="text-primary-600 ml-2">
              для ваших питомцев: {pets.map(p => p.name).join(', ')}
            </span>
          </p>
        </div>
      )}
    </>
  )
}

export { CourseHeader }
