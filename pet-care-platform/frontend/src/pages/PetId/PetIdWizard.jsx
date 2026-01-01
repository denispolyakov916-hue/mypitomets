import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Check, X,
  FileText, Phone, Weight, Utensils, Brain, Stethoscope, Home
} from 'lucide-react';

// Импорт компонентов шагов
import StepBasicInfo from './components/StepBasicInfo';
import StepContacts from './components/StepContacts';
import StepPhysical from './components/StepPhysical';
import StepNutrition from './components/StepNutrition';
import StepBehavior from './components/StepBehavior';
import StepHealth from './components/StepHealth';
import StepLifestyle from './components/StepLifestyle';
import StepConfirmation from './components/StepConfirmation';

// Определение шагов
const STEPS = [
  { number: 1, title: 'Основные данные', icon: FileText },
  { number: 2, title: 'Контакты', icon: Phone },
  { number: 3, title: 'Физические данные', icon: Weight },
  { number: 4, title: 'Питание', icon: Utensils },
  { number: 5, title: 'Поведение', icon: Brain },
  { number: 6, title: 'Здоровье', icon: Stethoscope },
  { number: 7, title: 'Образ жизни', icon: Home },
  { number: 8, title: 'Подтверждение', icon: Check }
];

// Начальное состояние формы
const initialFormData = {
  // Шаг 1
  name: '', species: 'dog', breed: '', gender: '', birthDate: '', neutered: '', photo: null,
  // Шаг 2
  phone: '', email: '', city: '',
  // Шаг 3
  currentWeight: '', size: '', bodyType: '', activityLevel: '',
  // Шаг 4
  dietType: '', feedingFrequency: '', favoriteFlavors: [], allergies: '', sensitiveBelly: false,
  // Шаг 5
  traits: [], behaviorProblems: [], goals: '', trainingLevel: '',
  // Шаг 6
  chronicConditions: '', vaccinations: '', medications: '', dentalHealth: '',
  // Шаг 7
  housingType: '', hasYard: false, otherPets: '', hasChildren: false, walkFrequency: '', walkDuration: ''
};

export default function PetIdWizard({ onClose, onSubmit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);

  // Обновление данных формы
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Переключение значений в массиве (для чекбоксов)
  const toggleArrayValue = (field, value) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
      };
    });
  };

  // Навигация
  const nextStep = () => currentStep < 8 && setCurrentStep(currentStep + 1);
  const prevStep = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  // Отправка формы
  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  // Расчёт прогресса заполнения
  const calculateProgress = () => {
    let filled = 0, total = 0;
    Object.entries(formData).forEach(([key, value]) => {
      total++;
      if (Array.isArray(value) && value.length > 0) filled++;
      else if (typeof value === 'boolean') filled++;
      else if (value && value !== '') filled++;
    });
    return Math.round((filled / total) * 100);
  };

  // Рендер текущего шага
  const renderStep = () => {
    const props = { formData, updateFormData, toggleArrayValue };
    switch (currentStep) {
      case 1: return <StepBasicInfo {...props} />;
      case 2: return <StepContacts {...props} />;
      case 3: return <StepPhysical {...props} />;
      case 4: return <StepNutrition {...props} />;
      case 5: return <StepBehavior {...props} />;
      case 6: return <StepHealth {...props} />;
      case 7: return <StepLifestyle {...props} />;
      case 8: return <StepConfirmation formData={formData} progress={calculateProgress()} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-5xl bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent font-bold">
              Создание Pet ID
            </h2>
            <p className="text-sm text-gray-500 mt-1">Шаг {currentStep} из {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar - Индикатор шагов */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 ${
                    currentStep > step.number
                      ? 'bg-gradient-to-r from-purple-500 to-orange-500 text-white'
                      : currentStep === step.number
                      ? 'bg-gradient-to-r from-purple-600 to-orange-600 text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </button>
                {index < STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-purple-500 to-orange-500 transition-all duration-300 ${
                        currentStep > step.number ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer - Навигация */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
              currentStep === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft className="w-5 h-5" /> Назад
          </button>

          <div className="text-sm text-gray-500">{currentStep} / {STEPS.length}</div>

          {currentStep === 8 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              <Check className="w-5 h-5" /> Сохранить
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              Далее <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}