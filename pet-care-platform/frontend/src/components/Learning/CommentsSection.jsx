import React, { useState, useEffect } from 'react'
import { Button } from '../ui'
import { Card } from '../ui'
import { Textarea } from '../ui'
import {
  getLessonComments, addLessonComment, likeComment, dislikeComment, removeCommentReaction,
  updateComment, deleteComment, addCommentReaction
} from '../../api/comments'
import {
  getCourseComments, addCourseComment
} from '../../api/courses'
import { useAuthStore } from '../../store/authStore'

/**
 * Универсальный компонент комментариев
 *
 * Поддерживает комментарии к курсам и урокам.
 * Показывает комментарии, позволяет добавлять, редактировать и удалять,
 * поддерживает лайки/дизлайки и древовидную структуру.
 */
const CommentsSection = ({
  courseId,
  lessonId,
  className = ''
}) => {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [editText, setEditText] = useState('')
  const [pagination, setPagination] = useState(null)

  // Загрузка комментариев
  useEffect(() => {
    if (courseId || lessonId) {
      loadComments()
    }
  }, [courseId, lessonId])

  const loadComments = async (page = 1) => {
    try {
      setLoading(true)
      let response

      if (courseId) {
        response = await getCourseComments(courseId, { page, per_page: 20 })
      } else if (lessonId) {
        response = await getLessonComments(lessonId)
      }

      if (response) {
        // API клиент возвращает response.data напрямую
        setComments(response.comments || response)
        setPagination(response.pagination)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  // Добавление комментария
  const handleSubmitComment = async (e) => {
    e.preventDefault()

    const content = replyTo ? replyText.trim() : newComment.trim()
    if (!content) return

    try {
      setSubmitting(true)
      let response

      if (courseId) {
        response = await addCourseComment(courseId, content, replyTo?.id)
      } else if (lessonId) {
        response = await addLessonComment(lessonId, content, replyTo?.id)
      }

      // Очистка формы
      if (replyTo) {
        setReplyText('')
        setReplyTo(null)
      } else {
        setNewComment('')
      }

      // Перезагрузка комментариев
      loadComments()
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Редактирование комментария
  const handleEditComment = async (commentId, newContent) => {
    try {
      await updateComment(commentId, newContent)
      setComments(prev => prev.map(comment =>
        comment.id === commentId
          ? { ...comment, content: newContent, updated_at: new Date().toISOString() }
          : comment
      ))
      setEditingComment(null)
      setEditText('')
    } catch (error) {
      console.error('Error editing comment:', error)
    }
  }

  // Удаление комментария
  const handleDeleteComment = async (commentId) => {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) return

    try {
      await deleteComment(commentId)
      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  // Обновленная реакция на комментарий
  const handleReaction = async (commentId, action) => {
    try {
      const response = await addCommentReaction(commentId, action)

      // Обновляем локальное состояние
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          // API клиент возвращает response.data напрямую
          const newReaction = response.action
          const wasLike = comment.user_reaction === 'like'
          const wasDislike = comment.user_reaction === 'dislike'

          let newLikes = comment.likes_count
          let newDislikes = comment.dislikes_count

          // Убираем предыдущую реакцию
          if (wasLike) newLikes--
          if (wasDislike) newDislikes--

          // Добавляем новую реакцию
          if (newReaction === 'like') newLikes++
          if (newReaction === 'dislike') newDislikes++

          return {
            ...comment,
            likes_count: newLikes,
            dislikes_count: newDislikes,
            user_reaction: newReaction === comment.user_reaction ? null : newReaction
          }
        }
        return comment
      }))
    } catch (error) {
      console.error('Error handling reaction:', error)
    }
  }

  // Удаление реакции
  const handleRemoveReaction = async (commentId) => {
    try {
      await removeCommentReaction(commentId)
      loadComments()
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Обсуждение урока
        </h3>
        <span className="text-sm text-gray-500">
          {comments.length} комментариев
        </span>
      </div>

      {/* Форма добавления комментария */}
      <Card className="p-4">
        <form onSubmit={handleSubmitComment}>
          <div className="space-y-3">
            {replyTo && (
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                <span className="text-sm text-blue-700">
                  Ответ на комментарий {replyTo.user.username}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyTo(null)
                    setReplyText('')
                  }}
                >
                  ✕
                </Button>
              </div>
            )}

            <textarea
              value={replyTo ? replyText : newComment}
              onChange={(e) => replyTo ? setReplyText(e.target.value) : setNewComment(e.target.value)}
              placeholder={replyTo ? "Напишите ответ..." : "Поделитесь своими мыслями об уроке..."}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={replyTo ? 3 : 4}
              disabled={submitting}
            />

            <div className="flex justify-end space-x-2">
              {replyTo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyTo(null)
                    setReplyText('')
                  }}
                  disabled={submitting}
                >
                  Отмена
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !(replyTo ? replyText.trim() : newComment.trim())}
              >
                {submitting ? 'Отправка...' : (replyTo ? 'Ответить' : 'Комментировать')}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Список комментариев */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Пока нет комментариев.</p>
            <p className="text-sm">Будьте первым, кто поделится мнением!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={setReplyTo}
              onReaction={handleReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Компонент отдельного комментария
 */
const CommentItem = ({ comment, onReply, onReaction, onRemoveReaction }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="p-4">
      <div className="flex space-x-3">
        {/* Аватар пользователя */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {comment.user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Содержимое комментария */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">
              {comment.user.username}
            </span>
            <span className="text-sm text-gray-500">
              {formatDate(comment.created_at)}
            </span>
          </div>

          <p className="text-gray-700 mb-3 whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Вложения */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {comment.attachments.map((attachment, index) => (
                <div key={index} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                  📎 Вложение {index + 1}
                </div>
              ))}
            </div>
          )}

          {/* Действия с комментарием */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Кнопки реакций */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onReaction(comment.id, true)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                    comment.user_like?.is_liked === true
                      ? 'bg-green-100 text-green-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  disabled={comment.user_like?.is_liked === true}
                >
                  <span>👍</span>
                  <span>{comment.likes_count}</span>
                </button>

                <button
                  onClick={() => onReaction(comment.id, false)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                    comment.user_like?.is_liked === false
                      ? 'bg-red-100 text-red-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  disabled={comment.user_like?.is_liked === false}
                >
                  <span>👎</span>
                  <span>{comment.dislikes_count}</span>
                </button>

                {comment.user_like && (
                  <button
                    onClick={() => onRemoveReaction(comment.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-2"
                  >
                    Убрать
                  </button>
                )}
              </div>

              {/* Кнопка ответа */}
              <button
                onClick={() => onReply(comment)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Ответить
              </button>
            </div>

            {/* Количество ответов */}
            {comment.replies_count > 0 && (
              <span className="text-sm text-gray-500">
                {comment.replies_count} ответов
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default CommentsSection
