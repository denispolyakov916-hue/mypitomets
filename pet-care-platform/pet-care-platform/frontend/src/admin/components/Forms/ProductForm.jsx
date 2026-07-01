import React, { useEffect, useState } from 'react';

// Components
import Modal from '../../../components/ui/Modal';
import FormField from './FormField';
import FormButtons from './FormButtons';
import ImageUpload from './ImageUpload';

// Hooks
import { useForm } from '../../hooks/useForm';

// Utils
import { adminAPI } from '../../utils/api';
import { devLog } from '../../utils/logger';

// Валидация формы товара
const validateProduct = (values) => {
  const errors = {};

  if (!values.name) {
    errors.name = 'Название обязательно';
  } else if (values.name.length < 3) {
    errors.name = 'Название должно содержать минимум 3 символа';
  }

  if (!values.price || values.price <= 0) {
    errors.price = 'Цена должна быть больше 0';
  }

  if (!values.animal) {
    errors.animal = 'Выберите тип животного';
  }

  if (!values.category) {
    errors.category = 'Выберите категорию';
  }

  return errors;
};

const ProductForm = ({
  isOpen,
  onClose,
  product,
  onSuccess
}) => {
  const isEditing = !!product;
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

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
    product || {
      name: '',
      description: '',
      price: '',
      discount_percent: 0,
      animal: 'dog',
      category: '',
      subcategory: '',
      vendor: '',
      vendor_code: '',
      in_stock: true,
      stock_count: 0,
      weight: '',
      images: []
    },
    validateProduct
  );

  // Загрузка категорий
  useEffect(() => {
    const loadCategories = async () => {
      // В будущем можно загрузить динамически из API
      // Пока используем статические данные
      setCategories([
        { value: 'food', label: 'Корм' },
        { value: 'pharmacy', label: 'Ветаптека' },
        { value: 'ammunition', label: 'Амуниция' },
        { value: 'care', label: 'Средства по уходу' },
        { value: 'transport', label: 'Транспортировка' },
        { value: 'toys', label: 'Игрушки' }
      ]);
    };

    loadCategories();
  }, []);

  // Обновление подкатегорий при изменении категории
  useEffect(() => {
    const categorySubcategories = {
      food: [
        { value: 'dry', label: 'Сухой' },
        { value: 'wet', label: 'Влажный' },
        { value: 'canned', label: 'Консервы' },
        { value: 'pouch', label: 'Паучи' },
        { value: 'pate', label: 'Паштет' },
        { value: 'holistic', label: 'Холистик' },
        { value: 'diet', label: 'Диетический' },
        { value: 'hypoallergenic', label: 'Гипоаллергенный' }
      ],
      pharmacy: [
        { value: 'antiparasite', label: 'Средства от паразитов' }
      ],
      ammunition: [
        { value: 'leashes', label: 'Поводки' },
        { value: 'collars', label: 'Ошейники' },
        { value: 'harnesses', label: 'Шлейки' },
        { value: 'muzzles', label: 'Намордники' },
        { value: 'clickers', label: 'Кликеры' },
        { value: 'retractable', label: 'Рулетки' },
        { value: 'lights', label: 'Подсветки' },
        { value: 'multiboxes', label: 'Мультибоксы' }
      ],
      care: [
        { value: 'grooming', label: 'Уход за шерстью' },
        { value: 'hygiene', label: 'Гигиена' },
        { value: 'coat_care', label: 'Уход за шерстью' }
      ],
      transport: [
        { value: 'enclosures', label: 'Клетки' },
        { value: 'pads', label: 'Пелёнки' }
      ],
      toys: [
        { value: 'general', label: 'Общее' }
      ]
    };

    setSubcategories(categorySubcategories[values.category] || []);
  }, [values.category]);

  // Сброс формы при открытии/закрытии
  useEffect(() => {
    if (isOpen) {
      reset(product || {
        name: '',
        description: '',
        price: '',
        discount_percent: 0,
        animal: 'dog',
        category: '',
        subcategory: '',
        vendor: '',
        vendor_code: '',
        in_stock: true,
        stock_count: 0,
        weight: '',
        images: []
      });
    }
  }, [isOpen, product, reset]);

  const handleSave = async () => {
    const result = await handleSubmit(async (formData) => {
      // Преобразование типов
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        discount_percent: parseInt(formData.discount_percent) || 0,
        stock_count: parseInt(formData.stock_count) || 0,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };

      if (isEditing) {
        return await adminAPI.products.update(product.id, data);
      } else {
        // Для создания нужно сгенерировать external_id
        // Пока оставим как заглушку
        throw new Error('Создание товаров пока не реализовано через API');
      }
    });

    if (result.success) {
      onSuccess?.(result.data);
      onClose();
    } else {
      devLog.error('Save error:', result.error);
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      await adminAPI.products.delete(product.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      devLog.error('Delete error:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Редактирование товара' : 'Создание товара'}
      size="xl"
      className="max-w-4xl"
    >
      <form className="p-6 space-y-6">
        {/* Основная информация */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Основная информация</h4>

          <FormField
            label="Название товара"
            name="name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.name}
            required
            placeholder="Введите название товара"
          />

          <FormField
            label="Описание"
            name="description"
            type="textarea"
            value={values.description}
            onChange={handleChange}
            placeholder="Подробное описание товара"
            rows={4}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Цена (₽)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={values.price}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.price}
              required
              placeholder="0.00"
            />

            <FormField
              label="Скидка (%)"
              name="discount_percent"
              type="number"
              min="0"
              max="100"
              value={values.discount_percent}
              onChange={handleChange}
              placeholder="0"
            />

            <FormField
              label="Вес (кг)"
              name="weight"
              type="number"
              step="0.001"
              min="0"
              value={values.weight}
              onChange={handleChange}
              placeholder="0.000"
            />
          </div>
        </div>

        {/* Классификация */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Классификация</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Тип животного"
              name="animal"
              type="select"
              value={values.animal}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.animal}
              required
            >
              <option value="dog">🐕 Собаки</option>
              <option value="cat">🐈 Кошки</option>
            </FormField>

            <FormField
              label="Категория"
              name="category"
              type="select"
              value={values.category}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.category}
              required
            >
              <option value="">Выберите категорию</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </FormField>

            <FormField
              label="Подкатегория"
              name="subcategory"
              type="select"
              value={values.subcategory}
              onChange={handleChange}
              disabled={!values.category}
            >
              <option value="">Выберите подкатегорию</option>
              {subcategories.map(sub => (
                <option key={sub.value} value={sub.value}>{sub.label}</option>
              ))}
            </FormField>
          </div>
        </div>

        {/* Производитель */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Производитель</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Бренд"
              name="vendor"
              value={values.vendor}
              onChange={handleChange}
              placeholder="Название бренда"
            />

            <FormField
              label="Артикул"
              name="vendor_code"
              value={values.vendor_code}
              onChange={handleChange}
              placeholder="Код производителя"
            />
          </div>
        </div>

        {/* Изображения */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Изображения товара</h4>

          <ImageUpload
            label="Фотографии товара"
            name="images"
            value={values.images}
            onChange={handleChange}
            maxFiles={10}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          />
        </div>

        {/* Наличие */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Наличие</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="В наличии"
              name="in_stock"
              type="checkbox"
              value={values.in_stock}
              onChange={handleChange}
            />

            <FormField
              label="Количество на складе"
              name="stock_count"
              type="number"
              min="0"
              value={values.stock_count}
              onChange={handleChange}
              disabled={!values.in_stock}
            />
          </div>
        </div>

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

export default ProductForm;
