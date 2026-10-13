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

  public playChunk(base64Pcm: string, onEnded?: () => void) {
    try {
      if (onEnded) this.onEndedCallback = onEnded;
      const ctx = this.getAudioContext();

      // Decode base64 to binary
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);

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
      console.error('Error playing PCM chunk:', e);
      this.isPlaying = false;
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
 * Cleans LaTeX and markdown notation so mathematical formulas are read
 * naturally and phonetically in Spanish by the speech synthesizer.
 */
export function cleanLatexForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
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

// Browser speech synthesis fallback with natural Dominican / Spanish accent and masculine tone
export function speakWithBrowserSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return () => {};
  }

  window.speechSynthesis.cancel();
  const spokenText = cleanLatexForSpeech(text);
  if (!spokenText) return () => {};

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = 'es-DO';
  utterance.rate = 0.98;
  utterance.pitch = 0.90; // Resonant serene masculine teacher pitch

  const applyVoiceAndSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const voice = findMasculineSpanishVoice(voices);
    if (voice) {
      utterance.voice = voice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis event notice:', e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  const initialVoices = window.speechSynthesis.getVoices();
  if (initialVoices.length > 0) {
    applyVoiceAndSpeak();
  } else {
    // Wait for voices to load in Chromium / WebKit
    const onVoicesChanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      applyVoiceAndSpeak();
    };
    window.speechSynthesis.onvoiceschanged = onVoicesChanged;
    // Timeout fallback in case onvoiceschanged never fires
    setTimeout(() => {
      if (!utterance.voice) {
        applyVoiceAndSpeak();
      }
    }, 200);
  }

  return () => {
    window.speechSynthesis.cancel();
  };
}

