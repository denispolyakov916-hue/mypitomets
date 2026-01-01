/**
 * PageNavigation - Навигация по страницам курса
 *
 * Отображает список страниц курса и позволяет переключаться между ними.
 * Позволяет добавлять и удалять страницы.
 */

function PageNavigation({ pages, currentPageId, onPageChange, onPageAdd, onPageDelete }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Страницы курса:</span>

          <div className="flex items-center space-x-2 overflow-x-auto">
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${currentPageId === page.id
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className="mr-2 text-xs bg-gray-200 px-2 py-1 rounded">
                  {index + 1}
                </span>
                <span className="truncate max-w-32">
                  {page.title || `Страница ${index + 1}`}
                </span>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPageDelete(page.id)
                    }}
                    className="ml-2 text-gray-400 hover:text-red-600"
                    title="Удалить страницу"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </button>
            ))}

            <button
              onClick={onPageAdd}
              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {pages.length} страниц
        </div>
      </div>
    </div>
  )
}

export default PageNavigation

