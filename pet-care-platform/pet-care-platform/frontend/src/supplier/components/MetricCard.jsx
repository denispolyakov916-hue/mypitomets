import React from 'react';

const MetricCard = ({ label, value, hint, icon: Icon }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-2 break-words text-xl font-semibold text-gray-900 sm:text-2xl">{value}</div>
      </div>
      {Icon && (
        <div className="rounded-md bg-primary-50 p-2 text-primary-600">
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
    {hint && <div className="mt-2 text-xs text-gray-500">{hint}</div>}
  </div>
);

export default MetricCard;
