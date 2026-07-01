/**
 * Виджет «Чат с Пуфом» — помощник в правом нижнем углу.
 * Показывается на всех страницах (кроме админки).
 *
 * Подключён к бэкенду POST /api/assistant/chat/ (через src/api/chat.js):
 * - требует авторизации (гостю предлагаем войти);
 * - для вопросов о здоровье/питании передаёт id выбранного питомца;
 * - показывает дисклеймер ответа и индикатор набора.
 *
 * Маскот Пуф анимируется по сценарию (см. PUFF_SCENE): дремлет в покое,
 * машет при открытии, думает во время ответа, говорит после ответа и радуется
 * лайку. Анимации — из базы public/lottie/puff (реестр brand/puffAnimations.js).
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

// Короткие реплики Пуфа в интро — показываются по одной, сменяя друг друга.
const INTRO_BUBBLES = [
  'Привет! Я Пуф. Я твой помощник!',
  'Помогу с питанием, уходом, дрессировкой и здоровьем',
  'Спроси меня о чём угодно 🐾',
]
const INTRO_ROTATE_MS = 3200

// Быстрые вопросы — по клику подставляются в поле ввода.
const QUICK_QUESTIONS = ['Чем кормить?', 'Как ухаживать?', 'С чего начать дрессировку?']

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Крутить интро-реплики стоит только пока чат открыт, диалог ещё не начат и
// не включён reduced-motion (там показываем одну строку без ротации).
function shouldRotateIntro({ isOpen, introActive, reducedMotion }) {
  return isOpen && introActive && !reducedMotion && INTRO_BUBBLES.length > 1
}

// Сценарий маскота: состояние чата → анимация (имена из base public/lottie/puff).
const PUFF_SCENE = {
  idle:      { name: 'bored_yawn',      loop: true },   // чат закрыт — дремлет
  greet:     { name: 'hello_wave',      loop: false },  // только открыли — машет
  listen:    { name: 'stay',            loop: true },   // открыт, ждёт вопрос
  think:     { name: 'think',           loop: true },   // «печатает» ответ
  talk:      { name: 'talk_gesture',    loop: false },  // выдал ответ
  celebrate: { name: 'celebrate_jump2', loop: false },  // лайк ответа
}
const PUFF_ONE_SHOT = new Set(['greet', 'talk', 'celebrate'])

/**
 * Интро над полем ввода: короткая реплика Пуфа (сменяется по таймеру, с мягким
 * проявлением; при reduced-motion — одна ёмкая строка) и быстрые вопросы-чипсы.
 */
function PuffIntro({ index, reducedMotion, onQuickQuestion }) {
  const line = reducedMotion ? INTRO_BUBBLES[1] : INTRO_BUBBLES[index]
  return (
    <div className="flex flex-shrink-0 flex-col gap-2">
      <div
        key={reducedMotion ? 'intro-static' : index}
        className={`w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-[#522f81] px-3 py-2 text-sm leading-snug text-[#F5F5F5] shadow-sm ${
          reducedMotion ? '' : 'animate-slideUp'
        }`}
        aria-live="polite"
      >
        {line}
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onQuickQuestion(q)}
            className="rounded-full border border-primary-900/20 bg-white/70 px-2.5 py-1 text-xs text-[#522f81] transition-colors hover:border-primary-900/40 hover:bg-white"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

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
  const [puff, setPuff] = useState('idle')
  const [introIndex, setIntroIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion())
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Интро (короткие реплики + чипсы) показываем, пока диалог не начался.
  const introActive = messages.length <= 1 && !isSending

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isSending])

  // Маскот: машет при открытии, дремлет при закрытии.
  useEffect(() => {
    setPuff(isOpen ? 'greet' : 'idle')
  }, [isOpen])

  // Следим за prefers-reduced-motion — при включённом не крутим интро-реплики.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReducedMotion(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  // Интро-реплики Пуфа сменяются по таймеру; при reduced-motion крутить не будем
  // (в рендере показываем одну ёмкую строку вместо ротации).
  const canRotateIntro = shouldRotateIntro({ isOpen, introActive, reducedMotion })
  useEffect(() => {
    setIntroIndex(0)
    if (!canRotateIntro) return undefined
    const timer = setInterval(() => {
      setIntroIndex((i) => (i + 1) % INTRO_BUBBLES.length)
    }, INTRO_ROTATE_MS)
    return () => clearInterval(timer)
  }, [canRotateIntro])

  // После одноразовой анимации (или если onComplete не пришёл — напр. reduced-motion)
  // вернуться в покой по текущему контексту.
  const restPuff = () => setPuff(isSending ? 'think' : isOpen ? 'listen' : 'idle')
  useEffect(() => {
    if (!PUFF_ONE_SHOT.has(puff)) return undefined
    const t = setTimeout(restPuff, 2800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puff, isSending, isOpen])

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
      setPuff('talk')
      return
    }

    setMessages((prev) => [...prev, { text, isUser: true }])
    setInputValue('')
    setIsSending(true)
    setPuff('think')
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
      setPuff('talk')
    } catch (err) {
      const msg = err?.isAuthRequired ? LOGIN_PROMPT : ERROR_REPLY
      setMessages((prev) => [...prev, { text: msg, isUser: false }])
      setPuff('listen')
    } finally {
      setIsSending(false)
    }
  }

  const handleFeedback = (index, rating) => {
    const msg = messages[index]
    if (!msg || msg.rated) return
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, rated: rating } : m)))
    if (rating === 'up') setPuff('celebrate')
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

  // Быстрый вопрос: подставляем текст в поле ввода и фокусируем его (не отправляем).
  const handleQuickQuestion = (text) => {
    setInputValue(text)
    inputRef.current?.focus()
  }

  const mobileBottomClass = stackGuestStrip
    ? 'bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px)+5.75rem+0.5rem)]'
    : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px)+5.5rem+0.25rem)]'

  const rootZ = stackGuestStrip ? 'z-[50065]' : 'z-[10040]'
  const puffScene = PUFF_SCENE[puff] || PUFF_SCENE.idle

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
          flex flex-col overflow-visible rounded-[40px] border border-primary-900/20 shadow-xl
          transition-all duration-250 ease-out
          ${isOpen ? 'visible scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}
          absolute bottom-[88px] left-3 right-3 w-auto max-h-[68vh] min-h-[300px]
          sm:bottom-0 sm:left-auto sm:right-full sm:mr-4 sm:min-h-0 sm:max-h-none sm:w-[400px]
        `}
        style={{
          height: '380px',
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
          {introActive ? (
            <PuffIntro
              index={introIndex}
              reducedMotion={reducedMotion}
              onQuickQuestion={handleQuickQuestion}
            />
          ) : messages.map((msg, i) => (
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
              ref={inputRef}
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
        className="puff-support-trigger relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-full border-0 p-0 shadow-lg transition-transform hover:scale-105 active:scale-95 sm:h-[112px] sm:w-[112px]"
        style={{
          background: '#f3e9c6',
          boxShadow: '0 6px 24px rgba(82, 47, 129, 0.35)',
        }}
        title="Чат с Пуфом"
        aria-label="Открыть чат с Пуфом"
      >
        <span className="flex h-full w-full items-center justify-center">
          <PuffLottie
            name={puffScene.name}
            loop={puffScene.loop}
            size={96}
            onComplete={() => { if (PUFF_ONE_SHOT.has(puff)) restPuff() }}
            alt="Пуфыч"
          />
        </span>
      </button>
    </div>
  )
}
