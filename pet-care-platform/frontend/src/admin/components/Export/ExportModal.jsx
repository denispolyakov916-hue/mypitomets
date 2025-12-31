import React, { useState } from 'react';

// Components
import Modal from '../Forms/Modal';
import FormField from '../Forms/FormField';
import FormButtons from '../Forms/FormButtons';

const ExportModal = ({
  isOpen,
  onClose,
  model,
  onExport
}) => {
  const [exportParams, setExportParams] = useState({
    format: 'csv',
    date_from: '',
    date_to: '',
    status: '',
    include_related: true,
    filename: `${model}_export_${new Date().toISOString().split('T')[0]}`
  });

  const handleSubmit = () => {
    onExport(exportParams);
    onClose();
  };

  const getModelDisplayName = (model) => {
    const names = {
      users: 'Пользователи',
      pets: 'Питомцы',
      products: 'Товары',
      orders: 'Заказы',
      courses: 'Курсы',
      payments: 'Платежи',
      reviews: 'Отзывы'
    };
    return names[model] || model;
  };

  const getAvailableStatuses = (model) => {
    const statuses = {
      orders: [
        { value: 'pending', label: 'Ожидают' },
        { value: 'processing', label: 'В обработке' },
        { value: 'shipped', label: 'Отправлены' },
        { value: 'delivered', label: 'Доставлены' },
        { value: 'cancelled', label: 'Отменены' }
      ],
      payments: [
        { value: 'pending', label: 'Ожидают' },
        { value: 'completed', label: 'Завершены' },
        { value: 'failed', label: 'Не удались' },
        { value: 'refunded', label: 'Возвращены' }
      ],
      users: [
        { value: 'true', label: 'Активные' },
        { value: 'false', label: 'Заблокированные' }
      ]
    };
    return statuses[model] || [];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Экспорт данных: ${getModelDisplayName(model)}`}
      size="md"
    >
      <form className="p-6 space-y-6">
        {/* Формат экспорта */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Формат файла
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'csv', label: 'CSV', description: 'Для Excel и Google Sheets' },
              { value: 'excel', label: 'Excel', description: 'XLSX файл' },
              { value: 'pdf', label: 'PDF', description: 'Отчет в PDF формате' },
              { value: 'json', label: 'JSON', description: 'Структурированные данные' }
            ].map(format => (
              <label
                key={format.value}
                className={`
                  relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none
                  ${exportParams.format === format.value ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-300'}
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.value}
                  checked={exportParams.format === format.value}
                  onChange={(e) => setExportParams(prev => ({ ...prev, format: e.target.value }))}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      {format.label}
                    </span>
                    <span className="block text-xs text-gray-500 mt-1">
                      {format.description}
                    </span>
                  </span>
                </span>
                <svg
                  className={`h-5 w-5 text-blue-600 ${
                    exportParams.format === format.value ? '' : 'invisible'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </label>
            ))}
          </div>
        </div>

        {/* Период */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Дата с"
            name="date_from"
            type="date"
            value={exportParams.date_from}
            onChange={(name, value) => setExportParams(prev => ({ ...prev, [name]: value }))}
          />

          <FormField
            label="Дата по"
            name="date_to"
            type="date"
            value={exportParams.date_to}
            onChange={(name, value) => setExportParams(prev => ({ ...prev, [name]: value }))}
          />
        </div>

        {/* Статус (если применимо) */}
        {getAvailableStatuses(model).length > 0 && (
          <FormField
            label="Статус"
            name="status"
            type="select"
            value={exportParams.status}
            onChange={(name, value) => setExportParams(prev => ({ ...prev, [name]: value }))}
          >
            <option value="">Все статусы</option>
            {getAvailableStatuses(model).map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </FormField>
        )}

        {/* Дополнительные опции */}
        <div className="space-y-3">
          <FormField
            label="Включить связанные данные"
            name="include_related"
            type="checkbox"
            value={exportParams.include_related}
            onChange={(name, value) => setExportParams(prev => ({ ...prev, [name]: value }))}
          />

          <FormField
            label="Имя файла"
            name="filename"
            value={exportParams.filename}
            onChange={(name, value) => setExportParams(prev => ({ ...prev, [name]: value }))}
            placeholder="Название файла экспорта"
          />
        </div>

        {/* Предупреждение для больших объемов данных */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="text-yellow-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Внимание
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Экспорт больших объемов данных может занять продолжительное время.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <FormButtons
          onSave={handleSubmit}
          onCancel={onClose}
          saveLabel="Экспортировать"
        />
      </form>
    </Modal>
  );
};

export default ExportModal;
