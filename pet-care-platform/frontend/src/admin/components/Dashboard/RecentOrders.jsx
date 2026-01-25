import React from 'react';
import { Link } from 'react-router-dom';

const RecentOrders = ({ orders }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      partially_delivered: 'bg-purple-100 text-purple-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Ожидает',
      processing: 'В обработке',
      partially_delivered: 'Частично доставлен',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      cancelled: 'Отменён',
      expired: 'Истёк',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Последние заказы</h2>
        <Link
          to="/admin-panel/orders"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Все заказы →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📦</div>
          <p>Нет заказов</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="font-mono text-sm font-medium text-gray-900">
                    #{order.id.slice(-8)}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {order.user_email || 'Анонимный пользователь'}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {formatDate(order.created_at)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {order.total_amount.toLocaleString()} ₽
                </div>
                <div className="text-sm text-gray-500">
                  {order.items_count} товар{order.items_count !== 1 ? 'ов' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
