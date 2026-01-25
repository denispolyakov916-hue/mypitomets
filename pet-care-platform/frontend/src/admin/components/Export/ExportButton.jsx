import React, { useState } from 'react';

// Utils
import { adminAPI } from '../../utils/api';

const ExportButton = ({
  model,
  format = 'csv',
  filters = {},
  filename,
  className = '',
  children,
  disabled = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (disabled || isExporting) return;

    setIsExporting(true);
    setError(null);

    try {
      const response = await adminAPI.management.exportData({
        model,
        format,
        filters,
        filename: filename || `${model}_export_${new Date().toISOString().split('T')[0]}`
      });

      // Создаем blob из response
      const blob = new Blob([response.data], {
        type: getContentType(format)
      });

      // Создаем download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename || model}_export.${format}`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.message || 'Ошибка экспорта данных');
    } finally {
      setIsExporting(false);
    }
  };

  const getContentType = (format) => {
    const types = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      json: 'application/json'
    };
    return types[format] || 'text/plain';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleExport}
        disabled={disabled || isExporting}
        className={`
          inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${disabled || isExporting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isExporting && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}

        {!isExporting && (
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}

        {isExporting ? 'Экспорт...' : (children || `Экспорт ${format.toUpperCase()}`)}
      </button>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 z-10">
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <div className="text-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
