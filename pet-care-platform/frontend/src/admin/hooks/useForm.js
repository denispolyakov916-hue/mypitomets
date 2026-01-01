import { useState, useCallback } from 'react';

export const useForm = (initialValues = {}, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Обновление значения поля
  const handleChange = useCallback((field, value) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));

    // Очищаем ошибку при изменении
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  }, [errors]);

  // Обработка blur (потеря фокуса)
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    // Валидация при blur если есть функция валидации
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: validationErrors[field]
        }));
      }
    }
  }, [values, validate]);

  // Установка нескольких значений
  const updateValues = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
  }, []);

  // Сброс формы
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Валидация всей формы
  const validateForm = useCallback(() => {
    if (!validate) return true;

    const validationErrors = validate(values);
    setErrors(validationErrors);
    setTouched(Object.keys(values).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {}));

    return Object.keys(validationErrors).length === 0;
  }, [values, validate]);

  // Отправка формы
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);

    try {
      // Валидация перед отправкой
      if (!validateForm()) {
        setIsSubmitting(false);
        return { success: false, errors };
      }

      const result = await onSubmit(values);
      return { success: true, data: result };
    } catch (error) {
      setIsSubmitting(false);
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, errors]);

  // Получение значения поля
  const getValue = useCallback((field) => values[field], [values]);

  // Получение ошибки поля
  const getError = useCallback((field) => errors[field], [errors]);

  // Проверка, было ли поле затронуто
  const isTouched = useCallback((field) => touched[field], [touched]);

  // Проверка, есть ли ошибки в форме
  const hasErrors = Object.keys(errors).length > 0;

  // Проверка, валидна ли форма
  const isValid = !hasErrors;

  return {
    // Состояние
    values,
    errors,
    touched,
    isSubmitting,

    // Методы
    handleChange,
    handleBlur,
    setValues: updateValues,
    reset,
    validateForm,
    handleSubmit,

    // Геттеры
    getValue,
    getError,
    isTouched,
    hasErrors,
    isValid,
  };
};
