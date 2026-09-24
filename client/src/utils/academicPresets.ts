import { AcademicLevel } from '../types';

export interface LevelInfo {
  id: AcademicLevel;
  title: string;
  subtitle: string;
  badge: string;
  suggestedAge: number;
  ageRange: string;
  description: string;
  iconName: string;
  subjects: string[];
}

export const ACADEMIC_LEVELS: LevelInfo[] = [
  {
    id: 'primaria',
    title: 'Primaria (Educación Básica)',
    subtitle: 'Niños de 6 a 11 años',
    badge: '🎒 Primaria',
    suggestedAge: 9,
    ageRange: '6 - 11 años',
    description: 'Profesor integral, cariñoso y divertido. Explica con manzanitas, fábulas y metáforas fáciles. Te ayuda con tareas y exámenes de todas las materias.',
    iconName: 'Sparkles',
    subjects: [
      'Matemáticas Divertidas (Sumas, Restas, Tablas)',
      'Lengua Española y Comprensión Lectora',
      'Ciencias de la Naturaleza',
      'Ciencias Sociales e Historia',
      'Inglés Inicial',
      'Educación Artística',
    ],
  },
  {
    id: 'secundaria',
    title: 'Secundaria / Bachillerato / Liceo',
    subtitle: 'Jóvenes de 12 a 17 años',
    badge: '🏫 Secundaria',
    suggestedAge: 15,
    ageRange: '12 - 17 años',
    description: 'Profesor polimático para asignaturas del liceo. Razonamiento paso a paso, trucos para recordar fórmulas y preparación para pruebas.',
    iconName: 'BookOpen',
    subjects: [
      'Matemáticas (Álgebra y Geometría)',
      'Física Elemental y Mecánica',
      'Química General',
      'Biología y Anatomía básica',
      'Lengua Castellana y Literatura',
      'Historia Universal y Geografía',
      'Inglés Intermedio',
      'Filosofía y Formación Ciudadana',
    ],
  },
  {
    id: 'universidad',
    title: 'Nivel Universitario (Pregrado)',
    subtitle: 'Estudiantes de Carrera Superior',
    badge: '🎓 Universidad',
    suggestedAge: 20,
    ageRange: '18+ años',
    description: 'Profesor de cátedra especializado en tu carrera y semestre exacto. Rigor técnico, casos prácticos, papers y preparación profesional.',
    iconName: 'GraduationCap',
    subjects: [], // populated dynamically based on career
  },
  {
    id: 'posgrado',
    title: 'Posgrado / Maestría / Doctorado',
    subtitle: 'Investigación y Especialización',
    badge: '🏛️ Posgrado',
    suggestedAge: 26,
    ageRange: '23+ años',
    description: 'Tutor de tesis y cátedra avanzada. Análisis crítico de frontera, metodología de investigación, discusión científica y papers.',
    iconName: 'Award',
    subjects: [],
  },
  {
    id: 'autodidacta',
    title: 'Autodidacta / Aprendizaje Libre',
    subtitle: 'Para cualquier persona con ganas de aprender',
    badge: '💡 Autodidacta',
    suggestedAge: 28,
    ageRange: 'Cualquier edad',
    description: 'Mentor personal práctico y paciente. Aprende desde cero sin jerga pesada, con ejemplos del mundo real y a tu propio ritmo.',
    iconName: 'Compass',
    subjects: [
      'Programación y Desarrollo Web',
      'Finanzas Personales e Inversiones',
      'Inteligencia Artificial y Tecnología',
      'Idiomas (Inglés Práctico)',
      'Escritura y Oratoria',
      'Ciencia Cotidiana y Astronomía',
      'Emprendimiento y Negocios',
    ],
  },
];

export interface CareerOption {
  name: string;
  category: string;
  typicalSemesters: number;
  semesterSubjects: Record<number, string[]>;
}

export const POPULAR_CAREERS: CareerOption[] = [
  {
    name: 'Medicina Humana',
    category: 'Ciencias de la Salud',
    typicalSemesters: 12,
    semesterSubjects: {
      1: ['Anatomía Humana I', 'Biología Celular', 'Bioquímica Médica', 'Bioética Médica'],
      2: ['Anatomía Humana II', 'Histología y Embriología', 'Fisiología I', 'Genética Médica'],
      3: ['Fisiología II', 'Microbiología e Inmunología', 'Neuroanatomía', 'Bioestadística Médica'],
      4: ['Farmacología General', 'Patología General', 'Semiología Médica I', 'Epidemiología'],
      5: ['Farmacología Clínica', 'Fisiopatología', 'Semiología Quirúrgica', 'Diagnóstico por Imágenes'],
      6: ['Medicina Interna I (Cardiología / Neumología)', 'Cirugía General I', 'Pediatría I', 'Toxicología'],
      7: ['Medicina Interna II (Gastro / Nefro / Reumato)', 'Ginecología y Obstetricia I', 'Neurología', 'Dermatología'],
      8: ['Psiquiatría Clínica', 'Traumatología y Ortopedia', 'Oftalmología y Otorrinolaringología', 'Urgencias Médicas'],
    },
  },
  {
    name: 'Ingeniería de Sistemas / Software',
    category: 'Ingeniería y Tecnología',
    typicalSemesters: 10,
    semesterSubjects: {
      1: ['Cálculo Diferencial', 'Álgebra Lineal', 'Fundamentos de Programación (Python)', 'Física Mecánica'],
      2: ['Cálculo Integral', 'Estructuras de Datos y Algoritmos', 'Programación Orientada a Objetos', 'Matemáticas Discretas'],
      3: ['Cálculo Multivariable', 'Bases de Datos Relacionales (SQL)', 'Arquitectura de Computadores', 'Ecuaciones Diferenciales'],
      4: ['Sistemas Operativos', 'Ingeniería de Software I', 'Redes de Computadoras', 'Bases de Datos NoSQL'],
      5: ['Desarrollo Web Full-Stack', 'Inteligencia Artificial y Machine Learning', 'Seguridad Informática', 'Sistemas Distribuidos'],
      6: ['Arquitectura de Microservicios', 'Cloud Computing (GCP/AWS)', 'DevOps y CI/CD', 'Compiladores'],
    },
  },
  {
    name: 'Derecho y Ciencias Jurídicas',
    category: 'Ciencias Sociales y Humanidades',
    typicalSemesters: 10,
    semesterSubjects: {
      1: ['Introducción al Derecho', 'Derecho Romano', 'Historia del Derecho', 'Teoría del Estado'],
      2: ['Derecho Civil I (Personas)', 'Derecho Constitucional General', 'Filosofía del Derecho', 'Sociología Jurídica'],
      3: ['Derecho Civil II (Bienes)', 'Derecho Penal General (Teoría del Delito)', 'Derecho Administrativo I', 'Derechos Humanos'],
      4: ['Derecho Civil III (Obligaciones)', 'Derecho Penal Especial', 'Derecho Procesal General', 'Derecho Internacional Público'],
      5: ['Derecho Civil IV (Contratos)', 'Derecho Procesal Penal', 'Derecho Laboral Individual', 'Derecho Mercantil'],
      6: ['Derecho Procesal Civil', 'Derecho Laboral Colectivo', 'Derecho Tributario', 'Litigación Oral y Argumentación'],
    },
  },
  {
    name: 'Psicología',
    category: 'Ciencias de la Salud',
    typicalSemesters: 10,
    semesterSubjects: {
      1: ['Bases Biológicas de la Conducta', 'Historia de la Psicología', 'Procesos Psicológicos Básicos', 'Metodología'],
      2: ['Neuroanatomía y Neurofisiología', 'Psicología del Desarrollo (Infancia y Adolescencia)', 'Teorías de la Personalidad', 'Estadística'],
      3: ['Psicopatología General', 'Psicología Cognitivo-Conductual', 'Psicología Social', 'Evaluación Psicológica I'],
      4: ['Psicopatología Clínica Infantil y Adulto', 'Psicometría y Tests', 'Psicología Clínica', 'Entrevista Psicológica'],
      5: ['Psicoterapia Cognitiva', 'Psicología Educativa', 'Psicología Organizacional', 'Neuropsicología Clínica'],
    },
  },
  {
    name: 'Administración de Empresas y Finanzas',
    category: 'Negocios y Economía',
    typicalSemesters: 8,
    semesterSubjects: {
      1: ['Fundamentos de Administración', 'Contabilidad Financiera I', 'Microeconomía', 'Matemáticas Financieras'],
      2: ['Contabilidad de Costos', 'Macroeconomía', 'Estadística para los Negocios', 'Derecho Empresarial'],
      3: ['Finanzas Corporativas I', 'Marketing Estratégico', 'Gestión del Talento Humano', 'Comportamiento Organizacional'],
      4: ['Finanzas Corporativas II', 'Investigación de Mercados', 'Operaciones y Logística', 'Presupuestos'],
      5: ['Dirección Estratégica', 'Evaluación de Proyectos de Inversión', 'Mercados Financieros', 'Negocios Internacionales'],
    },
  },
  {
    name: 'Arquitectura y Urbanismo',
    category: 'Arte y Diseño',
    typicalSemesters: 10,
    semesterSubjects: {
      1: ['Taller de Diseño Arquitectónico I', 'Geometría Descriptiva', 'Historia de la Arquitectura I', 'Expresión Gráfica'],
      2: ['Taller de Diseño II', 'Estructuras I (Estática)', 'Materiales de Construcción', 'Historia de la Arquitectura II'],
      3: ['Taller de Diseño III', 'Estructuras II (Hormigón y Acero)', 'Instalaciones Hidráulicas y Eléctricas', 'Urbanismo I'],
      4: ['Taller de Diseño IV', 'Acondicionamiento Ambiental', 'Construcción Sostenible', 'BIM y Modelado 3D'],
    },
  },
];

export const POSGRADO_AREAS = [
  'Maestría en Ciencias Médicas / Especialidad Quirúrgica',
  'Maestría / Doctorado en Inteligencia Artificial y Ciencia de Datos',
  'Maestría en Derecho Constitucional / Penal / Corporativo',
  'MBA (Maestría en Administración de Negocios)',
  'Maestría en Educación y Pedagogía Digital',
  'Doctorado en Ciencias Biológicas y Biomédicas',
  'Maestría en Ingeniería Estructural / Ambiental',
  'Investigación Libre de Tesis / Paper Científico',
];

export const SAMPLE_PROMPTS_BY_LEVEL: Record<AcademicLevel, string[]> = {
  primaria: [
    '🍎 Explícame por qué el cielo es azul como si fuera una aventura',
    '➗ Ayúdame a entender las divisiones con un ejemplo divertido',
    '🌿 ¿Cómo fabrican las plantas su propia comida (fotosíntesis)?',
    '📖 ¿Cómo puedo escribir un cuento que empiece con un dragón amable?',
  ],
  secundaria: [
    '📐 Resuelve paso a paso una ecuación cuadrática por fórmula general',
    '⚡ Explica la Segunda Ley de Newton con un ejemplo de un cohete',
    '🧪 ¿Cómo balancear una ecuación química por método de tanteo?',
    '🌍 ¿Cuáles fueron las causas principales de la Primera Guerra Mundial?',
  ],
  universidad: [
    '🩺 Explica la cascada de coagulación y las vías intrínseca y extrínseca',
    '💻 Diferencias arquitectónicas entre REST, GraphQL y gRPC con casos de uso',
    '⚖️ ¿Cuál es la diferencia entre dolo eventual y culpa con representación?',
    '📊 ¿Cómo calcular e interpretar el WACC (costo promedio ponderado de capital)?',
  ],
  posgrado: [
    '📑 ¿Cómo justificar la validez de constructo en un diseño cuasiexperimental?',
    '🔬 Realiza una síntesis crítica sobre los últimos avances en transformers y memoria recurrente',
    '📊 Análisis metodológico para el control de variables confusoras en estudios de cohortes',
    '💡 Sugerencias para formular una hipótesis nula y alternativa robusta en mi tesis',
  ],
  autodidacta: [
    '🐍 Quiero aprender Python desde cero: ¿cuál es el primer paso práctico?',
    '💰 ¿Cómo armar un presupuesto mensual y fondo de emergencia real?',
    '🗣️ 10 frases clave en inglés para sonar más natural en una conversación',
    '🤖 ¿Cómo funciona una red neuronal de manera intuitiva y sin matemáticas pesadas?',
  ],
};

// ---------- Sugerencias inteligentes por perfil ----------
// Primaria y secundaria: datos curiosos que invitan a preguntar.
// Universidad y posgrado: tips del área de estudio del estudiante.

const FUN_FACTS_PRIMARIA: string[] = [
  '¿Sabías que los pulpos tienen 3 corazones y sangre azul?',
  '¿Sabías que un rayo puede calentar el aire 5 veces más que el sol?',
  '¿Sabías que las abejas reconocen rostros y bailan para hablar?',
  '¿Sabías que la Luna se aleja de la Tierra 4 centímetros cada año?',
  '¿Sabías que tu cuerpo tiene más de 200 huesos cuando eres bebé?',
  '¿Sabías que los árboles se comunican entre ellos por las raíces?',
  '¿Sabías que un delfín duerme con medio cerebro despierto?',
  '¿Sabías que el azúcar moreno y el blanco vienen de la misma planta?',
];

const FUN_FACTS_SECUNDARIA: string[] = [
  '¿Sabías que el agua que bebes hoy pudo ser de un dinosaurio?',
  '¿Sabías que la luz del Sol tarda 8 minutos en llegar a la Tierra?',
  '¿Sabías que tu cuerpo tiene suficiente hierro para hacer un clavo?',
  '¿Sabías que Venus gira al revés y un día dura más que un año?',
  '¿Sabías que los tiburones existían antes que los árboles?',
  '¿Sabías que el vidrio es un líquido tan viscoso que parece sólido?',
  '¿Sabías que sin la Luna la Tierra giraría tan rápido que un día duraría 6 horas?',
  '¿Sabías que hay más células de bacterias en tu cuerpo que células tuyas?',
];

interface CareerTipGroup {
  match: RegExp;
  tips: string[];
}

const CAREER_TIPS: CareerTipGroup[] = [
  {
    match: /medic|enfermer|bioanáli|odontolog|veterinar|farmac|salud|medicina|anatom|fisiolog/,
    tips: [
      'Tip de Medicina: repasa la cascada de coagulación con un caso clínico',
      'Tip de Medicina: ¿cómo actúa la penicilina sobre la pared bacteriana?',
      'Tip de Medicina: interprétame un ECG básico paso a paso',
      'Tip de Medicina: diferencia entre hipertrofia e hiperplasia con ejemplos',
      'Tip de Medicina: vías de administración de fármacos y sus ventajas',
      'Tip de Medicina: repasa los signos vitales y sus valores normales',
    ],
  },
  {
    match: /ingenier|sistema|software|comput|informát|tecnolog|program|redes|datos/,
    tips: [
      'Tip de Ingeniería: diferencia entre proceso e hilo con un ejemplo real',
      'Tip de Ingeniería: ¿cuándo conviene SQL y cuándo NoSQL?',
      'Tip de Ingeniería: explícame la notación Big-O con ejemplos',
      'Tip de Ingeniería: cómo funciona el protocolo TCP/IP paso a paso',
      'Tip de Ingeniería: patrones de diseño más usados en la industria',
      'Tip de Ingeniería: ¿qué es una API REST y cómo se consume?',
    ],
  },
  {
    match: /derecho|jurídic|abogac|legal|penal|constitucional/,
    tips: [
      'Tip de Derecho: diferencia entre dolo eventual y culpa con casos',
      'Tip de Derecho: elementos del delito explicados con un ejemplo',
      'Tip de Derecho: jerarquía de las fuentes del derecho',
      'Tip de Derecho: requisitos de validez de un contrato',
      'Tip de Derecho: diferencia entre prescripción y caducidad',
      'Tip de Derecho: cómo se interpreta una norma constitucional',
    ],
  },
  {
    match: /psicolog|conduct|clínica psico/,
    tips: [
      'Tip de Psicología: diferencia entre refuerzo positivo y negativo',
      'Tip de Psicología: etapas del desarrollo cognitivo de Piaget',
      'Tip de Psicología: ¿cómo funciona la memoria a corto y largo plazo?',
      'Tip de Psicología: sesgos cognitivos más comunes con ejemplos',
      'Tip de Psicología: criterios básicos para diagnosticar depresión',
      'Tip de Psicología: teorías de la personalidad comparadas',
    ],
  },
  {
    match: /admin|contadur|econom|finanz|negocio|comercio|gerenc|market|emprend/,
    tips: [
      'Tip de Negocios: cómo calcular e interpretar el punto de equilibrio',
      'Tip de Negocios: diferencia entre costo fijo, variable y marginal',
      'Tip de Negocios: ¿qué es el WACC y por qué importa en finanzas?',
      'Tip de Negocios: las 4P del marketing con ejemplos reales',
      'Tip de Negocios: cómo leer un estado de resultados paso a paso',
      'Tip de Negocios: análisis FODA aplicado a una empresa real',
    ],
  },
  {
    match: /educaci|pedagog|docen/,
    tips: [
      'Tip de Educación: cómo diseñar una clase con objetivos SMART',
      'Tip de Educación: técnicas de evaluación formativa vs sumativa',
      'Tip de Educación: la taxonomía de Bloom aplicada a planificar',
      'Tip de Educación: estrategias para manejar aulas diversas',
    ],
  },
  {
    match: /arquitect|urbanis|civil|estructur/,
    tips: [
      'Tip de Arquitectura: tipos de estructuras y cómo resisten cargas',
      'Tip de Arquitectura: principios del diseño bioclimático',
      'Tip de Arquitectura: cómo leer planos arquitectónicos paso a paso',
      'Tip de Arquitectura: diferencia entre cemento, hormigón y concreto',
    ],
  },
  {
    match: /agronom|agro|veterinaria|ambient|biolog|química|geolog/,
    tips: [
      'Tip de Ciencias: ciclo del nitrógeno y su papel en la agricultura',
      'Tip de Ciencias: cómo funciona el efecto invernadero realmente',
      'Tip de Ciencias: cadenas tróficas con un ejemplo de ecosistema',
      'Tip de Ciencias: por qué los suelos se degradan y cómo se recuperan',
    ],
  },
  {
    match: /comunicac|periodis|publicidad|audiovisual|letras|historia|humanidades|filosof|arte/,
    tips: [
      'Tip de Humanidades: cómo estructurar un ensayo argumentativo',
      'Tip de Humanidades: diferencia entre análisis y síntesis',
      'Tip de Humanidades: falacias lógicas más comunes con ejemplos',
      'Tip de Humanidades: técnicas de retórica clásica para persuadir',
    ],
  },
];

const DEFAULT_UNI_TIPS: string[] = [
  'Tip de estudio: cómo hacer un mapa mental que de verdad funcione',
  'Tip de estudio: técnica Pomodoro para sesiones de concentración',
  'Tip de estudio: cómo preparar un examen con repaso espaciado',
  'Tip de estudio: método Feynman para entender cualquier tema a fondo',
];

const POSGRADO_TIPS: string[] = [
  'Tip de investigación: cómo formular una pregunta de investigación sólida',
  'Tip de investigación: validez y confiabilidad en diseño metodológico',
  'Tip de investigación: cómo hacer una revisión de literatura sistemática',
  'Tip de investigación: estructura IMRaD para escribir un paper',
];

function pickRandom(items: string[], count: number): string[] {
  const copy = [...items];
  const picked: string[] = [];
  while (picked.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(idx, 1)[0]);
  }
  return picked;
}

export function getSuggestedPrompts(profile: {
  level: AcademicLevel;
  career?: string;
  subject?: string;
}): string[] {
  if (profile.level === 'primaria') return pickRandom(FUN_FACTS_PRIMARIA, 4);
  if (profile.level === 'secundaria') return pickRandom(FUN_FACTS_SECUNDARIA, 4);

  const areaText = `${profile.career || ''} ${profile.subject || ''}`.toLowerCase();
  const matched = CAREER_TIPS.find((g) => g.match.test(areaText));

  if (profile.level === 'posgrado') {
    const careerPicked = matched ? pickRandom(matched.tips, 2) : [];
    return [...careerPicked, ...pickRandom(POSGRADO_TIPS, careerPicked.length ? 2 : 4)];
  }

  if (profile.level === 'universidad') {
    return matched ? pickRandom(matched.tips, 4) : DEFAULT_UNI_TIPS;
  }

  // Autodidacta: mantener las sugerencias originales del nivel.
  return SAMPLE_PROMPTS_BY_LEVEL.autodidacta;
}
