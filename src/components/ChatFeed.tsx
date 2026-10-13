import React, { useState } from 'react';
import {
  GraduationCap,
  User,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Layers,
  FileText,
  RotateCw,
  Loader2,
  CheckCircle2,
  TrendingUp,
  FileDown,
} from 'lucide-react';
import { ChatMessage, MediaAttachment, ProceduralStep, TeacherLessonPlan } from '../types';
import { PcmAudioPlayer, speakWithBrowserSpeech } from '../utils/audioUtils';
import { MathMarkdown, MathFormula, StepFormulaView } from './MathRenderer';
import { LaTeXRenderer } from './LaTeXRenderer';
import { downloadLessonPlanAsWord } from '../utils/wordExport';

interface ChatFeedProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onQuickAction: (actionText: string) => void;
  onRequestArtifact: (type: string) => void;
  onSelectArtifactToView?: (artifact: any) => void;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  isLoading,
  onQuickAction,
  onRequestArtifact,
  onSelectArtifactToView,
}) => {
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [downloadingWordId, setDownloadingWordId] = useState<string | null>(null);
  const audioPlayerRef = React.useRef<PcmAudioPlayer>(new PcmAudioPlayer());

  const handleDownloadWordFromMsg = async (msgId: string, planData: TeacherLessonPlan) => {
    try {
      setDownloadingWordId(msgId);
      await downloadLessonPlanAsWord(planData);
    } catch (err) {
      console.error('Error downloading Word from chat:', err);
    } finally {
      setDownloadingWordId(null);
    }
  };

  const handlePlayAudio = async (msg: ChatMessage) => {
    if (playingMessageId === msg.id) {
      audioPlayerRef.current.stop();
      window.speechSynthesis?.cancel();
      setPlayingMessageId(null);
      return;
    }

    // Stop current
    audioPlayerRef.current.stop();
    window.speechSynthesis?.cancel();
    setPlayingMessageId(msg.id);
    setIsSynthesizing(true);

    try {
      // 1. If message already has base64 audio, play immediately
      if (msg.audioBase64) {
        setIsSynthesizing(false);
        audioPlayerRef.current.playChunk(msg.audioBase64, () => {
          setPlayingMessageId(null);
        });
        return;
      }

      // 2. Fetch server-side TTS from Gemini 3.1 Flash TTS
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: msg.text.slice(0, 450), // keep spoken utterance crisp
          voice: 'Fenrir', // Voz masculina de Gemini (Fenrir)
        }),
      });

      const data = await res.json();
      setIsSynthesizing(false);

      if (data.success && data.audioBase64) {
        msg.audioBase64 = data.audioBase64;
        audioPlayerRef.current.playChunk(data.audioBase64, () => {
          setPlayingMessageId(null);
        });
      } else {
        // Fallback to browser Web Speech API
        speakWithBrowserSpeech(
          msg.text,
          () => setPlayingMessageId(msg.id),
          () => setPlayingMessageId(null)
        );
      }
    } catch (e) {
      console.warn('TTS API error, falling back to speech synthesis:', e);
      setIsSynthesizing(false);
      speakWithBrowserSpeech(
        msg.text,
        () => setPlayingMessageId(msg.id),
        () => setPlayingMessageId(null)
      );
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {messages.map((msg) => {
        const isModel = msg.role === 'model';
        const isPlaying = playingMessageId === msg.id;

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              isModel ? 'justify-start' : 'justify-end'
            } transition-all`}
          >
            {/* Model Avatar */}
            {isModel && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
                <GraduationCap className="w-5 h-5" />
              </div>
            )}

            {/* Message Card */}
            <div
              className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 shadow-xs transition-all ${
                isModel
                  ? 'bg-white border border-slate-200 text-slate-800'
                  : 'bg-blue-600 text-white shadow-blue-200'
              }`}
            >
              {/* Sender info */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100/40 text-xs">
                <span className={`font-bold ${isModel ? 'text-blue-900' : 'text-blue-100'}`}>
                  {isModel ? 'Profesor Virtual Dominicano' : 'Tú'}
                </span>

                {/* Model Audio Player Button */}
                {isModel && (
                  <button
                    onClick={() => handlePlayAudio(msg)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                      isPlaying
                        ? 'bg-rose-100 text-rose-700 animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    title={isPlaying ? 'Detener audio' : 'Escuchar explicación'}
                  >
                    {isSynthesizing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPlaying ? (
                      <VolumeX className="w-3 h-3 text-rose-600" />
                    ) : (
                      <Volume2 className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{isPlaying ? 'Detener voz' : 'Escuchar'}</span>
                  </button>
                )}
              </div>

              {/* Media Attachment if User sent an image or document */}
              {msg.attachment && (
                <div className="mb-3 p-2 rounded-xl bg-slate-900/10 border border-slate-200/50 flex items-center gap-2 text-xs">
                  {msg.attachment.previewUrl ? (
                    <img
                      src={msg.attachment.previewUrl}
                      alt="Adjunto"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-slate-500" />
                  )}
                  <div className="truncate">
                    <span className="font-semibold block truncate">
                      {msg.attachment.name || 'Archivo adjunto'}
                    </span>
                    <span className="text-[10px] opacity-75">
                      Analizado visualmente con Gemini
                    </span>
                  </div>
                </div>
              )}

              {/* Message Main Body with LaTeXRenderer */}
              <div className="text-xs sm:text-sm leading-relaxed">
                <LaTeXRenderer
                  content={msg.text}
                  className={!isModel ? 'text-white [&_.katex]:text-white [&_.katex-display-wrapper]:text-white [&_.katex-display-wrapper]:border-blue-400 [&_.katex-display-wrapper]:bg-blue-600/30' : ''}
                />
              </div>

              {/* Procedural Steps (if Math or Science breakdown) */}
              {msg.proceduralSteps && msg.proceduralSteps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Procedimiento Paso a Paso:
                  </span>
                  {msg.proceduralSteps.map((step: ProceduralStep) => (
                    <div
                      key={step.stepNumber}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs shadow-2xs"
                    >
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                          {step.stepNumber}
                        </span>
                        <div className="flex-1">
                          <LaTeXRenderer content={step.title} />
                        </div>
                      </div>
                      <div className="text-slate-600 mb-1.5">
                        <LaTeXRenderer content={step.explanation} />
                      </div>
                      {step.formulaOrCode && (
                        <StepFormulaView formulaOrCode={step.formulaOrCode} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Socratic follow-up callout */}
              {msg.socraticQuestion && (
                <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                    <span className="text-sm">🤔</span>
                    <span>Pregunta de reflexión socrática:</span>
                  </div>
                  <div className="text-amber-800 leading-relaxed font-medium">
                    <LaTeXRenderer content={msg.socraticQuestion} />
                  </div>
                  <button
                    onClick={() =>
                      onQuickAction(
                        `Profesor, respecto a tu pregunta socrática ("${msg.socraticQuestion}"): `
                      )
                    }
                    className="mt-2 text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1"
                  >
                    <span>Responder esta pregunta al profesor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Embedded Artifact Teaser */}
              {msg.artifact && (
                <div className={`mt-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                  msg.artifact.type === 'teacher_plan'
                    ? 'bg-gradient-to-r from-blue-50/90 to-amber-50/70 border-blue-300 shadow-2xs'
                    : msg.artifact.type === 'graph_plot'
                    ? 'bg-blue-50/90 border-blue-300 shadow-2xs'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-lg text-white shrink-0 ${
                      msg.artifact.type === 'teacher_plan'
                        ? 'bg-blue-700'
                        : msg.artifact.type === 'graph_plot'
                        ? 'bg-blue-600'
                        : 'bg-blue-600'
                    }`}>
                      {msg.artifact.type === 'teacher_plan' ? (
                        <FileText className="w-4 h-4 text-amber-300" />
                      ) : msg.artifact.type === 'graph_plot' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-950 block leading-tight">
                          {msg.artifact.title}
                        </span>
                        {msg.artifact.type === 'teacher_plan' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-700 text-white uppercase">
                            MINERD
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-blue-700 font-medium">
                        {msg.artifact.type === 'teacher_plan'
                          ? 'Planificación Curricular Oficial • Lista para descargar'
                          : msg.artifact.type === 'graph_plot'
                          ? 'Gráfica y Plano Cartesiano Interactivo'
                          : `Recurso: ${msg.artifact.type}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Direct Word Download for teacher_plan */}
                    {msg.artifact.type === 'teacher_plan' && (
                      <button
                        onClick={() => {
                          if (msg.artifact) {
                            handleDownloadWordFromMsg(msg.id, msg.artifact.data as TeacherLessonPlan);
                          }
                        }}
                        disabled={downloadingWordId === msg.id}
                        className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Descargar directamente documento Word (.docx)"
                      >
                        {downloadingWordId === msg.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>{downloadingWordId === msg.id ? 'Descargando...' : 'Descargar Word (.docx)'}</span>
                      </button>
                    )}

                    {onSelectArtifactToView && (
                      <button
                        onClick={() => onSelectArtifactToView(msg.artifact)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs shrink-0 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{msg.artifact.type === 'teacher_plan' ? 'Ver completa' : 'Ver y manipular'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Contextual Teacher Actions */}
              {isModel && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onQuickAction('Hazlo más sencillo')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 text-[10px] font-medium text-slate-700 transition-all"
                  >
                    "Hazlo más sencillo"
                  </button>
                  <button
                    onClick={() => onQuickAction('Ponme un ejemplo cotidiano en República Dominicana')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 text-[10px] font-medium text-slate-700 transition-all"
                  >
                    "Ejemplo dominicano"
                  </button>
                  <button
                    onClick={() => onRequestArtifact('teacher_plan')}
                    className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-bold text-amber-900 transition-all flex items-center gap-1"
                  >
                    <FileDown className="w-3 h-3 text-amber-700" />
                    <span>"Planificación en Word (.docx)"</span>
                  </button>
                  <button
                    onClick={() => onRequestArtifact('graph_plot')}
                    className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[10px] font-semibold text-blue-700 transition-all flex items-center gap-1"
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>"Graficar en plano cartesiano"</span>
                  </button>
                  <button
                    onClick={() => onRequestArtifact('quiz')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 text-[10px] font-semibold text-slate-700 transition-all"
                  >
                    "Quiz interactivo"
                  </button>
                </div>
              )}
            </div>

            {/* User Avatar */}
            {!isModel && (
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      })}

      {/* Typing / Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-3 justify-start animate-in fade-in">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-slate-500">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>El profesor está analizando el material y preparando la explicación...</span>
          </div>
        </div>
      )}
    </div>
  );
};
