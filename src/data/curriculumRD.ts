import { DominicanSubject, EducationLevel, GradeId } from '../types';

export interface GradeInfo {
  id: GradeId;
  name: string;
  cycle: string;
  level: EducationLevel;
  typicalAge: string;
}

export const DOMINICAN_GRADES: GradeInfo[] = [
  { id: '1ro_primaria', name: '1ro Primaria', cycle: 'Primer Ciclo', level: 'primaria_primer_ciclo', typicalAge: '6 años' },
  { id: '2do_primaria', name: '2do Primaria', cycle: 'Primer Ciclo', level: 'primaria_primer_ciclo', typicalAge: '7 años' },
  { id: '3ro_primaria', name: '3ro Primaria', cycle: 'Primer Ciclo', level: 'primaria_primer_ciclo', typicalAge: '8 años' },
  { id: '4to_primaria', name: '4to Primaria', cycle: 'Segundo Ciclo', level: 'primaria_segundo_ciclo', typicalAge: '9 años' },
  { id: '5to_primaria', name: '5to Primaria', cycle: 'Segundo Ciclo', level: 'primaria_segundo_ciclo', typicalAge: '10 años' },
  { id: '6to_primaria', name: '6to Primaria', cycle: 'Segundo Ciclo', level: 'primaria_segundo_ciclo', typicalAge: '11 años' },
  { id: '1ro_secundaria', name: '1ro Secundaria (7mo)', cycle: 'Primer Ciclo', level: 'secundaria_primer_ciclo', typicalAge: '12 años' },
  { id: '2do_secundaria', name: '2do Secundaria (8vo)', cycle: 'Primer Ciclo', level: 'secundaria_primer_ciclo', typicalAge: '13 años' },
  { id: '3ro_secundaria', name: '3ro Secundaria (1ro Bach)', cycle: 'Primer Ciclo', level: 'secundaria_primer_ciclo', typicalAge: '14 años' },
  { id: '4to_secundaria', name: '4to Secundaria (2do Bach)', cycle: 'Segundo Ciclo', level: 'secundaria_segundo_ciclo', typicalAge: '15 años' },
  { id: '5to_secundaria', name: '5to Secundaria (3ro Bach)', cycle: 'Segundo Ciclo', level: 'secundaria_segundo_ciclo', typicalAge: '16 años' },
  { id: '6to_secundaria', name: '6to Secundaria (4to Bach)', cycle: 'Segundo Ciclo', level: 'secundaria_segundo_ciclo', typicalAge: '17 años' },
];

export interface SubjectMeta {
  id: DominicanSubject;
  name: string;
  color: string;
  bgLight: string;
  iconName: string;
  description: string;
  sampleTopics: {
    title: string;
    description: string;
    gradeRange: string;
    prompt: string;
  }[];
}

export const DOMINICAN_SUBJECTS: Record<DominicanSubject, SubjectMeta> = {
  matematica: {
    id: 'matematica',
    name: 'Matemática',
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50 border-emerald-200',
    iconName: 'Calculator',
    description: 'Aritmética, Álgebra, Geometría, Razonamiento lógico y Resolución de problemas contextualizados a la vida cotidiana dominicana.',
    sampleTopics: [
      {
        title: 'Fracciones y Porcentajes en el Colmado',
        description: 'Cálculo de presupuestos, descuentos y proporciones en compras cotidianas de República Dominicana.',
        gradeRange: '4to a 6to Primaria',
        prompt: 'Profesor, explícame cómo calcular un descuento del 15% en una compra del colmado y cómo representarlo con fracciones paso a paso.'
      },
      {
        title: 'Ecuaciones Lineales y Geometría',
        description: 'Despeje de variables, Teorema de Pitágoras y áreas aplicadas a construcciones arquitectónicas de Santo Domingo.',
        gradeRange: '1ro a 3ro Secundaria',
        prompt: 'Ayúdame a resolver una ecuación de primer grado paso a paso mostrando cada procedimiento sin saltar pasos.'
      },
      {
        title: 'Funciones Cuadráticas y Parábolas en Béisbol',
        description: 'Modelado matemático de la trayectoria de un batazo de jonrón en el Estadio Quisqueya Juan Marichal.',
        gradeRange: '4to a 6to Secundaria',
        prompt: 'Explícame cómo modelar la parábola de un batazo de béisbol con la función cuadrática y encontrar la altura máxima.'
      }
    ]
  },
  lengua_espanola: {
    id: 'lengua_espanola',
    name: 'Lengua Española',
    color: 'text-blue-700',
    bgLight: 'bg-blue-50 border-blue-200',
    iconName: 'BookOpen',
    description: 'Comprensión y producción escrita, gramática, literatura dominicana y caribeña, y valoración de la riqueza del español dominicano.',
    sampleTopics: [
      {
        title: 'Análisis de Cuentos de Juan Bosch',
        description: 'Estructura narrativa, personajes y realidad social en obras maestras como "Dos pesos de agua" o "La mujer".',
        gradeRange: '1ro a 4to Secundaria',
        prompt: 'Analicemos juntos el cuento "Dos pesos de agua" de Juan Bosch: tema central, conflicto y recursos literarios utilizados.'
      },
      {
        title: 'Variedades del Español Dominicano',
        description: 'Particularidades fonéticas y léxicas (vocalización cibaeña, lambdacismo del sur) como manifestación de identidad cultural.',
        gradeRange: '3ro a 6to Secundaria',
        prompt: 'Explícame las características lingüísticas del español dominicano en el Cibao, el Sur y la capital, y su valor cultural.'
      },
      {
        title: 'El Informe de Lectura y el Ensayo Argumentativo',
        description: 'Estructura lógica, conectores, tesis y argumentos según las pautas curriculares del MINERD.',
        gradeRange: '5to y 6to Primaria / Secundaria',
        prompt: 'Guíame paso a paso para escribir una introducción sólida para un ensayo argumentativo con tesis clara.'
      }
    ]
  },
  ciencias_sociales: {
    id: 'ciencias_sociales',
    name: 'Ciencias Sociales',
    color: 'text-amber-700',
    bgLight: 'bg-amber-50 border-amber-200',
    iconName: 'Globe',
    description: 'Historia dominicana, geografía de la isla de Santo Domingo, formación ciudadana, Constitución y memoria histórica.',
    sampleTopics: [
      {
        title: 'La Gesta de Independencia de 1844',
        description: 'El pensamiento de Juan Pablo Duarte, la sociedad secreta La Trinitaria y el trabucazo del 27 de Febrero.',
        gradeRange: '5to Primaria a 6to Secundaria',
        prompt: 'Cuéntame cómo se organizó La Trinitaria y cuáles fueron los ideales democráticos de Juan Pablo Duarte para fundar la República.'
      },
      {
        title: 'La Guerra de la Restauración (1863-1865)',
        description: 'El Grito de Capotillo, el liderazgo de Gregorio Luperón y la expulsión de la anexión a España.',
        gradeRange: '6to Primaria a Secundaria',
        prompt: 'Explícame por qué la Guerra de la Restauración es considerada la verdadera consolidación de la independencia dominicana.'
      },
      {
        title: 'Geografía y Relieve: Cordillera Central y Lago Enriquillo',
        description: 'Pico Duarte, cuencas hidrográficas, valles intramontanos y la depresión hipersalina más baja del Caribe.',
        gradeRange: '4to Primaria a Secundaria',
        prompt: 'Describe los principales sistemas montañosos de República Dominicana y la importancia de la Cordillera Central como "madre de las aguas".'
      }
    ]
  },
  ciencias_naturaleza: {
    id: 'ciencias_naturaleza',
    name: 'Ciencias de la Naturaleza',
    color: 'text-teal-700',
    bgLight: 'bg-teal-50 border-teal-200',
    iconName: 'Leaf',
    description: 'Biología, Física, Química, Biodiversidad de la Hispaniola, Ecosistemas protegidos y Prevención ante fenómenos del Caribe.',
    sampleTopics: [
      {
        title: 'Especies Endémicas de la Hispaniola',
        description: 'La Cigüita Palmera (ave nacional), el Solenodonte, el Gavilán de la Hispaniola y la Rosa de Bayahíbe.',
        gradeRange: 'Primaria y Secundaria',
        prompt: '¿Cuáles son las especies endémicas más emblemáticas de República Dominicana y qué adaptaciones biológicas tienen?'
      },
      {
        title: 'Tectónica de Placas y Fallas Sísmicas en RD',
        description: 'Interacción entre la placa del Caribe y la placa Norteamericana, Falla Septentrional y Falla de Enriquillo.',
        gradeRange: '1ro a 4to Secundaria',
        prompt: 'Explícame cómo interactúan las placas tectónicas del Caribe y por qué ocurren movimientos sísmicos en la isla La Española.'
      },
      {
        title: 'Huracanes y Dinámica Atmosférica en el Caribe',
        description: 'Formación de ciclones tropicales, escala Saffir-Simpson y medidas de prevención del Centro de Operaciones de Emergencias (COE).',
        gradeRange: '4to Primaria a Secundaria',
        prompt: '¿Cómo se forma un huracán en el Atlántico tropical y cómo se interpretan los niveles de alerta verde, amarilla y roja del COE?'
      }
    ]
  }
};

export const DOMINICAN_COMPETENCIES = [
  'Competencia Ética y Ciudadana',
  'Competencia Comunicativa',
  'Competencia Pensamiento Lógico, Creativo y Crítico',
  'Competencia Resolución de Problemas',
  'Competencia Científica y Tecnológica',
  'Competencia Ambiental y de la Salud',
  'Competencia Desarrollo Personal y Espiritual'
];
