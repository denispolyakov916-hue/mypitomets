import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { supplierAPI } from '../utils/api';

const formatDateTime = (value) => value ? new Date(value).toLocaleString('ru-RU') : '-';

const SupplierImports = () => {
  const [imports, setImports] = useState([]);

  useEffect(() => {
    supplierAPI.imports.list({ page_size: 50 }).then(res => setImports(res.data.results || []));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Импорты</h1>
        <p className="mt-1 text-sm text-gray-500">История загрузок и сверок JSON-фида Динозаврика</p>
      </div>
      <div className="space-y-3 md:hidden">
        {imports.map(item => (
          <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-semibold text-gray-900">{item.file_name || 'Без файла'}</div>
                <div className="mt-1 text-xs text-gray-500">{formatDateTime(item.started_at)}</div>
              </div>
              <StatusBadge value={item.status} />
            </div>
            <div className="mt-3 text-xs text-gray-500">Источник: <span className="font-medium text-gray-900">{item.source || '-'}</span></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-gray-500">Всего</dt>
                <dd className="mt-1 font-medium text-gray-900">{item.total_items}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Создано</dt>
                <dd className="mt-1 font-medium text-gray-900">{item.created_items}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Обновлено</dt>
                <dd className="mt-1 font-medium text-gray-900">{item.updated_items}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Ошибки</dt>
                <dd className={`mt-1 font-medium ${item.failed_items ? 'text-red-600' : 'text-gray-900'}`}>{item.failed_items}</dd>
              </div>
            </dl>
          </article>
        ))}
        {imports.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            История импортов пока пустая
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Файл</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Источник</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Всего</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Создано</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Обновлено</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Ошибки</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {imports.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="font-medium">{item.file_name || 'Без файла'}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(item.started_at)}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{item.source}</td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.total_items}</td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.created_items}</td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.updated_items}</td>
                <td className="px-4 py-4 text-right text-sm text-gray-700">{item.failed_items}</td>
                <td className="px-4 py-4"><StatusBadge value={item.status} /></td>
              </tr>
            ))}
            {imports.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">История импортов пока пустая</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierImports;
