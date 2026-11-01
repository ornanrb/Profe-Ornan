import React, { useState, useRef, useEffect } from 'react';
import {
  DominicanSubject,
  GradeId,
  UserRole,
  UserSessionProfile,
  ChatMessage,
  LearningArtifact,
  MediaAttachment,
  AIProviderConfig,
  AnalyzedMediaItem,
} from './types';
import { DOMINICAN_GRADES, DOMINICAN_SUBJECTS } from './data/curriculumRD';
import { AI_PROVIDERS, DEFAULT_AI_CONFIG } from './data/aiProviders';
import { Header } from './components/Header';
import { WelcomeHero } from './components/WelcomeHero';
import { LiveVoiceBar } from './components/LiveVoiceBar';
import { MediaPanel } from './components/MediaPanel';
import { ChatFeed } from './components/ChatFeed';
import { ArtifactViewer } from './components/ArtifactViewer';
import { TeacherToolbox } from './components/TeacherToolbox';
import { ChatInputBar } from './components/ChatInputBar';
import { AIProviderModal } from './components/AIProviderModal';
import { AnalyzedMediaDrawer } from './components/AnalyzedMediaDrawer';
import {
  Layers,
  Sparkles,
  MessageSquare,
  GraduationCap,
  Volume2,
  Minimize2,
  Maximize2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

const INITIAL_ANALYZED_MEDIA: AnalyzedMediaItem[] = [
  {
    id: 'sample-algebra-1',
    type: 'camera',
    name: 'Libreta de Álgebra: Ecuación Cuadrática',
    mimeType: 'image/svg+xml',
    dataBase64: '',
    previewUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%23f8fafc" rx="8"/><path d="M0 36h300M0 72h300M0 108h300M0 144h300" stroke="%23cbd5e1" stroke-width="1"/><text x="16" y="26" font-family="sans-serif" font-size="12" fill="%231e293b" font-weight="bold">Libreta 3ro Sec - Álgebra</text><text x="16" y="62" font-family="monospace" font-size="13" fill="%232563eb">x² - 4x + 3 = 0</text><text x="16" y="98" font-family="monospace" font-size="11" fill="%23dc2626">x = [-(-4) ± √(16 - 12)] / 2</text><text x="16" y="134" font-family="monospace" font-size="12" fill="%2316a34a">x₁ = 3,  x₂ = 1</text></svg>',
    timestamp: Date.now() - 1000 * 60 * 18,
    detectedContent:
      'Ecuación cuadrática escrita a mano: $x^2 - 4x + 3 = 0$. Coeficientes $a = 1$, $b = -4$, $c = 3$.',
    diagnosis:
      'Procedimiento correcto. Discriminante $\\Delta = (-4)^2 - 4(1)(3) = 4 > 0$. Las dos raíces reales obtenidas son $x_1 = 3$ y $x_2 = 1$.',
    keyConcepts: ['Fórmula Cuadrática', 'Discriminante', 'Raíces reales', 'Álgebra'],
    questionAsked: '¿Está bien aplicada la fórmula general en este ejercicio de mi cuaderno?',
    notes:
      '¡Excelente desarrollo! Recuerda verificar siempre sustituyendo los valores $x=3$ y $x=1$ en la ecuación original para corroborar que la igualdad se cumpla.',
  },
  {
    id: 'sample-geometria-2',
    type: 'screen',
    name: 'Captura de Gráfica: Parábola y Vértice',
    mimeType: 'image/svg+xml',
    dataBase64: '',
    previewUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%230f172a" rx="8"/><path d="M150 0v180M0 90h300" stroke="%23334155" stroke-width="1.5"/><path d="M50 20 Q150 160 250 20" stroke="%2338bdf8" stroke-width="2.5" fill="none"/><circle cx="150" cy="90" r="4" fill="%23f43f5e"/><text x="160" y="85" font-family="sans-serif" font-size="11" fill="%23f43f5e" font-weight="bold">V(2, -1)</text></svg>',
    timestamp: Date.now() - 1000 * 60 * 48,
    detectedContent:
      'Representación en el plano cartesiano de la función cuadrática $f(x) = x^2 - 4x + 3$.',
    diagnosis:
      'Vértice en $V(2, -1)$, eje de simetría en la recta vertical $x = 2$, corte en el eje Y en $(0, 3)$ y concavidad hacia arriba ($a > 0$).',
    keyConcepts: ['Vértice', 'Eje de Simetría', 'Concavidad', 'Geometría Analítica'],
    questionAsked: 'Explícame el vértice y cómo determinar si la parábola abre hacia arriba o hacia abajo.',
    notes:
      'El signo del coeficiente $a$ determina si la parábola abre hacia arriba ($a > 0$) o hacia abajo ($a < 0$). El vértice representa el punto mínimo absoluto.',
  },
];

export default function App() {
  // Session Profile state
  const [profile, setProfile] = useState<UserSessionProfile>({
    role: 'estudiante',
    subject: 'matematica',
    level: 'secundaria_primer_ciclo',
    grade: '3ro_secundaria',
    difficulty: 'intermedio',
    pedagogicalStyle: 'socratico',
  });

  // AI Provider configuration state
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem('profe_ornan_ai_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_AI_CONFIG;
  });
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Analyzed Media & Images Drawer state
  const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
  const [analyzedMedia, setAnalyzedMedia] = useState<AnalyzedMediaItem[]>(INITIAL_ANALYZED_MEDIA);

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState<MediaAttachment | null>(null);

  // Gemini Live Voice Bar state
  const [isLiveVoiceActive, setIsLiveVoiceActive] = useState(false);

  // Active Artifact state for the side/bottom panel
  const [activeArtifact, setActiveArtifact] = useState<LearningArtifact | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'both' | 'chat_only' | 'artifact_only'>('both');

  // Video Frame Getter ref (for camera/screen streaming to Gemini Live)
  const videoFrameGetterRef = useRef<(() => string | null) | null>(null);

  // Chat scroll container ref
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize with initial educational greeting if messages empty
  useEffect(() => {
    if (messages.length === 0) {
      const subj = DOMINICAN_SUBJECTS[profile.subject];
      const initialTeacherMessage: ChatMessage = {
        id: 'welcome-01',
        role: 'model',
        text: `¡Hola! Soy el Profe Ornan, tu tutor virtual pedagógico de ${subj.name} para 3ro de Secundaria (Currículo MINERD). Estoy aquí para acompañarte paso a paso con explicaciones claras, resolver tus dudas socráticamente, revisar fotos de tus cuadernos o tareas y asegurarme de que todas las fórmulas y cálculos matemáticos se formulen rigurosamente con la más alta precisión.

¿Qué tema o ejercicio te gustaría que exploremos hoy?`,
        timestamp: Date.now(),
        socraticQuestion: '¿Tienes algún ejercicio específico de tu libro o libreta, o prefieres comenzar repasando un concepto clave?',
      };
      setMessages([initialTeacherMessage]);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSaveAIConfig = (newConfig: AIProviderConfig) => {
    setAiConfig(newConfig);
    try {
      localStorage.setItem('profe_ornan_ai_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save ai config:', e);
    }
    const providerInfo = AI_PROVIDERS[newConfig.provider] || AI_PROVIDERS.google;
    setMessages((prev) => [
      ...prev,
      {
        id: 'sys-' + Date.now(),
        role: 'system',
        text: `Motor de IA actualizado a: ${providerInfo.name} (${newConfig.model}).`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleUpdateProfile = (updates: Partial<UserSessionProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };

      // If subject changed, optionally update prompt context
      if (updates.subject && updates.subject !== prev.subject) {
        const newSubj = DOMINICAN_SUBJECTS[updates.subject];
        setMessages((prevMsgs) => [
          ...prevMsgs,
          {
            id: 'sys-' + Date.now(),
            role: 'system',
            text: `Asignatura cambiada a: ${newSubj.name}. Adaptando explicaciones curriculares y ejemplos dominicanos.`,
            timestamp: Date.now(),
          },
        ]);
      }

      return next;
    });
  };

  // Main message sender to `/api/chat`
  const handleSendMessage = async (text: string, requestArtifactType?: string) => {
    if (!text.trim() && !activeAttachment) return;

    const userMessage: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: text || (activeAttachment ? `Analiza este archivo: ${activeAttachment.name}` : ''),
      timestamp: Date.now(),
      attachment: activeAttachment || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentAttach = activeAttachment;
    setActiveAttachment(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          profile: profile,
          history: messages.slice(-6),
          attachment: currentAttach,
          requestArtifact: requestArtifactType,
          providerConfig: aiConfig,
        }),
      });

      const data = await res.json();

      let generatedArtifact: LearningArtifact | null = null;
      if (data.artifact && data.artifact.type) {
        generatedArtifact = {
          id: 'art-' + Date.now(),
          type: data.artifact.type,
          title: data.artifact.title || 'Recurso Educativo Interactivo',
          subject: profile.subject,
          grade: profile.grade,
          data: data.artifact.data || data.artifact,
          timestamp: Date.now(),
        };
        setActiveArtifact(generatedArtifact);
      }

      const modelMessage: ChatMessage = {
        id: 'mod-' + Date.now(),
        role: 'model',
        text: data.text || 'He procesado tu consulta pedagógica.',
        timestamp: Date.now(),
        socraticQuestion: data.socraticQuestion || undefined,
        proceduralSteps: data.proceduralSteps || undefined,
        artifact: generatedArtifact || undefined,
      };

      setMessages((prev) => [...prev, modelMessage]);

      // If user provided an attachment, register it in the Analyzed Media Drawer
      if (currentAttach) {
        const newMediaItem: AnalyzedMediaItem = {
          id: 'media-' + Date.now(),
          type: currentAttach.type,
          name: currentAttach.name || 'Archivo Adjunto',
          mimeType: currentAttach.mimeType,
          dataBase64: currentAttach.dataBase64,
          previewUrl: currentAttach.previewUrl,
          timestamp: Date.now(),
          detectedContent: data.text ? data.text.slice(0, 160) + '...' : undefined,
          diagnosis: data.socraticQuestion || undefined,
          keyConcepts: [DOMINICAN_SUBJECTS[profile.subject].name, 'Consulta Pedagógica'],
          questionAsked: text || 'Analiza este archivo',
          notes: data.text,
        };
        setAnalyzedMedia((prev) => [newMediaItem, ...prev]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          text: 'Ocurrió un error temporal conectando con el servicio de IA. Por favor intenta de nuevo en unos momentos.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Vision Analysis handler from Camera or Screen Snapshot
  const handleVisionAnalysis = async (attachment: MediaAttachment, customPrompt?: string) => {
    setIsLoading(true);
    const userPrompt =
      customPrompt ||
      (attachment.type === 'camera'
        ? 'Analiza esta imagen de mi libreta escolar. ¿Hay algún error en mis pasos?'
        : 'Analiza lo que aparece en pantalla y explícame el concepto.');

    // Add user question with the image attachment
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      text: userPrompt,
      timestamp: Date.now(),
      attachment: attachment,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: attachment.dataBase64,
          mimeType: attachment.mimeType,
          question: userPrompt,
          profile: profile,
          providerConfig: aiConfig,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const vData = data.data;

        let responseMarkdown = `🔍 **Análisis Visual**: ${vData.detectedContent}\n\n`;
        responseMarkdown += `💡 **Diagnóstico Pedagógico**: ${vData.diagnosis}\n\n`;
        responseMarkdown += `${vData.pedagogicalExplanation}`;

        const modelMsg: ChatMessage = {
          id: 'mod-' + Date.now(),
          role: 'model',
          text: responseMarkdown,
          timestamp: Date.now(),
          socraticQuestion: vData.socraticQuestion || '¿Qué paso te gustaría que repasemos juntos?',
          proceduralSteps: Array.isArray(vData.correctSteps)
            ? vData.correctSteps.map((s: string, idx: number) => ({
                stepNumber: idx + 1,
                title: `Paso ${idx + 1}`,
                explanation: s,
              }))
            : undefined,
        };

        setMessages((prev) => [...prev, modelMsg]);

        // Register in Analyzed Media Drawer
        const newMediaItem: AnalyzedMediaItem = {
          id: 'media-' + Date.now(),
          type: attachment.type,
          name:
            attachment.name ||
            (attachment.type === 'camera'
              ? 'Foto de Libreta Escolar'
              : attachment.type === 'screen'
              ? 'Captura de Pantalla'
              : 'Archivo Analizado'),
          mimeType: attachment.mimeType,
          dataBase64: attachment.dataBase64,
          previewUrl: attachment.previewUrl,
          timestamp: Date.now(),
          detectedContent: vData.detectedContent,
          diagnosis: vData.diagnosis,
          keyConcepts: Array.isArray(vData.keyConcepts)
            ? vData.keyConcepts
            : ['Diagnóstico Visual', DOMINICAN_SUBJECTS[profile.subject].name],
          questionAsked: userPrompt,
          notes: vData.pedagogicalExplanation,
        };
        setAnalyzedMedia((prev) => [newMediaItem, ...prev]);
      } else {
        handleSendMessage(userPrompt);
      }
    } catch (e) {
      console.error('Vision analysis error:', e);
      handleSendMessage(userPrompt);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate MINERD Lesson Plan for Teachers
  const handleGenerateTeacherPlan = async (topic: string, duration: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/teacher-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: profile.subject,
          grade: profile.grade,
          topic: topic,
          duration: duration,
          providerConfig: aiConfig,
        }),
      });

      const data = await res.json();
      if (data.success && data.plan) {
        const planArtifact: LearningArtifact = {
          id: 'plan-' + Date.now(),
          type: 'teacher_plan',
          title: `Planificación MINERD: ${data.plan.title || topic}`,
          subject: profile.subject,
          grade: profile.grade,
          data: data.plan,
          timestamp: Date.now(),
        };

        setActiveArtifact(planArtifact);

        setMessages((prev) => [
          ...prev,
          {
            id: 'mod-plan-' + Date.now(),
            role: 'model',
            text: `He estructurado la Planificación de Clase según el Diseño Curricular del MINERD para **${topic}** (${duration}). Incluye competencias fundamentales y específicas, situación de aprendizaje, secuencia didáctica (Inicio, Desarrollo, Cierre) y rúbrica de evaluación analítica por niveles de dominio.\n\n📄 **Descarga en Word disponible**: Haz clic en el botón **"Descargar Word (.docx)"** para obtener el documento editable oficial con formato institucional y firmas.`,
            timestamp: Date.now(),
            artifact: planArtifact,
            socraticQuestion: '¿Deseas adaptar alguna actividad a un contexto comunitario específico de tu centro educativo?',
          },
        ]);
      }
    } catch (e) {
      console.error('Error generating teacher plan:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* 1. Header with Subject Selector, Grade, Role, AI Provider & Voice CTA */}
      <Header
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        isLiveActive={isLiveVoiceActive}
        onToggleLive={() => setIsLiveVoiceActive(!isLiveVoiceActive)}
        activeView="chat"
        setActiveView={() => {}}
        hasArtifact={!!activeArtifact}
        aiConfig={aiConfig}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenMediaDrawer={() => setIsMediaDrawerOpen(true)}
        mediaCount={analyzedMedia.length}
      />

      {/* 2. Diálogo con Audio con el Profe Ornan (Voz Masculina & Transcripción en vivo) */}
      <LiveVoiceBar
        isActive={isLiveVoiceActive}
        onClose={() => setIsLiveVoiceActive(false)}
        onTranscriptReceived={(text, isUser) => {
          // Transcript feedback
        }}
        onSendToChatFeed={(userText, aiText, data) => {
          const userMsg: ChatMessage = {
            id: 'usr-' + Date.now(),
            role: 'user',
            text: userText,
            timestamp: Date.now(),
          };
          const modelMsg: ChatMessage = {
            id: 'mod-' + (Date.now() + 1),
            role: 'model',
            text: aiText,
            timestamp: Date.now() + 1,
            socraticQuestion: data?.socraticQuestion,
            proceduralSteps: data?.proceduralSteps,
            artifact: data?.artifact?.type
              ? {
                  id: 'art-' + Date.now(),
                  type: data.artifact.type,
                  title: data.artifact.title || 'Recurso Pedagógico Interactivo',
                  subject: profile.subject,
                  grade: profile.grade,
                  data: data.artifact.data || data.artifact,
                  timestamp: Date.now(),
                }
              : undefined,
          };
          if (modelMsg.artifact) {
            setActiveArtifact(modelMsg.artifact);
          }
          setMessages((prev) => [...prev, userMsg, modelMsg]);
        }}
        videoFrameGetter={() => videoFrameGetterRef.current?.() || null}
        profile={profile}
        aiConfig={aiConfig}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col">
        
        {/* Welcome Hero / Initial Choice Screen */}
        {messages.length <= 1 && (
          <WelcomeHero
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onStartWithPrompt={(prompt) => handleSendMessage(prompt)}
            onStartLiveVoice={() => setIsLiveVoiceActive(true)}
            onOpenAIModal={() => setIsAIModalOpen(true)}
          />
        )}

        {/* Multimedia Bar & Stage (Camera, Screen Share, File Upload) */}
        <MediaPanel
          activeAttachment={activeAttachment}
          onAttachmentSelected={setActiveAttachment}
          onSendVisionAnalysis={handleVisionAnalysis}
          onRegisterVideoFrameGetter={(getter) => {
            videoFrameGetterRef.current = getter;
          }}
        />

        {/* Teacher Mode Toolbox (when Role is Docente) */}
        {profile.role === 'docente' && (
          <TeacherToolbox
            currentSubject={profile.subject}
            currentGrade={profile.grade}
            isLoading={isLoading}
            activePlan={
              activeArtifact?.type === 'teacher_plan'
                ? ((activeArtifact.data as any)?.data || activeArtifact.data)
                : ((messages.slice().reverse().find((m) => m.artifact?.type === 'teacher_plan')?.artifact?.data as any)?.data ||
                   (messages.slice().reverse().find((m) => m.artifact?.type === 'teacher_plan')?.artifact?.data as any))
            }
            onGeneratePlan={handleGenerateTeacherPlan}
            onGenerateQuizRequest={(topic) =>
              handleSendMessage(`Diseña un quiz formativo para docentes sobre "${topic}"`, 'quiz')
            }
            onGenerateRubricRequest={(topic) =>
              handleSendMessage(
                `Diseña una rúbrica analítica por competencias MINERD para evaluar "${topic}"`
              )
            }
          />
        )}

        {/* Dual Panel Workspace: Chat + Visual Learning Artifacts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
          
          {/* Main Left/Center Panel: Conversation with Professor */}
          <div
            className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden ${
              activeArtifact ? 'lg:col-span-7' : 'lg:col-span-12'
            }`}
          >
            {/* Conversation Feed Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sesión Pedagógica Activa • {DOMINICAN_SUBJECTS[profile.subject].name}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {DOMINICAN_GRADES.find((g) => g.id === profile.grade)?.name}
              </span>
            </div>

            {/* Scrollable Messages Area */}
            <div
              ref={chatScrollRef}
              className="p-4 sm:p-5 max-h-[600px] min-h-[380px] overflow-y-auto"
            >
              <ChatFeed
                messages={messages}
                isLoading={isLoading}
                onQuickAction={(action) => handleSendMessage(action)}
                onRequestArtifact={(artType) =>
                  handleSendMessage(`Por favor genera un recurso interactivo de tipo ${artType}`, artType)
                }
                onSelectArtifactToView={(artifact) => setActiveArtifact(artifact)}
              />
            </div>

            {/* Chat Input Bar */}
            <ChatInputBar
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              activeAttachment={activeAttachment}
              onClearAttachment={() => setActiveAttachment(null)}
              profile={profile}
            />
          </div>

          {/* Right Panel: Interactive Learning Artifacts (Quizzes, Step-by-Step, Timelines, Plans) */}
          {activeArtifact && (
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Panel de Aprendizaje Interactivo
                </span>
                <button
                  onClick={() => setActiveArtifact(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Cerrar panel
                </button>
              </div>

              <ArtifactViewer
                artifact={activeArtifact}
                onAskAboutArtifactPart={(partText) => handleSendMessage(partText)}
              />
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
        Profe Ornan • Tutor Virtual Multimodal • Currículo Nacional Dominicano MINERD • Compatible con OpenAI, Google Gemini, Anthropic y DeepSeek
      </footer>

      {/* AI Provider & API Key Modal */}
      <AIProviderModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        config={aiConfig}
        onSaveConfig={handleSaveAIConfig}
      />

      {/* Lateral Drawer: Analyzed Images and Notebook Exercises Review */}
      <AnalyzedMediaDrawer
        isOpen={isMediaDrawerOpen}
        onClose={() => setIsMediaDrawerOpen(false)}
        items={analyzedMedia}
        onSelectItemForReview={(item) => {
          handleSendMessage(
            `Profe Ornan, repasemos el ejercicio "${item.name}": ${
              item.detectedContent || item.diagnosis || 'Explícame los conceptos clave y el procedimiento.'
            }`
          );
        }}
        onAskQuestionAboutItem={(item, promptText) => {
          handleSendMessage(
            promptText || `Profesor, tengo una duda sobre ${item.name}: ${item.detectedContent || ''}`
          );
        }}
        onTriggerQuizFromItem={(item) => {
          handleSendMessage(
            `Genera un quiz formativo para evaluar lo aprendido en el ejercicio "${item.name}"`,
            'quiz'
          );
        }}
        onTriggerNewUpload={() => {
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }}
        onDeleteItem={(id) => {
          setAnalyzedMedia((prev) => prev.filter((m) => m.id !== id));
        }}
        onLoadSampleItem={(sampleKey) => {
          if (sampleKey === 'algebra') {
            setAnalyzedMedia((prev) => [INITIAL_ANALYZED_MEDIA[0], ...prev.filter((m) => m.id !== 'sample-algebra-1')]);
          } else if (sampleKey === 'geometria') {
            setAnalyzedMedia((prev) => [INITIAL_ANALYZED_MEDIA[1], ...prev.filter((m) => m.id !== 'sample-geometria-2')]);
          } else if (sampleKey === 'historia') {
            const histItem: AnalyzedMediaItem = {
              id: 'sample-historia-3',
              type: 'file',
              name: '🇩🇴 Documento Histórico: Los Trinitarios 1844',
              mimeType: 'image/svg+xml',
              dataBase64: '',
              previewUrl:
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%23fef3c7" rx="8"/><text x="16" y="32" font-family="serif" font-size="13" fill="%2378350f" font-weight="bold">Manifiesto del 16 de Enero de 1844</text><text x="16" y="65" font-family="serif" font-size="11" fill="%2392400e">Juan Pablo Duarte y los Trinitarios</text><text x="16" y="105" font-family="sans-serif" font-size="11" fill="%231e3a8a">Dios, Patria y Libertad • Rep. Dominicana</text></svg>',
              timestamp: Date.now() - 1000 * 60 * 120,
              detectedContent:
                'Manifiesto y juramento de la sociedad secreta La Trinitaria liderada por Juan Pablo Duarte.',
              diagnosis:
                'Documento fundacional de la República Dominicana proclamada el 27 de febrero de 1844.',
              keyConcepts: ['Independencia 1844', 'La Trinitaria', 'Juan Pablo Duarte', 'Ciencias Sociales'],
              questionAsked: '¿Cuál fue la importancia de La Trinitaria en la independencia?',
              notes:
                'La Trinitaria utilizó métodos pedagógicos y teatrales clandestinos para despertar el fervor patriótico en la juventud de Santo Domingo.',
            };
            setAnalyzedMedia((prev) => [histItem, ...prev.filter((m) => m.id !== 'sample-historia-3')]);
          }
        }}
      />
    </div>
  );
}
