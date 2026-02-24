import React, { useState, useCallback, useRef } from 'react';

const ImageUpload = ({
  label,
  name,
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  // Валидация файла
  const validateFile = useCallback((file) => {
    const errors = [];

    if (!acceptedTypes.includes(file.type)) {
      errors.push(`Неподдерживаемый формат файла: ${file.type}`);
    }

    if (file.size > maxSize) {
      errors.push(`Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)}MB (макс. ${maxSize / 1024 / 1024}MB)`);
    }

    return errors;
  }, [acceptedTypes, maxSize]);

  // Обработка выбора файлов
  const handleFiles = useCallback((files) => {
    const fileArray = Array.from(files);
    const newErrors = [];
    const validFiles = [];

    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        newErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(newErrors);

    if (validFiles.length > 0) {
      const newImages = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Date.now() + Math.random()
      }));

      const updatedImages = [...value, ...newImages];

      // Ограничение количества файлов
      if (updatedImages.length > maxFiles) {
        setErrors(prev => [...prev, `Максимум ${maxFiles} файлов`]);
        return;
      }

      onChange?.(name, updatedImages);
    }
  }, [value, maxFiles, validateFile, onChange, name]);

  // Drag and drop обработчики
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  // Обработчик клика по кнопке
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Обработчик изменения input
  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFiles(files);
    }
    // Сбрасываем значение input для возможности повторного выбора того же файла
    e.target.value = '';
  };

  // Удаление изображения
  const removeImage = (imageId) => {
    const updatedImages = value.filter(img => img.id !== imageId);
    onChange?.(name, updatedImages);

    // Очищаем preview URL для освобождения памяти
    const removedImage = value.find(img => img.id === imageId);
    if (removedImage?.preview) {
      URL.revokeObjectURL(removedImage.preview);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Зона загрузки */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${value.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={value.length >= maxFiles}
        />

        <div className="space-y-2">
          <div className="text-4xl text-gray-400">
            📷
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Перетащите изображения сюда или{' '}
              <span className="text-primary-600 hover:text-primary-800 font-medium">
                выберите файлы
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Максимум {maxFiles} файлов, до {(maxSize / 1024 / 1024).toFixed(0)}MB каждый
            </p>
            <p className="text-xs text-gray-500">
              Форматы: {acceptedTypes.map(type => type.split('/')[1]).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Ошибки */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Загруженные изображения */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {value.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={image.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Кнопка удаления */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(image.id);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Удалить изображение"
              >
                ×
              </button>

              {/* Информация о файле */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(image.file.size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Счетчик файлов */}
      <p className="text-xs text-gray-500">
        Загружено: {value.length} / {maxFiles} файлов
      </p>
    </div>
  );
};

export default ImageUpload;
