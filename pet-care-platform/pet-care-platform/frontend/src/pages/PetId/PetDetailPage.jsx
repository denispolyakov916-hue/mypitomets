import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Edit, Trash2, Share2, QrCode, AlertCircle,
  Scale, Activity, Utensils, Brain, Heart, Home, Scissors,
  ChevronRight, Info, CheckCircle, AlertTriangle, XCircle, UtensilsCrossed,
  Bell, Plus, ShoppingCart, BookOpen, GraduationCap, CalendarPlus,
  Stethoscope, Cake, Weight, ShieldCheck, Sparkles, Bone, Pill, Syringe,
  Bath, Footprints, ArrowRight, ClipboardList, PawPrint, Camera, Loader2
} from 'lucide-react';
import { getPet, deletePet, getPetBreedComparison, updatePet, updatePetPartial, getPetAllergies, BEHAVIORAL_PROBLEMS_OPTIONS } from '../../api/pets';
import { getReminders, createReminder } from '../../api/reminders';
import { getPersonalizedCourses } from '../../api/courses';
import { PageLoader } from '../../components/Loader';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToastStore } from '../../store/toastStore';
import PetProfileEditor from './components/PetProfileEditor';
import Lottie from 'lottie-react';
import api from '../../api/client';

// Цвета для статусов
const STATUS_COLORS = {
  good: 'bg-green-100 text-green-700 border-green-200',
  normal: 'bg-green-100 text-green-700 border-green-200',
  attention: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  needs_attention: 'bg-accent-100 text-accent-700 border-accent-200',
  needs_improvement: 'bg-accent-100 text-accent-700 border-accent-200',
  needs_work: 'bg-accent-100 text-accent-700 border-accent-200',
  insufficient: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  excessive: 'bg-blue-100 text-blue-700 border-blue-200',
  underweight: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  overweight: 'bg-accent-100 text-accent-700 border-accent-200',
  obese: 'bg-red-100 text-red-700 border-red-200',
  severely_underweight: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_ICONS = {
  good: CheckCircle,
  normal: CheckCircle,
  attention: AlertTriangle,
  needs_attention: AlertTriangle,
  needs_improvement: AlertTriangle,
  needs_work: AlertTriangle,
  insufficient: Info,
  excessive: Info,
  underweight: AlertTriangle,
  overweight: AlertTriangle,
  obese: XCircle,
  severely_underweight: XCircle,
  unknown: Info,
};

// Компонент карточки анализа
function AnalysisCard({ title, icon: Icon, analysis, iconColor = 'text-primary-600' }) {
  const StatusIcon = STATUS_ICONS[analysis.status] || Info;
  const statusColor = STATUS_COLORS[analysis.status] || STATUS_COLORS.unknown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-primary-50 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
          <div className="flex items-center gap-1.5">
            <StatusIcon className="w-3.5 h-3.5" />
            {analysis.status_label || analysis.status}
          </div>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{analysis.message}</p>
      
      {analysis.recommendation && (
        <p className="text-sm text-primary-600 bg-primary-50 rounded-xl p-3">
          💡 {analysis.recommendation}
        </p>
      )}
      
      {/* Дополнительные данные в зависимости от типа анализа */}
      {analysis.current_weight && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-gray-500">Текущий</div>
            <div className="font-bold text-gray-800">{analysis.current_weight} кг</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-gray-500">Идеал мин.</div>
            <div className="font-bold text-gray-800">{analysis.ideal_min} кг</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-gray-500">Идеал макс.</div>
            <div className="font-bold text-gray-800">{analysis.ideal_max} кг</div>
          </div>
        </div>
      )}
      
      {analysis.issues && analysis.issues.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {analysis.issues.map((issue, idx) => (
            <div key={idx} className="text-xs text-gray-600 flex items-start gap-2">
              <span className="text-accent-600 mt-0.5">•</span>
              {issue}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Компонент рекомендации
function RecommendationCard({ recommendation, index }) {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50/50',
    medium: 'border-l-yellow-500 bg-yellow-50/50',
    low: 'border-l-blue-500 bg-blue-50/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-white rounded-xl p-4 border-l-4 ${priorityColors[recommendation.priority] || priorityColors.low}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{recommendation.icon || '📌'}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">{recommendation.title}</h4>
          <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
          
          {recommendation.actions && recommendation.actions.length > 0 && (
            <div className="space-y-1.5">
              {recommendation.actions.map((action, idx) => (
                <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Компонент риска здоровья
function HealthRiskCard({ risk }) {
  const severityColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-accent-100 text-accent-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-800">{risk.condition_name}</h4>
        <span className={`px-2 py-0.5 rounded-full text-xs ${severityColors[risk.severity]}`}>
          {risk.severity === 'low' ? 'Низкий' : 
           risk.severity === 'medium' ? 'Средний' :
           risk.severity === 'high' ? 'Высокий' : 'Критический'}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{risk.description || 'Нет описания'}</p>
      <div className="text-xs text-gray-500">
        Распространённость: {risk.prevalence_percent}%
      </div>
    </div>
  );
}
export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Bug 1: свежие данные питомца, переданные сразу после создания/сохранения рациона
  // из воронки (navigate('/pet-id/:id', { state: { pet } })). Рисуем мгновенно, без F5,
  // затем фоновым refetch заменяем на канонические данные с backend.
  const seededPet = location.state && location.state.pet ? location.state.pet : null;
  const [pet, setPet] = useState(seededPet);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(!seededPet);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  // Этап 2 — данные дашборда карточки (всё опционально, не должно ронять карточку).
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [allergies, setAllergies] = useState([]);
  const [behaviorCourses, setBehaviorCourses] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  // Смена фото питомца: триггерим скрытый input, грузим через существующий эндпоинт.
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);
  const notifyOk = useToastStore((st) => st.success);
  const notifyErr = useToastStore((st) => st.error);

  const handlePhotoSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      if (notifyErr) notifyErr('Выберите файл изображения');
      return;
    }
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      // PUT /pets/{id}/ принимает фото через multipart (бэкенд уже это умеет, не меняется).
      await api.put(`/pets/${pet.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadPetData();
      if (notifyOk) notifyOk('Фото обновлено');
    } catch {
      if (notifyErr) notifyErr('Не удалось загрузить фото');
    } finally {
      setPhotoUploading(false);
    }
  };

  useEffect(() => {
    loadPetData();
  }, [id]);

  // Этап 2 — подтягиваем напоминания, аллергии и курсы по поведению.
  // Каждый запрос независим и не-фатален: блок просто показывает пустое состояние.
  const loadReminders = () => {
    setRemindersLoading(true);
    getReminders({ pet_id: id, upcoming_only: true })
      .then((res) => setReminders(flattenReminders(res)))
      .catch(() => setReminders([]))
      .finally(() => setRemindersLoading(false));
  };

  useEffect(() => {
    let active = true;
    loadReminders();
    getPetAllergies(id)
      .then((res) => { if (active) setAllergies(normalizeList(res)); })
      .catch(() => { if (active) setAllergies([]); });
    getPersonalizedCourses(id)
      .then((res) => { if (active) setBehaviorCourses(normalizeCourses(res)); })
      .catch(() => { if (active) setBehaviorCourses([]); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadPetData = async () => {
    // Если уже показываем переданные из воронки данные — обновляем в фоне, не пряча карточку.
    if (!pet) setIsLoading(true);
    setError(null);
    try {
      // Питомца грузим обязательно; сравнение пород не должно ронять загрузку карточки.
      const [petResponse, comparisonResponse] = await Promise.all([
        getPet(id),
        getPetBreedComparison(id).catch(() => null)
      ]);
      
      setPet(petResponse.data || petResponse.pet || petResponse);
      setComparison(comparisonResponse);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      // Не затираем уже показанные свежие данные ошибкой фонового refetch.
      if (!pet) setError('Не удалось загрузить данные питомца');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Вы уверены, что хотите удалить питомца "${pet?.name}"?`)) {
      try {
        await deletePet(id);
        navigate('/pet-id');
      } catch (err) {
        console.error('Ошибка удаления:', err);
        alert('Не удалось удалить питомца');
      }
    }
  };

  const handleEditComplete = async (formData, options = {}) => {
    try {
      const payload = {
        ...formData,
        is_draft: options.isDraft ?? formData?.is_draft ?? false,
        draft_step: options.draftStep ?? formData?.draft_step ?? null,
      };
      if (options.partial) {
        await updatePetPartial(id, payload);
        return;
      }
      await updatePet(id, payload);
      setShowWizard(false);
      loadPetData();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Не удалось сохранить изменения. Попробуйте ещё раз.');
    }
  };

  if (isLoading) return <PageLoader />;

  if (error) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{error}</h3>
          <Link to="/pet-id" className="text-primary-600 hover:underline">
            Вернуться к списку питомцев
          </Link>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Питомец не найден</h3>
          <Link to="/pet-id" className="text-primary-600 hover:underline">
            Вернуться к списку питомцев
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: '📊' },
    { id: 'analysis', label: 'Анализ', icon: '🔍' },
    { id: 'recommendations', label: 'Рекомендации', icon: '💡' },
    { id: 'health', label: 'Здоровье', icon: '❤️' },
  ];

  return (
    <div className="page-container animate-fadeIn pb-8">
      {/* Навигация назад */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/pet-id')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Все питомцы
        </button>
      </div>

      {/* Hero-карточка профиля питомца */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-primary-100 shadow-[0_8px_30px_rgba(82,47,129,0.08)] p-6 sm:p-8 mb-6">
        {/* мягкое фирменное свечение (декор) */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary-200/40 to-gold-200/40 blur-3xl" />

        {/* Пуфыч выглядывает ИЗ-ЗА ЛЕВОГО КРАЯ карточки: он позади контента (z-0), а левый
            край карточки (overflow-hidden) аккуратно срезает его тело — наружу смотрят
            мордочка и машущая лапка. Мягкое свечение делает его частью карточки. Desktop only. */}
        <div aria-hidden="true" className="hidden lg:block pointer-events-none absolute top-7 -left-[40px] z-0">
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-gold-200/55 to-primary-200/45 blur-2xl" />
          <div className="relative">
            <PuffPeek size={166} />
          </div>
        </div>

        {/* Верх hero: аватар + имя/метрики + одно основное действие */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 lg:pl-32">
          {/* Аватар с кнопкой смены фото */}
          <div className="relative flex-shrink-0 mx-auto lg:mx-0">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-gradient-to-br from-primary-100 via-violet-100 to-gold-100 ring-4 ring-white shadow-md flex items-center justify-center overflow-hidden text-6xl">
              {pet.photo ? (
                <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                <span>{pet.species === 'dog' ? '🐕' : '🐱'}</span>
              )}
              {photoUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={photoUploading}
              aria-label="Изменить фото питомца"
              title="Изменить фото питомца"
              className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-gold-400 hover:bg-gold-500 text-primary-900 shadow-md ring-2 ring-white flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 disabled:opacity-60"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelected}
            />
          </div>

          {/* Имя + метрики + основное действие */}
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2.5 flex-wrap">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-900 tracking-tight" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>{pet.name}</h2>
              <SexPill sex={pet.sex} />
            </div>
            <p className="text-gray-500 mt-1.5">{pet.breed_name || 'Порода не указана'}</p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-4">
              {pet.weight_kg && <MetricPill icon={Scale}>{pet.weight_kg} кг</MetricPill>}
              {ageText(pet) && <MetricPill icon={Cake}>{ageText(pet)}</MetricPill>}
              {activityLabel(pet.activity_level) && <MetricPill icon={Activity}>{activityLabel(pet.activity_level)}</MetricPill>}
              {comparison?.overall_score !== undefined && comparison.breed_found && (
                <MetricPill icon={Sparkles} highlight>Оценка {comparison.overall_score}/100</MetricPill>
              )}
            </div>
            <div className="mt-5 flex justify-center lg:justify-start">
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gold-400 hover:bg-gold-500 text-primary-900 font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
              >
                <Edit className="w-4 h-4" /> Редактировать профиль
              </button>
            </div>
          </div>
        </div>

        {/* Информация о питомце — перенесена внутрь hero */}
        <div className="relative z-10 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary-500" />
              <h3 className="text-base font-bold text-primary-900" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>Информация о питомце</h3>
            </div>
            <CompletenessBadge value={pet.profile_completeness} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoTile icon={PawPrint} tint="bg-primary-50 text-primary-600" label="Вид" value={pet.species === 'dog' ? 'Собака' : 'Кошка'} />
            <InfoTile icon={BookOpen} tint="bg-violet-50 text-violet-600" label="Порода" value={pet.breed_name} placeholder="Указать породу" onAdd={() => setShowWizard(true)} />
            <InfoTile iconText={pet.sex === 'female' ? '♀' : '♂'} tint={pet.sex === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-sky-50 text-sky-600'} label="Пол" value={pet.sex ? (pet.sex === 'male' ? 'Мужской' : 'Женский') : null} placeholder="Указать пол" onAdd={() => setShowWizard(true)} />
            <InfoTile icon={Scale} tint="bg-sky-50 text-sky-600" label="Вес" value={pet.weight_kg ? `${pet.weight_kg} кг` : null} placeholder="Записать вес" onAdd={() => setShowWizard(true)} />
            <InfoTile icon={Activity} tint="bg-amber-50 text-amber-600" label="Активность">
              <ActivityDots level={pet.activity_level} onAdd={() => setShowWizard(true)} />
            </InfoTile>
            <InfoTile icon={Scissors} tint="bg-emerald-50 text-emerald-600" label="Кастрация / стерилизация">
              <NeuterBadge value={pet.is_neutered} />
            </InfoTile>
            <InfoTile icon={Utensils} tint="bg-rose-50 text-rose-600" label="Тип питания" value={dietLabel(pet.diet_type)} placeholder="Добавить" onAdd={() => setShowWizard(true)} />
            <InfoTile icon={Home} tint="bg-indigo-50 text-indigo-600" label="Тип жилья" value={housingLabel(pet.housing_type)} placeholder="Добавить" onAdd={() => setShowWizard(true)} />
          </div>
        </div>

        {/* Информация о породе */}
        {comparison?.breed_standard && comparison.breed_found && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📖</span>
              <h3 className="font-semibold text-gray-800">О породе {comparison.breed_standard.name}</h3>
            </div>
            <p className="text-gray-600 text-sm mb-3">{comparison.breed_standard.description}</p>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                📏 {comparison.breed_standard.weight_min}-{comparison.breed_standard.weight_max} кг
              </span>
              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                📅 {comparison.breed_standard.lifespan_min}-{comparison.breed_standard.lifespan_max} лет
              </span>
              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                ⚡ {comparison.breed_standard.energy_level_display}
              </span>
              {comparison.breed_standard.apartment_friendly && (
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                  🏠 Подходит для квартиры
                </span>
              )}
              {comparison.breed_standard.good_for_novice && (
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                  👤 Подходит новичкам
                </span>
              )}
            </div>
          </div>
        )}

        {/* Предупреждение если порода не найдена */}
        {comparison && !comparison.breed_found && comparison.has_breed && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Порода не найдена в базе знаний</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Порода "{pet.breed_name || '—'}" не найдена. Для полного анализа выберите породу из списка при редактировании профиля.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary-600 to-accent-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент табов */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Этап 2 — быстрые действия (личный кабинет питомца) */}
            <QuickActions
              pet={pet}
              navigate={navigate}
              onAddEvent={() => setShowReminderModal(true)}
              onRecordWeight={() => setShowWizard(true)}
            />

            {/* Этап 2 — рацион + здоровье */}
            <div className="grid lg:grid-cols-2 gap-6">
              <RationBlock pet={pet} navigate={navigate} />
              <HealthBlock pet={pet} allergies={allergies} onRecordWeight={() => setShowWizard(true)} />
            </div>

            {/* Этап 2 — напоминания + поведение */}
            <div className="grid lg:grid-cols-2 gap-6">
              <RemindersBlock
                reminders={reminders}
                loading={remindersLoading}
                petName={pet.name}
                onAdd={() => setShowReminderModal(true)}
              />
              <BehaviorBlock pet={pet} courses={behaviorCourses} navigate={navigate} />
            </div>

            {/* Быстрая статистика */}
            {comparison?.analysis && comparison.breed_found && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(comparison.analysis).map(([key, value]) => {
                  const icons = {
                    weight: Scale,
                    activity: Activity,
                    nutrition: Utensils,
                    behavior: Brain,
                    health: Heart,
                    housing: Home,
                  };
                  const titles = {
                    weight: 'Вес',
                    activity: 'Активность',
                    nutrition: 'Питание',
                    behavior: 'Поведение',
                    health: 'Здоровье',
                    housing: 'Содержание',
                  };
                  const Icon = icons[key];
                  return (
                    <div key={key} className="bg-white rounded-xl p-4 text-center shadow-sm">
                      <Icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-800">{value.score || 0}</div>
                      <div className="text-xs text-gray-500">{titles[key]}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* «Информация о питомце» перенесена в hero-карточку выше. */}

            {/* Сохранённый рацион теперь отображается блоком «Рацион» выше (RationBlock). */}
          </motion.div>
        )}

        {activeTab === 'analysis' && comparison?.analysis && comparison.breed_found && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-2 gap-4"
          >
            <AnalysisCard title="Вес" icon={Scale} analysis={comparison.analysis.weight} />
            <AnalysisCard title="Активность" icon={Activity} analysis={comparison.analysis.activity} />
            <AnalysisCard title="Питание" icon={Utensils} analysis={comparison.analysis.nutrition} />
            <AnalysisCard title="Поведение" icon={Brain} analysis={comparison.analysis.behavior} />
            <AnalysisCard title="Здоровье" icon={Heart} analysis={comparison.analysis.health} />
            <AnalysisCard title="Условия содержания" icon={Home} analysis={comparison.analysis.housing} />
          </motion.div>
        )}

        {activeTab === 'analysis' && (!comparison?.analysis || !comparison.breed_found) && (
          <motion.div
            key="analysis-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-16 bg-white rounded-2xl"
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Анализ недоступен</h3>
            <p className="text-gray-500">
              Для проведения анализа укажите породу питомца из базы знаний
            </p>
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {comparison?.recommendations && comparison.recommendations.length > 0 ? (
              comparison.recommendations.map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} index={index} />
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Всё отлично!</h3>
                <p className="text-gray-500">
                  {comparison?.breed_found 
                    ? 'Параметры питомца соответствуют стандартам породы'
                    : 'Укажите породу для получения персонализированных рекомендаций'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'health' && (
          <motion.div
            key="health"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Породные риски здоровья */}
            {comparison?.health_risks && comparison.health_risks.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent-600" />
                  Породные риски здоровья
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {comparison.health_risks.map((risk, index) => (
                    <HealthRiskCard key={index} risk={risk} />
                  ))}
                </div>
              </div>
            )}

            {/* Текущие проблемы здоровья */}
            {pet.health_issues && pet.health_issues.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">🩺 Текущие проблемы здоровья</h3>
                <div className="flex flex-wrap gap-2">
                  {pet.health_issues.map((issue, index) => (
                    <span key={index} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Хронические заболевания */}
            {pet.chronic_conditions && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">📋 Хронические заболевания</h3>
                <p className="text-gray-600">{pet.chronic_conditions}</p>
              </div>
            )}

            {/* Рекомендации по уходу */}
            {comparison?.care_procedures && comparison.care_procedures.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary-600" />
                  Рекомендации по уходу
                </h3>
                <div className="space-y-3">
                  {comparison.care_procedures.map((proc, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-lg">
                        {proc.category === 'grooming' ? '✂️' :
                         proc.category === 'dental' ? '🦷' :
                         proc.category === 'exercise' ? '🏃' : '🏥'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-800">{proc.procedure_name}</div>
                        <div className="text-sm text-gray-500">
                          Частота: {proc.frequency === 'daily' ? 'Ежедневно' :
                                    proc.frequency === 'weekly' ? 'Еженедельно' :
                                    proc.frequency === 'monthly' ? 'Ежемесячно' : proc.frequency}
                        </div>
                        {proc.tips && <div className="text-sm text-gray-600 mt-1">{proc.tips}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Пустое состояние */}
            {!comparison?.health_risks?.length && !pet.health_issues?.length && !pet.chronic_conditions && !comparison?.care_procedures?.length && (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="text-6xl mb-4">💚</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Информация о здоровье</h3>
                <p className="text-gray-500">
                  {comparison?.breed_found 
                    ? 'Нет данных о проблемах со здоровьем'
                    : 'Укажите породу для просмотра породных рисков здоровья'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модальное окно редактирования */}
      {showWizard && (
        <PetProfileEditor
          pet={pet}
          onClose={() => setShowWizard(false)}
          onSave={handleEditComplete}
        />
      )}

      {showReminderModal && (
        <CreateReminderModal
          petId={pet.id}
          petName={pet.name}
          onClose={() => setShowReminderModal(false)}
          onCreated={() => { setShowReminderModal(false); loadReminders(); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Этап 2 — Дашборд карточки питомца.
   Только существующие API/данные. Бэкенд не меняется.
   ============================================================ */

const GOLD_CTA = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gold-400 hover:bg-gold-500 text-primary-900 font-semibold shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold-300 focus:ring-offset-1';
const SOFT_CTA = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-200';
const GHOST_CTA = 'inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium transition-colors';

const reminderCategoryMeta = {
  feeding:     { icon: Bone,          label: 'Кормление',  tint: 'bg-amber-100 text-amber-700' },
  medication:  { icon: Pill,          label: 'Лекарства',  tint: 'bg-rose-100 text-rose-700' },
  vaccination: { icon: Syringe,       label: 'Вакцинация', tint: 'bg-emerald-100 text-emerald-700' },
  vet_visit:   { icon: Stethoscope,   label: 'Ветеринар',  tint: 'bg-red-100 text-red-700' },
  grooming:    { icon: Scissors,      label: 'Груминг',    tint: 'bg-violet-100 text-violet-700' },
  walk:        { icon: Footprints,    label: 'Прогулка',   tint: 'bg-sky-100 text-sky-700' },
  training:    { icon: GraduationCap, label: 'Тренировка', tint: 'bg-indigo-100 text-indigo-700' },
  hygiene:     { icon: Bath,          label: 'Гигиена',    tint: 'bg-cyan-100 text-cyan-700' },
  other:       { icon: Bell,          label: 'Другое',     tint: 'bg-gray-100 text-gray-600' },
};

const reminderCategoryOptions = ['vaccination', 'vet_visit', 'medication', 'feeding', 'grooming', 'walk', 'training', 'hygiene', 'other'];

const behaviorDescriptions = {
  aggression_dogs: 'Реакция на других собак — поможет курс по социализации и коррекции.',
  aggression_people: 'Настороженность к людям — нужна мягкая поведенческая работа.',
  aggression_cats: 'Конфликты с кошками — разбираем триггеры и дистанцию.',
  separation_anxiety: 'Тревога при расставании — постепенное приучение к одиночеству.',
  excessive_barking: 'Частый лай — учим спокойствию и альтернативному поведению.',
  destructive_behavior: 'Порча вещей — даём питомцу занятость и правильные нагрузки.',
  fear_phobias: 'Страхи и фобии — работа с уверенностью и снижение чувствительности.',
  marking_territory: 'Метки в доме — разбираем причины и закрепляем привычки.',
  excessive_licking: 'Навязчивое вылизывание — снижаем стресс и скуку.',
  food_aggression: 'Охрана еды — безопасные протоколы кормления.',
  leash_pulling: 'Тянет поводок — техника спокойной прогулки рядом.',
  jumping_on_people: 'Прыгает на людей — учим вежливому приветствию.',
};

function behaviorLabel(code) {
  const found = (BEHAVIORAL_PROBLEMS_OPTIONS || []).find((o) => o.value === code);
  return found ? found.label : code;
}

function normalizeList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.allergies)) return res.allergies;
  return [];
}

function normalizeCourses(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.courses)) return res.courses;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.results)) return res.results;
  return [];
}

function flattenReminders(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const merged = [];
  ['overdue', 'upcoming', 'future'].forEach((g) => { if (Array.isArray(res[g])) merged.push(...res[g]); });
  if (!merged.length && Array.isArray(res.reminders)) merged.push(...res.reminders);
  return merged.sort((a, b) => String(a.reminder_date).localeCompare(String(b.reminder_date)));
}

function formatRuDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return 'Сегодня';
  if (dd.getTime() === tomorrow.getTime()) return 'Завтра';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function pluralYears(y) {
  const d10 = y % 10;
  const d100 = y % 100;
  if (d10 === 1 && d100 !== 11) return 'год';
  if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) return 'года';
  return 'лет';
}

function ageText(pet) {
  if (pet.age === null || pet.age === undefined) {
    if (pet.age_months) return `${pet.age_months} мес.`;
    return null;
  }
  return `${pet.age} ${pluralYears(pet.age)}`;
}

function coursePrice(c) {
  if (c.is_free) return 'Бесплатно';
  if (c.price) return `${c.price} ₽`;
  return 'Курс';
}

const ageCategoryLabel = { puppy: 'малыш', kitten: 'малыш', adult: 'взрослый', senior: 'старший' };

function SectionCard({ icon: Icon, title, action, children, className = '' }) {
  return (
    <section className={`bg-white rounded-3xl border border-primary-100 p-5 sm:p-6 shadow-[0_4px_24px_rgba(82,47,129,0.06)] ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
          )}
          <h3 className="text-lg font-bold text-primary-900 truncate" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <span className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-400 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7" />
      </span>
      <p className="font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-xs">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function QuickActions({ pet, navigate, onAddEvent, onRecordWeight }) {
  const actions = [
    { label: 'Купить корм', icon: ShoppingCart, tint: 'bg-gold-100 text-gold-600', onClick: () => navigate('/shop') },
    { label: 'Записать вес', icon: Weight, tint: 'bg-emerald-100 text-emerald-600', onClick: onRecordWeight },
    { label: 'Добавить событие', icon: CalendarPlus, tint: 'bg-sky-100 text-sky-600', onClick: onAddEvent },
    { label: 'Открыть дневник', icon: BookOpen, tint: 'bg-violet-100 text-violet-600', onClick: () => navigate(`/health-diary?pet_id=${pet.id}`) },
    { label: 'Подобрать рацион', icon: UtensilsCrossed, tint: 'bg-amber-100 text-amber-600', onClick: () => navigate(`/food-recommendation?pet_id=${pet.id}`) },
    { label: 'Курсы', icon: GraduationCap, tint: 'bg-indigo-100 text-indigo-600', onClick: () => navigate('/courses') },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            onClick={a.onClick}
            className="group flex flex-col items-center justify-center gap-2 min-h-[96px] p-4 rounded-2xl bg-white border border-primary-100 hover:border-primary-300 hover:shadow-[0_6px_20px_rgba(82,47,129,0.10)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${a.tint} group-hover:scale-105 transition-transform duration-200`}>
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium text-gray-700 text-center leading-tight">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RationBlock({ pet, navigate }) {
  const food = pet.current_food;
  const hasFood = food && (food.brand_name || food.product_name);
  return (
    <SectionCard icon={UtensilsCrossed} title="Рацион питомца">
      {hasFood ? (
        <div>
          <div className="rounded-2xl bg-gradient-to-br from-gold-50 to-primary-50 border border-gold-200/60 p-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {food.brand_name && <p className="text-xs uppercase tracking-wide text-primary-500 font-semibold truncate">{food.brand_name}</p>}
                <p className="text-lg font-bold text-primary-900 leading-snug">{food.product_name || food.brand_name}</p>
                {food.daily_amount_grams && <p className="text-sm text-gray-600 mt-1">Норма: {food.daily_amount_grams} г/день</p>}
              </div>
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> Активен
              </span>
            </div>
            {pet.updated_at && <p className="text-xs text-gray-400 mt-3">Обновлён {new Date(pet.updated_at).toLocaleDateString('ru-RU')}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/shop')} className={GOLD_CTA}><ShoppingCart className="w-4 h-4" /> Купить рацион</button>
            <button onClick={() => navigate(`/food-recommendation?pet_id=${pet.id}`)} className={SOFT_CTA}><Edit className="w-4 h-4" /> Изменить рацион</button>
          </div>
          <button onClick={() => navigate(`/food-recommendation?pet_id=${pet.id}`)} className={`${GHOST_CTA} mt-3`}>
            Открыть подбор корма <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <EmptyState
          icon={UtensilsCrossed}
          title="Подберите первый рацион для вашего питомца"
          subtitle="Учтём вес, возраст и особенности — и предложим подходящий корм."
        >
          <button onClick={() => navigate(`/food-recommendation?pet_id=${pet.id}`)} className={GOLD_CTA}>
            <Sparkles className="w-4 h-4" /> Подобрать корм
          </button>
        </EmptyState>
      )}
    </SectionCard>
  );
}

function HealthBlock({ pet, allergies, onRecordWeight }) {
  const tiles = [
    { label: 'Вес', icon: Scale, value: pet.weight_kg ? `${pet.weight_kg} кг` : null, hint: 'Записать вес', onHint: onRecordWeight },
    { label: 'Возраст', icon: Cake, value: ageText(pet), sub: pet.age_category ? ageCategoryLabel[pet.age_category] : null, hint: 'Указать дату', onHint: onRecordWeight },
    { label: 'Стерилизация', icon: ShieldCheck, value: pet.is_neutered ? 'Да' : 'Нет' },
  ];
  const allergyNames = (allergies || [])
    .map((a) => (a.allergy_detail && a.allergy_detail.display_name) || a.display_name || a.name)
    .filter(Boolean);
  const hasChronic = pet.chronic_conditions_notes && String(pet.chronic_conditions_notes).trim();
  return (
    <SectionCard icon={Heart} title="Здоровье">
      <div className="grid grid-cols-3 gap-3 mb-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="rounded-2xl bg-gray-50 p-3 text-center">
              <Icon className="w-5 h-5 text-primary-500 mx-auto mb-1.5" />
              {t.value ? (
                <>
                  <div className="text-base font-bold text-gray-800 leading-tight">{t.value}</div>
                  {t.sub && <div className="text-[11px] text-gray-400">{t.sub}</div>}
                </>
              ) : (
                <button onClick={t.onHint} className="text-xs text-primary-600 hover:text-primary-800 font-medium">{t.hint}</button>
              )}
              <div className="text-[11px] text-gray-500 mt-0.5">{t.label}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1.5">Аллергии</p>
          {allergyNames.length ? (
            <div className="flex flex-wrap gap-1.5">
              {allergyNames.map((n, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" /> {n}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Аллергии не указаны</p>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1.5">Особенности здоровья</p>
          <div className="flex flex-wrap gap-1.5">
            {pet.sensitive_digestion && <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">Чувствительное пищеварение</span>}
            {hasChronic && <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-medium">{pet.chronic_conditions_notes}</span>}
            {!pet.sensitive_digestion && !hasChronic && <p className="text-sm text-gray-400">Особенности не отмечены</p>}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function RemindersBlock({ reminders, loading, petName, onAdd }) {
  const items = (reminders || []).slice(0, 4);
  const hasItems = (reminders || []).length > 0;
  return (
    <SectionCard
      icon={Bell}
      title="Напоминания"
      action={hasItems ? (
        <button onClick={onAdd} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      ) : null}
    >
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : hasItems ? (
        <div className="space-y-2">
          {items.map((r) => {
            const meta = reminderCategoryMeta[r.category] || reminderCategoryMeta.other;
            const Icon = meta.icon;
            return (
              <div key={r.id} className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${r.is_overdue ? 'bg-red-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${meta.tint}`}><Icon className="w-4 h-4" /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500">{meta.label} · {formatRuDate(r.reminder_date)}{r.reminder_time ? ` · ${String(r.reminder_time).slice(0, 5)}` : ''}</p>
                </div>
                {r.is_overdue && <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">Просрочено</span>}
                {!r.is_overdue && r.is_upcoming && <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">Скоро</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarPlus}
          title="Пока нет напоминаний"
          subtitle={`Добавьте первое событие для ${petName}: вакцинация, обработка, контроль веса.`}
        >
          <button onClick={onAdd} className={GOLD_CTA}><Plus className="w-4 h-4" /> Создать первое напоминание</button>
        </EmptyState>
      )}
    </SectionCard>
  );
}

function BehaviorBlock({ pet, courses, navigate }) {
  const problems = (pet.behavioral_problems || []).filter((p) => p && p !== 'none');
  const hasProblems = problems.length > 0;
  const courseList = (courses || []).slice(0, 2);
  return (
    <SectionCard icon={Brain} title="Поведение">
      {hasProblems ? (
        <div className="space-y-3">
          {problems.slice(0, 4).map((code) => (
            <div key={code} className="rounded-2xl border border-orange-100 bg-orange-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <p className="font-semibold text-gray-800">{behaviorLabel(code)}</p>
              </div>
              {behaviorDescriptions[code] && <p className="text-sm text-gray-600 mb-2">{behaviorDescriptions[code]}</p>}
              <button onClick={() => navigate('/courses')} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800">
                Перейти к курсам <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {courseList.length > 0 && (
            <div className="pt-1">
              <p className="text-sm font-semibold text-gray-700 mb-2">Рекомендуемые курсы</p>
              <div className="space-y-2">
                {courseList.map((c) => (
                  <button key={c.id} onClick={() => navigate(`/courses/${c.id}`)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all text-left">
                    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><GraduationCap className="w-4 h-4" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-gray-900 truncate">{c.title}</span>
                      <span className="block text-xs text-gray-500">{coursePrice(c)}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="Проблем поведения не зафиксировано"
          subtitle="Отличная работа! Поддержать форму помогут обучающие курсы."
        >
          <button onClick={() => navigate('/courses')} className={SOFT_CTA}><GraduationCap className="w-4 h-4" /> Открыть курсы</button>
        </EmptyState>
      )}
    </SectionCard>
  );
}

function CreateReminderModal({ petId, petName, onClose, onCreated }) {
  const showSuccess = useToastStore((s) => s.success);
  const showError = useToastStore((s) => s.error);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('vaccination');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setFormError('Введите название'); return; }
    if (!date) { setFormError('Выберите дату'); return; }
    setSubmitting(true); setFormError('');
    try {
      await createReminder({
        pet_id: petId,
        title: title.trim(),
        category,
        reminder_date: date,
        reminder_time: time || undefined,
        frequency,
      });
      if (showSuccess) showSuccess('Напоминание создано');
      onCreated();
    } catch (err) {
      const msg = (err && err.response && err.response.data && err.response.data.message) || 'Не удалось создать напоминание';
      setFormError(msg);
      if (showError) showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Новое напоминание" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">Для питомца: <span className="font-medium text-gray-700">{petName}</span></p>
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1.5">Название</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Прививка от бешенства" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1.5">Тип</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {reminderCategoryOptions.map((c) => (
              <option key={c} value={c}>{reminderCategoryMeta[c].label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-primary-800 mb-1.5">Дата</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-800 mb-1.5">Время</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-800 mb-1.5">Повтор</label>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="once">Однократно</option>
            <option value="daily">Ежедневно</option>
            <option value="weekly">Еженедельно</option>
            <option value="monthly">Ежемесячно</option>
            <option value="quarterly">Раз в квартал</option>
            <option value="yearly">Ежегодно</option>
          </select>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="primary" isLoading={submitting}>Создать</Button>
        </div>
      </form>
    </Modal>
  );
}


/* ============================================================
   Этап 2.1 — Hero питомца + карта профиля (вспомогательные компоненты).
   Только фронт, существующие данные. Бэкенд/API не меняются.
   ============================================================ */

function activityLabel(v) {
  return ({ very_low: 'Очень низкая', low: 'Низкая', moderate: 'Средняя', high: 'Высокая', very_high: 'Очень высокая' })[v] || null;
}
function activityDotCount(v) {
  return ({ very_low: 1, low: 1, moderate: 2, high: 3, very_high: 3 })[v] || 0;
}
function dietLabel(v) {
  return ({ dry: 'Сухой корм', wet: 'Влажный корм', mixed: 'Смешанное', raw: 'Натуральное', homemade: 'Домашняя еда' })[v] || null;
}
function housingLabel(v) {
  return ({ apartment: 'Квартира', house: 'Частный дом', farm: 'Ферма / село', outdoor: 'Вольер' })[v] || null;
}

function SexPill({ sex }) {
  if (!sex) return null;
  const female = sex === 'female';
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base font-bold ${female ? 'bg-pink-100 text-pink-600' : 'bg-sky-100 text-sky-600'}`}
      title={female ? 'Самка' : 'Самец'}
    >
      {female ? '♀' : '♂'}
    </span>
  );
}

function MetricPill({ icon: Icon, children, highlight }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium ${highlight ? 'bg-gold-100 text-gold-700' : 'bg-primary-50 text-primary-700'}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </span>
  );
}
function InfoTile({ icon: Icon, iconText, tint = 'bg-primary-50 text-primary-600', label, value, placeholder = 'Не указано', onAdd, children }) {
  let content;
  if (children) {
    content = <div className="mt-0.5">{children}</div>;
  } else if (value) {
    content = <p className="font-semibold text-gray-800 truncate">{value}</p>;
  } else {
    content = (
      <button onClick={onAdd} className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary-500 hover:text-primary-700 font-medium transition-colors">
        <Plus className="w-3.5 h-3.5" /> {placeholder}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50/80 p-3.5 transition-colors hover:bg-gray-50">
      <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold ${tint}`}>
        {Icon ? <Icon className="w-5 h-5" /> : <span className="text-base leading-none">{iconText}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {content}
      </div>
    </div>
  );
}

function ActivityDots({ level, onAdd }) {
  const n = activityDotCount(level);
  const label = activityLabel(level);
  if (!n || !label) {
    return (
      <button onClick={onAdd} className="inline-flex items-center gap-1 text-sm text-primary-500 hover:text-primary-700 font-medium transition-colors">
        <Plus className="w-3.5 h-3.5" /> Добавить
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i <= n ? 'bg-amber-400' : 'bg-gray-200'}`} />
        ))}
      </span>
      <span className="font-semibold text-gray-800 text-sm">{label}</span>
    </div>
  );
}

function NeuterBadge({ value }) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
        <CheckCircle className="w-3.5 h-3.5" /> Да
      </span>
    );
  }
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Нет</span>;
}

function CompletenessBadge({ value }) {
  if (typeof value !== 'number') {
    return <span className="hidden md:inline text-xs text-gray-400 max-w-[220px] text-right">Чем точнее профиль, тем полезнее рекомендации</span>;
  }
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:block w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-gold-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-primary-700 whitespace-nowrap">Профиль {pct}%</span>
    </div>
  );
}


/* PuffPeek — Пуфыч выглядывает и машет НЕ постоянно, а раз в ~10 секунд.
   Грузим анимацию один раз, повтор запускаем по таймеру через ref (без перемонтирования/мерцания).
   Уважает prefers-reduced-motion. Только визуал, существующий Lottie-файл. */
function PuffPeek({ size = 166, everyMs = 10000 }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const lottieRef = useRef(null);
  const reduced = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    let alive = true;
    fetch('/lottie/puff/puff_hello_corner.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not found'))))
      .then((j) => { if (alive) setData(j); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (reduced || !data) return undefined;
    const tid = setInterval(() => {
      const inst = lottieRef.current;
      if (inst && typeof inst.goToAndPlay === 'function') inst.goToAndPlay(0, true);
    }, everyMs);
    return () => clearInterval(tid);
  }, [reduced, data, everyMs]);

  const box = { width: size, height: size };
  if (reduced || failed) {
    return (
      <img src="/purple-monster.png" alt="" aria-hidden="true" style={box}
        className="object-contain select-none pointer-events-none" draggable={false} />
    );
  }
  if (!data) return <div aria-hidden="true" style={box} />;
  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={data}
      loop={false}
      autoplay
      style={box}
      className="select-none pointer-events-none"
      aria-hidden="true"
    />
  );
}

