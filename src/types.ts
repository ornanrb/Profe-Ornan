export type DominicanSubject =
  | 'matematica'
  | 'lengua_espanola'
  | 'ciencias_sociales'
  | 'ciencias_naturaleza';

export type EducationLevel =
  | 'primaria_primer_ciclo'
  | 'primaria_segundo_ciclo'
  | 'secundaria_primer_ciclo'
  | 'secundaria_segundo_ciclo';

export type GradeId =
  | '1ro_primaria'
  | '2do_primaria'
  | '3ro_primaria'
  | '4to_primaria'
  | '5to_primaria'
  | '6to_primaria'
  | '1ro_secundaria'
  | '2do_secundaria'
  | '3ro_secundaria'
  | '4to_secundaria'
  | '5to_secundaria'
  | '6to_secundaria';

export type UserRole = 'estudiante' | 'docente';

export type DifficultyLevel = 'sencillo' | 'intermedio' | 'avanzado';

export type PedagogicalStyle =
  | 'socratico'          // Hace preguntas para guiar la deducción
  | 'explicacion_paso'   // Explica paso a paso detallado
  | 'repaso_examen'      // Enfoque en preguntas clave de prueba nacional
  | 'evaluacion_quiz'    // Diagnóstico mediante preguntas
  | 'planificacion';     // Para docentes (MINERD)

export type AIProviderId = 'google' | 'openai' | 'anthropic' | 'deepseek' | 'groq';

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  company: string;
  iconName: string;
  tagline: string;
  keyPlaceholder: string;
  keyPrefix?: string;
  keyHelpText: string;
  docUrl: string;
  models: AIModelOption[];
  defaultModel: string;
  hasServerFallback: boolean;
}

export interface AIProviderConfig {
  provider: AIProviderId;
  apiKey?: string;
  model: string;
}

export interface UserSessionProfile {
  role: UserRole;
  subject: DominicanSubject;
  level: EducationLevel;
  grade: GradeId;
  topic?: string;
  difficulty: DifficultyLevel;
  pedagogicalStyle: PedagogicalStyle;
}

export interface ProceduralStep {
  stepNumber: number;
  title: string;
  explanation: string;
  formulaOrCode?: string;
  pitfallWarning?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  dominicanContext?: string;
}

export interface MindmapNode {
  id: string;
  label: string;
  description: string;
  category?: string;
  connectedTo?: string[];
}

export interface TimelineEvent {
  yearOrDate: string;
  title: string;
  description: string;
  significanceRD: string;
  figures?: string[];
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string;
  category: string;
}

export interface TeacherLessonPlan {
  title: string;
  subject: string;
  grade: string;
  duration: string;
  fundamentalCompetencies: string[];
  specificCompetencies: string[];
  learningSituation: string; // Situación de Aprendizaje MINERD
  didacticSequence: {
    phase: 'Inicio' | 'Desarrollo' | 'Cierre';
    durationMinutes: number;
    teacherActivity: string;
    studentActivity: string;
    resources: string[];
  }[];
  evaluationRubric: {
    indicator: string;
    levels: { receptive: string; basic: string; autonomous: string; strategic: string };
  }[];
}

export interface PlotPoint {
  x: number;
  y: number;
  label?: string;
  color?: string;
  description?: string;
}

export interface PlotFunctionCurve {
  id?: string;
  expression: string; // e.g. "x^2 - 4*x + 3" or "2*x + 1"
  latexLabel?: string; // e.g. "f(x) = x^2 - 4x + 3"
  color?: string;
  strokeWidth?: number;
  isDashed?: boolean;
}

export interface GeometricElement {
  type: 'point' | 'segment' | 'line' | 'circle' | 'polygon' | 'vector' | 'parabola';
  points?: { x: number; y: number }[];
  center?: { x: number; y: number };
  radius?: number;
  label?: string;
  color?: string;
  isDashed?: boolean;
}

export interface GraphPlotArtifactData {
  title: string;
  plotType: 'parabola' | 'linear' | 'cubic' | 'geometry' | 'function' | 'custom_drawing';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep?: number;
  yStep?: number;
  functions: PlotFunctionCurve[];
  points?: PlotPoint[];
  elements?: GeometricElement[];
  keyFeatures?: {
    vertex?: { x: number; y: number };
    roots?: number[];
    yIntercept?: number;
    axisOfSymmetry?: number;
    discriminant?: number;
    concavity?: 'hacia arriba' | 'hacia abajo';
    focus?: { x: number; y: number };
    directrix?: number;
    explanation?: string;
  };
  tableValues?: { x: number; y: number }[];
  interactiveSliders?: {
    param: string; // e.g. 'a', 'b', 'c'
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
  }[];
  svgDrawing?: string;
}

export type ArtifactType =
  | 'quiz'
  | 'mindmap'
  | 'timeline'
  | 'math_step'
  | 'flashcards'
  | 'teacher_plan'
  | 'dominican_glossary'
  | 'graph_plot';

export interface LearningArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  subject: DominicanSubject;
  grade: string;
  data:
    | { questions: QuizQuestion[] }
    | { nodes: MindmapNode[] }
    | { events: TimelineEvent[] }
    | { steps: ProceduralStep[]; finalAnswer?: string }
    | { cards: FlashcardItem[] }
    | TeacherLessonPlan
    | { terms: { term: string; meaning: string; usageExample: string; origin: string }[] }
    | GraphPlotArtifactData;
  timestamp: number;
}

export interface MediaAttachment {
  type: 'camera' | 'screen' | 'file';
  name?: string;
  mimeType: string;
  dataBase64: string; // base64 representation without data url header prefix
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  attachment?: MediaAttachment;
  socraticQuestion?: string;
  proceduralSteps?: ProceduralStep[];
  artifact?: LearningArtifact;
  audioBase64?: string;
  isStreaming?: boolean;
}
