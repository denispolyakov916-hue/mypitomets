import React from 'react';

const options = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
  { value: '1y', label: 'Год' },
];

const PeriodFilter = ({ value, onChange }) => (
  <div className="grid w-full grid-cols-4 rounded-md border border-gray-200 bg-white p-1 sm:inline-grid sm:w-auto">
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`rounded px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
          value === option.value
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default PeriodFilter;
