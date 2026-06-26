/**
 * RationResultHero — «Рацион для {имя} готов» (recipe-режим).
 *
 * Дизайн заимствован из онбординг-страницы (Funnel/RecommendationsPage), но
 * питается реальными данными выбранного питомца. Чисто презентационный, без логики
 * подбора. Показывается только в recipe-режиме при выбранном питомце.
 */
import { Sparkles } from 'lucide-react';
import { BrandBadge, PuffLottie } from '../../../components/brand';

const SPECIES_LABEL = { dog: 'Собака', cat: 'Кошка' };

function petAgeLabel(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years -= 1;
  if (years < 0) return null;
  const lastTwo = years % 100;
  const last = years % 10;
  let word = 'лет';
  if (last === 1 && lastTwo !== 11) word = 'год';
  else if ([2, 3, 4].includes(last) && ![12, 13, 14].includes(lastTwo)) word = 'года';
  return `${years} ${word}`;
}

function buildChips(pet) {
  const rows = [
    { key: 'species', label: 'Вид', value: SPECIES_LABEL[pet.species] || null },
    { key: 'breed', label: 'Порода', value: (pet.breed_name && String(pet.breed_name).trim()) || null },
    { key: 'age', label: 'Возраст', value: petAgeLabel(pet.date_of_birth) },
    { key: 'weight', label: 'Вес', value: pet.weight_kg != null ? `${pet.weight_kg} кг` : null },
    {
      key: 'status',
      label: 'Статус',
      value: pet.is_neutered === true ? 'Стерилизован' : pet.is_neutered === false ? 'Не стерилизован' : null,
    },
  ];
  return rows.filter((r) => r.value);
}

export default function RationResultHero({ pet }) {
  if (!pet) return null;
  const name = pet.name || 'питомца';
  const chips = buildChips(pet);

  return (
    <section className="mb-6 text-center" aria-label="Рацион подобран">
      <div className="flex justify-center">
        <PuffLottie name="celebrate_jump2" size={120} alt={`Пуфыч подобрал рацион для ${name}`} />
      </div>
      <BrandBadge variant="gold" className="mt-2">
        <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden /> Рацион готов
      </BrandBadge>
      <h1 className="mt-3 font-heading text-3xl font-bold text-primary-800 md:text-4xl">
        Рацион для {name} готов
      </h1>
      <p className="mx-auto mt-2 max-w-2xl text-primary-600">
        Пуфыч учёл вид, возраст, вес и особенности {name} — и собрал рацион под вашего питомца.
      </p>
      {chips.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm shadow-sm ring-1 ring-primary-100"
            >
              <span className="text-primary-400">{c.label}:</span>
              <span className="font-semibold text-primary-800">{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
