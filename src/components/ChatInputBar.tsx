import React, { useState, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  HelpCircle,
  Calculator,
  BookOpen,
  Globe,
  Leaf,
  Layers,
  StopCircle,
} from 'lucide-react';
import { MediaAttachment, UserSessionProfile } from '../types';

interface ChatInputBarProps {
  onSendMessage: (text: string, requestArtifact?: string) => void;
  isLoading: boolean;
  activeAttachment: MediaAttachment | null;
  onClearAttachment: () => void;
  profile: UserSessionProfile;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  isLoading,
  activeAttachment,
  onClearAttachment,
  profile,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingWebSpeech, setIsRecordingWebSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !activeAttachment) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Browser Speech Recognition for quick voice-to-text dictation
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz por navegador no está soportado en este navegador. Utiliza el botón superior de Gemini Live.');
      return;
    }

    if (isRecordingWebSpeech) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecordingWebSpeech(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-DO';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsRecordingWebSpeech(true);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecordingWebSpeech(false);
      };

      rec.onend = () => {
        setIsRecordingWebSpeech(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error('Speech recognition exception:', e);
      setIsRecordingWebSpeech(false);
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 p-3 sm:p-4 sticky bottom-0 z-20">
      <div className="max-w-4xl mx-auto">
        
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Sugerencias:
          </span>

          <button
            type="button"
            onClick={() => onSendMessage('Explícame la fórmula general de las ecuaciones cuadráticas ax^2 + bx + c = 0 paso a paso y qué significa cada término con la discriminante.', 'math_step')}
            className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 shrink-0 text-[11px] transition-all font-medium border border-emerald-200"
          >
            "Ecuación cuadrática"
          </button>

          <button
            type="button"
            onClick={() => onSendMessage('Explícame este ejercicio paso a paso sin saltarte nada.', 'math_step')}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 shrink-0 text-[11px] transition-all font-medium"
          >
            "Paso a paso"
          </button>

          <button
            type="button"
            onClick={() => onSendMessage('Hazme preguntas socráticas para ver si comprendí este concepto.')}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 shrink-0 text-[11px] transition-all font-medium"
          >
            "Pregúntame socráticamente"
          </button>

          <button
            type="button"
            onClick={() => onSendMessage('Genera un Quiz interactivo de 4 preguntas con contexto dominicano.', 'quiz')}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 shrink-0 text-[11px] transition-all font-medium"
          >
            "Crear Quiz"
          </button>

          <button
            type="button"
            onClick={() => onSendMessage('¿Cuáles son los errores conceptuales más frecuentes sobre este tema?')}
            className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 text-[11px] transition-all font-medium"
          >
            "¿Errores conceptuales?"
          </button>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeAttachment
                  ? `Pregunta sobre ${activeAttachment.name} (ej: '¿Dónde está mi error?', 'Explícame este diagrama')...`
                  : profile.role === 'docente'
                  ? 'Consulta curricular o pide una situación de aprendizaje MINERD...'
                  : 'Escribe tu pregunta para el profesor particular dominicano...'
              }
              className="w-full text-xs sm:text-sm pl-4 pr-12 py-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            />

            {/* Quick Mic Speech-to-text dictation button inside input */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                isRecordingWebSpeech
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
              title={isRecordingWebSpeech ? 'Detener dictado' : 'Dictar por voz'}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !activeAttachment)}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-xs active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center shrink-0"
            title="Enviar mensaje al profesor"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {isRecordingWebSpeech && (
          <p className="text-[11px] text-rose-600 font-semibold mt-1 text-center animate-pulse">
            ● Escuchando tu voz en español dominicano... habla claramente.
          </p>
        )}

      </div>
    </div>
  );
};
