/**
 * Вход/регистрация по номеру телефона через SMS-код.
 * Двухшаговый поток: телефон → код из SMS → вход.
 * Стилизована под AuthModal (классы .auth-input-box / .auth-btn / .auth-error).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#522f81',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  padding: 0,
}

export default function PhoneAuthForm({ redirectPath = '/' }) {
  const navigate = useNavigate()
  const isLoading = useAuthStore((s) => s.isLoading)
  const storeError = useAuthStore((s) => s.error)
  const { requestPhoneCode, loginWithPhone, clearError } = useAuthStore()

  const [step, setStep] = useState('phone') // 'phone' | 'code'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [localError, setLocalError] = useState('')
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

  const handleRequest = async (e) => {
    e?.preventDefault()
    setLocalError('')
    clearError()
    if (phone.replace(/\D/g, '').length < 10) {
      setLocalError('Введите корректный номер телефона')
      return
    }
    setSending(true)
    try {
      await requestPhoneCode(phone)
      setStep('code')
      startCooldown()
    } catch (err) {
      setLocalError(err.message || 'Не удалось отправить код')
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async (e) => {
    e?.preventDefault()
    setLocalError('')
    clearError()
    if (code.trim().length !== 6) {
      setLocalError('Код состоит из 6 цифр')
      return
    }
    const ok = await loginWithPhone(phone, code)
    if (ok) navigate(redirectPath, { replace: true })
  }

  return (
    <div>
      {(localError || storeError) && (
        <div className="auth-error" role="alert">{localError || storeError}</div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleRequest}>
          <div className="auth-input-box">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Телефон"
              required
              disabled={sending}
              autoComplete="tel"
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
              placeholder="Код из SMS"
              required
              autoFocus
              style={{ letterSpacing: '0.4em', textAlign: 'center', fontWeight: 700 }}
            />
            <i className="bx bxs-key"></i>
          </div>
          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? 'Проверяем…' : 'Войти'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <button type="button" style={linkBtnStyle} onClick={() => { setStep('phone'); setCode('') }}>
              ← Изменить номер
            </button>
            <button
              type="button"
              style={{ ...linkBtnStyle, opacity: cooldown > 0 || sending ? 0.5 : 1 }}
              disabled={cooldown > 0 || sending}
              onClick={handleRequest}
            >
              {cooldown > 0 ? `Повторить через ${cooldown}с` : 'Отправить снова'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
