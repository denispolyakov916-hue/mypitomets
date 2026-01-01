import React from 'react';

const TablePagination = ({
  pagination,
  onPageChange
}) => {
  if (!pagination) return null;

  const {
    count,
    current_page,
    num_pages,
    has_next,
    has_previous,
    start_index,
    end_index
  } = pagination;

  const getPageNumbers = () => {
    const pages = [];
    const totalPages = num_pages;
    const currentPage = current_page;

    if (totalPages <= 7) {
      // Показываем все страницы если их мало
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Показываем первые, последние и текущую с соседями
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center justify-between">
        {/* Левая часть - информация о записях */}
        <div className="text-sm text-gray-700">
          Показано <span className="font-medium">{start_index}</span> -{' '}
          <span className="font-medium">{end_index}</span> из{' '}
          <span className="font-medium">{count}</span> записей
        </div>

        {/* Правая часть - навигация */}
        <div className="flex items-center space-x-2">
          {/* Предыдущая страница */}
          <button
            onClick={() => onPageChange(current_page - 1)}
            disabled={!has_previous}
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Номера страниц */}
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    page === current_page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}

          {/* Следующая страница */}
          <button
            onClick={() => onPageChange(current_page + 1)}
            disabled={!has_next}
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Переход к странице */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Перейти к:</span>
          <input
            type="number"
            min="1"
            max={num_pages}
            defaultValue={current_page}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= num_pages) {
                  onPageChange(page);
                }
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-500">из {num_pages}</span>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
