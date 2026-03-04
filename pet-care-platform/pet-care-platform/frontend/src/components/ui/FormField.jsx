/**
 * Обёртка для полей формы: label + input + error message
 *
 * Стандартизирует отображение полей формы по всему приложению.
 *
 * @example
 * <FormField label="Email" error={errors.email} required>
 *   <Input
 *     type="email"
 *     value={email}
 *     onChange={e => setEmail(e.target.value)}
 *   />
 * </FormField>
 */

import { forwardRef } from 'react'

const FormField = forwardRef(({
  children,
  label,
  error,
  hint,
  required = false,
  htmlFor,
  className = '',
  ...props
}, ref) => (
  <div ref={ref} className={`space-y-1.5 ${className}`} {...props}>
    {label && (
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}

    {children}

    {error && (
      <p className="text-sm text-red-600 mt-1" role="alert">
        {error}
      </p>
    )}

    {hint && !error && (
      <p className="text-sm text-gray-500 mt-1">
        {hint}
      </p>
    )}
  </div>
))

FormField.displayName = 'FormField'

export { FormField }
export default FormField
