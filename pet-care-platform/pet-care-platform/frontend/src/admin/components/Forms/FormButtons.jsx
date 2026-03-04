import React from 'react';

const FormButtons = ({
  onSave,
  onCancel,
  onDelete,
  isLoading = false,
  isSubmitting = false,
  saveLabel = 'Сохранить',
  cancelLabel = 'Отмена',
  deleteLabel = 'Удалить',
  showDelete = false,
  saveDisabled = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between pt-6 border-t border-gray-200 ${className}`}>
      {/* Левая часть - кнопка удаления */}
      <div>
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading || isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deleteLabel}
          </button>
        )}
      </div>

      {/* Правая часть - основные кнопки */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isLoading || isSubmitting || saveDisabled}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting ? 'Сохранение...' : saveLabel}
        </button>
      </div>
    </div>
  );
};

export default FormButtons;
