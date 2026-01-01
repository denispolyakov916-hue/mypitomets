import React, { useEffect } from 'react';

// Components
import Modal from './Modal';
import FormField from './FormField';
import FormButtons from './FormButtons';

// Hooks
import { useForm } from '../../hooks/useForm';

// Utils
import { adminAPI } from '../../utils/api';

// Валидация формы пользователя
const validateUser = (values) => {
  const errors = {};

  if (!values.email) {
    errors.email = 'Email обязателен';
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Некорректный email';
  }

  if (!values.first_name && !values.last_name) {
    errors.first_name = 'Укажите имя или фамилию';
  }

  if (values.phone && !/^(\+7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/.test(values.phone)) {
    errors.phone = 'Некорректный номер телефона';
  }

  return errors;
};

const UserForm = ({
  isOpen,
  onClose,
  user,
  onSuccess
}) => {
  const isEditing = !!user;

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    reset,
    handleSubmit,
    hasErrors
  } = useForm(
    user || {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      default_address: '',
      is_active: true,
      is_staff: false,
      is_superuser: false
    },
    validateUser
  );

  // Сброс формы при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      reset(user || {
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        default_address: '',
        is_active: true,
        is_staff: false,
        is_superuser: false
      });
    }
  }, [isOpen, user, reset]);

  const handleSave = async () => {
    const result = await handleSubmit(async (formData) => {
      if (isEditing) {
        return await adminAPI.users.update(user.id, formData);
      } else {
        // Для создания нового пользователя может потребоваться дополнительная логика
        // Пока оставим как заглушку
        throw new Error('Создание пользователей пока не реализовано');
      }
    });

    if (result.success) {
      onSuccess?.(result.data);
      onClose();
    } else {
      // Обработка ошибок API
      console.error('Save error:', result.error);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await adminAPI.users.delete(user.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактирование пользователя' : 'Создание пользователя'}
      size="lg"
    >
      <form className="p-6 space-y-6">
        {/* Основная информация */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Основная информация</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              required
              placeholder="user@example.com"
            />

            <FormField
              label="Телефон"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.phone}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Имя"
              name="first_name"
              value={values.first_name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.first_name}
              placeholder="Иван"
            />

            <FormField
              label="Фамилия"
              name="last_name"
              value={values.last_name}
              onChange={handleChange}
              placeholder="Иванов"
            />
          </div>

          <FormField
            label="Адрес по умолчанию"
            name="default_address"
            value={values.default_address}
            onChange={handleChange}
            placeholder="г. Москва, ул. Ленина, д. 1, кв. 1"
          />
        </div>

        {/* Права доступа */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Права доступа</h4>

          <div className="space-y-3">
            <FormField
              label="Активен"
              name="is_active"
              type="checkbox"
              value={values.is_active}
              onChange={handleChange}
            />

            <FormField
              label="Администратор"
              name="is_staff"
              type="checkbox"
              value={values.is_staff}
              onChange={handleChange}
            />

            <FormField
              label="Супервайзер"
              name="is_superuser"
              type="checkbox"
              value={values.is_superuser}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Статистика (только для просмотра) */}
        {isEditing && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Статистика</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{user.pets_count || 0}</div>
                <div className="text-sm text-gray-600">Питомцев</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{user.orders_count || 0}</div>
                <div className="text-sm text-gray-600">Заказов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{user.payments_count || 0}</div>
                <div className="text-sm text-gray-600">Платежей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{user.courses_count || 0}</div>
                <div className="text-sm text-gray-600">Курсов</div>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки */}
        <FormButtons
          onSave={handleSave}
          onCancel={onClose}
          onDelete={isEditing ? handleDelete : null}
          isSubmitting={isSubmitting}
          saveDisabled={hasErrors}
          showDelete={isEditing}
        />
      </form>
    </Modal>
  );
};

export default UserForm;
