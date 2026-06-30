/**
 * Виджет «Чат с Пуфом» — помощник в правом нижнем углу.
 * Показывается на всех страницах (кроме админки).
 * Дизайн и поведение соответствуют виджету с лендинга.
 *
 * Подключён к бэкенду POST /api/assistant/chat/ (через src/api/chat.js):
 * - требует авторизации (гостю предлагаем войти);
 * - для вопросов о здоровье/питании передаёт id выбранного питомца;
 * - показывает дисклеймер ответа и индикатор набора.
 */

import { useState, useRef, useEffect } from 'react'
import { X, Send, ThumbsUp, ThumbsDown } from 'lucide-react'
import { PuffLottie } from './brand'
import { useAuthStore } from '../store/authStore'
import { getPets } from '../api/pets'
import { sendChatMessage, sendChatFeedback } from '../api/chat'

const GREETING = 'Привет! Я Пуф, твой помощник. Чем могу помочь?'
const LOGIN_PROMPT = 'Чтобы я мог помочь, войдите в аккаунт 🙂'
const ERROR_REPLY = 'Не получилось ответить. Попробуйте ещё раз или напишите в поддержку на сайте.'

/**
 * @param {{ stackGuestStrip?: boolean }} props — если true, кнопка на одной вертикали с полоской «Начать бесплатно» (над таблеткой)
 */
export default function PuffSupportWidget({ stackGuestStrip = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([{ text: GREETING, isUser: false }])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [pets, setPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isSending])

  // Питомцев грузим лениво — только при первом открытии чата для авторизованного
  // пользователя (без лишнего запроса на каждой странице).
  useEffect(() => {
    if (!isOpen || !isAuthenticated || pets.length) return undefined
    let cancelled = false
    getPets()
      .then((r) => { if (!cancelled) setPets(r?.pets || []) })
      .catch(() => { /* список питомцев необязателен для работы поддержки */ })
    return () => { cancelled = true }
  }, [isOpen, isAuthenticated, pets.length])

  // Один питомец — выбираем автоматически; иначе ждём явного выбора в селекторе.
  const effectivePetId = selectedPetId || (pets.length === 1 ? pets[0].id : null)

  const sendMessage = async () => {
    const text = inputValue.trim()
    if (!text || isSending) return

    if (!isAuthenticated) {
      setMessages((prev) => [...prev, { text, isUser: true }, { text: LOGIN_PROMPT, isUser: false }])
      setInputValue('')
      return
    }

    setMessages((prev) => [...prev, { text, isUser: true }])
    setInputValue('')
    setIsSending(true)
    try {
      const data = await sendChatMessage({ message: text, petId: effectivePetId })
      setMessages((prev) => [...prev, {
        text: data?.reply || 'Готово.',
        isUser: false,
        disclaimer: data?.disclaimer || null,
        // для оценки 👍/👎: сохраняем вопрос и тему ответа
        query: text,
        capability: data?.capability || null,
      }])
    } catch (err) {
      const msg = err?.isAuthRequired ? LOGIN_PROMPT : ERROR_REPLY
      setMessages((prev) => [...prev, { text: msg, isUser: false }])
    } finally {
      setIsSending(false)
    }
  }

  const handleFeedback = (index, rating) => {
    const msg = messages[index]
    if (!msg || msg.rated) return
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, rated: rating } : m)))
    // оценку отправляем «тихо»: ошибка отправки не должна мешать пользователю
    sendChatFeedback({
      rating,
      message: msg.query || '',
      reply: msg.text || '',
      capability: msg.capability || null,
    }).catch(() => {})
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  const mobileBottomClass = stackGuestStrip
    ? 'bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px)+5.75rem+0.5rem)]'
    : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px)+5.5rem+0.25rem)]'

  const rootZ = stackGuestStrip ? 'z-[50065]' : 'z-[10040]'

  return (
    <div
      className={`fixed ${rootZ} flex flex-col items-end gap-0 right-5 md:bottom-5 md:right-5 ${mobileBottomClass}`}
      style={{ right: 'max(20px, env(safe-area-inset-right))' }}
      aria-label="Чат с Пуфом"
    >
      {/* Окно чата */}
      <div
        role="dialog"
        aria-label="Чат с Пуфом"
        aria-hidden={!isOpen}
        className={`
          flex flex-col overflow-visible rounded-[48px] border border-primary-900/20 shadow-xl
          transition-all duration-250 ease-out
          ${isOpen ? 'visible scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}
          absolute bottom-[88px] left-3 right-3 w-auto max-h-[50vh] min-h-[175px]
          sm:bottom-0 sm:left-auto sm:right-full sm:mr-4 sm:min-h-0 sm:max-h-none sm:w-[380px]
        `}
        style={{
          height: '175px',
          background: 'linear-gradient(165deg, #faf6fc 0%, #f5f0fa 35%, #fff8f5 70%, #fff 100%)',
          boxShadow: '0 8px 16px rgba(82, 47, 129, 0.08), 0 24px 48px rgba(82, 47, 129, 0.15), 0 48px 96px rgba(82, 47, 129, 0.12), 0 0 0 1px rgba(82, 47, 129, 0.1), 0 0 40px -8px rgba(82, 47, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute left-6 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-gray-500 transition-colors hover:bg-black/10 hover:text-gray-700"
          title="Скрыть"
          aria-label="Скрыть чат"
        >
          <X className="h-3 w-3" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-6 pt-9 pb-2">
          {messages.map((msg, i) => (
            <div key={i} className="flex flex-shrink-0 flex-col gap-0.5">
              <div
                className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                  msg.isUser
                    ? 'ml-auto max-w-[85%] rounded-br-md bg-primary-900/10 text-gray-800'
                    : 'w-full rounded-bl-md bg-[#522f81] text-[#F5F5F5] shadow-sm'
                }`}
              >
                {msg.text}
              </div>
              {msg.disclaimer && (
                <div className="px-1 text-[11px] italic leading-tight text-gray-500">
                  {msg.disclaimer}
                </div>
              )}
              {!msg.isUser && msg.query && (
                msg.rated ? (
                  <div className="px-1 text-[11px] text-gray-400">Спасибо за оценку!</div>
                ) : (
                  <div className="flex items-center gap-2 px-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleFeedback(i, 'up')}
                      className="text-gray-400 transition-colors hover:text-[#522f81]"
                      title="Полезно"
                      aria-label="Полезный ответ"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(i, 'down')}
                      className="text-gray-400 transition-colors hover:text-[#522f81]"
                      title="Не помогло"
                      aria-label="Бесполезный ответ"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
          {isSending && (
            <div className="flex-shrink-0 w-full animate-pulse rounded-2xl rounded-bl-md bg-[#522f81] px-3 py-2 text-sm text-[#F5F5F5]/80 shadow-sm">
              Пуф печатает…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Выбор питомца — только если их несколько (для вопросов о здоровье/питании) */}
        {isAuthenticated && pets.length > 1 && (
          <div className="flex shrink-0 gap-1 overflow-x-auto px-6 pb-1">
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPetId(p.id)}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                  effectivePetId === p.id
                    ? 'bg-[#522f81] text-white'
                    : 'bg-black/5 text-gray-600 hover:bg-black/10'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex shrink-0 px-6 pb-5 pt-0">
          <div className="flex min-h-[34px] w-full items-center gap-0 rounded-full border border-black/10 bg-[#f8f8f8] py-1 pl-3 pr-1.5 focus-within:border-primary-900/30 focus-within:bg-white">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              maxLength={500}
              autoComplete="off"
              disabled={isSending}
              className="min-w-0 flex-1 border-0 bg-transparent py-1.5 pr-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60"
              aria-label="Введите сообщение"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isSending}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-900/25 text-primary-900 transition-all hover:scale-105 hover:bg-primary-900/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              aria-label="Отправить"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="puff-support-trigger relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-0 p-0 shadow-lg transition-transform hover:scale-105 active:scale-95 sm:h-[88px] sm:w-[88px]"
        style={{
          background: '#f3e9c6',
          boxShadow: '0 6px 24px rgba(82, 47, 129, 0.35)',
        }}
        title="Чат с Пуфом"
        aria-label="Открыть чат с Пуфом"
      >
        <span className="flex h-full w-full items-center justify-center">
          <PuffLottie name="bored_yawn" loop size={60} alt="Пуфыч спит" />
        </span>
      </button>
    </div>
  )
}
