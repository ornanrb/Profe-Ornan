// Audio utilities for 16-bit PCM audio recording (16kHz) and playback (24kHz)

// Convert Float32Array channel data to 16-bit PCM base64 string
export function float32ToPcm16Base64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8 = new Uint8Array(int16Array.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

// Player class for gapless 24kHz PCM audio playback from Gemini models
export class PcmAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public isPlaying = false;
  private onEndedCallback?: () => void;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public async playChunk(base64Audio: string, onEnded?: () => void) {
    try {
      if (onEnded) this.onEndedCallback = onEnded;
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check if format is an encoded audio container (e.g. MP3/WAV with ID3/RIFF header)
      const isCompressed =
        (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3 (mp3)
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) || // MPEG frame sync (mp3)
        (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46); // RIFF (wav)

      let buffer: AudioBuffer;

      if (isCompressed) {
        // Use Web Audio built-in decoder for standard audio formats
        buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      } else {
        // Raw 16-bit PCM (24kHz single channel)
        const sampleCount = Math.floor(bytes.byteLength / 2);
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768.0;
        }

        buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }

      source.start(this.nextStartTime);
      this.isPlaying = true;
      this.nextStartTime += buffer.duration;
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          if (this.onEndedCallback) {
            this.onEndedCallback();
            this.onEndedCallback = undefined;
          }
        }
      };
    } catch (e) {
      console.error('Error playing audio chunk, invoking completion callback:', e);
      this.isPlaying = false;
      if (this.onEndedCallback) {
        this.onEndedCallback();
        this.onEndedCallback = undefined;
      }
    }
  }

  // Stop immediately on user interrupt
  public stop() {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // ignore already stopped source
      }
    }
    this.activeSources = [];
    this.nextStartTime = 0;
    this.isPlaying = false;
    if (this.audioCtx && this.audioCtx.state === 'running') {
      // Keep context open for next playback
    }
  }
}

/**
 * Removes system prompt instructions, tone directions, and tutor configurations
 * (e.g. "(lee con tono amable...)", "[con tono motivador]", "Lee con tono amable:", etc.)
 * so audio strictly only delivers the pedagogical answer.
 */
export function stripMetaAndToneInstructions(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Parenthetical instructions: (lee con tono amable...), (tono reflexivo), (voz tranquila), etc.
    .replace(/\((?:lee con|le[eí]r? con|tono|con tono|habla con|voz|acotaci[oó]n|modo|indicaci[oó]n|estilo|configuraci[oó]n|instrucci[oó]n)[^)]*\)/gi, '')
    // Bracketed instructions: [lee con tono amable], [tono motivador], etc.
    .replace(/\[(?:lee con|le[eí]r? con|tono|con tono|habla con|voz|acotaci[oó]n|modo|indicaci[oó]n|estilo|configuraci[oó]n|instrucci[oó]n)[^\]]*\]/gi, '')
    // Asterisk instructions: *lee con tono amable*, *tono pausado*, etc.
    .replace(/\*(?:lee con|le[eí]r? con|tono|con tono|habla con|voz|acotaci[oó]n|modo|indicaci[oó]n|estilo|configuraci[oó]n|instrucci[oó]n)[^*]*\*/gi, '')
    // Configuration / tone prefixes: "Configuración del tutor: ...", "Instrucciones: ...", "Modo: ..."
    .replace(/(?:configuraci[oó]n(?: del tutor)?|instrucci[oó]n(?: para el tutor)?|modo de respuesta)\s*:\s*/gi, '')
    // Leading tone commands at start of line: "Lee con tono amable: ...", "Tono amable: ..."
    .replace(/^(?:lee|habla|responde|le[eí]do)\s+(?:con\s+)?(?:un\s+)?tono\s+[a-záéíóúñ\s,]+[:.-]\s*/gi, '')
    .replace(/^[\s\S]*?(?:lee con tono [^\n.:]*[.:]?\s*)/gi, '')
    .replace(/^(?:tono amable|tono motivador|tono c[aá]lido|tono pausado|tono entusiasta|tono emp[aá]tico)[^\n.:]*[.:]?\s*/gi, '')
    .replace(/^(?:Profesor|Profe Ornan|Tutor|Docente):\s*/gi, '')
    // Filter out any accidental LaTeX meta-labels, tags or prefixes:
    .replace(/\[(?:c[oó]digo\s+)?latex\]/gi, '')
    .replace(/\((?:en\s+|c[oó]digo\s+)?latex\)/gi, '')
    .replace(/\b(?:en\s+)?latex\s*:\s*/gi, '')
    .replace(/\b(?:f[oó]rmula|c[oó]digo|expresi[oó]n)\s+(?:en\s+)?latex\b/gi, 'fórmula matemática')
    .replace(/\b(?:escrita|formulada|expresada)\s+en\s+latex\b/gi, 'con formulación matemática')
    .replace(/\blatex\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cleans LaTeX and markdown notation so mathematical formulas are read
 * naturally and phonetically in Spanish by the speech synthesizer.
 */
export function cleanLatexForSpeech(raw: string): string {
  if (!raw) return '';
  const withoutMeta = stripMetaAndToneInstructions(raw);
  return withoutMeta
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => m)
    .replace(/\$([^\$\n]+?)\$/g, (_, m) => m)
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\(([^)]*?=[^)]*?)\)/g, (_, m) => ` ${m} `)
    .replace(/\\cdot/g, ' por ')
    .replace(/\\times/g, ' por ')
    .replace(/\\div/g, ' dividido entre ')
    .replace(/\\pm/g, ' más o menos ')
    .replace(/\\leq/g, ' menor o igual que ')
    .replace(/\\geq/g, ' mayor o igual que ')
    .replace(/\\neq/g, ' diferente de ')
    .replace(/\\sqrt\{([^}]+)\}/g, 'raíz cuadrada de $1')
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'raíz $1 de $2')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 sobre $2')
    .replace(/\\Delta/g, 'delta')
    .replace(/\\pi/g, 'pi')
    .replace(/\^2/g, ' al cuadrado')
    .replace(/\^3/g, ' al cubo')
    .replace(/\^([0-9a-zA-Z]+)/g, ' elevado a la $1')
    .replace(/_([0-9a-zA-Z]+)/g, ' sub $1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[*#_`~]/g, '')
    .replace(/[{}()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the most natural masculine Spanish voice available
 */
function findMasculineSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices || voices.length === 0) return undefined;
  const maleKeywords = [
    'male', 'hombre', 'jorge', 'diego', 'carlos', 'miguel', 'david',
    'manuel', 'antonio', 'enrique', 'pablo', 'raul', 'alvaro', 'alberto',
    'francisco', 'gonzalo', 'pedro', 'juan'
  ];

  // 1. Spanish voice with male keyword in name
  const maleSpanish = voices.find(
    (v) => v.lang.startsWith('es') && maleKeywords.some((k) => v.name.toLowerCase().includes(k))
  );
  if (maleSpanish) return maleSpanish;

  // 2. Dominican Spanish
  const esDO = voices.find((v) => v.lang === 'es-DO');
  if (esDO) return esDO;

  // 3. Any Caribbean or Latin American Spanish
  const esLatin = voices.find((v) => ['es-MX', 'es-US', 'es-CO', 'es-AR', 'es-CL', 'es-419'].includes(v.lang));
  if (esLatin) return esLatin;

  // 4. Any Spanish
  const esAny = voices.find((v) => v.lang.startsWith('es'));
  if (esAny) return esAny;

  return voices[0];
}

// Global reference set to protect utterances from Chromium V8 garbage collection
const activeUtterances = new Set<SpeechSynthesisUtterance>();

// Browser speech synthesis with natural Dominican / Spanish accent and masculine tone
export function speakWithBrowserSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => {};
  }

  // Clear any stuck audio queue and resume immediately
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch (e) {
    // ignore
  }

  const spokenText = cleanLatexForSpeech(text);
  if (!spokenText) return () => {};

  let isCancelled = false;

  const playUtterance = () => {
    if (isCancelled) return;
    try {
      window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 0.98;
      utterance.pitch = 0.92; // Resonant serene masculine teacher pitch
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice = findMasculineSpanishVoice(voices);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'es-ES';
      }

      utterance.onstart = () => {
        if (!isCancelled && onStart) onStart();
      };

      const cleanup = () => {
        activeUtterances.delete(utterance);
        (window as any).__profeOrnanUtterance = null;
      };

      utterance.onend = () => {
        cleanup();
        if (!isCancelled && onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis event notice:', e);
        cleanup();
        if (!isCancelled && onEnd) onEnd();
      };

      // Guard against Chromium garbage collector aborting speech
      activeUtterances.add(utterance);
      (window as any).__profeOrnanUtterance = utterance;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis playback error:', err);
      if (onEnd) onEnd();
    }
  };

  const initialVoices = window.speechSynthesis.getVoices();
  if (initialVoices.length > 0) {
    playUtterance();
  } else {
    let triggered = false;
    const onVoicesChanged = () => {
      if (triggered) return;
      triggered = true;
      window.speechSynthesis.onvoiceschanged = null;
      playUtterance();
    };
    window.speechSynthesis.onvoiceschanged = onVoicesChanged;
    // Timeout fallback if onvoiceschanged doesn't fire immediately
    setTimeout(() => {
      if (!triggered) {
        triggered = true;
        playUtterance();
      }
    }, 120);
  }

  return () => {
    isCancelled = true;
    try {
      window.speechSynthesis.cancel();
      activeUtterances.clear();
      (window as any).__profeOrnanUtterance = null;
    } catch (e) {
      // ignore
    }
  };
}

