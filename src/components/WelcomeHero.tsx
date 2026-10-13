import React from 'react';
import {
  Calculator,
  BookOpen,
  Globe,
  Leaf,
  Mic,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Volume2,
} from 'lucide-react';
import { DominicanSubject, GradeId, UserSessionProfile } from '../types';
import { DOMINICAN_GRADES, DOMINICAN_SUBJECTS } from '../data/curriculumRD';

interface WelcomeHeroProps {
  profile: UserSessionProfile;
  onUpdateProfile: (updates: Partial<UserSessionProfile>) => void;
  onStartWithPrompt: (promptText: string) => void;
  onStartLiveVoice: () => void;
  onOpenAIModal?: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  profile,
  onUpdateProfile,
  onStartWithPrompt,
  onStartLiveVoice,
  onOpenAIModal,
}) => {
  const currentSubject = DOMINICAN_SUBJECTS[profile.subject];

  return (
    <div className="bg-gradient-to-b from-blue-50/70 via-white to-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs my-4">
      <div className="max-w-4xl mx-auto text-center">
        
        {/* National Emblem & AI Provider Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200">
            <GraduationCap className="w-4 h-4 text-blue-700" />
            <span>Profe Ornan • Currículo Dominicano MINERD</span>
          </div>
          {onOpenAIModal && (
            <button
              onClick={onOpenAIModal}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
              title="Cambiar proveedor de IA o clave API"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Configurar Proveedor de IA</span>
            </button>
          )}
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          ¿Qué quieres aprender hoy con el Profe Ornan?
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-6">
          Tu tutor pedagógico particular inteligente especializado en el currículo nacional dominicano. Conversa por voz en tiempo real, comparte tu cámara para revisar tareas y libretas con formulación matemática rigurosa en LaTeX.
        </p>

        {/* Prominent Gemini Live Voice Action */}
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onStartLiveVoice}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:to-rose-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all transform active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span>Hablar con el Profe Ornan (Gemini Live)</span>
            <Volume2 className="w-4 h-4 opacity-80" />
          </button>

          <div className="text-xs text-slate-500 font-medium sm:text-left flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Respuestas habladas, interrupciones naturales y visión en vivo</span>
          </div>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left mb-6">
          {(Object.keys(DOMINICAN_SUBJECTS) as DominicanSubject[]).map((key) => {
            const subj = DOMINICAN_SUBJECTS[key];
            const isSelected = profile.subject === key;

            return (
              <div
                key={key}
                onClick={() => onUpdateProfile({ subject: key })}
                className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${subj.bgLight}`}>
                    {key === 'matematica' && <Calculator className="w-5 h-5 text-emerald-600" />}
                    {key === 'lengua_espanola' && <BookOpen className="w-5 h-5 text-blue-600" />}
                    {key === 'ciencias_sociales' && <Globe className="w-5 h-5 text-amber-600" />}
                    {key === 'ciencias_naturaleza' && <Leaf className="w-5 h-5 text-teal-600" />}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Activa
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm mb-1">{subj.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {subj.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Topic Starters for the Active Subject */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Temas recomendados del currículo para {currentSubject.name}:
            </span>
            <span className="text-xs text-slate-500 font-medium">Haz clic para comenzar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {currentSubject.sampleTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => onStartWithPrompt(topic.prompt)}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-blue-50/60 hover:border-blue-200 transition-all text-left flex flex-col justify-between group"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 flex items-center justify-between">
                    <span>{topic.title}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {topic.description}
                  </p>
                </div>
                <span className="text-[10px] font-medium text-slate-400 mt-2">
                  {topic.gradeRange}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
