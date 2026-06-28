/**
 * Виджет «Чат с Пуфом» — помощник в правом нижнем углу.
 * Показывается на всех страницах (кроме админки).
 * Дизайн и поведение соответствуют виджету с лендинга.
 */

import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'

// Видео маскота с лендинга (то же, что в виджете на главной)
const PUFF_VIDEO_SRC = '/landing/puf-krug-obrez-new.MP4'
const PUFF_IMAGE_FALLBACK = '/purple-monster.png'

const GREETING = 'Привет! Я Пуф, твой помощник. Чем могу помочь?'
const REPLY_PLACEHOLDER = 'Получил! Постараюсь ответить скоро. Если срочно — напишите в поддержку на сайте.'

/**
 * @param {{ stackGuestStrip?: boolean }} props — если true, кнопка на одной вертикали с полоской «Начать бесплатно» (над таблеткой)
 */
export default function PuffSupportWidget({ stackGuestStrip = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([{ text: GREETING, isUser: false }])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)
  const videoRef = useRef(null)
  const [useVideo, setUseVideo] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isOpen) {
      video.play().catch(() => {})
    }
  }, [isOpen])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stackGuestStrip) return
    video.play().catch(() => {})
  }, [stackGuestStrip])

  const sendMessage = () => {
    const text = inputValue.trim()
    if (!text) return
    setMessages(prev => [...prev, { text, isUser: true }])
    setInputValue('')
    setTimeout(() => {
      setMessages(prev => [...prev, { text: REPLY_PLACEHOLDER, isUser: false }])
    }, 600)
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
            <div
              key={i}
              className={`flex-shrink-0 rounded-2xl px-3 py-2 text-sm leading-snug ${
                msg.isUser
                  ? 'ml-auto max-w-[85%] rounded-br-md bg-primary-900/10 text-gray-800'
                  : 'w-full rounded-bl-md bg-[#522f81] text-[#F5F5F5] shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

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
              className="min-w-0 flex-1 border-0 bg-transparent py-1.5 pr-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400"
              aria-label="Введите сообщение"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-900/25 text-primary-900 transition-all hover:scale-105 hover:bg-primary-900/40"
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
        className={`shrink-0 rounded-full border-0 p-0 transition-transform hover:scale-105 active:scale-95 ${
          stackGuestStrip
            ? 'guest-puff-active'
            : 'puff-support-trigger relative h-[72px] w-[72px] overflow-hidden sm:h-[88px] sm:w-[88px] shadow-lg'
        }`}
        style={
          stackGuestStrip
            ? undefined
            : {
                background: '#f3e9c6',
                boxShadow: '0 6px 24px rgba(82, 47, 129, 0.35)',
              }
        }
        title="Чат с Пуфом"
        aria-label="Открыть чат с Пуфом"
      >
        {stackGuestStrip ? (
          <span className="guest-puff-active__inner">
            {useVideo ? (
              <video
                ref={videoRef}
                src={PUFF_VIDEO_SRC}
                muted
                loop
                playsInline
                preload="auto"
                className="guest-puff-active__video"
                aria-hidden
                onError={() => setUseVideo(false)}
              />
            ) : (
              <img
                src={PUFF_IMAGE_FALLBACK}
                alt=""
                className="guest-puff-active__video object-cover"
                aria-hidden
              />
            )}
          </span>
        ) : (
          <span className="absolute inset-0 overflow-hidden rounded-full">
            {useVideo ? (
              <video
                src={PUFF_VIDEO_SRC}
                muted
                loop
                autoPlay
                playsInline
                preload="auto"
                className="h-full w-full scale-[0.85] object-contain"
                aria-hidden
                onError={() => setUseVideo(false)}
              />
            ) : (
              <img src={PUFF_IMAGE_FALLBACK} alt="" className="h-full w-full scale-[0.85] object-contain" aria-hidden />
            )}
          </span>
        )}
      </button>
    </div>
  )
}
