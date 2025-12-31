import React, { useState } from 'react';
import LessonForm from './LessonForm';
import LessonItem from './LessonItem';

const LessonManager = ({ lessons, onLessonsChange, onCreateCourse }) => {
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLesson = () => {
    setEditingLesson(null);
    setShowLessonForm(true);
  };

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setShowLessonForm(true);
  };

  const handleDeleteLesson = (lessonId) => {
    const updatedLessons = lessons.filter(lesson => lesson.id !== lessonId);
    onLessonsChange(updatedLessons);
  };

  const handleMoveLesson = (lessonId, direction) => {
    const currentIndex = lessons.findIndex(lesson => lesson.id === lessonId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;

    const updatedLessons = [...lessons];
    [updatedLessons[currentIndex], updatedLessons[newIndex]] = [updatedLessons[newIndex], updatedLessons[currentIndex]];

    // Обновляем порядок
    updatedLessons.forEach((lesson, index) => {
      lesson.order = index + 1;
    });

    onLessonsChange(updatedLessons);
  };

  const handleLessonSaved = (lessonData) => {
    let updatedLessons;

    if (editingLesson) {
      // Редактирование существующего урока
      updatedLessons = lessons.map(lesson =>
        lesson.id === editingLesson.id ? { ...lessonData, id: lesson.id } : lesson
      );
    } else {
      // Добавление нового урока
      const newLesson = {
        ...lessonData,
        id: `temp_${Date.now()}`, // Временный ID для новых уроков
        order: lessons.length + 1
      };
      updatedLessons = [...lessons, newLesson];
    }

    onLessonsChange(updatedLessons);
    setShowLessonForm(false);
    setEditingLesson(null);
  };

  const handleCreateCourse = async () => {
    if (lessons.length === 0) {
      alert('Добавьте хотя бы один урок в курс');
      return;
    }

    setIsSubmitting(true);
    try {
      // Получаем данные курса из формы (предполагаем, что они будут переданы)
      // Пока создаем базовый курс
      const courseData = {
        title: 'Новый курс',
        description: 'Описание курса',
        category: 'basics',
        level: 'beginner',
        pet_type: 'all',
        price: 0,
        duration: lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0),
        is_active: true
      };

      await onCreateCourse(courseData);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Ошибка при создании курса');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопки */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Структура курса</h2>
              <p className="text-sm text-gray-500 mt-1">
                Создайте уроки и организуйте их в правильном порядке
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAddLesson}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Добавить урок
              </button>
            </div>
          </div>
        </div>

        {/* Список уроков */}
        <div className="p-6">
          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Нет уроков</h3>
              <p className="mt-1 text-sm text-gray-500">
                Добавьте первый урок, чтобы начать создавать курс
              </p>
              <div className="mt-6">
                <button
                  onClick={handleAddLesson}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить первый урок
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  totalLessons={lessons.length}
                  onEdit={handleEditLesson}
                  onDelete={handleDeleteLesson}
                  onMove={handleMoveLesson}
                />
              ))}
            </div>
          )}
        </div>

        {/* Кнопка создания курса */}
        {lessons.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Всего уроков: {lessons.length} |
                Общая длительность: {lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0)} мин
              </div>
              <button
                onClick={handleCreateCourse}
                disabled={isSubmitting}
                className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Создание курса...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Создать курс с уроками
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно формы урока */}
      {showLessonForm && (
        <LessonForm
          lesson={editingLesson}
          onSave={handleLessonSaved}
          onClose={() => {
            setShowLessonForm(false);
            setEditingLesson(null);
          }}
        />
      )}
    </div>
  );
};

export default LessonManager;

