const INPUT_STYLE = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-gradient-to-r from-white to-purple-50 hover:border-purple-300 hover:shadow-md";

export default function StepContacts({ formData, updateFormData }) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-gray-900 text-lg font-medium mb-2">Контактная информация</h3>
        <p className="text-sm text-gray-500">Укажите ваши контактные данные для связи</p>
      </div>

      <div className="grid md:grid-cols-1 gap-4">
        {/* Телефон */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Телефон *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateFormData('phone', e.target.value)}
            className={INPUT_STYLE}
            placeholder="+7 (999) 123-45-67"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={INPUT_STYLE}
            placeholder="example@email.com"
          />
        </div>

        {/* Город */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Город проживания</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData('city', e.target.value)}
            className={INPUT_STYLE}
            placeholder="Например: Москва"
          />
        </div>
      </div>
    </div>
  );
}
