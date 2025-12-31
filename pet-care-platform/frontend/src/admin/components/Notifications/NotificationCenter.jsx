import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, alerts

  // Имитация получения уведомлений
  useEffect(() => {
    if (isOpen) {
      // В реальном приложении здесь будет API вызов
      const mockNotifications = [
        {
          id: 1,
          type: 'alert',
          title: 'Низкий запас товаров',
          message: '5 товаров имеют запас менее 10 единиц',
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 минут назад
          read: false,
          actionUrl: '/admin-panel/products?stock=low'
        },
        {
          id: 2,
          type: 'info',
          title: 'Новый пользователь',
          message: 'Зарегистрирован новый пользователь: user@example.com',
          timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 минут назад
          read: false,
          actionUrl: '/admin-panel/users'
        },
        {
          id: 3,
          type: 'success',
          title: 'Заказ выполнен',
          message: 'Заказ #1234 успешно доставлен',
          timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 час назад
          read: true,
          actionUrl: '/admin-panel/orders'
        },
        {
          id: 4,
          type: 'warning',
          title: 'Неактивные пользователи',
          message: '15 пользователей не заходили более 30 дней',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
          read: false,
          actionUrl: '/admin-panel/users'
        }
      ];

      setNotifications(mockNotifications);
    }
  }, [isOpen]);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'alerts':
        return notification.type === 'alert' || notification.type === 'warning';
      default:
        return true;
    }
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'alert':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'alert':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} д назад`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Уведомления</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Все ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Непрочитанные ({notifications.filter(n => !n.read).length})
              </button>
              <button
                onClick={() => setFilter('alerts')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === 'alerts'
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Важные ({notifications.filter(n => n.type === 'alert' || n.type === 'warning').length})
              </button>
            </div>

            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Отметить все прочитанными
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 0112 21c7.962 0 12-1.21 12-2.683m-12 2.683a17.925 17.925 0 01-7.132-8.317M12 21c4.411 0 8-4.03 8-9s-3.589-9-8-9-8 4.03-8 9a9.06 9.06 0 001.832 5.445L4 21l4.868-8.317z" />
                </svg>
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.actionUrl) {
                        navigate(notification.actionUrl);
                        onClose();
                      }
                    }}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        getTypeColor(notification.type)
                      }`}>
                        {getTypeIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.timestamp)}
                          </span>

                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Отметить прочитанным
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
