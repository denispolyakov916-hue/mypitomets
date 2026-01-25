import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Components
import CourseForm from '../Forms/CourseForm';
import LessonManager from './LessonManager';

// Hooks
import { useAdminStore } from '../../stores/adminStore';

// Utils
import { adminAPI } from '../../utils/api';

const CourseCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [createdCourse, setCreatedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'content'
  const [courseLessons, setCourseLessons] = useState([]);
  const { user } = useAdminStore();

  const isEditing = !!id && id !== 'create';

  // Загрузка курса для редактирования
  useEffect(() => {
    if (isEditing) {
      loadCourse();
    }
  }, [id]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.courses.retrieve(id);
      setEditingCourse(response.data);

      // Загружаем уроки курса, если они есть
      if (response.data.lessons) {
        setCourseLessons(response.data.lessons);
      }
    } catch (error) {
      console.error('Error loading course:', error);
      navigate('/admin-panel/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSaved = (courseData) => {
    if (isEditing) {
      // При редактировании возвращаемся к списку
      navigate('/admin-panel/courses');
    } else {
      // При создании сохраняем данные для показа опций
      setCreatedCourse(courseData);
    }
  };

  const handleCourseFormSuccess = (courseData) => {
    // Сохраняем данные формы и переходим к следующему шагу
    setActiveTab('content');
  };

  const handleCreateCourseWithLessons = async () => {
    try {
      // Получаем данные из формы (пока используем дефолтные)
      const courseData = {
        title: 'Новый курс',
        description: 'Описание курса будет заполнено позже',
        category: 'basics',
        level: 'beginner',
        pet_type: 'all',
        price: 0,
        duration: courseLessons.reduce((total, lesson) => total + (lesson.duration || 0), 0),
        is_active: true
      };

      // Создаем курс с уроками
      const courseWithLessons = {
        ...courseData,
        lessons: courseLessons
      };

      const response = await adminAPI.courses.create(courseWithLessons);
      setCreatedCourse(response.data);
      setActiveTab('basic'); // Возвращаемся к базовой информации
    } catch (error) {
      console.error('Error creating course with lessons:', error);
      throw error;
    }
  };

  const handleLessonsChange = (lessons) => {
    setCourseLessons(lessons);
  };

  const handleGoToBuilder = () => {
    const courseId = createdCourse?.id || editingCourse?.id;
    if (courseId) {
      // Переходим в билдер курса
      navigate(`/admin-panel/courses/${courseId}/builder`);
    }
  };

  const handleGoToCourses = () => {
    navigate('/admin-panel/courses');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Редактирование курса' : 'Создание нового курса'}
              </h1>
              <p className="mt-2 text-gray-600">
                {isEditing
                  ? 'Измените основную информацию о курсе.'
                  : 'Заполните основную информацию о курсе. После сохранения вы сможете перейти к созданию контента.'
                }
              </p>
            </div>
            <button
              onClick={handleGoToCourses}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← К списку курсов
            </button>
          </div>
        </div>

        {/* Вкладки */}
        {!createdCourse && !isEditing && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'basic'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Основная информация
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'content'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Структура курса
                  {courseLessons.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {courseLessons.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Основная форма */}
        {loading ? (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка курса...</p>
            </div>
          </div>
        ) : (!createdCourse || isEditing) ? (
          <div className="space-y-6">
            {/* Основная информация */}
            {(activeTab === 'basic' || isEditing) && (
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Основная информация</h2>
                </div>
                <div className="p-6">
              <CourseForm
                course={editingCourse}
                onSuccess={isEditing ? handleCourseSaved : handleCourseFormSuccess}
                onClose={() => navigate('/admin-panel/courses')}
                showButtons={true}
                customButtons={
                  <div className="flex justify-between">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={handleGoToBuilder}
                        className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011-1V6a2 2 0 00-2-2H9a2 2 0 00-2 2v1a2 2 0 002 2zM21 12a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM21 16a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zM4 16a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1z" />
                        </svg>
                        Перейти в билдер
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('content')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Далее: Структура курса
                      </button>
                    )}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => navigate('/admin-panel/courses')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={false} // TODO: add loading state
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEditing ? 'Сохранить изменения' : 'Сохранить и продолжить'}
                      </button>
                    </div>
                  </div>
                }
              />
                </div>
              </div>
            )}

            {/* Структура курса */}
            {activeTab === 'content' && !isEditing && (
              <LessonManager
                lessons={courseLessons}
                onLessonsChange={handleLessonsChange}
                onCreateCourse={handleCreateCourseWithLessons}
              />
            )}
          </div>
        ) : (
          /* После создания курса показываем опции */
          <div className="space-y-6">
            {/* Успешное создание */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Курс "{createdCourse.title}" успешно создан!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Теперь вы можете добавить уроки и материалы в курс через конструктор.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Опции действий */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Что делать дальше?</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Перейти в билдер */}
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011-1V6a2 2 0 00-2-2H9a2 2 0 00-2 2v1a2 2 0 002 2zM21 12a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM21 16a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zM4 16a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">Создать контент курса</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Перейти в конструктор для добавления уроков и материалов
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={handleGoToBuilder}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011-1V6a2 2 0 00-2-2H9a2 2 0 00-2 2v1a2 2 0 002 2zM21 12a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM21 16a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zM4 16a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1z" />
                        </svg>
                        Сохранить и перейти в билдер
                      </button>
                    </div>
                  </div>

                  {/* Вернуться к списку */}
                  <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9l4 4V5H9z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-900">Вернуться к списку</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Просмотреть все курсы или создать новый позже
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={handleGoToCourses}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V9l4 4V5H9z" />
                        </svg>
                        К списку курсов
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCreatePage;
