import React from 'react';

const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary'
}) => {
  const colorClasses = {
    primary: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
    purple: 'border-primary-200 bg-primary-50',
  };

  const textColors = {
    primary: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-yellow-700',
    danger: 'text-red-700',
    purple: 'text-primary-700',
  };

  return (
    <div className={`
      relative overflow-hidden rounded-lg border p-6 shadow-sm transition-all duration-200 hover:shadow-md
      ${colorClasses[color]}
    `}>
      {/* Фоновый элемент */}
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10"
           style={{ backgroundColor: `var(--color-${color})` }}>
      </div>

      {/* Иконка */}
      <div className="flex items-center justify-between">
        <div className="text-2xl">{icon}</div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${textColors[color]}`}>
            {value}
          </p>
        </div>
      </div>

      {/* Подзаголовок и тренд */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">{subtitle}</p>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center text-xs font-medium ${
            trend > 0 ? 'text-green-600' :
            trend < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend > 0 && (
              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend < 0 && (
              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {trend === 0 && '➡️'}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
