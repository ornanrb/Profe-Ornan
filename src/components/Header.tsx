import React from 'react';
import {
  BookOpen,
  Calculator,
  Globe,
  Leaf,
  GraduationCap,
  Sparkles,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  Cpu,
  FolderOpen,
} from 'lucide-react';
import {
  DominicanSubject,
  GradeId,
  UserRole,
  PedagogicalStyle,
  UserSessionProfile,
  AIProviderConfig,
} from '../types';
import { DOMINICAN_GRADES, DOMINICAN_SUBJECTS } from '../data/curriculumRD';
import { AI_PROVIDERS } from '../data/aiProviders';

interface HeaderProps {
  profile: UserSessionProfile;
  onUpdateProfile: (updates: Partial<UserSessionProfile>) => void;
  isLiveActive: boolean;
  onToggleLive: () => void;
  activeView: 'chat' | 'artifacts' | 'teacher_tools';
  setActiveView: (view: 'chat' | 'artifacts' | 'teacher_tools') => void;
  hasArtifact: boolean;
  aiConfig: AIProviderConfig;
  onOpenAIModal: () => void;
  onOpenMediaDrawer?: () => void;
  mediaCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onUpdateProfile,
  isLiveActive,
  onToggleLive,
  activeView,
  setActiveView,
  hasArtifact,
  aiConfig,
  onOpenAIModal,
  onOpenMediaDrawer,
  mediaCount = 0,
}) => {
  const currentSubject = DOMINICAN_SUBJECTS[profile.subject];
  const currentGrade = DOMINICAN_GRADES.find((g) => g.id === profile.grade) || DOMINICAN_GRADES[6];
  const currentProviderInfo = AI_PROVIDERS[aiConfig.provider] || AI_PROVIDERS.google;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs w-full">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between min-h-16 py-2 gap-2 lg:gap-3 w-full">
          
          {/* Brand & Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">Profe Ornan</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  🇩🇴 Currículo MINERD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden 2xl:block">
                Tutor Virtual Pedagógico y Multimodal de República Dominicana
              </p>
            </div>
          </div>

          {/* Center: Full-width Subject Tabs Menu */}
          <div className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 flex-1 max-w-2xl mx-2">
            {(Object.keys(DOMINICAN_SUBJECTS) as DominicanSubject[]).map((subjKey) => {
              const isSelected = profile.subject === subjKey;
              const subj = DOMINICAN_SUBJECTS[subjKey];
              return (
                <button
                  key={subjKey}
                  onClick={() => onUpdateProfile({ subject: subjKey })}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title={subj.name}
                >
                  {subjKey === 'matematica' && <Calculator className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {subjKey === 'lengua_espanola' && <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  {subjKey === 'ciencias_sociales' && <Globe className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  {subjKey === 'ciencias_naturaleza' && <Leaf className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                  <span className="truncate">{subj.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Role, Grade, Live CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Grade Selector */}
            <div className="relative inline-block text-left">
              <select
                value={profile.grade}
                onChange={(e) => onUpdateProfile({ grade: e.target.value as GradeId })}
                className="appearance-none bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2.5 py-1.5 pr-6 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                title="Seleccionar Grado Escolar Dominicano"
              >
                {DOMINICAN_GRADES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* AI Provider Selector Button */}
            <button
              onClick={onOpenAIModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all group"
              title={`Proveedor de IA: ${currentProviderInfo.name} (${aiConfig.model}). Clic para cambiar de proveedor o clave API.`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="hidden xl:inline font-semibold text-slate-800">
                {currentProviderInfo.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline bg-slate-100 px-1.5 py-0.5 rounded-md">
                {aiConfig.model.split('-').slice(0, 2).join('-')}
              </span>
              <SlidersHorizontal className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
            </button>

            {/* Analyzed Media & Images Drawer Button */}
            {onOpenMediaDrawer && (
              <button
                onClick={onOpenMediaDrawer}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all cursor-pointer group"
                title="Ver historial de imágenes y archivos analizados para repasar conceptos"
              >
                <FolderOpen className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Archivos</span>
                {mediaCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {mediaCount}
                  </span>
                )}
              </button>
            )}

            {/* Role Switcher */}
            <button
              onClick={() =>
                onUpdateProfile({
                  role: profile.role === 'estudiante' ? 'docente' : 'estudiante',
                })
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                profile.role === 'docente'
                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                  : 'bg-blue-50 text-blue-800 border-blue-200 font-medium'
              }`}
              title="Cambiar entre modo Estudiante y Docente"
            >
              {profile.role === 'docente' ? '👨‍🏫 Modo Docente' : '🎒 Modo Estudiante'}
            </button>

            {/* Gemini Live Voice Button */}
            <button
              onClick={onToggleLive}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                isLiveActive
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-200 ring-2 ring-rose-400'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              }`}
              title="Conectar sesión de voz Gemini Live"
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveActive ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isLiveActive ? 'Gemini Live Activo' : 'Hablar con el Profesor'}
              </span>
              <span className="sm:hidden">{isLiveActive ? 'Live' : 'Voz'}</span>
            </button>

          </div>
        </div>

        {/* Mobile Subject Bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 overflow-x-auto gap-1 text-xs no-scrollbar">
          {(Object.keys(DOMINICAN_SUBJECTS) as DominicanSubject[]).map((subjKey) => {
            const isSelected = profile.subject === subjKey;
            const subj = DOMINICAN_SUBJECTS[subjKey];
            return (
              <button
                key={subjKey}
                onClick={() => onUpdateProfile({ subject: subjKey })}
                className={`px-2 py-1 rounded-md shrink-0 font-medium ${
                  isSelected ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
                }`}
              >
                {subj.name}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
