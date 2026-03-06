import React, { useEffect } from 'react';

// Components
import Modal from '../../../components/ui/Modal';
import FormField from './FormField';
import FormButtons from './FormButtons';

// Hooks
import { useForm } from '../../hooks/useForm';

// Utils
import { adminAPI } from '../../utils/api';

// Валидация формы курса
const validateCourse = (values) => {
  const errors = {};

  if (!values.title) {
    errors.title = 'Название курса обязательно';
  } else if (values.title.length < 3) {
    errors.title = 'Название должно содержать минимум 3 символа';
  }

  if (!values.category) {
    errors.category = 'Категория обязательна';
  }

  if (!values.level) {
    errors.level = 'Уровень сложности обязателен';
  }

  if (values.price && values.price < 0) {
    errors.price = 'Цена не может быть отрицательной';
  }

  return errors;
};

const CourseForm = ({
  isOpen,
  onClose,
  course,
  onSuccess,
  showButtons = true,
  customButtons
}) => {
  const isEditing = !!course;

  // Опции для селекторов
  const petTypeOptions = [
    { value: 'dog', label: 'Собак' },
    { value: 'cat', label: 'Кошек' },
    { value: 'all', label: 'Все' },
  ];

  const categoryOptions = [
    { value: 'basics', label: 'Основы' },
    { value: 'training', label: 'Дрессировка' },
    { value: 'care', label: 'Уход' },
    { value: 'health', label: 'Здоровье' },
    { value: 'nutrition', label: 'Питание' },
    { value: 'behavior', label: 'Поведение' },
    { value: 'specialized', label: 'Специализированные' },
    { value: 'entertainment', label: 'Развлечения' },
  ];

  const levelOptions = [
    { value: 'beginner', label: 'Начинающий' },
    { value: 'intermediate', label: 'Средний' },
    { value: 'advanced', label: 'Продвинутый' },
    { value: 'expert', label: 'Эксперт' },
  ];

  const formatOptions = [
    { value: 'video', label: 'Видео' },
    { value: 'text', label: 'Текст' },
    { value: 'interactive', label: 'Интерактивный' },
    { value: 'mixed', label: 'Смешанный' },
    { value: 'webinar', label: 'Вебинар' },
    { value: 'workshop', label: 'Мастер-класс' },
  ];

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    reset,
    handleSubmit,
  } = useForm({
    initialValues: {
      title: course?.title || '',
      description: course?.description || '',
      category: course?.category || '',
      level: course?.level || '',
      pet_type: course?.pet_type || 'all',
      format_type: course?.format_type || 'video',
      price: course?.price || '',
      duration: course?.duration || 60,
      is_active: course?.is_active ?? true,
      instructor_name: course?.instructor_name || '',
      instructor_bio: course?.instructor_bio || '',
    },
    validate: validateCourse,
    onSubmit: async (formValues) => {
      try {
        const data = {
          ...formValues,
          price: formValues.price ? parseFloat(formValues.price) : 0,
          duration: formValues.duration ? parseInt(formValues.duration) : 60,
        };

        if (isEditing) {
          await adminAPI.courses.update(course.id, data);
        } else {
          await adminAPI.courses.create(data);
        }

        onSuccess?.();
        onClose();
      } catch (error) {
        console.error('Course save error:', error);
        throw new Error(error.response?.data?.detail || 'Ошибка сохранения курса');
      }
    },
  });

  // Сброс формы при закрытии
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактировать курс' : 'Создать курс'}
      size="xl"
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormField
              label="Название курса"
              name="title"
              type="text"
              value={values.title}
              error={errors.title}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              label="Описание"
              name="description"
              type="textarea"
              rows={3}
              value={values.description}
              error={errors.description}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>

          <FormField
            label="Категория"
            name="category"
            type="select"
            value={values.category}
            error={errors.category}
            onChange={handleChange}
            onBlur={handleBlur}
            options={categoryOptions}
            required
          />

          <FormField
            label="Уровень сложности"
            name="level"
            type="select"
            value={values.level}
            error={errors.level}
            onChange={handleChange}
            onBlur={handleBlur}
            options={levelOptions}
            required
          />

          <FormField
            label="Для животных"
            name="pet_type"
            type="select"
            value={values.pet_type}
            error={errors.pet_type}
            onChange={handleChange}
            onBlur={handleBlur}
            options={petTypeOptions}
          />

          <FormField
            label="Формат обучения"
            name="format_type"
            type="select"
            value={values.format_type}
            error={errors.format_type}
            onChange={handleChange}
            onBlur={handleBlur}
            options={formatOptions}
          />

          <FormField
            label="Цена (₽)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            error={errors.price}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <FormField
            label="Длительность (мин)"
            name="duration"
            type="number"
            min="1"
            value={values.duration}
            error={errors.duration}
            onChange={handleChange}
            onBlur={handleBlur}
          />

          <FormField
            label="Активен"
            name="is_active"
            type="checkbox"
            value={values.is_active}
            onChange={handleChange}
          />
        </div>

        {/* Информация об инструкторе */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Информация об инструкторе</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Имя инструктора"
              name="instructor_name"
              type="text"
              value={values.instructor_name}
              error={errors.instructor_name}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <div className="md:col-span-2">
              <FormField
                label="Биография инструктора"
                name="instructor_bio"
                type="textarea"
                rows={3}
                value={values.instructor_bio}
                error={errors.instructor_bio}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          </div>
        </div>

        {/* Кнопки */}
        {showButtons && !customButtons && (
          <FormButtons
            onCancel={onClose}
            isSubmitting={isSubmitting}
            submitLabel={isEditing ? 'Сохранить изменения' : 'Создать курс'}
            cancelLabel="Отмена"
          />
        )}

        {/* Кастомные кнопки */}
        {customButtons}
      </form>
    </Modal>
  );
};

export default CourseForm;
