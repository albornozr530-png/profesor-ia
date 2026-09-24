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
