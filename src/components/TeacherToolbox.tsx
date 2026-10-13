import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Award,
  CheckSquare,
  BookOpen,
  Send,
  Loader2,
  Calendar,
  Layers,
  FileDown,
  Check,
} from 'lucide-react';
import { DominicanSubject, GradeId, TeacherLessonPlan } from '../types';
import { DOMINICAN_GRADES, DOMINICAN_SUBJECTS } from '../data/curriculumRD';
import { downloadLessonPlanAsWord } from '../utils/wordExport';

interface TeacherToolboxProps {
  currentSubject: DominicanSubject;
  currentGrade: GradeId;
  onGeneratePlan: (topic: string, duration: string) => void;
  onGenerateQuizRequest: (topic: string) => void;
  onGenerateRubricRequest: (topic: string) => void;
  isLoading: boolean;
  activePlan?: TeacherLessonPlan;
}

export const TeacherToolbox: React.FC<TeacherToolboxProps> = ({
  currentSubject,
  currentGrade,
  onGeneratePlan,
  onGenerateQuizRequest,
  onGenerateRubricRequest,
  isLoading,
  activePlan,
}) => {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('45 minutos');
  const [isDownloading, setIsDownloading] = useState(false);
  const subj = DOMINICAN_SUBJECTS[currentSubject];
  const gradeObj = DOMINICAN_GRADES.find((g) => g.id === currentGrade);

  const handleDownloadActive = async () => {
    if (!activePlan) return;
    try {
      setIsDownloading(true);
      await downloadLessonPlanAsWord(activePlan);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs mb-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            👨‍🏫
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Módulo de Asistencia Curricular y Docente (MINERD)
            </h3>
            <p className="text-xs text-slate-500">
              Generador de planificaciones, situaciones de aprendizaje y recursos didácticos oficiales.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          {subj.name} • {gradeObj?.name}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tema Curricular o Contenido a Trabajar:
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Teorema de Pitágoras / Gesta Restauradora 1863 / Informe de Lectura / Célula y Ecosistemas"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Duración de la Clase:
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="45 minutos">45 minutos (1 bloque)</option>
              <option value="90 minutos">90 minutos (2 bloques)</option>
              <option value="Unidad Semanal">Unidad Semanal</option>
            </select>
          </div>

          <div className="flex-1 flex flex-wrap items-end gap-2 pt-4">
            {/* Action 1: Complete Lesson Plan */}
            <button
              onClick={() => onGeneratePlan(topic || 'Tema Curricular Dominicano', duration)}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generar Planificación MINERD</span>
            </button>

            {/* Action 1b: Download active plan to Word directly */}
            {activePlan && (
              <button
                onClick={handleDownloadActive}
                disabled={isDownloading}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Descargar la planificación activa directamente en formato Word (.docx)"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>Descargar en Word (.docx)</span>
              </button>
            )}

            {/* Action 2: Quiz Generator */}
            <button
              onClick={() => onGenerateQuizRequest(topic || 'Evaluación Curricular')}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Crear Quiz Formativo</span>
            </button>

            {/* Action 3: Rubric */}
            <button
              onClick={() => onGenerateRubricRequest(topic || 'Criterios de Evaluación')}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Diseñar Rúbrica Analítica</span>
            </button>
          </div>
        </div>

        {/* Word format badge */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>
              <strong>Exportación en Word (.docx)</strong>: Todas las planificaciones generadas incluyen competencias MINERD, situación de aprendizaje, secuencia didáctica (Inicio, Desarrollo, Cierre), rúbrica analítica y firmas oficiales.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
