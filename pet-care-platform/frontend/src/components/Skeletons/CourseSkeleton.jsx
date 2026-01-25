/**
 * Скелетоны для загрузки страниц курсов
 * 
 * Обеспечивают плавный переход при загрузке тяжёлых компонентов
 */

import React from 'react'

/**
 * Скелетон для страницы обучения курсу
 */
export const CourseLearningPageSkeleton = () => {
  return (
    <div className="page-container animate-pulse">
      {/* Заголовок */}
      <div className="h-8 w-96 bg-gray-200 rounded mb-6" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Основной контент */}
        <div className="lg:col-span-2 space-y-6">
          {/* Карточка курса */}
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-24 h-24 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-1/3 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
          
          {/* Список уроков */}
          <div className="card p-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-1/4 bg-gray-200 rounded" />
                  </div>
                  <div className="w-20 h-8 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Боковая панель */}
        <div className="lg:col-span-1">
          <div className="card p-6 space-y-4">
            <div className="h-6 w-32 bg-gray-200 rounded" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Скелетон для страницы урока
 */
export const LessonPageSkeleton = () => {
  return (
    <div className="page-container animate-pulse">
      {/* Навигация */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      
      {/* Заголовок урока */}
      <div className="h-8 w-2/3 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-1/4 bg-gray-200 rounded mb-8" />
      
      {/* Контент урока */}
      <div className="card p-8 mb-8">
        <div className="aspect-video bg-gray-200 rounded-lg mb-6" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/5 bg-gray-200 rounded" />
        </div>
      </div>
      
      {/* Комментарии */}
      <div className="card p-6">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-1/4 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Скелетон для списка уроков
 */
export const LessonListSkeleton = ({ count = 5 }) => {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-1/4 bg-gray-200 rounded" />
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}

/**
 * Скелетон для прогресса курса
 */
export const ProgressSkeleton = () => {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
      <div className="h-3 bg-gray-200 rounded-full mb-2" />
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export default {
  CourseLearningPageSkeleton,
  LessonPageSkeleton,
  LessonListSkeleton,
  ProgressSkeleton
}

