import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Compass,
  FileCheck2,
  ChevronRight,
  BookOpen,
  Send,
  Copy,
  Check,
  TrendingUp,
  FileDown,
  Download,
  Loader2,
} from 'lucide-react';
import {
  LearningArtifact,
  QuizQuestion,
  ProceduralStep,
  TimelineEvent,
  FlashcardItem,
  MindmapNode,
  TeacherLessonPlan,
  GraphPlotArtifactData,
} from '../types';
import { MathMarkdown, MathFormula, StepFormulaView } from './MathRenderer';
import { LaTeXRenderer } from './LaTeXRenderer';
import { GraphPlotter } from './GraphPlotter';
import { downloadLessonPlanAsWord } from '../utils/wordExport';

interface ArtifactViewerProps {
  artifact: LearningArtifact;
  onAskAboutArtifactPart: (partText: string, contextPrompt?: string) => void;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  onAskAboutArtifactPart,
}) => {
  // Normalize artifact data structure
  const rawData: any = artifact.data || artifact;
  const artData: any =
    rawData && typeof rawData === 'object' && rawData.data && typeof rawData.data === 'object' && !Array.isArray(rawData.data)
      ? { ...rawData, ...rawData.data }
      : rawData || {};

  // State for Quiz
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // State for Flashcards
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // State for Copied feedback
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);

  const handleDownloadWord = async (plan: TeacherLessonPlan) => {
    try {
      setIsDownloadingWord(true);
      await downloadLessonPlanAsWord(plan);
    } catch (err) {
      console.error('Error exporting lesson plan to Word:', err);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  // Quiz answer handler
  const handleAnswerSelect = (questionIndex: number, optionIndex: number, correctIndex: number) => {
    if (selectedAnswers[questionIndex] !== undefined) return; // already answered
    const nextAnswers = { ...selectedAnswers, [questionIndex]: optionIndex };
    setSelectedAnswers(nextAnswers);

    if (optionIndex === correctIndex) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}
    }
  };

  const calculateScore = (questions: QuizQuestion[]) => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) score++;
    });
    setQuizScore(score);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition-all animate-in fade-in duration-300">
      
      {/* Header bar of Artifact */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            {artifact.type === 'quiz' && <HelpCircle className="w-4 h-4" />}
            {artifact.type === 'math_step' && <Layers className="w-4 h-4" />}
            {artifact.type === 'timeline' && <Calendar className="w-4 h-4" />}
            {artifact.type === 'mindmap' && <Compass className="w-4 h-4" />}
            {artifact.type === 'flashcards' && <BookOpen className="w-4 h-4" />}
            {artifact.type === 'teacher_plan' && <FileCheck2 className="w-4 h-4" />}
            {artifact.type === 'graph_plot' && <TrendingUp className="w-4 h-4 text-blue-600" />}
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              {artifact.title}
            </h3>
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
              Recurso Interactivo Dominicano • {artifact.subject}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Generado por Gemini</span>
        </div>
      </div>

      {/* 1. INTERACTIVE QUIZ */}
      {artifact.type === 'quiz' && (
        <div className="space-y-5">
          {(artData.questions || []).map((q: QuizQuestion, qIdx: number) => {
            const hasAnswered = selectedAnswers[qIdx] !== undefined;
            const userAnswer = selectedAnswers[qIdx];
            const isCorrect = userAnswer === q.correctIndex;

            return (
              <div key={q.id || qIdx} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                    Pregunta {qIdx + 1}
                  </span>
                  {hasAnswered && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isCorrect ? '¡Correcto!' : 'Respuesta errónea'}
                    </span>
                  )}
                </div>

                <div className="text-sm font-semibold text-slate-800 mb-3">
                  <LaTeXRenderer content={q.question} />
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

                    if (hasAnswered) {
                      if (optIdx === q.correctIndex) {
                        btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-400';
                      } else if (userAnswer === optIdx) {
                        btnStyle = 'bg-rose-50 border-rose-400 text-rose-900 font-semibold';
                      } else {
                        btnStyle = 'bg-white/60 border-slate-200 text-slate-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={hasAnswered}
                        onClick={() => handleAnswerSelect(qIdx, optIdx, q.correctIndex)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <div className="flex-1 pr-2">
                          <LaTeXRenderer content={opt} />
                        </div>
                        {hasAnswered && optIdx === q.correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Explanation */}
                {hasAnswered && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <p className="font-semibold text-slate-900 mb-1">Fundamento Pedagógico:</p>
                    <LaTeXRenderer content={q.explanation} />
                    {q.dominicanContext && (
                      <p className="mt-1 text-[11px] text-blue-700 font-medium">
                        🇩🇴 Contexto: {q.dominicanContext}
                      </p>
                    )}
                    <button
                      onClick={() =>
                        onAskAboutArtifactPart(
                          `Sobre la pregunta "${q.question}": explícame con más detalle por qué la respuesta correcta es "${q.options[q.correctIndex]}"`
                        )
                      }
                      className="mt-2 text-blue-600 hover:text-blue-800 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <span>Preguntarle al profesor sobre esta pregunta</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. PROCEDURAL STEP-BY-STEP MATH / SCIENCE */}
      {artifact.type === 'math_step' && (
        <div className="space-y-3">
          {(artData.steps || []).map((step: ProceduralStep, sIdx: number) => (
            <div key={sIdx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {step.stepNumber || sIdx + 1}
                  </span>
                  <div className="text-xs font-bold text-slate-900">
                    <LaTeXRenderer content={step.title} />
                  </div>
                </div>
                <button
                  onClick={() =>
                    onAskAboutArtifactPart(
                      `Explícame el paso ${step.stepNumber}: "${step.title}" de una forma más sencilla y con otro ejemplo.`
                    )
                  }
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium shrink-0"
                >
                  Explicar este paso
                </button>
              </div>

              <div className="text-xs text-slate-600 mb-2 leading-relaxed">
                <LaTeXRenderer content={step.explanation} />
              </div>

              {step.formulaOrCode && (
                <StepFormulaView formulaOrCode={step.formulaOrCode} />
              )}

              {step.pitfallWarning && (
                <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
                  <span className="font-bold">⚠️ Error frecuente: </span>
                  <LaTeXRenderer content={step.pitfallWarning} className="inline" />
                </div>
              )}
            </div>
          ))}

          {artData.finalAnswer && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between shadow-2xs">
              <span>Resultado Final:</span>
              <div className="text-sm font-extrabold text-emerald-950">
                <LaTeXRenderer content={`$${artData.finalAnswer}$`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. DOMINICAN HISTORY TIMELINE */}
      {artifact.type === 'timeline' && (
        <div className="relative border-l-2 border-blue-200 ml-3 pl-5 space-y-6 my-2">
          {(artData.events || []).map((ev: TimelineEvent, idx: number) => (
            <div key={idx} className="relative group">
              {/* Dot */}
              <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-blue-700 px-2 py-0.5 rounded-md bg-blue-50">
                    {ev.yearOrDate}
                  </span>
                  <button
                    onClick={() =>
                      onAskAboutArtifactPart(
                        `Cuéntame más sobre el evento histórico: "${ev.title}" (${ev.yearOrDate}) y su trascendencia en la República Dominicana.`
                      )
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Preguntar sobre esto
                  </button>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mb-1">{ev.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">{ev.description}</p>

                {ev.significanceRD && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                    🇩🇴 Significado Patrio: {ev.significanceRD}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. CONCEPT MINDMAP / NODES */}
      {artifact.type === 'mindmap' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(artData.nodes || []).map((node: MindmapNode, nIdx: number) => (
              <div
                key={node.id || nIdx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer"
                onClick={() =>
                  onAskAboutArtifactPart(
                    `Explícame el concepto "${node.label}" y cómo se conecta con el resto del tema.`
                  )
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">
                    <LaTeXRenderer content={node.label} className="inline" />
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold shrink-0 ml-2">Tocar para preguntar</span>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  <LaTeXRenderer content={node.description} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FLASHCARDS */}
      {artifact.type === 'flashcards' && (
        <div>
          {(() => {
            const cards: FlashcardItem[] = artData.cards || [];
            if (cards.length === 0) return <p className="text-xs text-slate-400">Sin tarjetas.</p>;
            const currentCard = cards[currentCardIndex];

            return (
              <div className="max-w-md mx-auto">
                <div
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className="min-h-[160px] p-6 rounded-2xl border border-slate-300 bg-gradient-to-tr from-slate-50 to-white shadow-xs cursor-pointer flex flex-col justify-between text-center transition-all transform hover:scale-[1.01]"
                >
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {currentCard.category || 'Tarjeta de Estudio'} • Toca para voltear
                  </span>

                  <div className="my-auto py-3">
                    <div className="text-base font-bold text-slate-900">
                      <LaTeXRenderer content={isCardFlipped ? currentCard.back : currentCard.front} />
                    </div>
                    {!isCardFlipped && currentCard.hint && (
                      <div className="text-xs text-slate-500 mt-2">
                        💡 Pista: <LaTeXRenderer content={currentCard.hint} className="inline" />
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {isCardFlipped ? 'Mostrando Respuesta' : 'Mostrando Concepto / Pregunta'}
                  </span>
                </div>

                {/* Card Controls */}
                <div className="flex items-center justify-between mt-3 px-2">
                  <button
                    disabled={currentCardIndex === 0}
                    onClick={() => {
                      setIsCardFlipped(false);
                      setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  <span className="text-xs font-semibold text-slate-500">
                    {currentCardIndex + 1} de {cards.length}
                  </span>

                  <button
                    disabled={currentCardIndex === cards.length - 1}
                    onClick={() => {
                      setIsCardFlipped(false);
                      setCurrentCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 6. TEACHER LESSON PLAN (MINERD FORMAT) */}
      {artifact.type === 'teacher_plan' && (
        <div className="space-y-4">
          {(() => {
            const plan: TeacherLessonPlan = artifact.data as TeacherLessonPlan;
            const fullPlanText = JSON.stringify(plan, null, 2);

            return (
              <div className="space-y-4">
                {/* Header Banner with Direct Word Download */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-amber-50 p-4 rounded-xl border border-blue-200 text-xs shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white font-bold text-[10px] tracking-wide uppercase">
                        Planificación MINERD
                      </span>
                      <span className="text-[11px] text-blue-900 font-semibold">
                        Formato Oficial Docente
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-sm block leading-tight">
                      {plan.title || artifact.title}
                    </span>
                    <span className="text-slate-600 text-xs mt-0.5 block">
                      {plan.subject} • {plan.grade} • Tiempo: <span className="font-semibold text-slate-800">{plan.duration}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleDownloadWord(plan)}
                      disabled={isDownloadingWord}
                      className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
                      title="Descargar documento editable de Word compatible con Microsoft Word y Google Docs"
                    >
                      {isDownloadingWord ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4 text-amber-300" />
                      )}
                      <span>
                        {isDownloadingWord ? 'Generando .docx...' : 'Descargar en Word (.docx)'}
                      </span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(fullPlanText)}
                      className="px-2.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 shadow-2xs text-xs transition-all"
                      title="Copiar contenido de la planificación"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* Institutional Note */}
                <div className="px-3 py-2 bg-blue-50/70 border border-blue-200/80 rounded-xl text-slate-700 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-700 font-bold">📄 Documento Word Editable:</span>
                    <span>Descarga el archivo estructurado con tablas, encabezado oficial del MINERD, rúbrica y firmas.</span>
                  </div>
                  <button
                    onClick={() => handleDownloadWord(plan)}
                    disabled={isDownloadingWord}
                    className="text-blue-700 hover:text-blue-900 font-bold underline text-[11px] shrink-0"
                  >
                    Bajar .docx
                  </button>
                </div>

                {/* Competencias Fundamentales */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    Competencias Fundamentales (MINERD):
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                    {(plan.fundamentalCompetencies || []).map((c, i) => (
                      <li key={i} className="leading-snug">{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Competencias Específicas */}
                {plan.specificCompetencies && plan.specificCompetencies.length > 0 && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                      Competencias Específicas del Área:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                      {plan.specificCompetencies.map((c, i) => (
                        <li key={i} className="leading-snug">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Situación de Aprendizaje */}
                {plan.learningSituation && (
                  <div className="p-3.5 bg-blue-50/40 rounded-xl border-l-4 border-l-blue-600 border border-slate-200 text-xs">
                    <h4 className="font-bold text-blue-950 mb-1 flex items-center gap-1.5">
                      Situación de Aprendizaje Contextualizada:
                    </h4>
                    <p className="text-slate-800 leading-relaxed italic">{plan.learningSituation}</p>
                  </div>
                )}

                {/* Secuencia Didáctica */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between">
                    <span>Secuencia Didáctica (Fases de la Clase):</span>
                    <span className="text-[11px] font-normal text-slate-500">Inicio • Desarrollo • Cierre</span>
                  </h4>
                  {(plan.didacticSequence || []).map((seq, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs">
                      <div className="flex items-center justify-between font-bold text-slate-900 mb-2 pb-1.5 border-b border-slate-100">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-900 text-xs font-bold">
                          Fase {seq.phase}
                        </span>
                        <span className="text-slate-500 text-xs font-semibold">
                          ⏱ {seq.durationMinutes} minutos
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                        <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-900 block text-[11px] mb-1">
                            👨‍🏫 Actividad de Enseñanza (Docente):
                          </span>
                          <p className="leading-relaxed text-[11px]">{seq.teacherActivity}</p>
                        </div>
                        <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-900 block text-[11px] mb-1">
                            🧑‍🎓 Actividad de Aprendizaje (Estudiante):
                          </span>
                          <p className="leading-relaxed text-[11px]">{seq.studentActivity}</p>
                        </div>
                      </div>
                      {seq.resources && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Recursos:</span>
                          <span>
                            {Array.isArray(seq.resources) ? seq.resources.join(', ') : seq.resources}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Rúbrica de Evaluación Analítica */}
                {plan.evaluationRubric && plan.evaluationRubric.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Rúbrica de Evaluación Analítica por Niveles de Dominio:
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5 w-1/4">Indicador / Criterio</th>
                            <th className="p-2 text-slate-700">Receptivo</th>
                            <th className="p-2 text-blue-800">Básico</th>
                            <th className="p-2 text-emerald-800">Autónomo</th>
                            <th className="p-2 text-purple-800">Estratégico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {plan.evaluationRubric.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-bold text-slate-900 align-top bg-slate-50/30">
                                {r.indicator}
                              </td>
                              <td className="p-2 text-slate-600 align-top">
                                {r.levels?.receptive || '—'}
                              </td>
                              <td className="p-2 text-slate-700 align-top">
                                {r.levels?.basic || '—'}
                              </td>
                              <td className="p-2 text-slate-800 align-top font-medium">
                                {r.levels?.autonomous || '—'}
                              </td>
                              <td className="p-2 text-purple-900 align-top font-semibold">
                                {r.levels?.strategic || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Download CTA footer */}
                <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="font-bold block text-xs">¿Deseas imprimir o editar esta planificación en Word?</span>
                    <span className="text-[11px] text-slate-300">Descárgala en formato .docx listo para el centro educativo y MINERD.</span>
                  </div>
                  <button
                    onClick={() => handleDownloadWord(plan)}
                    disabled={isDownloadingWord}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {isDownloadingWord ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>Descargar Word (.docx)</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 7. INTERACTIVE CARTESIAN GRAPH & DRAWING PLOTTER */}
      {artifact.type === 'graph_plot' && (
        <GraphPlotter
          data={artifact.data as GraphPlotArtifactData}
          onAskAboutGraph={onAskAboutArtifactPart}
        />
      )}

      {/* Quick Inquiry Bar for the Artifact */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500 font-medium">Preguntas rápidas sobre este recurso:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onAskAboutArtifactPart('Explícame esta parte de forma más sencilla.')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 transition-all"
          >
            "Hazlo más sencillo"
          </button>
          <button
            onClick={() => onAskAboutArtifactPart('Ponme otro ejemplo de la vida cotidiana en República Dominicana.')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 transition-all"
          >
            "Ponme otro ejemplo"
          </button>
          <button
            onClick={() => onAskAboutArtifactPart('¿Por qué ocurre esto y cuál es el fundamento científico o histórico?')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 transition-all"
          >
            "¿Por qué ocurre esto?"
          </button>
        </div>
      </div>

    </div>
  );
};
