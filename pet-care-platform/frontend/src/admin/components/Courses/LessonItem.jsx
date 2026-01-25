import React from 'react';

const LessonItem = ({ lesson, index, totalLessons, onEdit, onDelete, onMove }) => {
  const getContentTypeIcon = (contentType) => {
    const icons = {
      video: '🎥',
      text: '📄',
      interactive: '🎮',
      mixed: '🔄',
      webinar: '📹',
      workshop: '🛠️'
    };
    return icons[contentType] || '📚';
  };

  const getContentTypeLabel = (contentType) => {
    const labels = {
      video: 'Видео',
      text: 'Текст',
      interactive: 'Интерактивный',
      mixed: 'Смешанный',
      webinar: 'Вебинар',
      workshop: 'Мастер-класс'
    };
    return labels[contentType] || contentType;
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
      {/* Информация об уроке */}
      <div className="flex items-center space-x-4 flex-1">
        {/* Номер урока */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">{index + 1}</span>
          </div>
        </div>

        {/* Тип контента */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
            {getContentTypeIcon(lesson.content_type)}
          </div>
        </div>

        {/* Детали урока */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {lesson.title}
          </h4>
          <div className="flex items-center space-x-4 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {getContentTypeLabel(lesson.content_type)}
            </span>
            <span className="text-xs text-gray-500">
              {lesson.duration} мин
            </span>
            {lesson.is_required && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Обязательный
              </span>
            )}
          </div>
          {lesson.content?.description && (
            <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
              {lesson.content.description}
            </p>
          )}
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center space-x-2">
        {/* Перемещение вверх */}
        <button
          onClick={() => onMove(lesson.id, 'up')}
          disabled={index === 0}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Переместить вверх"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Перемещение вниз */}
        <button
          onClick={() => onMove(lesson.id, 'down')}
          disabled={index === totalLessons - 1}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Переместить вниз"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Редактировать */}
        <button
          onClick={() => onEdit(lesson)}
          className="p-1 text-blue-600 hover:text-blue-800"
          title="Редактировать урок"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Удалить */}
        <button
          onClick={() => {
            if (window.confirm('Вы уверены, что хотите удалить этот урок?')) {
              onDelete(lesson.id);
            }
          }}
          className="p-1 text-red-600 hover:text-red-800"
          title="Удалить урок"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default LessonItem;

