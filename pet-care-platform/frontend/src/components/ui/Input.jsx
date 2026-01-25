/**
 * Универсальный компонент поля ввода
 * 
 * Поддерживает различные типы, валидацию и состояния.
 * Включает поддержку доступности (a11y).
 * 
 * @example
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="example@mail.ru"
 *   error="Введите корректный email"
 *   required
 * />
 * 
 * <Input
 *   label="Пароль"
 *   type="password"
 *   helperText="Минимум 8 символов"
 *   leftIcon={<LockIcon />}
 * />
 */

import { forwardRef, useState, useId } from 'react'

/**
 * Иконка глаза для пароля
 */
const EyeIcon = ({ open }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    {open ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    )}
  </svg>
)

/**
 * Иконка ошибки
 */
const ErrorIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

/**
 * Иконка успеха
 */
const SuccessIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

/**
 * Размеры input
 */
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
}

/**
 * Компонент Input
 */
const Input = forwardRef(({
  label,
  type = 'text',
  size = 'md',
  error,
  success,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled = false,
  required = false,
  optional = false,
  className = '',
  inputClassName = '',
  labelClassName = '',
  id: propId,
  onChange,
  onBlur,
  ...props
}, ref) => {
  const generatedId = useId()
  const inputId = propId || generatedId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`
  
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
  // Определяем актуальный тип input
  const actualType = type === 'password' && showPassword ? 'text' : type
  
  // Классы состояния
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : success
      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
  
  // Классы input
  const inputClasses = `
    block ${fullWidth ? 'w-full' : ''}
    rounded-lg border
    bg-white
    placeholder-gray-400
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${sizes[size] || sizes.md}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon || type === 'password' || error || success ? 'pr-10' : ''}
    ${stateClasses}
    ${inputClassName}
  `.trim().replace(/\s+/g, ' ')
  
  /**
   * Обработчик фокуса
   */
  const handleFocus = () => setIsFocused(true)
  
  /**
   * Обработчик потери фокуса
   */
  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }
  
  /**
   * Определяем правую иконку
   */
  const renderRightIcon = () => {
    if (type === 'password') {
      return (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          tabIndex={-1}
        >
          <EyeIcon open={showPassword} />
        </button>
      )
    }
    
    if (error) return <ErrorIcon />
    if (success) return <SuccessIcon />
    if (rightIcon) return rightIcon
    
    return null
  }
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={`
            block text-sm font-medium text-gray-700 mb-1.5
            ${labelClassName}
          `.trim().replace(/\s+/g, ' ')}
        >
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
          {optional && <span className="text-gray-400 ml-1 font-normal">(опционально)</span>}
        </label>
      )}
      
      {/* Input container */}
      <div className="relative">
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        
        {/* Input element */}
        <input
          ref={ref}
          id={inputId}
          type={actualType}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={inputClasses}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {/* Right icon / password toggle / status icon */}
        {renderRightIcon() && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {renderRightIcon()}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {/* Success message */}
      {success && typeof success === 'string' && (
        <p className="mt-1.5 text-sm text-green-600">
          {success}
        </p>
      )}
      
      {/* Helper text */}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

/**
 * Компонент Textarea
 */
export const Textarea = forwardRef(({
  label,
  size = 'md',
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  optional = false,
  rows = 4,
  resize = 'vertical',
  className = '',
  textareaClassName = '',
  id: propId,
  ...props
}, ref) => {
  const generatedId = useId()
  const textareaId = propId || generatedId
  const errorId = `${textareaId}-error`
  const helperId = `${textareaId}-helper`
  
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  }
  
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
  
  const textareaClasses = `
    block ${fullWidth ? 'w-full' : ''}
    rounded-lg border
    bg-white
    placeholder-gray-400
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${sizes[size] || sizes.md}
    ${resizeClasses[resize] || resizeClasses.vertical}
    ${stateClasses}
    ${textareaClassName}
  `.trim().replace(/\s+/g, ' ')
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {optional && <span className="text-gray-400 ml-1 font-normal">(опционально)</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={textareaClasses}
        {...props}
      />
      
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

/**
 * Компонент Select
 */
export const Select = forwardRef(({
  label,
  options = [],
  placeholder = 'Выберите...',
  size = 'md',
  error,
  helperText,
  fullWidth = true,
  disabled = false,
  required = false,
  optional = false,
  className = '',
  selectClassName = '',
  id: propId,
  ...props
}, ref) => {
  const generatedId = useId()
  const selectId = propId || generatedId
  const errorId = `${selectId}-error`
  const helperId = `${selectId}-helper`
  
  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
  
  const selectClasses = `
    block ${fullWidth ? 'w-full' : ''}
    rounded-lg border
    bg-white
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${sizes[size] || sizes.md}
    ${stateClasses}
    ${selectClassName}
  `.trim().replace(/\s+/g, ' ')
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {optional && <span className="text-gray-400 ml-1 font-normal">(опционально)</span>}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={selectClasses}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

/**
 * Компонент Checkbox
 */
export const Checkbox = forwardRef(({
  label,
  description,
  error,
  disabled = false,
  className = '',
  id: propId,
  ...props
}, ref) => {
  const generatedId = useId()
  const checkboxId = propId || generatedId
  
  return (
    <div className={`relative flex items-start ${className}`}>
      <div className="flex items-center h-5">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          className={`
            w-4 h-4 rounded
            border-gray-300
            text-primary-600
            focus:ring-primary-500 focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-300' : ''}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
      </div>
      {(label || description) && (
        <div className="ml-3">
          {label && (
            <label
              htmlFor={checkboxId}
              className={`
                text-sm font-medium
                ${disabled ? 'text-gray-400' : 'text-gray-700'}
                ${error ? 'text-red-600' : ''}
              `.trim().replace(/\s+/g, ' ')}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
        </div>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

export default Input

