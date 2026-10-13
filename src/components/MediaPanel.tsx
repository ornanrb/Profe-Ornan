import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  CheckCircle2,
  Scan,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { MediaAttachment } from '../types';

interface MediaPanelProps {
  onAttachmentSelected: (attachment: MediaAttachment | null) => void;
  activeAttachment: MediaAttachment | null;
  onSendVisionAnalysis: (attachment: MediaAttachment, prompt?: string) => void;
  onRegisterVideoFrameGetter?: (getter: () => string | null) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  onAttachmentSelected,
  activeAttachment,
  onSendVisionAnalysis,
  onRegisterVideoFrameGetter,
}) => {
  const [mediaMode, setMediaMode] = useState<'none' | 'camera' | 'screen' | 'file'>('none');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingSnapshot, setIsProcessingSnapshot] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detect if running inside an iframe (like AI Studio preview)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Frame capture function for live streaming video frames (to Gemini Live audio/video)
  const captureCurrentFrame = useCallback((): string | null => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(640, videoRef.current.videoWidth);
      canvas.height = Math.min(480, videoRef.current.videoHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      return dataUrl.split(',')[1];
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (onRegisterVideoFrameGetter) {
      onRegisterVideoFrameGetter(captureCurrentFrame);
    }
  }, [cameraStream, screenStream, captureCurrentFrame, onRegisterVideoFrameGetter]);

  // Synchronize active media stream into the video DOM element whenever stream or mode changes
  useEffect(() => {
    const activeStream = mediaMode === 'camera' ? cameraStream : mediaMode === 'screen' ? screenStream : null;
    if (videoRef.current) {
      if (activeStream) {
        if (videoRef.current.srcObject !== activeStream) {
          videoRef.current.srcObject = activeStream;
        }
        videoRef.current.muted = true;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsVideoReady(true))
            .catch((err) => {
              console.warn('Video playback waiting for user interaction or load:', err);
            });
        }
      } else {
        videoRef.current.srcObject = null;
        setIsVideoReady(false);
      }
    }
  }, [cameraStream, screenStream, mediaMode]);

  // Callback ref to attach stream immediately upon element mounting in the DOM
  const attachVideoElement = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      const activeStream = mediaMode === 'camera' ? cameraStream : mediaMode === 'screen' ? screenStream : null;
      if (activeStream) {
        if (el.srcObject !== activeStream) {
          el.srcObject = activeStream;
        }
        el.muted = true;
        el.play()
          .then(() => setIsVideoReady(true))
          .catch(() => {});
      }
    }
  };

  // Clean up streams when unmounting
  useEffect(() => {
    return () => {
      stopCamera();
      stopScreen();
    };
  }, []);

  // Stop Device Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (mediaMode === 'camera') {
      setMediaMode('none');
      setIsVideoReady(false);
    }
  };

  // Stop Screen Share
  const stopScreen = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (mediaMode === 'screen') {
      setMediaMode('none');
      setIsVideoReady(false);
    }
  };

  // Start Device Camera with robust fallback
  const startCamera = async (targetFacing: 'environment' | 'user' = cameraFacing) => {
    stopScreen();
    setErrorMessage(null);
    setIsVideoReady(false);

    try {
      let stream: MediaStream;
      try {
        // Try requested facing mode (back camera for notebooks/boards, front for webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn('FacingMode constraint failed, falling back to any available video stream:', constraintErr);
        // Fallback to any default camera available
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setCameraStream(stream);
      setCameraFacing(targetFacing);
      setMediaMode('camera');

      // Bind immediately if videoRef is already in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().then(() => setIsVideoReady(true)).catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Permiso de cámara denegado. Haz clic en el ícono de candado o permisos en la barra de direcciones de tu navegador y permite el acceso a la cámara.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara conectada a este dispositivo.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('La cámara está en uso por otra aplicación o pestaña del navegador.');
      } else {
        setErrorMessage(`No se pudo acceder a la cámara: ${err.message || 'Error del dispositivo'}`);
      }
    }
  };

  // Toggle between Front and Back camera
  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    await startCamera(nextFacing);
  };

  // Start Screen Share with iframe detection and comprehensive error reporting
  const startScreen = async () => {
    stopCamera();
    setErrorMessage(null);
    setIsVideoReady(false);

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setErrorMessage(
        'La función para compartir pantalla no está disponible en este dispositivo o navegador (los dispositivos móviles no permiten capturar pantalla web). Puedes usar la "Cámara" para enfocar tu pantalla o abrir la app en una computadora de escritorio.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      setScreenStream(stream);
      setMediaMode('screen');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().then(() => setIsVideoReady(true)).catch(() => {});
      }

      // Handle user stopping screen share via native browser floating UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreen();
        };
      }
    } catch (err: any) {
      console.error('Screen share error:', err);
      if (err.name === 'NotAllowedError') {
        if (isInIframe) {
          setErrorMessage(
            'El navegador restringió la captura de pantalla dentro de la vista previa embebida (iFrame). Por favor abre la aplicación en una pestaña nueva para compartir cualquier ventana o pantalla completa.'
          );
        } else {
          setErrorMessage(
            'Compartición de pantalla cancelada o permiso no otorgado. Selecciona la pestaña, ventana o pantalla que deseas compartir en el diálogo del navegador.'
          );
        }
      } else if (err.name === 'SecurityError') {
        setErrorMessage(
          'La política de seguridad del marco embebido impidió la captura. Abre la app en una pestaña nueva para compartir pantalla sin restricciones.'
        );
      } else {
        setErrorMessage(`No se pudo iniciar la compartición de pantalla: ${err.message || 'Error desconocido'}`);
      }
    }
  };

  // Capture still snapshot from active camera or screen
  const takeSnapshot = (customPrompt?: string) => {
    if (!videoRef.current) return;
    setIsProcessingSnapshot(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];

        const attachment: MediaAttachment = {
          type: mediaMode === 'camera' ? 'camera' : 'screen',
          name: mediaMode === 'camera' ? 'Foto de libreta/material' : 'Captura de pantalla',
          mimeType: 'image/jpeg',
          dataBase64: base64,
          previewUrl: dataUrl,
        };

        onAttachmentSelected(attachment);
        onSendVisionAnalysis(
          attachment,
          customPrompt ||
            (mediaMode === 'camera'
              ? 'Por favor analiza lo que ves en esta foto de mi libreta/material. Explícame el concepto y revisa si hay algún error.'
              : 'Analiza esta captura de pantalla y explícame el contenido paso a paso.')
        );
      }
    } catch (e) {
      console.error('Snapshot capture error:', e);
    } finally {
      setIsProcessingSnapshot(false);
    }
  };

  // File Upload Handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const attachment: MediaAttachment = {
        type: 'file',
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64: base64,
        previewUrl: file.type.startsWith('image/') ? result : undefined,
      };

      onAttachmentSelected(attachment);
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mb-4">
      {/* Mode Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          
          {/* Camera Button */}
          <button
            onClick={() => {
              if (mediaMode === 'camera') stopCamera();
              else startCamera();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mediaMode === 'camera'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {mediaMode === 'camera' ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5 text-blue-600" />}
            <span>{mediaMode === 'camera' ? 'Apagar Cámara' : 'Cámara (Libreta/Pizarra)'}</span>
          </button>

          {/* Screen Share Button */}
          <button
            onClick={() => {
              if (mediaMode === 'screen') stopScreen();
              else startScreen();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              mediaMode === 'screen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {mediaMode === 'screen' ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{mediaMode === 'screen' ? 'Dejar de compartir' : 'Compartir Pantalla'}</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Subir Archivo/PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,text/plain"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Open in new tab hint button if running inside iframe */}
          {isInIframe && (
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              title="Abrir la aplicación en una pestaña nueva completa para mejor acceso a cámara y pantalla compartida"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3 h-3 text-slate-500" />
              <span className="hidden md:inline">Abrir en pestaña nueva</span>
            </button>
          )}
        </div>

        {/* Status / Active Attachment indicator */}
        {activeAttachment && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[200px]">{activeAttachment.name}</span>
            <button
              onClick={() => onAttachmentSelected(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
              title="Quitar archivo adjunto"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Error & Guidance Banner */}
      {errorMessage && (
        <div className="p-3 bg-amber-50 text-amber-900 text-xs border-b border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
          {isInIframe && (
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="shrink-0 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en pestaña nueva</span>
            </button>
          )}
        </div>
      )}

      {/* Live Video Stage (Camera / Screen Share) */}
      {(mediaMode === 'camera' || mediaMode === 'screen') && (
        <div className="relative bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-4 min-h-[300px] sm:min-h-[380px] overflow-hidden">
          {/* Top Video Header Status Bar */}
          <div className="w-full max-w-2xl flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-900/90 rounded-lg border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${mediaMode === 'camera' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
              <span className="font-semibold text-white">
                {mediaMode === 'camera'
                  ? `Cámara en Vivo (${cameraFacing === 'environment' ? 'Libreta/Trasera' : 'Frontal/Webcam'})`
                  : 'Compartiendo Pantalla'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {mediaMode === 'camera' && (
                <button
                  onClick={toggleCameraFacing}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all"
                  title="Cambiar entre cámara trasera y frontal"
                >
                  <RefreshCw className="w-3 h-3 text-blue-400" />
                  <span>Girar Cámara</span>
                </button>
              )}
              <button
                onClick={mediaMode === 'camera' ? stopCamera : stopScreen}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                title="Cerrar video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actual Video Element */}
          <div className="relative w-full max-w-2xl flex items-center justify-center bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl min-h-[240px]">
            <video
              ref={attachVideoElement}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                const target = e.currentTarget;
                target.play().then(() => setIsVideoReady(true)).catch(() => {});
              }}
              className="max-h-[380px] w-full object-contain bg-black"
            />

            {!isVideoReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-300 text-xs gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Iniciando transmisión de video...</span>
              </div>
            )}
          </div>

          {/* Floating Action Overlay for Snapshot & Analysis */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl max-w-2xl w-full">
            <button
              onClick={() => takeSnapshot()}
              disabled={isProcessingSnapshot}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Scan className="w-4 h-4" />
              <span>
                {isProcessingSnapshot
                  ? 'Analizando con Gemini...'
                  : mediaMode === 'camera'
                  ? 'Analizar libreta con el Profesor'
                  : 'Analizar pantalla actual'}
              </span>
            </button>

            {mediaMode === 'camera' && (
              <>
                <button
                  onClick={() => takeSnapshot('Revisa paso a paso este ejercicio escrito y dime si tengo algún error.')}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  ¿Dónde está el error?
                </button>
                <button
                  onClick={() => takeSnapshot('Explícame de forma sencilla el contenido y los conceptos de esta página.')}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  Explicar concepto
                </button>
              </>
            )}

            {mediaMode === 'screen' && (
              <>
                <button
                  onClick={() => takeSnapshot('Resume esta página y explícame las ideas clave y fórmulas que ves.')}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  Resumir esta vista
                </button>
                <button
                  onClick={() => takeSnapshot('Formula 3 preguntas socráticas para evaluar si entiendo lo que está en pantalla.')}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                >
                  Evaluar comprensión
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Active Attachment Preview Card (When not in video mode) */}
      {activeAttachment && mediaMode !== 'camera' && mediaMode !== 'screen' && (
        <div className="p-4 bg-blue-50/40 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {activeAttachment.previewUrl ? (
              <img
                src={activeAttachment.previewUrl}
                alt="Vista previa"
                className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 border border-blue-200">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div>
              <h4 className="text-xs font-bold text-slate-900">{activeAttachment.name}</h4>
              <p className="text-[11px] text-slate-500">
                Archivo listo para que el profesor virtual lo analice y explique.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                onSendVisionAnalysis(
                  activeAttachment,
                  'Explícame este material didáctico paso a paso y destaca las ideas clave.'
                )
              }
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all"
            >
              Explícame este material
            </button>
            <button
              onClick={() =>
                onSendVisionAnalysis(
                  activeAttachment,
                  'Crea 4 preguntas de comprobación de lectura basadas en este documento.'
                )
              }
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all"
            >
              Crear preguntas sobre esto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

