/**
 * Вход/регистрация по номеру телефона через SMS-код.
 * Двухшаговый поток: телефон → код из SMS → вход.
 * Стилизована под AuthModal (классы .auth-input-box / .auth-btn / .auth-error).
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { resolvePostAuthRedirect } from '../../utils/postAuthRedirect'
import { formatPhoneDisplay, normalizePhone, isPhoneComplete } from './phoneFormat'

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#522f81',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  padding: 0,
}

// .auth-success нет в auth.css (а его править нельзя) — стилизуем инлайн,
// зеркаля геометрию .auth-error, но в зелёной палитре успеха.
const successBoxStyle = {
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#047857',
  padding: '12px',
  borderRadius: '8px',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center',
  fontWeight: 500,
  width: '100%',
}

export default function PhoneAuthForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoading = useAuthStore((s) => s.isLoading)
  const storeError = useAuthStore((s) => s.error)
  const { requestPhoneCode, loginWithPhone, clearError } = useAuthStore()

  const [step, setStep] = useState('phone') // 'phone' | 'code'
  // phone хранит ТОЛЬКО отображаемую маску «+7 (XXX) XXX-XX-XX».
  // На бэкенд уходит normalizePhone(phone) → «+7XXXXXXXXXX».
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [localSuccess, setLocalSuccess] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)

  const startCooldown = () => {
    setCooldown(60)
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const handlePhoneChange = (e) => {
    setLocalError('')
    setLocalSuccess('')
    setPhone(formatPhoneDisplay(e.target.value))
  }

  const handleRequest = async (e, { isResend = false } = {}) => {
    e?.preventDefault()
    setLocalError('')
    setLocalSuccess('')
    clearError()
    if (!isPhoneComplete(phone)) {
      setLocalError('Введите корректный номер телефона')
      return
    }
    setSending(true)
    try {
      await requestPhoneCode(normalizePhone(phone))
      setStep('code')
      startCooldown()
      if (isResend) setLocalSuccess('Код отправлен повторно')
    } catch (err) {
      setLocalError(err.message || 'Не удалось отправить код')
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async (e) => {
    e?.preventDefault()
    setLocalError('')
    setLocalSuccess('')
    clearError()
    if (code.trim().length !== 6) {
      setLocalError('Код состоит из 6 цифр')
      return
    }
    const ok = await loginWithPhone(normalizePhone(phone), code)
    if (ok) {
      // Резолвим по свежему user из стора — ролевой дефолт (специалист/маркетолог/
      // админ → своя панель), funnel-aware, с anti-open-redirect.
      const target = resolvePostAuthRedirect({ location, user: useAuthStore.getState().user })
      navigate(target, { replace: true })
    }
  }

  const displayError = localError || storeError
  const resendDisabled = cooldown > 0 || sending
  const resendLabel = cooldown > 0 ? `Отправить заново через ${cooldown}с` : 'Отправить код заново'

  return (
    <div>
      {displayError && (
        <div className="auth-error" role="alert">{displayError}</div>
      )}
      {localSuccess && !displayError && (
        <div style={successBoxStyle} role="status">{localSuccess}</div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleRequest}>
          <div className="auth-input-box">
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+7 (___) ___-__-__"
              required
              disabled={sending}
              autoComplete="tel"
              inputMode="tel"
              autoFocus
            />
            <i className="bx bxs-phone"></i>
          </div>
          <button type="submit" className="auth-btn" disabled={sending || isLoading}>
            {sending ? 'Отправляем…' : 'Получить код'}
          </button>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#7c6f93' }}>
            Пришлём код подтверждения в SMS
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <div className="auth-input-box">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Код"
              required
              autoFocus
              // Широкий letter-spacing применяем ТОЛЬКО к введённым цифрам:
              // на длинном плейсхолдере он растягивал текст за пределы поля и обрезал его.
              style={{ letterSpacing: code ? '0.4em' : 'normal', textAlign: 'center', fontWeight: 700, textOverflow: 'ellipsis' }}
            />
            <i className="bx bxs-key"></i>
          </div>
          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? 'Проверяем…' : 'Войти'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <button type="button" style={linkBtnStyle} onClick={() => { setStep('phone'); setCode(''); setLocalError(''); setLocalSuccess('') }}>
              ← Изменить номер
            </button>
            <button
              type="button"
              style={{ ...linkBtnStyle, opacity: resendDisabled ? 0.5 : 1 }}
              disabled={resendDisabled}
              onClick={(e) => handleRequest(e, { isResend: true })}
            >
              {resendLabel}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
