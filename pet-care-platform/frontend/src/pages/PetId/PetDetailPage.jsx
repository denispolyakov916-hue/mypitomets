import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Edit, Trash2, Share2, QrCode, AlertCircle,
  Scale, Activity, Utensils, Brain, Heart, Home, Scissors,
  ChevronRight, Info, CheckCircle, AlertTriangle, XCircle, UtensilsCrossed
} from 'lucide-react';
import { getPet, deletePet, getPetBreedComparison, updatePet, updatePetPartial } from '../../api/pets';
import { PageLoader } from '../../components/Loader';
import PetProfileEditor from './components/PetProfileEditor';

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

// Индикатор общего скора
function ScoreIndicator({ score }) {
  const getScoreColor = (s) => {
    if (s >= 80) return 'from-green-400 to-emerald-500';
    if (s >= 60) return 'from-yellow-400 to-accent-500';
    if (s >= 40) return 'from-accent-400 to-red-500';
    return 'from-red-500 to-red-600';
  };

  const getScoreLabel = (s) => {
    if (s >= 80) return 'Отлично';
    if (s >= 60) return 'Хорошо';
    if (s >= 40) return 'Требует внимания';
    return 'Требует улучшения';
  };

  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${score * 2.83} 283`}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={`stop-color-${score >= 60 ? 'green' : 'orange'}-400`} style={{stopColor: score >= 60 ? '#4ade80' : '#fb923c'}} />
              <stop offset="100%" className={`stop-color-${score >= 60 ? 'emerald' : 'red'}-500`} style={{stopColor: score >= 60 ? '#10b981' : '#ef4444'}} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold bg-gradient-to-r ${getScoreColor(score)} bg-clip-text text-transparent`}>
            {score}
          </span>
          <span className="text-xs text-gray-500">из 100</span>
        </div>
      </div>
      <div className={`mt-2 px-4 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getScoreColor(score)} text-white`}>
        {getScoreLabel(score)}
      </div>
    </div>
  );
}

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPetData();
  }, [id]);

  const loadPetData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Загружаем данные питомца и сравнение параллельно
      const [petResponse, comparisonResponse] = await Promise.all([
        getPet(id),
        getPetBreedComparison(id)
      ]);
      
      setPet(petResponse.pet || petResponse);
      setComparison(comparisonResponse);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError('Не удалось загрузить данные питомца');
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
      {/* Навигация */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/pet-id')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="page-title mb-0">{pet.name}</h1>
          <p className="text-sm text-gray-500">
            {pet.breed_name || 'Порода не указана'} • {pet.species === 'dog' ? 'Собака' : 'Кошка'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Кнопка подбора корма - активна только если есть вес */}
          {pet.weight && (
            <button
              onClick={() => navigate(`/food-recommendation?pet_id=${pet.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-amber-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Подбор корма
            </button>
          )}
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-all"
          >
            <Edit className="w-4 h-4" />
            Изменить
          </button>
          <button
            onClick={handleDelete}
            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Карточка питомца со скором */}
      <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Фото и основная информация */}
          <div className="flex gap-6">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-6xl">
              {pet.photo ? (
                <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                pet.species === 'dog' ? '🐕' : '🐱'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-800">{pet.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs ${pet.sex === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                  {pet.sex === 'male' ? '♂' : '♀'}
                </span>
              </div>
              <p className="text-gray-600 mb-3">{pet.breed_name || 'Порода не указана'}</p>
              <div className="flex flex-wrap gap-2">
                {pet.weight_kg && (
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                    ⚖️ {pet.weight_kg} кг
                  </span>
                )}
                {comparison?.pet?.age && (
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                    🎂 {comparison.pet.age} {comparison.pet.age === 1 ? 'год' : comparison.pet.age < 5 ? 'года' : 'лет'}
                  </span>
                )}
                {pet.activity_level && (
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                    ⚡ {pet.activity_level === 'low' ? 'Низкая' : pet.activity_level === 'moderate' ? 'Средняя' : 'Высокая'} активность
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Общий скор */}
          {comparison?.overall_score !== undefined && comparison.breed_found && (
            <div className="md:ml-auto">
              <ScoreIndicator score={comparison.overall_score} />
            </div>
          )}
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

            {/* Основная информация о питомце */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">📋 Информация о питомце</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoRow label="Вид" value={pet.species === 'dog' ? 'Собака' : 'Кошка'} />
                <InfoRow label="Порода" value={pet.breed_name || 'Не указана'} />
                <InfoRow label="Пол" value={pet.sex === 'male' ? 'Мужской' : 'Женский'} />
                <InfoRow label="Вес" value={pet.weight_kg ? `${pet.weight_kg} кг` : 'Не указан'} />
                <InfoRow label="Активность" value={
                  pet.activity_level === 'low' ? 'Низкая' :
                  pet.activity_level === 'moderate' ? 'Средняя' : 'Высокая'
                } />
                <InfoRow label="Кастрация" value={pet.is_neutered ? 'Да' : 'Нет'} />
                <InfoRow label="Тип питания" value={
                  pet.diet_type === 'dry' ? 'Сухой корм' :
                  pet.diet_type === 'wet' ? 'Влажный корм' :
                  pet.diet_type === 'mixed' ? 'Смешанное' :
                  pet.diet_type === 'raw' ? 'Натуральное' :
                  pet.diet_type === 'homemade' ? 'Домашняя еда' : 'Не указан'
                } />
                <InfoRow label="Тип жилья" value={
                  pet.housing_type === 'apartment' ? 'Квартира' :
                  pet.housing_type === 'house' ? 'Частный дом' :
                  pet.housing_type === 'farm' ? 'Ферма/сельская местность' :
                  pet.housing_type === 'outdoor' ? 'Вольерное содержание' : 'Не указан'
                } />
              </div>
            </div>
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
    </div>
  );
}

// Вспомогательный компонент для отображения информации
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}


