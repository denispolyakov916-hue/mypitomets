import { useState, useCallback } from 'react';

/**
 * Хук валидации форм.
 *
 * @param {Object} rules - объект правил валидации { fieldName: validationFn }
 *   Каждая функция принимает значение поля и возвращает строку ошибки или null.
 * @returns {Object} { errors, validate, validateField, clearErrors, setErrors }
 *
 * @example
 * const { errors, validate, validateField, clearErrors } = useFormValidation({
 *   email: (v) => !v?.trim() ? 'Email обязателен' : !/\S+@\S+\.\S+/.test(v) ? 'Неверный формат' : null,
 *   password: (v) => !v ? 'Введите пароль' : v.length < 6 ? 'Минимум 6 символов' : null,
 * });
 *
 * const handleSubmit = () => {
 *   if (!validate(formData)) return;
 *   // ...
 * };
 */
export function useFormValidation(rules = {}) {
  const [errors, setErrors] = useState({});

  const validate = useCallback((data) => {
    const newErrors = {};

    for (const [field, rule] of Object.entries(rules)) {
      const error = rule(data[field], data);
      if (error) {
        newErrors[field] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [rules]);

  const validateField = useCallback((field, value, data = {}) => {
    const rule = rules[field];
    if (!rule) return null;

    const error = rule(value, data);
    setErrors((prev) => {
      if (error) return { ...prev, [field]: error };
      const { [field]: _, ...rest } = prev;
      return rest;
    });
    return error;
  }, [rules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, validateField, clearErrors, setErrors };
}
