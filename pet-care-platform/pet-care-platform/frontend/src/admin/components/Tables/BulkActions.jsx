import React, { useState } from 'react';

const BulkActions = ({
  selectedCount,
  actions,
  onAction,
  selectedIds
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  const handleAction = async (action) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setCurrentAction(action.key);

    try {
      await onAction(action.key, selectedIds);
      // Обработка успешного выполнения
    } catch (error) {
      console.error('Bulk action error:', error);
      // Обработка ошибки
    } finally {
      setIsProcessing(false);
      setCurrentAction(null);
    }
  };

  return (
    <div className="px-6 py-3 bg-primary-50 border-b border-primary-200">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-primary-900">
          Массовые действия ({selectedCount} выбрано):
        </span>

        <div className="flex items-center space-x-2">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={() => handleAction(action)}
              disabled={isProcessing}
              className={`
                inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md
                ${action.variant === 'danger'
                  ? 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                  : action.variant === 'warning'
                  ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500'
                  : 'text-primary-700 bg-primary-100 hover:bg-primary-200 focus:ring-primary-500'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isProcessing && currentAction === action.key && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {action.icon && <span className="mr-1.5">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>

        {/* Прогресс выполнения */}
        {isProcessing && (
          <div className="flex-1 ml-4">
            <div className="w-full bg-primary-200 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-primary-700 mt-1">
              Выполняется операция...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkActions;
