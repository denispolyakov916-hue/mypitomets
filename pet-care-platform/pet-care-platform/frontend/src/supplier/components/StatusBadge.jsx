import React from 'react';

const styles = {
  draft: 'bg-gray-100 text-gray-700',
  needs_fix: 'bg-amber-100 text-amber-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved_for_shop: 'bg-emerald-100 text-emerald-800',
  approved_for_recommendation: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  archived: 'bg-gray-200 text-gray-600',
  delivered: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  refunded: 'bg-purple-100 text-purple-800',
  requested: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  received: 'bg-indigo-100 text-indigo-800',
  running: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const labels = {
  draft: 'Черновик',
  needs_fix: 'Нужны исправления',
  submitted: 'На проверке',
  approved_for_shop: 'В магазине',
  approved_for_recommendation: 'В подборе',
  rejected: 'Отклонено',
  archived: 'Архив',
  delivered: 'Доставлен',
  processing: 'В обработке',
  shipped: 'Отправлен',
  cancelled: 'Отменён',
  pending: 'Ожидает',
  refunded: 'Возврат средств',
  requested: 'Запрошено',
  approved: 'Одобрено',
  received: 'Получено',
  running: 'Выполняется',
  success: 'Успешно',
  failed: 'Ошибка',
};

const StatusBadge = ({ value }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[value] || 'bg-gray-100 text-gray-700'}`}>
    {labels[value] || value || '-'}
  </span>
);

export default StatusBadge;
