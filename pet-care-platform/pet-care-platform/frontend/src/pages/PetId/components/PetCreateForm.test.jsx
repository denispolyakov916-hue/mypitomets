import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// --- Моки API: единственная граница ввода/вывода компонента. ---
// validateWeightInput / toLocalISODate НЕ мокаем — проверяем реальную логику парсинга и дат.
vi.mock('../../../api/pets', () => ({
  createPet: vi.fn(),
  updatePet: vi.fn(),
  getBreeds: vi.fn(),
}))

// react-datepicker тяжёл и завязан на portal/ввод даты — заменяем простым контролом.
// Кнопка set-dob вызывает onChange(локальная Date) = 15 мая 2020, что позволяет
// детерминированно проверить, что date_of_birth уходит как локальная YYYY-MM-DD.
vi.mock('react-datepicker', () => ({
  default: ({ selected, onChange }) => (
    <div>
      <input data-testid="dob-input" readOnly value={selected ? selected.toString() : ''} />
      <button type="button" data-testid="dob-set" onClick={() => onChange(new Date(2020, 4, 15, 0, 0))}>
        set-dob
      </button>
    </div>
  ),
}))

// framer-motion: рендерим как обычные div, без анимаций.
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    { get: () => ({ children, ...props }) => <div {...props}>{children}</div> }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

import PetCreateForm from './PetCreateForm'
import { createPet, updatePet, getBreeds } from '../../../api/pets'

// Породы, которые мок getBreeds отдаёт как «популярные» — они рисуются чипами под полем
// поиска (без открытия выпадающего списка), что делает выбор детерминированным.
const POPULAR_DOG_BREEDS = [
  { id: 10, name: 'Лабрадор', weight_min: 25, weight_max: 36 },
  { id: 11, name: 'Немецкая овчарка', weight_min: 22, weight_max: 40 },
]

function renderForm(props = {}) {
  return render(
    <MemoryRouter>
      <PetCreateForm onClose={vi.fn()} {...props} />
    </MemoryRouter>
  )
}

// Имя/вид/пол/кастрация. Породу и вес задают тесты отдельно.
// Используем fireEvent, а не userEvent.type: контролируемые поля + эффект автофокуса
// в userEvent v14 теряют символы после первого — fireEvent.change ставит значение целиком
// и при этом прогоняет тот же onChange-обработчик компонента.
async function fillNameSpeciesSexNeutered() {
  fireEvent.change(screen.getByPlaceholderText('Как зовут вашего питомца?'), {
    target: { value: 'Барсик' },
  })
  fireEvent.click(screen.getByRole('button', { name: /Собака/ }))
  fireEvent.click(screen.getByRole('button', { name: /Мальчик/ }))
  // Доступное имя кнопки кастрации — "✓Да" (символ идёт первым), поэтому матчим конец строки.
  fireEvent.click(screen.getByRole('button', { name: /Да$/ }))
  // Дожидаемся загрузки популярных пород (после выбора вида), чтобы чипы пород отрисовались.
  await screen.findByPlaceholderText('Поиск породы...')
}

// Выбор обычной породы кликом по чипу под полем поиска.
async function pickBreedChip(name) {
  const chip = await screen.findByRole('button', { name })
  fireEvent.click(chip)
}

function setApproximateYears(value) {
  // Роль combobox есть и у поиска породы; берём именно <select> по опции "Годы".
  const selects = screen.getAllByRole('combobox')
  const yearsEl = selects.find((el) => within(el).queryByText('Годы'))
  fireEvent.change(yearsEl, { target: { value } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /Добавить питомца/ }))
}

describe('PetCreateForm — отправка профиля питомца', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBreeds.mockResolvedValue({ breeds: POPULAR_DOG_BREEDS })
    createPet.mockResolvedValue({ data: { data: { id: 777 } } })
    updatePet.mockResolvedValue({ data: { data: { id: 777 } } })
  })

  it("вес с запятой ('5,5') попадает в payload как weight_kg === 5.5", async () => {
    renderForm()
    await fillNameSpeciesSexNeutered()
    await pickBreedChip('Лабрадор')

    const weightInput = screen.getByPlaceholderText('От 0.3 до 100 кг')
    fireEvent.change(weightInput, { target: { value: '5,5' } })
    expect(weightInput).toHaveValue('5,5')

    setApproximateYears('2')
    submit()

    await waitFor(() => expect(createPet).toHaveBeenCalledTimes(1))
    const payload = createPet.mock.calls[0][0]
    expect(payload.weight_kg).toBe(5.5)
  })

  it("выбор 'Дворняга / Метис' → is_mixed_breed:true и breed_id:null", async () => {
    renderForm()
    await fillNameSpeciesSexNeutered()
    await pickBreedChip('Дворняга / Метис')

    fireEvent.change(screen.getByPlaceholderText('От 0.3 до 100 кг'), {
      target: { value: '5.5' },
    })
    setApproximateYears('3')
    submit()

    await waitFor(() => expect(createPet).toHaveBeenCalledTimes(1))
    const payload = createPet.mock.calls[0][0]
    expect(payload.is_mixed_breed).toBe(true)
    expect(payload.breed_id).toBeNull()
  })

  it('ошибки backend по полям рендерятся под соответствующими полями (не только баннер)', async () => {
    // Интерцептор отдаёт { status, message, errors: { поле: [сообщения] } }.
    createPet.mockRejectedValue({
      status: 400,
      message: 'Ошибка',
      errors: {
        name: ['Кличка обязательна'],
        weight_kg: ['Некорректный вес'],
      },
    })

    renderForm()
    await fillNameSpeciesSexNeutered()
    await pickBreedChip('Лабрадор')
    fireEvent.change(screen.getByPlaceholderText('От 0.3 до 100 кг'), {
      target: { value: '5.5' },
    })
    setApproximateYears('2')
    submit()

    await waitFor(() => expect(createPet).toHaveBeenCalledTimes(1))
    // Пер-полевые сообщения backend должны появиться в DOM (name → под именем, weight_kg → под весом).
    expect(await screen.findByText('Кличка обязательна')).toBeInTheDocument()
    expect(await screen.findByText('Некорректный вес')).toBeInTheDocument()
  })

  it('date_of_birth отправляется как локальная YYYY-MM-DD (без off-by-one)', async () => {
    renderForm()
    await fillNameSpeciesSexNeutered()
    await pickBreedChip('Лабрадор')
    fireEvent.change(screen.getByPlaceholderText('От 0.3 до 100 кг'), {
      target: { value: '6' },
    })

    // Переключаемся на точную дату рождения и задаём 15 мая 2020 (локальная Date).
    fireEvent.click(screen.getByLabelText('Точная дата рождения'))
    fireEvent.click(screen.getByTestId('dob-set'))

    submit()

    await waitFor(() => expect(createPet).toHaveBeenCalledTimes(1))
    const payload = createPet.mock.calls[0][0]
    // new Date(2020, 4, 15) локально → '2020-05-15'. При наивном toISOString() в зонах +03
    // получили бы '2020-05-14' (off-by-one) — этого быть не должно.
    expect(payload.date_of_birth).toBe('2020-05-15')
  })
})
