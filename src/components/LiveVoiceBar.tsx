import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  StopCircle,
  RefreshCw,
  AlertCircle,
  X,
  Send,
  MessageSquare,
  Volume1,
} from 'lucide-react';
import {
  PcmAudioPlayer,
  float32ToPcm16Base64,
  speakWithBrowserSpeech,
} from '../utils/audioUtils';

interface LiveVoiceBarProps {
  isActive: boolean;
  onClose: () => void;
  onTranscriptReceived?: (text: string, isUser: boolean) => void;
  onSendToChatFeed?: (userText: string, aiText: string, data?: any) => void;
  videoFrameGetter?: () => string | null;
  profile?: any;
  aiConfig?: any;
}

export const LiveVoiceBar: React.FC<LiveVoiceBarProps> = ({
  isActive,
  onClose,
  onTranscriptReceived,
  onSendToChatFeed,
  videoFrameGetter,
  profile,
  aiConfig,
}) => {
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'
  >('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [lastModelResponse, setLastModelResponse] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceProviderNotice, setVoiceProviderNotice] = useState<string>('Fenrir (Voz Gemini Masculina)');
  const [manualText, setManualText] = useState<string>('');
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState<boolean>(true);
  const [isListeningActive, setIsListeningActive] = useState<boolean>(false);

  // Stable references to prevent component churn
  const statusRef = useRef(status);
  statusRef.current = status;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<PcmAudioPlayer>(new PcmAudioPlayer());
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const videoIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const stopBrowserSpeechRef = useRef<(() => void) | null>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const currentInterimRef = useRef<string>('');

  // Stop any active teacher audio
  const stopTeacherAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }
    if (stopBrowserSpeechRef.current) {
      stopBrowserSpeechRef.current();
      stopBrowserSpeechRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Main voice query handler: sends student voice question to Profe Ornan
  const handleProcessVoiceInput = useCallback(
    async (spokenQuestion: string) => {
      const q = spokenQuestion.trim();
      if (!q) return;

      // Pause speech recognition while Profe Ornan processes & speaks
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListeningActive(false);

      stopTeacherAudio();
      setStatus('processing');
      setTranscript(`Tú: "${q}"`);

      try {
        // Query Profe Ornan pedagogical engine
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: q,
            profile: profile || {
              role: 'estudiante',
              subject: 'matematica',
              grade: '3ro_secundaria',
              difficulty: 'intermedio',
            },
            providerConfig: aiConfig,
          }),
        });

        const data = await res.json();
        const teacherText: string = data.text || 'Entiendo tu consulta. Continuemos analizando este tema paso a paso.';
        const socratic: string = data.socraticQuestion || '';
        const fullSpokenUtterance = socratic ? `${teacherText} ${socratic}` : teacherText;

        setLastModelResponse(teacherText);

        // Record in Chat Feed for math LaTeX & interactive artifacts
        if (onSendToChatFeed) {
          onSendToChatFeed(q, teacherText, data);
        }
        if (onTranscriptReceived) {
          onTranscriptReceived(q, true);
          onTranscriptReceived(teacherText, false);
        }

        // Speak teacher's pedagogical response out loud with masculine voice
        setStatus('speaking');

        // 1. Try high-fidelity server TTS with Gemini masculine voice ('Fenrir')
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: fullSpokenUtterance.slice(0, 500),
              voice: 'Fenrir', // Voz masculina de Gemini
              providerConfig: aiConfig,
            }),
          });

          const ttsData = await ttsRes.json();
          if (ttsData.success && ttsData.audioBase64) {
            setVoiceProviderNotice(
              ttsData.voiceType ? `Voz: ${ttsData.voiceType}` : 'Voz: Fenrir (Gemini Masculina)'
            );
            audioPlayerRef.current.playChunk(ttsData.audioBase64, () => {
              setStatus('listening');
              setTranscript('¡Listo! Te escucho. Puedes responder o preguntar otra duda.');
              resumeListening();
            });
            return;
          }
        } catch (ttsErr) {
          console.warn('Server TTS notice, falling back to serene male speech synthesis:', ttsErr);
        }

        // 2. Local speech synthesis with serene masculine timbre
        setVoiceProviderNotice('Voz: Profe Ornan (Masculina)');
        const cancelSpeech = speakWithBrowserSpeech(
          fullSpokenUtterance,
          () => {
            setStatus('speaking');
          },
          () => {
            setStatus('listening');
            setTranscript('¡Listo! Te escucho. Puedes responder o preguntar otra duda.');
            resumeListening();
          }
        );
        stopBrowserSpeechRef.current = cancelSpeech;
      } catch (err: any) {
        console.error('Error processing voice dialogue:', err);
        setErrorMsg('No se pudo procesar la respuesta por voz. Intenta nuevamente.');
        setStatus('listening');
        resumeListening();
      }
    },
    [profile, aiConfig, onSendToChatFeed, onTranscriptReceived, stopTeacherAudio]
  );

  // Resume microphone listening for hands-free dialogue
  const resumeListening = useCallback(() => {
    if (!isActiveRef.current || isMutedRef.current) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListeningActive(true);
      } catch (e) {
        // Recognition might already be active
      }
    }
  }, []);

  // Cleanup all audio, speech recognition, and streaming resources
  const cleanupLive = useCallback(() => {
    stopTeacherAudio();

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListeningActive(false);

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setStatus('idle');
  }, [stopTeacherAudio]);

  // Setup Continuous Speech Recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSpeechRecognitionSupported(false);
      return null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-DO'; // Spanish Dominican Republic
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setErrorMsg(null);
        setIsListeningActive(true);
        if (statusRef.current !== 'speaking' && statusRef.current !== 'processing') {
          setStatus('listening');
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalized += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSaid = (finalized || interim).trim();
        if (currentSaid) {
          currentInterimRef.current = currentSaid;
          setTranscript(`Escuchando: "${currentSaid}"`);

          // If user speaks while teacher is speaking, interrupt immediately
          if (statusRef.current === 'speaking') {
            stopTeacherAudio();
            setStatus('listening');
          }

          // Debounced auto-submit after speech pause (1.3 seconds of silence)
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = setTimeout(() => {
            const queryToSend = currentInterimRef.current;
            currentInterimRef.current = '';
            if (queryToSend && queryToSend.length >= 2) {
              handleProcessVoiceInput(queryToSend);
            }
          }, 1300);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg(
            'Permiso de micrófono no habilitado en el navegador. Por favor permite el acceso al micrófono o usa el campo de texto rápido.'
          );
        } else if (event.error === 'no-speech') {
          // Normal when silent; keep ready
        }
      };

      recognition.onend = () => {
        setIsListeningActive(false);
        // Auto-restart if we are still active and supposed to be listening
        if (
          isActiveRef.current &&
          !isMutedRef.current &&
          statusRef.current !== 'speaking' &&
          statusRef.current !== 'processing'
        ) {
          try {
            recognition.start();
            setIsListeningActive(true);
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (e) {
      console.warn('Could not initialize SpeechRecognition:', e);
      setIsSpeechRecognitionSupported(false);
      return null;
    }
  }, [handleProcessVoiceInput, stopTeacherAudio]);

  // Audio Context & Microphone setup for visualizer & live streaming
  const startAudioProcessing = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate: 16000 });
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current) return;
          const channelData = e.inputBuffer.getChannelData(0);

          // Audio level detection for visual feedback
          let sum = 0;
          for (let i = 0; i < channelData.length; i++) {
            sum += Math.abs(channelData[i]);
          }
          const avg = sum / channelData.length;
          if (avg > 0.05 && statusRef.current === 'idle') {
            setStatus('listening');
          }

          // Optional WebSocket streaming if connection is alive
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const base64Pcm = float32ToPcm16Base64(channelData);
            wsRef.current.send(JSON.stringify({ type: 'audio', data: base64Pcm }));
          }
        };

        source.connect(processor);
        processor.connect(ctx.destination);
      } catch (e) {
        console.warn('Audio processor setup notice:', e);
      }
    },
    []
  );

  // Start live session
  const startLiveSession = useCallback(async () => {
    setErrorMsg(null);
    setStatus('connecting');
    setTranscript('Iniciando diálogo pedagógico por voz con el Profe Ornan...');

    try {
      // 1. Microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });
        mediaStreamRef.current = stream;
        startAudioProcessing(stream);
      } catch (micErr: any) {
        console.warn('Microphone access notice:', micErr);
        if (micErr.name === 'NotAllowedError') {
          setErrorMsg(
            'Permiso de micrófono no habilitado. Puedes escribir directamente o hacer clic en "Permitir micrófono".'
          );
        }
      }

      // 2. Start speech recognition engine
      const rec = initSpeechRecognition();
      if (rec) {
        try {
          rec.start();
          setIsListeningActive(true);
        } catch (e) {}
      }

      // 3. Connect WebSocket for background streaming
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/live`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (videoFrameGetter) {
            videoIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                const frame = videoFrameGetter();
                if (frame) {
                  ws.send(JSON.stringify({ type: 'video_frame', data: frame }));
                }
              }
            }, 1000);
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'audio') {
              setStatus('speaking');
              audioPlayerRef.current.playChunk(msg.audio, () => {
                setStatus('listening');
                resumeListening();
              });
            } else if (msg.type === 'transcript') {
              setLastModelResponse((prev) => prev + ' ' + msg.text);
            } else if (msg.type === 'interrupted') {
              stopTeacherAudio();
              setStatus('listening');
            }
          } catch (e) {}
        };
      } catch (e) {
        // WebSocket error is non-fatal
      }

      setStatus('listening');
      setTranscript('¡Listo! Te escucho. Habla con el Profe Ornan sobre cualquier duda o ejercicio.');
    } catch (err: any) {
      console.error('Error starting live session:', err);
      setErrorMsg('No se pudo inicializar el micrófono del dispositivo.');
      setStatus('idle');
    }
  }, [
    startAudioProcessing,
    initSpeechRecognition,
    videoFrameGetter,
    resumeListening,
    stopTeacherAudio,
  ]);

  // Session lifecycle: strictly depends only on isActive
  useEffect(() => {
    if (isActive) {
      startLiveSession();
    } else {
      cleanupLive();
    }

    return () => {
      cleanupLive();
    };
  }, [isActive]); // DO NOT include cleanupLive or startLiveSession to avoid unmount-loop

  // Immediate Interruption
  const handleInterrupt = () => {
    stopTeacherAudio();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setStatus('listening');
    setTranscript('Profesor en pausa. Te escucho atentamente...');
    resumeListening();
  };

  // Submit manual text question inside voice bar
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const txt = manualText.trim();
    setManualText('');
    handleProcessVoiceInput(txt);
  };

  // Push-to-talk / Click-to-speak action
  const handleTriggerSpeak = () => {
    if (status === 'speaking') {
      handleInterrupt();
      return;
    }

    if (isMuted) {
      setIsMuted(false);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListeningActive(true);
        setStatus('listening');
        setTranscript('Te escucho ahora mismo. Habla tu pregunta...');
      } catch (e) {
        // Already started
      }
    } else {
      initSpeechRecognition()?.start();
    }
  };

  // Waveform Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isSpeaking = status === 'speaking';
      const isListening = status === 'listening';
      const isProcessing = status === 'processing';

      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isSpeaking
        ? '#3b82f6' // Blue when Profe Ornan speaks
        : isListening
        ? '#10b981' // Green when student speaks
        : isProcessing
        ? '#f59e0b' // Amber when thinking
        : '#64748b';

      const amplitude = isSpeaking ? 14 : isListening ? 10 : isProcessing ? 6 : 2;
      const freq = isSpeaking ? 0.08 : isListening ? 0.05 : 0.03;

      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * freq + phase) * amplitude * Math.sin(x / 35);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      phase += isSpeaking ? 0.12 : isListening ? 0.08 : 0.03;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status]);

  if (!isActive) return null;

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 p-3 sm:p-4 shadow-xl transition-all animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status indicator & Active Voice feedback */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleTriggerSpeak}
            className="relative flex items-center justify-center shrink-0 cursor-pointer group"
            title="Toca para hablar directamente con el Profe Ornan"
          >
            <span
              className={`absolute inline-flex h-10 w-10 rounded-full opacity-75 animate-ping ${
                status === 'speaking'
                  ? 'bg-blue-400'
                  : status === 'listening'
                  ? 'bg-emerald-400'
                  : status === 'processing'
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
              }`}
            />
            <div
              className={`relative inline-flex rounded-full h-10 w-10 items-center justify-center shadow-md transition-transform group-hover:scale-105 ${
                status === 'speaking'
                  ? 'bg-blue-600 ring-2 ring-blue-300'
                  : status === 'listening'
                  ? 'bg-emerald-600 ring-2 ring-emerald-300'
                  : status === 'processing'
                  ? 'bg-amber-600'
                  : 'bg-slate-700'
              }`}
            >
              {status === 'speaking' ? (
                <Volume2 className="w-5 h-5 text-white animate-pulse" />
              ) : status === 'processing' ? (
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                {status === 'speaking'
                  ? 'Profe Ornan Hablando'
                  : status === 'listening'
                  ? 'Te escucho (Habla libremente)'
                  : status === 'processing'
                  ? 'Profe Ornan reflexionando...'
                  : status === 'connecting'
                  ? 'Iniciando Diálogo por Voz...'
                  : 'Listo para Hablar'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 font-mono border border-blue-800">
                {voiceProviderNotice}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 font-mono border border-emerald-800 hidden sm:inline">
                Diálogo Multimodal Dominicano
              </span>
            </div>

            <p className="text-xs text-slate-300 truncate max-w-sm sm:max-w-xl mt-0.5 font-medium">
              {status === 'speaking' && lastModelResponse
                ? `Profe Ornan: "${lastModelResponse.slice(0, 110)}..."`
                : transcript || 'Habla naturalmente sobre cualquier ejercicio, concepto o fórmula matemática...'}
            </p>
          </div>

          {/* Visual Waveform Canvas */}
          <div className="hidden sm:block w-28 h-9 bg-slate-950/80 rounded-lg p-1 border border-slate-800 shrink-0">
            <canvas ref={canvasRef} width={112} height={32} className="w-full h-full" />
          </div>
        </div>

        {/* Quick input fallback & Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          
          {/* Push-to-talk button */}
          <button
            onClick={handleTriggerSpeak}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              status === 'listening'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 shadow-md ring-2 ring-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Presiona para hablar con tu voz"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>{status === 'listening' ? 'Grabando tu voz...' : 'Hablar ahora'}</span>
          </button>

          {/* Quick text input for noisy rooms or quick questions */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="O escribe una duda por voz..."
              className="bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-400 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-full sm:w-48"
            />
            <button
              type="submit"
              disabled={!manualText.trim()}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all shrink-0 cursor-pointer"
              title="Enviar consulta por voz"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Interrupt teacher button */}
          {status === 'speaking' && (
            <button
              onClick={handleInterrupt}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 animate-pulse cursor-pointer"
              title="Pausar voz del profesor"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Interrumpir</span>
            </button>
          )}

          {/* Mute Mic */}
          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              if (newMuted) {
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch (e) {}
                }
                setIsListeningActive(false);
              } else {
                resumeListening();
              }
            }}
            className={`p-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-950 border-rose-800 text-rose-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Close Voice Dialog */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Cerrar diálogo con audio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {errorMsg && (
        <div className="max-w-7xl mx-auto mt-2 text-xs text-rose-400 bg-rose-950/60 border border-rose-900 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => {
              setErrorMsg(null);
              startLiveSession();
            }}
            className="text-[11px] underline font-bold hover:text-white cursor-pointer"
          >
            Reintentar micrófono
          </button>
        </div>
      )}
    </div>
  );
};
