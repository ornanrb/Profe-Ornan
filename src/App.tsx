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
        text: `¡Hola! Soy el Profe Ornan, tu tutor virtual pedagógico de ${subj.name} para 3ro de Secundaria (Currículo MINERD). Estoy aquí para acompañarte paso a paso con explicaciones claras, resolver tus dudas socráticamente, revisar fotos de tus cuadernos o tareas y asegurarme de que todas las fórmulas y cálculos matemáticos se formulen rigurosamente con LaTeX.

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
                ? (activeArtifact.data as any)
                : undefined
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
    </div>
  );
}
