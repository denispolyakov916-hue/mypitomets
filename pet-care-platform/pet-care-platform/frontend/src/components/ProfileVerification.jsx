/**
 * Блок «Контактные данные» в профиле.
 *
 * Регистрация на сервисе — свободная. Здесь пользователь по желанию
 * подтверждает почту и телефон кодом:
 *  - email: код приходит письмом → вводим в поле → emailVerified.
 *  - телефон: код приходит по SMS → вводим → phoneVerified.
 */

import { useState } from 'react'
import { Mail, Phone, ShieldCheck, Loader2 } from 'lucide-react'
import {
  requestEmailVerifyCode,
  confirmEmailVerify,
  requestPhoneVerifyCode,
  confirmPhoneVerify,
} from '../api/auth'

/** Зелёный бейдж «Подтверждён». */
function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 whitespace-nowrap">
      <ShieldCheck className="w-3.5 h-3.5" />
      Подтверждён
    </span>
  )
}

/** Поле ввода 6-значного кода. */
function CodeInput({ value, onChange, onSubmit, disabled }) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
      placeholder="Код из 6 цифр"
      className="w-36 px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none tracking-[0.3em] font-semibold text-gray-900 text-center"
    />
  )
}

function ProfileVerification({ user, onUpdated }) {
  const emailVerified = !!user?.emailVerified
  const phoneVerified = !!user?.phoneVerified

  // --- email ---
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailNote, setEmailNote] = useState('')
  const [emailErr, setEmailErr] = useState('')

  // --- телефон ---
  const [phone, setPhone] = useState(user?.phone || '')
  const [phoneSent, setPhoneSent] = useState(false)
  const [phoneCode, setPhoneCode] = useState('')
  const [phoneBusy, setPhoneBusy] = useState(false)
  const [phoneNote, setPhoneNote] = useState('')
  const [phoneErr, setPhoneErr] = useState('')

  const requestEmail = async () => {
    setEmailBusy(true); setEmailErr(''); setEmailNote('')
    try {
      const res = await requestEmailVerifyCode()
      setEmailOpen(true)
      setEmailNote(res?.message || 'Код отправлен на почту')
    } catch (e) {
      setEmailErr(e?.message || 'Не удалось отправить код')
    } finally {
      setEmailBusy(false)
    }
  }

  const confirmEmail = async () => {
    if (emailCode.length < 6) { setEmailErr('Введите код из 6 цифр'); return }
    setEmailBusy(true); setEmailErr(''); setEmailNote('')
    try {
      await confirmEmailVerify(emailCode)
      setEmailOpen(false); setEmailCode('')
      onUpdated?.()
    } catch (e) {
      setEmailErr(e?.message || 'Неверный код')
    } finally {
      setEmailBusy(false)
    }
  }

  const requestPhone = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) { setPhoneErr('Введите корректный номер'); return }
    setPhoneBusy(true); setPhoneErr(''); setPhoneNote('')
    try {
      const res = await requestPhoneVerifyCode(phone)
      setPhoneSent(true)
      setPhoneNote(res?.message || 'Код отправлен по SMS')
    } catch (e) {
      setPhoneErr(e?.message || 'Не удалось отправить код')
    } finally {
      setPhoneBusy(false)
    }
  }

  const confirmPhone = async () => {
    if (phoneCode.length < 6) { setPhoneErr('Введите код из 6 цифр'); return }
    setPhoneBusy(true); setPhoneErr(''); setPhoneNote('')
    try {
      await confirmPhoneVerify(phone, phoneCode)
      setPhoneSent(false); setPhoneCode('')
      onUpdated?.()
    } catch (e) {
      setPhoneErr(e?.message || 'Неверный код')
    } finally {
      setPhoneBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">Контактные данные</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Подтвердите почту и телефон — это нужно для важных уведомлений и восстановления доступа.
      </p>

      {/* EMAIL */}
      <div className="py-4 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Электронная почта</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email || '—'}</p>
            </div>
          </div>
          {emailVerified ? (
            <VerifiedBadge />
          ) : (
            <button
              type="button"
              onClick={emailOpen ? () => setEmailOpen(false) : requestEmail}
              disabled={emailBusy}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 py-2 px-4 rounded-full transition-colors"
            >
              {emailBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {emailOpen ? 'Скрыть' : 'Подтвердить'}
            </button>
          )}
        </div>

        {emailOpen && !emailVerified && (
          <div className="mt-3 sm:pl-[3.25rem]">
            <div className="flex items-center gap-2 flex-wrap">
              <CodeInput value={emailCode} onChange={setEmailCode} onSubmit={confirmEmail} disabled={emailBusy} />
              <button
                type="button"
                onClick={confirmEmail}
                disabled={emailBusy}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-800 bg-accent-400 hover:brightness-105 disabled:opacity-60 py-2 px-4 rounded-full transition"
              >
                {emailBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Подтвердить
              </button>
              <button
                type="button"
                onClick={requestEmail}
                disabled={emailBusy}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium px-2"
              >
                Отправить заново
              </button>
            </div>
            {emailNote && !emailErr && <p className="text-xs text-gray-500 mt-2">{emailNote}</p>}
            {emailErr && <p className="text-xs text-red-600 mt-2">{emailErr}</p>}
          </div>
        )}
      </div>

      {/* ТЕЛЕФОН */}
      <div className="py-4 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Телефон</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {phoneVerified ? (user?.phone || phone) : 'Не подтверждён'}
              </p>
            </div>
          </div>
          {phoneVerified && <VerifiedBadge />}
        </div>

        {!phoneVerified && (
          <div className="mt-3 sm:pl-[3.25rem]">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                disabled={phoneBusy || phoneSent}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 900 000-00-00"
                className="w-48 px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none text-gray-900"
              />
              {!phoneSent ? (
                <button
                  type="button"
                  onClick={requestPhone}
                  disabled={phoneBusy}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 py-2 px-4 rounded-full transition-colors"
                >
                  {phoneBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Получить код
                </button>
              ) : (
                <>
                  <CodeInput value={phoneCode} onChange={setPhoneCode} onSubmit={confirmPhone} disabled={phoneBusy} />
                  <button
                    type="button"
                    onClick={confirmPhone}
                    disabled={phoneBusy}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-800 bg-accent-400 hover:brightness-105 disabled:opacity-60 py-2 px-4 rounded-full transition"
                  >
                    {phoneBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Подтвердить
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhoneSent(false); setPhoneCode(''); setPhoneErr('') }}
                    disabled={phoneBusy}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium px-2"
                  >
                    Изменить номер
                  </button>
                </>
              )}
            </div>
            {phoneNote && !phoneErr && <p className="text-xs text-gray-500 mt-2">{phoneNote}</p>}
            {phoneErr && <p className="text-xs text-red-600 mt-2">{phoneErr}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileVerification
