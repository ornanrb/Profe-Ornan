import React, { useState, useMemo } from 'react';
import {
  X,
  Image as ImageIcon,
  Camera,
  Monitor,
  FileText,
  Search,
  Sparkles,
  Calendar,
  MessageSquare,
  HelpCircle,
  Eye,
  Trash2,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  Layers,
  ZoomIn,
} from 'lucide-react';
import { AnalyzedMediaItem } from '../types';
import { LaTeXRenderer } from './LaTeXRenderer';

interface AnalyzedMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: AnalyzedMediaItem[];
  onSelectItemForReview: (item: AnalyzedMediaItem) => void;
  onAskQuestionAboutItem: (item: AnalyzedMediaItem, promptText?: string) => void;
  onTriggerQuizFromItem?: (item: AnalyzedMediaItem) => void;
  onTriggerNewUpload?: () => void;
  onDeleteItem?: (id: string) => void;
  onLoadSampleItem?: (sampleKey: 'algebra' | 'geometria' | 'historia') => void;
}

export const AnalyzedMediaDrawer: React.FC<AnalyzedMediaDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItemForReview,
  onAskQuestionAboutItem,
  onTriggerQuizFromItem,
  onTriggerNewUpload,
  onDeleteItem,
  onLoadSampleItem,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'camera' | 'screen' | 'file'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<AnalyzedMediaItem | null>(null);

  // Filter and search items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.detectedContent && item.detectedContent.toLowerCase().includes(q)) ||
        (item.diagnosis && item.diagnosis.toLowerCase().includes(q)) ||
        (item.keyConcepts && item.keyConcepts.some((c) => c.toLowerCase().includes(q)));
      return matchesType && matchesSearch;
    });
  }, [items, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Container (Right side) */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Archivos e Imágenes Analizados
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {items.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Repasa conceptos, ejercicios de libreta y diagnósticos visuales.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Cerrar panel lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="mt-4 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por tema, concepto o fórmula..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todos ({items.length})
                </button>
                <button
                  onClick={() => setFilterType('camera')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    filterType === 'camera'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Cámara / Libreta</span>
                </button>
                <button
                  onClick={() => setFilterType('screen')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    filterType === 'screen'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Pantalla</span>
                </button>
                <button
                  onClick={() => setFilterType('file')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                    filterType === 'file'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Archivos</span>
                </button>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay archivos analizados aún'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                  {searchQuery
                    ? 'Intenta con otro término o limpia el filtro de búsqueda.'
                    : 'Toma una foto de tu libreta con la cámara, comparte tu pantalla o sube un documento para que el Profe Ornan lo diagnostique.'}
                </p>

                {onLoadSampleItem && !searchQuery && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-left space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-center">
                      Cargar ejemplos didácticos de repaso:
                    </span>
                    <button
                      onClick={() => onLoadSampleItem('algebra')}
                      className="w-full p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-200 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-indigo-700">
                          📐 Libreta de Álgebra: Ecuación Cuadrática
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Diagnóstico de fórmula general y raíces
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600">Cargar →</span>
                    </button>

                    <button
                      onClick={() => onLoadSampleItem('geometria')}
                      className="w-full p-2.5 bg-white hover:bg-emerald-50/50 border border-slate-200 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-emerald-700">
                          📊 Plano Cartesiano y Parábola
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Vértice, eje de simetría y concavidad
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600">Cargar →</span>
                    </button>

                    <button
                      onClick={() => onLoadSampleItem('historia')}
                      className="w-full p-2.5 bg-white hover:bg-amber-50/50 border border-slate-200 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer group"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-amber-700">
                          🇩🇴 Documento Histórico: Los Trinitarios
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Gesta independentista de 1844
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-600">Cargar →</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isImage = item.mimeType.startsWith('image/') || !!item.dataBase64;
                const imgSrc = isImage
                  ? item.previewUrl || `data:${item.mimeType};base64,${item.dataBase64}`
                  : undefined;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail with Zoom icon */}
                      <div
                        onClick={() => setSelectedPreviewItem(item)}
                        className="relative w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer group/thumb"
                      >
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <FileText className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            {item.type === 'camera' && <Camera className="w-2.5 h-2.5 text-blue-600" />}
                            {item.type === 'screen' && <Monitor className="w-2.5 h-2.5 text-indigo-600" />}
                            {item.type === 'file' && <FileText className="w-2.5 h-2.5 text-emerald-600" />}
                            <span>
                              {item.type === 'camera'
                                ? 'Libreta / Foto'
                                : item.type === 'screen'
                                ? 'Pantalla'
                                : 'Archivo'}
                            </span>
                          </span>

                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {new Date(item.timestamp).toLocaleTimeString('es-DO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-xs mt-1 leading-snug line-clamp-1">
                          {item.name}
                        </h4>

                        {item.detectedContent && (
                          <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">
                            <LaTeXRenderer content={item.detectedContent} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pedagogical Diagnosis & Notes */}
                    {item.diagnosis && (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-50/60 border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                        <span className="font-bold block mb-0.5 text-amber-950">
                          💡 Diagnóstico del Profe Ornan:
                        </span>
                        <div className="line-clamp-2">
                          <LaTeXRenderer content={item.diagnosis} />
                        </div>
                      </div>
                    )}

                    {/* Concept tags */}
                    {item.keyConcepts && item.keyConcepts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.keyConcepts.map((concept, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectItemForReview(item)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Repasar este concepto paso a paso con el tutor"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-200" />
                          <span>Repasar Concepto</span>
                        </button>

                        <button
                          onClick={() =>
                            onAskQuestionAboutItem(
                              item,
                              `Explícame detalladamente los pasos correctos para resolver lo que aparece en ${item.name}`
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Hacer una consulta sobre este ejercicio"
                        >
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span className="hidden sm:inline">Preguntar</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedPreviewItem(item)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Ver imagen en tamaño completo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteItem && (
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar de la sesión"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer with Quick Upload CTA */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {filteredItems.length} de {items.length} archivo(s)
            </span>

            {onTriggerNewUpload && (
              <button
                onClick={() => {
                  onClose();
                  onTriggerNewUpload();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Analizar Nuevo Archivo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full Preview Modal for Selected Media Item */}
      {selectedPreviewItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  {selectedPreviewItem.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
                  {selectedPreviewItem.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedPreviewItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Full Image */}
              <div className="rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-80 border border-slate-800">
                <img
                  src={
                    selectedPreviewItem.previewUrl ||
                    `data:${selectedPreviewItem.mimeType};base64,${selectedPreviewItem.dataBase64}`
                  }
                  alt={selectedPreviewItem.name}
                  className="max-h-80 max-w-full object-contain"
                />
              </div>

              {/* Detected Content */}
              {selectedPreviewItem.detectedContent && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <h5 className="font-bold text-slate-800 mb-1">Contenido Identificado:</h5>
                  <div className="leading-relaxed text-slate-700">
                    <LaTeXRenderer content={selectedPreviewItem.detectedContent} />
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {selectedPreviewItem.diagnosis && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
                  <h5 className="font-bold text-amber-900 mb-1">Diagnóstico Pedagógico:</h5>
                  <div className="leading-relaxed">
                    <LaTeXRenderer content={selectedPreviewItem.diagnosis} />
                  </div>
                </div>
              )}

              {/* Detailed Notes if available */}
              {selectedPreviewItem.notes && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-xs text-slate-800">
                  <h5 className="font-bold text-blue-900 mb-1">Explicación del Profe Ornan:</h5>
                  <div className="leading-relaxed">
                    <LaTeXRenderer content={selectedPreviewItem.notes} />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const item = selectedPreviewItem;
                  setSelectedPreviewItem(null);
                  onClose();
                  onSelectItemForReview(item);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Repasar con el Profesor en el Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
