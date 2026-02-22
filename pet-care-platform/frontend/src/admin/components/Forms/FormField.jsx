import React from 'react';
import Input, { Textarea, Checkbox } from '../../../components/ui/Input';

const selectClasses = (error, disabled) => `
  block w-full rounded-lg border bg-white
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-offset-0
  px-4 py-2 text-sm
  ${error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
  }
  ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
`.trim().replace(/\s+/g, ' ');

const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const handleChange = (e) => {
    if (onChange) {
      if (type === 'checkbox') {
        onChange(name, e.target.checked);
      } else if (type === 'file') {
        onChange(name, e.target.files);
      } else {
        onChange(name, e.target.value);
      }
    }
  };

  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(name, e.target.value);
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={props.rows || 4}
          />
        );

      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            className={selectClasses(error, disabled)}
            {...props}
          >
            {children}
          </select>
        );

      case 'checkbox':
        return (
          <Checkbox
            id={name}
            name={name}
            checked={value || false}
            onChange={handleChange}
            disabled={disabled}
            label={label}
            error={error}
          />
        );

      case 'file':
        return (
          <Input
            id={name}
            name={name}
            type="file"
            onChange={handleChange}
            disabled={disabled}
            {...props}
          />
        );

      default:
        return (
          <Input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            {...props}
          />
        );
    }
  };

  if (type === 'checkbox') {
    return (
      <div className={`space-y-1 ${className}`}>
        {renderInput()}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && type !== 'checkbox' && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {renderInput()}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormField;
