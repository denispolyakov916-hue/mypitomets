/**
 * База данных для здоровья питомцев
 * 
 * Содержит структурированные данные для:
 * - Хронические заболевания (120+ для собак и кошек)
 * - Вакцины с периодами ревакцинации
 * - Препараты с взаимодействиями с продуктами питания
 * - Аллергии и непереносимости
 */

// ===== ХРОНИЧЕСКИЕ ЗАБОЛЕВАНИЯ =====

/**
 * Хронические заболевания для собак
 * Категоризированы по системам органов
 */
export const DOG_CHRONIC_CONDITIONS = {
  cardiovascular: {
    label: 'Сердечно-сосудистая система',
    conditions: [
      { id: 'dcm', name: 'Дилатационная кардиомиопатия', severity: 'high' },
      { id: 'mvd', name: 'Дегенеративное заболевание митрального клапана', severity: 'high' },
      { id: 'chf', name: 'Хроническая сердечная недостаточность', severity: 'high' },
      { id: 'arrhythmia', name: 'Аритмия', severity: 'medium' },
      { id: 'hypertension', name: 'Гипертония', severity: 'medium' },
      { id: 'pda', name: 'Открытый артериальный проток', severity: 'high' },
    ]
  },
  digestive: {
    label: 'Пищеварительная система',
    conditions: [
      { id: 'ibd_dog', name: 'Воспалительное заболевание кишечника (ВЗК)', severity: 'medium' },
      { id: 'pancreatitis_chronic', name: 'Хронический панкреатит', severity: 'medium' },
      { id: 'epi', name: 'Экзокринная недостаточность поджелудочной железы', severity: 'medium' },
      { id: 'megaesophagus', name: 'Мегаэзофагус', severity: 'high' },
      { id: 'gastritis_chronic', name: 'Хронический гастрит', severity: 'low' },
      { id: 'colitis', name: 'Хронический колит', severity: 'medium' },
      { id: 'hepatitis_chronic', name: 'Хронический гепатит', severity: 'high' },
      { id: 'liver_shunt', name: 'Портосистемный шунт', severity: 'high' },
    ]
  },
  respiratory: {
    label: 'Дыхательная система',
    conditions: [
      { id: 'collapsing_trachea', name: 'Коллапс трахеи', severity: 'medium' },
      { id: 'chronic_bronchitis', name: 'Хронический бронхит', severity: 'medium' },
      { id: 'brachycephalic', name: 'Брахицефалический синдром', severity: 'medium' },
      { id: 'laryngeal_paralysis', name: 'Паралич гортани', severity: 'medium' },
    ]
  },
  musculoskeletal: {
    label: 'Опорно-двигательная система',
    conditions: [
      { id: 'hip_dysplasia', name: 'Дисплазия тазобедренного сустава', severity: 'medium' },
      { id: 'elbow_dysplasia', name: 'Дисплазия локтевого сустава', severity: 'medium' },
      { id: 'osteoarthritis', name: 'Остеоартрит', severity: 'medium' },
      { id: 'patellar_luxation', name: 'Вывих коленной чашечки', severity: 'medium' },
      { id: 'ivdd', name: 'Болезнь межпозвоночных дисков', severity: 'high' },
      { id: 'degenerative_myelopathy', name: 'Дегенеративная миелопатия', severity: 'high' },
      { id: 'ocd', name: 'Рассекающий остеохондрит', severity: 'medium' },
    ]
  },
  endocrine: {
    label: 'Эндокринная система',
    conditions: [
      { id: 'hypothyroidism', name: 'Гипотиреоз', severity: 'low' },
      { id: 'diabetes_dog', name: 'Сахарный диабет', severity: 'high' },
      { id: 'cushings', name: 'Синдром Кушинга (гиперадренокортицизм)', severity: 'high' },
      { id: 'addisons', name: 'Болезнь Аддисона (гипоадренокортицизм)', severity: 'high' },
    ]
  },
  urinary: {
    label: 'Мочевыделительная система',
    conditions: [
      { id: 'ckd_dog', name: 'Хроническая болезнь почек', severity: 'high' },
      { id: 'bladder_stones', name: 'Мочекаменная болезнь', severity: 'medium' },
      { id: 'urinary_incontinence', name: 'Недержание мочи', severity: 'low' },
      { id: 'chronic_uti', name: 'Хронический цистит', severity: 'low' },
    ]
  },
  neurological: {
    label: 'Нервная система',
    conditions: [
      { id: 'epilepsy_dog', name: 'Эпилепсия', severity: 'high' },
      { id: 'vestibular_disease', name: 'Вестибулярный синдром', severity: 'medium' },
      { id: 'cognitive_dysfunction', name: 'Когнитивная дисфункция (деменция)', severity: 'medium' },
    ]
  },
  dermatological: {
    label: 'Кожа и шерсть',
    conditions: [
      { id: 'atopic_dermatitis', name: 'Атопический дерматит', severity: 'medium' },
      { id: 'food_allergy_skin', name: 'Пищевая аллергия (кожные проявления)', severity: 'medium' },
      { id: 'seborrhea', name: 'Себорея', severity: 'low' },
      { id: 'pyoderma_chronic', name: 'Хроническая пиодермия', severity: 'medium' },
      { id: 'demodecosis', name: 'Демодекоз', severity: 'medium' },
      { id: 'alopecia', name: 'Алопеция', severity: 'low' },
    ]
  },
  ophthalmological: {
    label: 'Глаза',
    conditions: [
      { id: 'glaucoma', name: 'Глаукома', severity: 'high' },
      { id: 'cataracts', name: 'Катаракта', severity: 'medium' },
      { id: 'kcs', name: 'Сухой кератоконъюнктивит', severity: 'medium' },
      { id: 'pra', name: 'Прогрессирующая атрофия сетчатки', severity: 'high' },
      { id: 'cherry_eye', name: 'Пролапс железы третьего века', severity: 'low' },
    ]
  },
  immune: {
    label: 'Иммунная система',
    conditions: [
      { id: 'imha', name: 'Иммуноопосредованная гемолитическая анемия', severity: 'high' },
      { id: 'itp', name: 'Иммунная тромбоцитопения', severity: 'high' },
      { id: 'lupus', name: 'Системная красная волчанка', severity: 'high' },
    ]
  },
  oncological: {
    label: 'Онкология',
    conditions: [
      { id: 'mast_cell_tumor', name: 'Мастоцитома (опухоль тучных клеток)', severity: 'high' },
      { id: 'lymphoma_dog', name: 'Лимфома', severity: 'high' },
      { id: 'osteosarcoma', name: 'Остеосаркома', severity: 'high' },
      { id: 'hemangiosarcoma', name: 'Гемангиосаркома', severity: 'high' },
      { id: 'melanoma', name: 'Меланома', severity: 'high' },
    ]
  }
};

/**
 * Хронические заболевания для кошек
 */
export const CAT_CHRONIC_CONDITIONS = {
  cardiovascular: {
    label: 'Сердечно-сосудистая система',
    conditions: [
      { id: 'hcm', name: 'Гипертрофическая кардиомиопатия', severity: 'high' },
      { id: 'dcm_cat', name: 'Дилатационная кардиомиопатия', severity: 'high' },
      { id: 'rcm', name: 'Рестриктивная кардиомиопатия', severity: 'high' },
      { id: 'aortic_thromboembolism', name: 'Тромбоэмболия аорты', severity: 'critical' },
      { id: 'hypertension_cat', name: 'Системная гипертензия', severity: 'medium' },
    ]
  },
  digestive: {
    label: 'Пищеварительная система',
    conditions: [
      { id: 'ibd_cat', name: 'Воспалительное заболевание кишечника', severity: 'medium' },
      { id: 'pancreatitis_cat', name: 'Хронический панкреатит', severity: 'medium' },
      { id: 'hepatic_lipidosis', name: 'Липидоз печени', severity: 'high' },
      { id: 'cholangitis', name: 'Холангит/холангиогепатит', severity: 'high' },
      { id: 'triaditis', name: 'Триадит', severity: 'high' },
      { id: 'megacolon', name: 'Мегаколон', severity: 'medium' },
      { id: 'constipation_chronic', name: 'Хронический запор', severity: 'low' },
    ]
  },
  respiratory: {
    label: 'Дыхательная система',
    conditions: [
      { id: 'feline_asthma', name: 'Кошачья астма', severity: 'medium' },
      { id: 'chronic_rhinitis', name: 'Хронический ринит', severity: 'low' },
      { id: 'nasopharyngeal_polyp', name: 'Назофарингеальный полип', severity: 'medium' },
    ]
  },
  urinary: {
    label: 'Мочевыделительная система',
    conditions: [
      { id: 'ckd_cat', name: 'Хроническая болезнь почек', severity: 'high' },
      { id: 'flutd', name: 'Заболевания нижних мочевыводящих путей (FLUTD)', severity: 'medium' },
      { id: 'fic', name: 'Идиопатический цистит кошек', severity: 'medium' },
      { id: 'urolithiasis_cat', name: 'Мочекаменная болезнь', severity: 'medium' },
      { id: 'polycystic_kidney', name: 'Поликистоз почек', severity: 'high' },
    ]
  },
  endocrine: {
    label: 'Эндокринная система',
    conditions: [
      { id: 'hyperthyroidism', name: 'Гипертиреоз', severity: 'medium' },
      { id: 'diabetes_cat', name: 'Сахарный диабет', severity: 'high' },
      { id: 'hyperaldosteronism', name: 'Гиперальдостеронизм', severity: 'high' },
    ]
  },
  dermatological: {
    label: 'Кожа и шерсть',
    conditions: [
      { id: 'eosinophilic_granuloma', name: 'Эозинофильный комплекс', severity: 'medium' },
      { id: 'feline_acne', name: 'Акне кошек', severity: 'low' },
      { id: 'psychogenic_alopecia', name: 'Психогенная алопеция', severity: 'low' },
      { id: 'food_allergy_cat', name: 'Пищевая аллергия', severity: 'medium' },
      { id: 'miliary_dermatitis', name: 'Милиарный дерматит', severity: 'medium' },
    ]
  },
  neurological: {
    label: 'Нервная система',
    conditions: [
      { id: 'epilepsy_cat', name: 'Эпилепсия', severity: 'high' },
      { id: 'vestibular_cat', name: 'Вестибулярный синдром', severity: 'medium' },
      { id: 'cognitive_dysfunction_cat', name: 'Когнитивная дисфункция', severity: 'medium' },
    ]
  },
  ophthalmological: {
    label: 'Глаза',
    conditions: [
      { id: 'hypertensive_retinopathy', name: 'Гипертоническая ретинопатия', severity: 'high' },
      { id: 'uveitis', name: 'Увеит', severity: 'medium' },
      { id: 'glaucoma_cat', name: 'Глаукома', severity: 'high' },
      { id: 'herpes_keratitis', name: 'Герпетический кератит', severity: 'medium' },
    ]
  },
  infectious: {
    label: 'Инфекционные заболевания',
    conditions: [
      { id: 'fiv', name: 'Вирус иммунодефицита кошек (FIV)', severity: 'high' },
      { id: 'felv', name: 'Вирус лейкоза кошек (FeLV)', severity: 'high' },
      { id: 'fip', name: 'Инфекционный перитонит кошек (FIP)', severity: 'critical' },
      { id: 'herpes_chronic', name: 'Хроническая герпесвирусная инфекция', severity: 'low' },
      { id: 'calicivirus_chronic', name: 'Хронический калицивирус', severity: 'medium' },
    ]
  },
  oncological: {
    label: 'Онкология',
    conditions: [
      { id: 'lymphoma_cat', name: 'Лимфома', severity: 'high' },
      { id: 'scc', name: 'Плоскоклеточный рак', severity: 'high' },
      { id: 'mammary_tumor', name: 'Опухоли молочных желёз', severity: 'high' },
      { id: 'fibrosarcoma', name: 'Фибросаркома', severity: 'high' },
    ]
  },
  musculoskeletal: {
    label: 'Опорно-двигательная система',
    conditions: [
      { id: 'dja', name: 'Дегенеративное заболевание суставов', severity: 'medium' },
      { id: 'scottish_fold_osteochondrodysplasia', name: 'Остеохондродисплазия шотландских', severity: 'medium' },
    ]
  }
};

// ===== ВАКЦИНАЦИИ =====

/**
 * Вакцины для собак с периодами ревакцинации
 */
export const DOG_VACCINATIONS = [
  {
    id: 'rabies',
    name: 'Бешенство',
    description: 'Обязательная вакцина по законодательству РФ',
    firstDose: { months: 3 },
    revaccination: { months: 12 }, // ежегодно
    mandatory: true,
    category: 'core'
  },
  {
    id: 'dhpp',
    name: 'DHPP (комплексная)',
    fullName: 'Чума плотоядных, гепатит, парвовирус, парагрипп',
    description: 'Базовая комплексная вакцина',
    firstDose: { weeks: 6 },
    booster: [{ weeks: 9 }, { weeks: 12 }, { weeks: 16 }],
    revaccination: { months: 12 }, // первый год, затем каждые 3 года
    mandatory: true,
    category: 'core'
  },
  {
    id: 'distemper',
    name: 'Чума плотоядных',
    description: 'Тяжёлое вирусное заболевание',
    firstDose: { weeks: 6 },
    revaccination: { years: 3 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'parvovirus',
    name: 'Парвовирусный энтерит',
    description: 'Опасная вирусная инфекция ЖКТ',
    firstDose: { weeks: 6 },
    revaccination: { years: 3 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'hepatitis',
    name: 'Инфекционный гепатит',
    description: 'Аденовирусная инфекция',
    firstDose: { weeks: 6 },
    revaccination: { years: 3 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'leptospirosis',
    name: 'Лептоспироз',
    description: 'Бактериальная инфекция, опасная для человека',
    firstDose: { weeks: 12 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core',
    riskFactors: ['Контакт с грызунами', 'Плавание в водоёмах', 'Сельская местность']
  },
  {
    id: 'bordetella',
    name: 'Бордетеллёз (питомниковый кашель)',
    description: 'Инфекция верхних дыхательных путей',
    firstDose: { weeks: 8 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core',
    riskFactors: ['Посещение выставок', 'Передержки', 'Груминг салоны']
  },
  {
    id: 'parainfluenza',
    name: 'Парагрипп',
    description: 'Респираторная инфекция',
    firstDose: { weeks: 6 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core'
  },
  {
    id: 'lyme',
    name: 'Болезнь Лайма (боррелиоз)',
    description: 'Клещевая инфекция',
    firstDose: { weeks: 12 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core',
    riskFactors: ['Эндемичные районы', 'Частые прогулки в лесу']
  },
  {
    id: 'coronavirus_dog',
    name: 'Коронавирус собак',
    description: 'Кишечная инфекция (не COVID-19)',
    firstDose: { weeks: 6 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core'
  }
];

/**
 * Вакцины для кошек с периодами ревакцинации
 */
export const CAT_VACCINATIONS = [
  {
    id: 'rabies_cat',
    name: 'Бешенство',
    description: 'Обязательная вакцина по законодательству РФ',
    firstDose: { months: 3 },
    revaccination: { months: 12 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'fvrcp',
    name: 'FVRCP (комплексная)',
    fullName: 'Панлейкопения, ринотрахеит, калицивироз',
    description: 'Базовая комплексная вакцина',
    firstDose: { weeks: 6 },
    booster: [{ weeks: 9 }, { weeks: 12 }, { weeks: 16 }],
    revaccination: { years: 3 }, // после первого года
    mandatory: true,
    category: 'core'
  },
  {
    id: 'panleukopenia',
    name: 'Панлейкопения (чумка кошек)',
    description: 'Тяжёлое вирусное заболевание',
    firstDose: { weeks: 6 },
    revaccination: { years: 3 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'calicivirus',
    name: 'Калицивироз',
    description: 'Респираторная инфекция',
    firstDose: { weeks: 6 },
    revaccination: { years: 3 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'rhinotracheitis',
    name: 'Ринотрахеит (герпесвирус)',
    description: 'Респираторная инфекция',
    firstDose: { weeks: 6 },
    revaccination: { years: 3 },
    mandatory: true,
    category: 'core'
  },
  {
    id: 'felv_vaccine',
    name: 'Вирус лейкоза кошек (FeLV)',
    description: 'Рекомендуется для кошек с доступом на улицу',
    firstDose: { weeks: 8 },
    booster: [{ weeks: 12 }],
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core',
    riskFactors: ['Выход на улицу', 'Контакт с другими кошками', 'Питомники']
  },
  {
    id: 'fiv_vaccine',
    name: 'Вирус иммунодефицита кошек (FIV)',
    description: 'Для кошек в группе риска',
    firstDose: { weeks: 8 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core',
    riskFactors: ['Самовыгул', 'Драки с другими котами']
  },
  {
    id: 'chlamydia',
    name: 'Хламидиоз',
    description: 'Инфекция глаз и дыхательных путей',
    firstDose: { weeks: 9 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core',
    riskFactors: ['Питомники', 'Много кошек в доме']
  },
  {
    id: 'bordetella_cat',
    name: 'Бордетеллёз',
    description: 'Инфекция дыхательных путей',
    firstDose: { weeks: 4 },
    revaccination: { months: 12 },
    mandatory: false,
    category: 'non-core'
  }
];

// ===== ПРЕПАРАТЫ =====

/**
 * Категории лекарственных препаратов
 */
export const MEDICATION_CATEGORIES = {
  nsaid: 'Противовоспалительные (НПВС)',
  antibiotic: 'Антибиотики',
  antiparasitic: 'Противопаразитарные',
  cardiac: 'Сердечные препараты',
  hormone: 'Гормональные препараты',
  gastrointestinal: 'Препараты для ЖКТ',
  neurological: 'Неврологические препараты',
  dermatological: 'Дерматологические препараты',
  immunosuppressant: 'Иммуносупрессоры',
  supplement: 'Добавки и витамины',
  analgesic: 'Обезболивающие',
  urinary: 'Урологические препараты'
};

/**
 * Препараты с информацией о взаимодействиях с пищей
 */
export const PET_MEDICATIONS = [
  // Противовоспалительные
  {
    id: 'meloxicam',
    name: 'Мелоксикам',
    brandNames: ['Мелоксидил', 'Локсиком', 'Метакам'],
    category: 'nsaid',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Давать с едой для защиты ЖКТ'
    }
  },
  {
    id: 'carprofen',
    name: 'Карпрофен',
    brandNames: ['Римадил', 'Норокарп', 'Карпродил'],
    category: 'nsaid',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Рекомендуется давать с пищей'
    }
  },
  {
    id: 'robenacoxib',
    name: 'Робенакоксиб',
    brandNames: ['Онсиор'],
    category: 'nsaid',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Можно давать независимо от приёма пищи'
    }
  },
  // Антибиотики
  {
    id: 'amoxicillin_clavulanate',
    name: 'Амоксициллин + Клавуланат',
    brandNames: ['Синулокс', 'Амоксиклав', 'Кламоксил'],
    category: 'antibiotic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['dairy'],
      requiresFood: true,
      note: 'Молочные продукты снижают всасывание. Давать с едой.'
    }
  },
  {
    id: 'metronidazole',
    name: 'Метронидазол',
    brandNames: ['Метрогил', 'Трихопол'],
    category: 'antibiotic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['alcohol_based'],
      requiresFood: true,
      note: 'Давать с пищей для уменьшения тошноты'
    }
  },
  {
    id: 'doxycycline',
    name: 'Доксициклин',
    brandNames: ['Ронаксан', 'Доксибел'],
    category: 'antibiotic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['dairy', 'calcium_rich'],
      requiresFood: true,
      note: 'Кальций снижает всасывание. Избегать молочных продуктов.'
    }
  },
  {
    id: 'enrofloxacin',
    name: 'Энрофлоксацин',
    brandNames: ['Байтрил', 'Энромаг'],
    category: 'antibiotic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['dairy', 'antacids'],
      requiresFood: false,
      note: 'Молочные и антациды снижают эффективность'
    }
  },
  {
    id: 'cephalexin',
    name: 'Цефалексин',
    brandNames: ['Цефаклин', 'Рилексин'],
    category: 'antibiotic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Лучше давать с едой'
    }
  },
  // Противопаразитарные
  {
    id: 'fenbendazole',
    name: 'Фенбендазол',
    brandNames: ['Панакур', 'Прател', 'Фебтал'],
    category: 'antiparasitic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Эффективнее с жирной пищей'
    }
  },
  {
    id: 'milbemycin',
    name: 'Мильбемицин',
    brandNames: ['Мильбемакс', 'Мильпразон'],
    category: 'antiparasitic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Давать с небольшим количеством еды'
    }
  },
  {
    id: 'selamectin',
    name: 'Селамектин',
    brandNames: ['Стронгхолд'],
    category: 'antiparasitic',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Наружное применение, не зависит от еды'
    }
  },
  // Сердечные
  {
    id: 'pimobendan',
    name: 'Пимобендан',
    brandNames: ['Ветмедин'],
    category: 'cardiac',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Давать за 1 час до еды для лучшего всасывания'
    }
  },
  {
    id: 'enalapril',
    name: 'Эналаприл',
    brandNames: ['Энапприл', 'Вазотоп'],
    category: 'cardiac',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['high_salt'],
      requiresFood: false,
      note: 'Ограничить соль в рационе'
    }
  },
  {
    id: 'benazepril',
    name: 'Беназеприл',
    brandNames: ['Фортекор'],
    category: 'cardiac',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['high_salt'],
      requiresFood: false,
      note: 'Можно давать с едой или без'
    }
  },
  {
    id: 'atenolol',
    name: 'Атенолол',
    brandNames: ['Атенолол'],
    category: 'cardiac',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Не зависит от приёма пищи'
    }
  },
  {
    id: 'furosemide',
    name: 'Фуросемид',
    brandNames: ['Лазикс', 'Фуросемид'],
    category: 'cardiac',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['high_salt'],
      requiresFood: false,
      note: 'Ограничить соль. Следить за калием в рационе.'
    }
  },
  // Гормональные
  {
    id: 'levothyroxine',
    name: 'Левотироксин',
    brandNames: ['Эутирокс', 'Л-Тироксин'],
    category: 'hormone',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: ['soy', 'high_fiber', 'calcium_rich'],
      requiresFood: false,
      note: 'Соя и кальций снижают всасывание. Давать натощак.'
    }
  },
  {
    id: 'methimazole',
    name: 'Метимазол',
    brandNames: ['Тиамазол', 'Фелимазол'],
    category: 'hormone',
    species: ['cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Можно давать с едой для уменьшения тошноты'
    }
  },
  {
    id: 'trilostane',
    name: 'Трилостан',
    brandNames: ['Веторил'],
    category: 'hormone',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Обязательно давать с едой'
    }
  },
  {
    id: 'insulin',
    name: 'Инсулин',
    brandNames: ['Канинсулин', 'Протафан'],
    category: 'hormone',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['high_sugar', 'simple_carbs'],
      requiresFood: true,
      note: 'Вводить во время или после еды. Стабильное питание!'
    }
  },
  {
    id: 'prednisolone',
    name: 'Преднизолон',
    brandNames: ['Преднизолон', 'Преднизон'],
    category: 'hormone',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['high_salt'],
      requiresFood: true,
      note: 'Давать с едой для защиты желудка'
    }
  },
  // ЖКТ
  {
    id: 'omeprazole',
    name: 'Омепразол',
    brandNames: ['Омез', 'Лосек'],
    category: 'gastrointestinal',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Давать за 30-60 минут до еды'
    }
  },
  {
    id: 'famotidine',
    name: 'Фамотидин',
    brandNames: ['Квамател'],
    category: 'gastrointestinal',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Можно давать с едой или без'
    }
  },
  {
    id: 'sucralfate',
    name: 'Сукральфат',
    brandNames: ['Вентер', 'Сукральфат'],
    category: 'gastrointestinal',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Давать за 1-2 часа до еды и других лекарств'
    }
  },
  {
    id: 'maropitant',
    name: 'Маропитант',
    brandNames: ['Серения'],
    category: 'gastrointestinal',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Лучше давать с небольшим количеством еды'
    }
  },
  // Неврологические
  {
    id: 'phenobarbital',
    name: 'Фенобарбитал',
    brandNames: ['Люминал', 'Паглюферал'],
    category: 'neurological',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Постоянное время приёма с едой'
    }
  },
  {
    id: 'potassium_bromide',
    name: 'Калия бромид',
    brandNames: ['Либромид'],
    category: 'neurological',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: ['high_salt', 'high_chloride'],
      requiresFood: true,
      note: 'Стабильный уровень соли в рационе важен!'
    }
  },
  {
    id: 'gabapentin',
    name: 'Габапентин',
    brandNames: ['Нейронтин', 'Габагамма'],
    category: 'neurological',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Не зависит от приёма пищи'
    }
  },
  {
    id: 'selegiline',
    name: 'Селегилин',
    brandNames: ['Аниприл'],
    category: 'neurological',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: ['tyramine_rich', 'aged_cheese'],
      requiresFood: false,
      note: 'Избегать продуктов с тирамином'
    }
  },
  // Урологические
  {
    id: 'prazosin',
    name: 'Празозин',
    brandNames: ['Польпрессин'],
    category: 'urinary',
    species: ['cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Давать с едой'
    }
  },
  // Дерматологические
  {
    id: 'apoquel',
    name: 'Оклацитиниб',
    brandNames: ['Апоквел'],
    category: 'dermatological',
    species: ['dog'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Можно давать с едой или без'
    }
  },
  {
    id: 'cyclosporine',
    name: 'Циклоспорин',
    brandNames: ['Атопика'],
    category: 'immunosuppressant',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: ['grapefruit'],
      requiresFood: false,
      note: 'Грейпфрут повышает концентрацию. Давать натощак.'
    }
  },
  // Добавки
  {
    id: 'omega_fatty_acids',
    name: 'Омега-3/6 жирные кислоты',
    brandNames: ['Эфа', 'Дерм Капс', 'Омега Пет'],
    category: 'supplement',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Давать с едой для лучшего усвоения'
    }
  },
  {
    id: 'glucosamine_chondroitin',
    name: 'Глюкозамин + Хондроитин',
    brandNames: ['Гелакан', 'Страйд', 'Артрогликан'],
    category: 'supplement',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Лучше усваивается с пищей'
    }
  },
  {
    id: 'probiotics',
    name: 'Пробиотики',
    brandNames: ['Про-Колин', 'Форти Флора', 'Вийо'],
    category: 'supplement',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Добавлять в еду'
    }
  },
  {
    id: 'sam_e',
    name: 'S-Аденозилметионин (SAMe)',
    brandNames: ['Денозил', 'Гептрал'],
    category: 'supplement',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: false,
      note: 'Давать натощак за 1 час до еды'
    }
  },
  {
    id: 'ursodiol',
    name: 'Урсодезоксихолевая кислота',
    brandNames: ['Урсофальк', 'Урсосан'],
    category: 'gastrointestinal',
    species: ['dog', 'cat'],
    foodInteractions: {
      excludedIngredients: [],
      requiresFood: true,
      note: 'Давать с едой'
    }
  }
];

// ===== ПРОДУКТЫ И ИНГРЕДИЕНТЫ =====

/**
 * База продуктов питания для питомцев
 */
export const PET_FOOD_PRODUCTS = [
  // Мясо
  { id: 'chicken', name: 'Курица', category: 'meat', allergenicity: 'high' },
  { id: 'beef', name: 'Говядина', category: 'meat', allergenicity: 'high' },
  { id: 'turkey', name: 'Индейка', category: 'meat', allergenicity: 'low' },
  { id: 'lamb', name: 'Ягнёнок', category: 'meat', allergenicity: 'low' },
  { id: 'rabbit', name: 'Кролик', category: 'meat', allergenicity: 'low' },
  { id: 'duck', name: 'Утка', category: 'meat', allergenicity: 'low' },
  { id: 'pork', name: 'Свинина', category: 'meat', allergenicity: 'medium' },
  { id: 'venison', name: 'Оленина', category: 'meat', allergenicity: 'low' },
  { id: 'horse', name: 'Конина', category: 'meat', allergenicity: 'low' },
  { id: 'goat', name: 'Козлятина', category: 'meat', allergenicity: 'low' },
  
  // Субпродукты
  { id: 'liver', name: 'Печень', category: 'offal', allergenicity: 'medium' },
  { id: 'heart', name: 'Сердце', category: 'offal', allergenicity: 'low' },
  { id: 'kidney', name: 'Почки', category: 'offal', allergenicity: 'low' },
  { id: 'tripe', name: 'Рубец', category: 'offal', allergenicity: 'low' },
  { id: 'lung', name: 'Лёгкое', category: 'offal', allergenicity: 'low' },
  
  // Рыба
  { id: 'salmon', name: 'Лосось', category: 'fish', allergenicity: 'medium' },
  { id: 'whitefish', name: 'Белая рыба', category: 'fish', allergenicity: 'medium' },
  { id: 'tuna', name: 'Тунец', category: 'fish', allergenicity: 'medium' },
  { id: 'herring', name: 'Сельдь', category: 'fish', allergenicity: 'low' },
  { id: 'cod', name: 'Треска', category: 'fish', allergenicity: 'low' },
  { id: 'sardine', name: 'Сардина', category: 'fish', allergenicity: 'low' },
  { id: 'mackerel', name: 'Скумбрия', category: 'fish', allergenicity: 'low' },
  
  // Молочные
  { id: 'milk', name: 'Молоко', category: 'dairy', allergenicity: 'high' },
  { id: 'cheese', name: 'Сыр', category: 'dairy', allergenicity: 'medium' },
  { id: 'cottage_cheese', name: 'Творог', category: 'dairy', allergenicity: 'medium' },
  { id: 'yogurt', name: 'Йогурт', category: 'dairy', allergenicity: 'medium' },
  { id: 'kefir', name: 'Кефир', category: 'dairy', allergenicity: 'low' },
  
  // Яйца
  { id: 'eggs', name: 'Яйца', category: 'eggs', allergenicity: 'medium' },
  { id: 'egg_yolk', name: 'Желток', category: 'eggs', allergenicity: 'low' },
  { id: 'egg_white', name: 'Белок', category: 'eggs', allergenicity: 'medium' },
  
  // Злаки
  { id: 'rice', name: 'Рис', category: 'grains', allergenicity: 'low' },
  { id: 'wheat', name: 'Пшеница', category: 'grains', allergenicity: 'high' },
  { id: 'corn', name: 'Кукуруза', category: 'grains', allergenicity: 'high' },
  { id: 'oats', name: 'Овёс', category: 'grains', allergenicity: 'low' },
  { id: 'barley', name: 'Ячмень', category: 'grains', allergenicity: 'medium' },
  { id: 'millet', name: 'Просо', category: 'grains', allergenicity: 'low' },
  { id: 'buckwheat', name: 'Гречка', category: 'grains', allergenicity: 'low' },
  
  // Бобовые
  { id: 'soy', name: 'Соя', category: 'legumes', allergenicity: 'high' },
  { id: 'peas', name: 'Горох', category: 'legumes', allergenicity: 'low' },
  { id: 'lentils', name: 'Чечевица', category: 'legumes', allergenicity: 'low' },
  { id: 'chickpeas', name: 'Нут', category: 'legumes', allergenicity: 'low' },
  
  // Овощи
  { id: 'carrot', name: 'Морковь', category: 'vegetables', allergenicity: 'low' },
  { id: 'pumpkin', name: 'Тыква', category: 'vegetables', allergenicity: 'low' },
  { id: 'zucchini', name: 'Кабачок', category: 'vegetables', allergenicity: 'low' },
  { id: 'sweet_potato', name: 'Батат', category: 'vegetables', allergenicity: 'low' },
  { id: 'potato', name: 'Картофель', category: 'vegetables', allergenicity: 'low' },
  { id: 'spinach', name: 'Шпинат', category: 'vegetables', allergenicity: 'low' },
  { id: 'broccoli', name: 'Брокколи', category: 'vegetables', allergenicity: 'low' },
  { id: 'green_beans', name: 'Стручковая фасоль', category: 'vegetables', allergenicity: 'low' },
  
  // Фрукты
  { id: 'apple', name: 'Яблоко', category: 'fruits', allergenicity: 'low' },
  { id: 'banana', name: 'Банан', category: 'fruits', allergenicity: 'low' },
  { id: 'blueberry', name: 'Черника', category: 'fruits', allergenicity: 'low' },
  { id: 'cranberry', name: 'Клюква', category: 'fruits', allergenicity: 'low' },
  
  // Масла
  { id: 'fish_oil', name: 'Рыбий жир', category: 'oils', allergenicity: 'low' },
  { id: 'flaxseed_oil', name: 'Льняное масло', category: 'oils', allergenicity: 'low' },
  { id: 'coconut_oil', name: 'Кокосовое масло', category: 'oils', allergenicity: 'low' },
  { id: 'sunflower_oil', name: 'Подсолнечное масло', category: 'oils', allergenicity: 'low' },
];

/**
 * Категории аллергенов/непереносимостей
 */
export const ALLERGY_CATEGORIES = [
  { id: 'protein', name: 'Белковые аллергены', items: ['chicken', 'beef', 'eggs', 'fish', 'dairy', 'lamb', 'pork'] },
  { id: 'grain', name: 'Зерновые', items: ['wheat', 'corn', 'soy', 'gluten'] },
  { id: 'additives', name: 'Добавки', items: ['artificial_colors', 'artificial_flavors', 'preservatives'] },
];

/**
 * Полный список аллергий/непереносимостей для выбора
 */
export const ALLERGIES_LIST = [
  // Белковые
  { id: 'chicken_allergy', name: 'Курица', category: 'protein', severity: 'common' },
  { id: 'beef_allergy', name: 'Говядина', category: 'protein', severity: 'common' },
  { id: 'fish_allergy', name: 'Рыба', category: 'protein', severity: 'common' },
  { id: 'eggs_allergy', name: 'Яйца', category: 'protein', severity: 'medium' },
  { id: 'dairy_allergy', name: 'Молочные продукты', category: 'protein', severity: 'common' },
  { id: 'lamb_allergy', name: 'Баранина', category: 'protein', severity: 'rare' },
  { id: 'pork_allergy', name: 'Свинина', category: 'protein', severity: 'medium' },
  { id: 'turkey_allergy', name: 'Индейка', category: 'protein', severity: 'rare' },
  { id: 'rabbit_allergy', name: 'Кролик', category: 'protein', severity: 'rare' },
  { id: 'duck_allergy', name: 'Утка', category: 'protein', severity: 'rare' },
  
  // Зерновые
  { id: 'wheat_allergy', name: 'Пшеница', category: 'grain', severity: 'common' },
  { id: 'corn_allergy', name: 'Кукуруза', category: 'grain', severity: 'common' },
  { id: 'soy_allergy', name: 'Соя', category: 'grain', severity: 'common' },
  { id: 'gluten_allergy', name: 'Глютен', category: 'grain', severity: 'medium' },
  { id: 'rice_allergy', name: 'Рис', category: 'grain', severity: 'rare' },
  { id: 'oats_allergy', name: 'Овёс', category: 'grain', severity: 'rare' },
  
  // Добавки
  { id: 'artificial_colors', name: 'Искусственные красители', category: 'additives', severity: 'medium' },
  { id: 'artificial_flavors', name: 'Искусственные ароматизаторы', category: 'additives', severity: 'medium' },
  { id: 'preservatives', name: 'Консерванты', category: 'additives', severity: 'medium' },
  { id: 'bha_bht', name: 'BHA/BHT', category: 'additives', severity: 'medium' },
  { id: 'ethoxyquin', name: 'Этоксиквин', category: 'additives', severity: 'medium' },
];

// ===== ДОПОЛНИТЕЛЬНЫЕ СПРАВОЧНИКИ =====

/**
 * Варианты частоты прогулок
 */
export const WALK_FREQUENCY_OPTIONS = [
  { value: 'none', label: 'Не гуляет' },
  { value: '1_day', label: '1 раз в день' },
  { value: '2_day', label: '2 раза в день' },
  { value: '3_day', label: '3 раза в день' },
  { value: '4_plus', label: '4+ раз в день' },
  { value: 'free_access', label: 'Свободный выгул' },
];

/**
 * Варианты длительности прогулок
 */
export const WALK_DURATION_OPTIONS = [
  { value: 'under_15', label: 'Менее 15 минут' },
  { value: '15_30', label: '15-30 минут' },
  { value: '30_60', label: '30-60 минут' },
  { value: '60_90', label: '1-1.5 часа' },
  { value: '90_120', label: '1.5-2 часа' },
  { value: 'over_120', label: 'Более 2 часов' },
];

/**
 * Цели дрессировки
 */
export const TRAINING_GOALS = [
  { id: 'basic_obedience', name: 'Базовое послушание', description: 'Сидеть, лежать, ко мне, место' },
  { id: 'leash_walking', name: 'Хождение на поводке', description: 'Не тянуть поводок, идти рядом' },
  { id: 'recall', name: 'Подзыв', description: 'Надёжный подход по команде' },
  { id: 'socialization', name: 'Социализация', description: 'Дружелюбие к людям и животным' },
  { id: 'house_training', name: 'Приучение к туалету', description: 'Чистоплотность в доме' },
  { id: 'crate_training', name: 'Приучение к клетке', description: 'Спокойное пребывание в переноске' },
  { id: 'separation_anxiety', name: 'Работа с тревогой разлуки', description: 'Спокойное одиночество' },
  { id: 'aggression', name: 'Коррекция агрессии', description: 'Работа с агрессивным поведением' },
  { id: 'fear_reactivity', name: 'Работа со страхами', description: 'Преодоление фобий и реактивности' },
  { id: 'tricks', name: 'Трюки', description: 'Развлекательные команды' },
  { id: 'agility', name: 'Аджилити', description: 'Спортивная подготовка' },
  { id: 'protection', name: 'Защитная служба', description: 'ЗКС, IPO, охрана' },
  { id: 'search_rescue', name: 'Поисково-спасательная служба', description: 'Поиск людей' },
  { id: 'therapy', name: 'Канистерапия', description: 'Работа собакой-терапевтом' },
  { id: 'service', name: 'Собака-помощник', description: 'Помощь людям с инвалидностью' },
];

/**
 * Типы других питомцев в доме
 */
export const OTHER_PET_TYPES = [
  { id: 'dog', name: 'Собака', icon: '🐕' },
  { id: 'cat', name: 'Кошка', icon: '🐈' },
  { id: 'bird', name: 'Птица', icon: '🐦' },
  { id: 'rodent', name: 'Грызун', icon: '🐹' },
  { id: 'rabbit', name: 'Кролик', icon: '🐰' },
  { id: 'fish', name: 'Рыбки', icon: '🐠' },
  { id: 'reptile', name: 'Рептилия', icon: '🦎' },
  { id: 'ferret', name: 'Хорёк', icon: '🦡' },
];

/**
 * Расширенные черты характера
 */
export const CHARACTER_TRAITS_EXTENDED = [
  { id: 'friendly', name: 'Дружелюбный', category: 'social' },
  { id: 'active', name: 'Активный', category: 'energy' },
  { id: 'calm', name: 'Спокойный', category: 'temperament' },
  { id: 'playful', name: 'Игривый', category: 'energy' },
  { id: 'shy', name: 'Застенчивый', category: 'social' },
  { id: 'curious', name: 'Любопытный', category: 'mental' },
  { id: 'independent', name: 'Независимый', category: 'temperament' },
  { id: 'affectionate', name: 'Ласковый', category: 'social' },
  { id: 'stubborn', name: 'Упрямый', category: 'temperament' },
  { id: 'smart', name: 'Умный', category: 'mental' },
  { id: 'loyal', name: 'Преданный', category: 'social' },
  { id: 'social', name: 'Общительный', category: 'social' },
  { id: 'protective', name: 'Защитник', category: 'temperament' },
  { id: 'gentle', name: 'Нежный', category: 'temperament' },
  { id: 'patient', name: 'Терпеливый', category: 'temperament' },
  { id: 'alert', name: 'Бдительный', category: 'mental' },
  { id: 'confident', name: 'Уверенный', category: 'temperament' },
  { id: 'sensitive', name: 'Чувствительный', category: 'temperament' },
  { id: 'energetic', name: 'Энергичный', category: 'energy' },
  { id: 'lazy', name: 'Ленивый', category: 'energy' },
  { id: 'fearful', name: 'Пугливый', category: 'temperament' },
  { id: 'dominant', name: 'Доминантный', category: 'temperament' },
  { id: 'submissive', name: 'Покладистый', category: 'temperament' },
  { id: 'vocal', name: 'Голосистый', category: 'behavior' },
  { id: 'quiet', name: 'Тихий', category: 'behavior' },
];

/**
 * Расширенные поведенческие проблемы
 */
export const BEHAVIORAL_PROBLEMS_EXTENDED = [
  { id: 'excessive_barking', name: 'Чрезмерный лай', category: 'vocalization', species: ['dog'] },
  { id: 'excessive_meowing', name: 'Чрезмерное мяуканье', category: 'vocalization', species: ['cat'] },
  { id: 'destructive_chewing', name: 'Деструктивное жевание', category: 'destruction', species: ['dog'] },
  { id: 'furniture_scratching', name: 'Царапает мебель', category: 'destruction', species: ['cat'] },
  { id: 'animal_aggression', name: 'Агрессия к животным', category: 'aggression', species: ['dog', 'cat'] },
  { id: 'human_aggression', name: 'Агрессия к людям', category: 'aggression', species: ['dog', 'cat'] },
  { id: 'fear_aggression', name: 'Агрессия от страха', category: 'aggression', species: ['dog', 'cat'] },
  { id: 'resource_guarding', name: 'Охрана ресурсов', category: 'aggression', species: ['dog', 'cat'] },
  { id: 'noise_phobia', name: 'Боязнь громких звуков', category: 'anxiety', species: ['dog', 'cat'] },
  { id: 'separation_anxiety', name: 'Тревога разлуки', category: 'anxiety', species: ['dog', 'cat'] },
  { id: 'general_anxiety', name: 'Общая тревожность', category: 'anxiety', species: ['dog', 'cat'] },
  { id: 'territory_marking', name: 'Метит территорию', category: 'elimination', species: ['dog', 'cat'] },
  { id: 'house_soiling', name: 'Не приучен к туалету', category: 'elimination', species: ['dog', 'cat'] },
  { id: 'inappropriate_elimination', name: 'Ходит мимо лотка', category: 'elimination', species: ['cat'] },
  { id: 'leash_pulling', name: 'Тянет поводок', category: 'leash', species: ['dog'] },
  { id: 'leash_reactivity', name: 'Реактивность на поводке', category: 'leash', species: ['dog'] },
  { id: 'ignoring_commands', name: 'Игнорирует команды', category: 'obedience', species: ['dog'] },
  { id: 'jumping_on_people', name: 'Прыгает на людей', category: 'obedience', species: ['dog'] },
  { id: 'counter_surfing', name: 'Лазит на столы', category: 'obedience', species: ['dog', 'cat'] },
  { id: 'food_stealing', name: 'Ворует еду', category: 'obedience', species: ['dog', 'cat'] },
  { id: 'escaping', name: 'Пытается сбежать', category: 'safety', species: ['dog', 'cat'] },
  { id: 'coprophagia', name: 'Копрофагия (поедание кала)', category: 'eating', species: ['dog'] },
  { id: 'pica', name: 'Пика (поедание несъедобного)', category: 'eating', species: ['dog', 'cat'] },
  { id: 'excessive_licking', name: 'Чрезмерное вылизывание', category: 'compulsive', species: ['dog', 'cat'] },
  { id: 'tail_chasing', name: 'Гоняется за хвостом', category: 'compulsive', species: ['dog'] },
  { id: 'wool_sucking', name: 'Сосёт ткань', category: 'compulsive', species: ['cat'] },
  { id: 'hyperactivity', name: 'Гиперактивность', category: 'energy', species: ['dog'] },
  { id: 'night_activity', name: 'Ночная активность', category: 'energy', species: ['cat'] },
];

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * Получить все хронические заболевания для вида животного
 */
export const getChronicConditions = (species) => {
  const conditions = species === 'cat' ? CAT_CHRONIC_CONDITIONS : DOG_CHRONIC_CONDITIONS;
  const result = [];
  
  Object.values(conditions).forEach(category => {
    category.conditions.forEach(condition => {
      result.push({
        ...condition,
        category: category.label
      });
    });
  });
  
  return result;
};

/**
 * Получить вакцины для вида животного
 */
export const getVaccinations = (species) => {
  return species === 'cat' ? CAT_VACCINATIONS : DOG_VACCINATIONS;
};

/**
 * Получить препараты для вида животного
 */
export const getMedications = (species) => {
  return PET_MEDICATIONS.filter(med => med.species.includes(species));
};

/**
 * Получить поведенческие проблемы для вида животного
 */
export const getBehavioralProblems = (species) => {
  return BEHAVIORAL_PROBLEMS_EXTENDED.filter(
    problem => problem.species.includes(species)
  );
};

/**
 * Получить исключаемые продукты на основе принимаемых препаратов
 */
export const getExcludedFoodsByMedications = (medicationIds) => {
  const excluded = new Set();
  
  medicationIds.forEach(medId => {
    const medication = PET_MEDICATIONS.find(m => m.id === medId);
    if (medication?.foodInteractions?.excludedIngredients) {
      medication.foodInteractions.excludedIngredients.forEach(ing => excluded.add(ing));
    }
  });
  
  return Array.from(excluded);
};

/**
 * Рассчитать дату следующей вакцинации
 */
export const calculateNextVaccinationDate = (vaccination, lastDate) => {
  if (!lastDate || !vaccination.revaccination) return null;
  
  const date = new Date(lastDate);
  
  if (vaccination.revaccination.months) {
    date.setMonth(date.getMonth() + vaccination.revaccination.months);
  } else if (vaccination.revaccination.years) {
    date.setFullYear(date.getFullYear() + vaccination.revaccination.years);
  }
  
  return date;
};

