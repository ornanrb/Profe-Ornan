import React, { useState } from 'react';
import {
  X,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  RotateCcw,
  Cpu,
  Bot,
  Brain,
  Zap,
  Layers,
  Loader2,
  Lock,
} from 'lucide-react';
import { AIProviderConfig, AIProviderId } from '../types';
import { AI_PROVIDERS, DEFAULT_AI_CONFIG } from '../data/aiProviders';

interface AIProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIProviderConfig;
  onSaveConfig: (newConfig: AIProviderConfig) => void;
}

export const AIProviderModal: React.FC<AIProviderModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(config.provider);
  const [apiKey, setApiKey] = useState<string>(config.apiKey || '');
  const [selectedModel, setSelectedModel] = useState<string>(config.model);
  const [showKey, setShowKey] = useState<boolean>(false);

  // Testing connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  if (!isOpen) return null;

  const currentProviderInfo = AI_PROVIDERS[selectedProvider];

  const handleProviderSelect = (providerId: AIProviderId) => {
    setSelectedProvider(providerId);
    setSelectedModel(AI_PROVIDERS[providerId].defaultModel);
    // If switching back to configured provider, restore key, otherwise keep or clear
    if (providerId === config.provider) {
      setApiKey(config.apiKey || '');
    } else {
      // Check if we have a saved key in localStorage for that specific provider
      try {
        const savedMap = JSON.parse(localStorage.getItem('profe_ornan_keys_cache') || '{}');
        setApiKey(savedMap[providerId] || '');
      } catch (e) {
        setApiKey('');
      }
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Conexión verificada exitosamente.',
          latencyMs: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'No se pudo conectar con el proveedor.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error de red al intentar verificar el proveedor.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim();

    // Cache key for this provider
    try {
      const savedMap = JSON.parse(localStorage.getItem('profe_ornan_keys_cache') || '{}');
      if (trimmedKey) {
        savedMap[selectedProvider] = trimmedKey;
      } else {
        delete savedMap[selectedProvider];
      }
      localStorage.setItem('profe_ornan_keys_cache', JSON.stringify(savedMap));
    } catch (e) {
      console.warn('Could not cache keys map:', e);
    }

    onSaveConfig({
      provider: selectedProvider,
      apiKey: trimmedKey,
      model: selectedModel,
    });
    onClose();
  };

  const handleResetToDefault = () => {
    setSelectedProvider(DEFAULT_AI_CONFIG.provider);
    setApiKey('');
    setSelectedModel(DEFAULT_AI_CONFIG.model);
    setTestResult(null);
  };

  const getProviderIcon = (id: AIProviderId) => {
    switch (id) {
      case 'google':
        return <Sparkles className="w-5 h-5 text-blue-600" />;
      case 'openai':
        return <Bot className="w-5 h-5 text-emerald-600" />;
      case 'anthropic':
        return <Brain className="w-5 h-5 text-amber-600" />;
      case 'deepseek':
        return <Cpu className="w-5 h-5 text-indigo-600" />;
      case 'groq':
        return <Zap className="w-5 h-5 text-rose-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Proveedor de IA y Claves de API
              </h2>
              <p className="text-xs text-slate-500">
                Configura el motor pedagógico del Profe Ornan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* 1. Provider Cards Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              1. Selecciona tu Proveedor de Inteligencia Artificial
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {(Object.keys(AI_PROVIDERS) as AIProviderId[]).map((pId) => {
                const info = AI_PROVIDERS[pId];
                const isSelected = selectedProvider === pId;

                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => handleProviderSelect(pId)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-100">
                        {getProviderIcon(pId)}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          {info.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {info.company}
                        </span>
                      </div>
                    </div>
                    {info.hasServerFallback && (
                      <span className="inline-block mt-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200">
                        Servidor listo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Provider Details & Model */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white shadow-2xs border border-slate-200">
                  {getProviderIcon(selectedProvider)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {currentProviderInfo.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentProviderInfo.tagline}
                  </p>
                </div>
              </div>
              <a
                href={currentProviderInfo.docUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 shrink-0"
              >
                <span>Obtener clave</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Modelo de Inteligencia Artificial:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {currentProviderInfo.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.badge ? `(${m.badge})` : ''} - {m.description}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Clave de API ({currentProviderInfo.name}):
                </label>
                {currentProviderInfo.hasServerFallback && !apiKey && (
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Usando clave del servidor por defecto
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={currentProviderInfo.keyPlaceholder}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-10 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 placeholder:font-sans focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {currentProviderInfo.keyHelpText}
              </p>
            </div>

            {/* Test Connection Button & Result */}
            <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || (!currentProviderInfo.hasServerFallback && !apiKey.trim())}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-2xs"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>Verificando conexión...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Probar conexión con {currentProviderInfo.name}</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Almacenamiento seguro en tu navegador</span>
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.latencyMs && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Tiempo de respuesta: {testResult.latencyMs} ms
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-slate-200/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer a Gemini por defecto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/70 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              Guardar y Aplicar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
