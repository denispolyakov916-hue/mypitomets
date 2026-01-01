import React, { useState, useEffect } from 'react';
import Modal from '../Forms/Modal';
import FormField from '../Forms/FormField';
import FormButtons from '../Forms/FormButtons';

const validateLesson = (values) => {
  const errors = {};
  if (!values.title) errors.title = 'Название урока обязательно';
  if (!values.content_type) errors.content_type = 'Тип контента обязателен';
  if (values.duration <= 0) errors.duration = 'Длительность должна быть больше 0';
  return errors;
};

const LessonForm = ({ lesson, onSave, onClose }) => {
  const [values, setValues] = useState({
    title: '',
    content_type: 'video',
    content: {},
    duration: 30,
    is_required: true,
    additional_materials: [],
    description: '',
    video_url: '',
    text_content: '',
    quiz_questions: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!lesson;

  useEffect(() => {
    if (lesson) {
      setValues({
        title: lesson.title || '',
        content_type: lesson.content_type || 'video',
        content: lesson.content || {},
        duration: lesson.duration || 30,
        is_required: lesson.is_required !== false,
        additional_materials: lesson.additional_materials || [],
        description: lesson.content?.description || '',
        video_url: lesson.content?.video_url || '',
        text_content: lesson.content?.text_content || '',
        quiz_questions: lesson.content?.quiz_questions || []
      });
    }
  }, [lesson]);

  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));

    // Очищаем ошибку поля при изменении
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateLesson(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Формируем контент в зависимости от типа
      let content = { ...values.content };

      switch (values.content_type) {
        case 'video':
          content = {
            video_url: values.video_url,
            description: values.description,
            transcript: values.content?.transcript || ''
          };
          break;
        case 'text':
          content = {
            text_content: values.text_content,
            description: values.description
          };
          break;
        case 'interactive':
          content = {
            quiz_questions: values.quiz_questions,
            description: values.description,
            interactive_type: values.content?.interactive_type || 'quiz'
          };
          break;
        case 'mixed':
          content = {
            video_url: values.video_url,
            text_content: values.text_content,
            description: values.description,
            quiz_questions: values.quiz_questions
          };
          break;
        case 'webinar':
          content = {
            webinar_url: values.content?.webinar_url || '',
            description: values.description,
            schedule: values.content?.schedule || ''
          };
          break;
        case 'workshop':
          content = {
            workshop_content: values.content?.workshop_content || '',
            description: values.description,
            materials: values.additional_materials
          };
          break;
      }

      const lessonData = {
        title: values.title,
        content_type: values.content_type,
        content,
        duration: parseInt(values.duration),
        is_required: values.is_required,
        additional_materials: values.additional_materials,
        order: lesson?.order || 1
      };

      onSave(lessonData);
    } catch (error) {
      console.error('Error saving lesson:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentTypeOptions = [
    { value: 'video', label: '🎥 Видео' },
    { value: 'text', label: '📄 Текст' },
    { value: 'interactive', label: '🎮 Интерактивный' },
    { value: 'mixed', label: '🔄 Смешанный' },
    { value: 'webinar', label: '📹 Вебинар' },
    { value: 'workshop', label: '🛠️ Мастер-класс' }
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Редактировать урок' : 'Создать новый урок'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Основная информация</h3>

          <FormField
            label="Название урока"
            name="title"
            value={values.title}
            onChange={(value) => handleChange('title', value)}
            error={errors.title}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Тип контента"
              name="content_type"
              value={values.content_type}
              onChange={(value) => handleChange('content_type', value)}
              error={errors.content_type}
              type="select"
              options={contentTypeOptions}
              required
            />

            <FormField
              label="Длительность (минуты)"
              name="duration"
              value={values.duration}
              onChange={(value) => handleChange('duration', parseInt(value) || 0)}
              error={errors.duration}
              type="number"
              min="1"
              required
            />
          </div>

          <FormField
            label="Описание урока"
            name="description"
            value={values.description}
            onChange={(value) => handleChange('description', value)}
            type="textarea"
            rows={3}
          />

          <FormField
            label="Обязательный урок"
            name="is_required"
            checked={values.is_required}
            onChange={(value) => handleChange('is_required', value)}
            type="checkbox"
          />
        </div>

        {/* Контент в зависимости от типа */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Контент урока ({contentTypeOptions.find(opt => opt.value === values.content_type)?.label})
          </h3>

          {values.content_type === 'video' && (
            <FormField
              label="URL видео"
              name="video_url"
              value={values.video_url}
              onChange={(value) => handleChange('video_url', value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          )}

          {values.content_type === 'text' && (
            <FormField
              label="Текстовый контент"
              name="text_content"
              value={values.text_content}
              onChange={(value) => handleChange('text_content', value)}
              type="textarea"
              rows={8}
              placeholder="Введите текст урока..."
            />
          )}

          {(values.content_type === 'interactive' || values.content_type === 'mixed') && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Для интерактивного контента можно добавить вопросы викторины
              </div>
              {/* Здесь можно добавить компонент для управления вопросами викторины */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Функционал викторины будет добавлен в следующей версии
                </p>
              </div>
            </div>
          )}

          {values.content_type === 'webinar' && (
            <FormField
              label="URL вебинара"
              name="webinar_url"
              value={values.content?.webinar_url || ''}
              onChange={(value) => handleChange('content', { ...values.content, webinar_url: value })}
              placeholder="Ссылка на вебинарную платформу"
            />
          )}

          {values.content_type === 'workshop' && (
            <FormField
              label="Материалы мастер-класса"
              name="workshop_content"
              value={values.content?.workshop_content || ''}
              onChange={(value) => handleChange('content', { ...values.content, workshop_content: value })}
              type="textarea"
              rows={6}
              placeholder="Опишите шаги мастер-класса..."
            />
          )}
        </div>

        {/* Дополнительные материалы */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Дополнительные материалы</h3>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-500">
              Функционал дополнительных материалов будет добавлен в следующей версии
            </p>
          </div>
        </div>

        <FormButtons
          onCancel={onClose}
          isSubmitting={isSubmitting}
          submitLabel={isEditing ? 'Сохранить изменения' : 'Добавить урок'}
        />
      </form>
    </Modal>
  );
};

export default LessonForm;
