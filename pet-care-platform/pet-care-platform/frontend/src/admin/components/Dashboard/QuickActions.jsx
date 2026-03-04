import React from 'react';
import { Link } from 'react-router-dom';

const QuickActions = () => {
  const actions = [
    {
      title: 'Заказы на обработку',
      description: 'Просмотреть заказы, требующие внимания',
      href: '/admin-panel/orders?status=pending,processing',
      icon: '📦',
      color: 'bg-accent-50 border-accent-200 text-accent-700',
    },
    {
      title: 'Управление товарами',
      description: 'Добавить, редактировать или удалить товары',
      href: '/admin-panel/products',
      icon: '📦',
      color: 'bg-primary-50 border-primary-200 text-primary-700',
    },
    {
      title: 'Аналитика платежей',
      description: 'Просмотреть финансовые отчеты',
      href: '/admin-panel/analytics',
      icon: '💳',
      color: 'bg-primary-50 border-primary-200 text-primary-700',
    },
    {
      title: 'Управление пользователями',
      description: 'Просмотреть и редактировать профили пользователей',
      href: '/admin-panel/users',
      icon: '👥',
      color: 'bg-primary-50 border-primary-200 text-primary-700',
    },
    {
      title: 'База питомцев',
      description: 'Управление профилями питомцев',
      href: '/admin-panel/pets',
      icon: '🐾',
      color: 'bg-green-50 border-green-200 text-green-700',
    },
    {
      title: 'Курсы обучения',
      description: 'Управление образовательным контентом',
      href: '/admin-panel/courses',
      icon: '🎓',
      color: 'bg-primary-50 border-primary-200 text-primary-700',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            className={`
              block p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-105
              ${action.color}
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{action.icon}</div>
              <div>
                <h3 className="font-medium text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
