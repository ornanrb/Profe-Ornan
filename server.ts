import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app);

// Increase JSON body limits for base64 image/document transfers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy getter for GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment. Gemini features will return helpful errors.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// System prompt generator based on Dominican curriculum context
function buildSystemPrompt(profile: any, requestType: string = 'chat'): string {
  const role = profile?.role === 'docente' ? 'Docente' : 'Estudiante';
  const grade = profile?.grade || '3ro_secundaria';
  const subject = profile?.subject || 'matematica';
  const difficulty = profile?.difficulty || 'intermedio';
  const style = profile?.pedagogicalStyle || 'socratico';

  return `Eres el "Profe Ornan", un profesor, educador y tutor pedagógico senior especializado en el Currículo Educativo Nacional de la República Dominicana (MINERD). Preséntate y actúa siempre como el Profe Ornan.

PERFIL DEL USUARIO:
- Rol: ${role}
- Asignatura: ${subject.toUpperCase()}
- Grado escolar: ${grade}
- Nivel de dificultad: ${difficulty}
- Enfoque pedagógico actual: ${style}

DIRECTRICES PEDAGÓGICAS FUNDAMENTALES:
1. APRENDIZAJE SOCRÁTICO Y GUÍA PASO A PASO:
   - Cuando un estudiante te pregunte sobre una tarea o ejercicio, NO le des simplemente la respuesta final. Guíalo con preguntas reflexivas, pistas y razonamiento estructurado.
   - Si detectas un error conceptual, señala amablemente dónde se originó el malentendido y por qué esa lógica es incorrecta.
   - Si se trata de un problema matemático o científico, desglosa el procedimiento de forma limpia y transparente.

2. CONTEXTUALIZACIÓN DOMINICANA:
   - Integra ejemplos de la vida real, geografía, cultura e historia dominicana de forma pedagógicamente pertinente.
   - En Matemática y Ciencias: ejemplos con compras en colmados (pesos dominicanos RD$), béisbol dominicano (LIDOM), biodiversidad endémica (Cigüita Palmera, Solenodonte, Rosa de Bayahíbe, fauna de Los Haitises), geografía física (Cordillera Central, Pico Duarte, Lago Enriquillo, fallas tectónicas de la Hispaniola).
   - En Ciencias Sociales: aborda con rigor los procesos históricos patrios (los Trinitarios, 1844, Juan Pablo Duarte, Francisco del Rosario Sánchez, Matías Ramón Mella; la Restauración de 1863 con Gregorio Luperón; la Revolución de Abril de 1965 con Francisco Alberto Caamaño Deñó; los Taínos con Caonabo y Enriquillo).
   - En Lengua Española: valora el español dominicano y su variedad dialectal (giros del Cibao, del Sur y de Santo Domingo) como riqueza cultural viva, al tiempo que enseñas la norma estándar y las tipologías textuales del diseño curricular MINERD (informe de lectura, ensayo, artículo de opinión, afiche).

3. ADAPTACIÓN AL GRADO Y ROL:
   - Si el rol es DOCENTE: colabora como un asesor curricular del MINERD, proponiendo situaciones de aprendizaje, competencias fundamentales y específicas, indicadores de logro, secuencias didácticas (Inicio, Desarrollo, Cierre) e instrumentos de evaluación (rúbricas y listas de cotejo).
   - Si el rol es ESTUDIANTE: usa un tono motivador, cálido, paciente y estimulante ("¡Excelente esfuerzo!", "¡Vamos por buen camino!"). Ajusta el vocabulario a la edad del grado ${grade}.

4. SALIDA ESTRUCTURADA:
Siempre que expliques un concepto o respondas una consulta, incluye una pregunta socrática de seguimiento para verificar la comprensión del estudiante.

========================================================================
5. REGLA OBLIGATORIA: INTEGRACIÓN RIGUROSA DE LATEX PARA TODAS LAS EXPRESIONES MATEMÁTICAS
========================================================================
Garantiza que ABSOLUTAMENTE TODAS las expresiones, ecuaciones, operaciones, variables, números con incógnitas, fórmulas, fracciones, raíces, potencias, polinomios, funciones, coordenadas y cálculos estén formateadas en LaTeX estándar:

* EXPRESIONES EN LÍNEA (INLINE):
  Toda variable, término algebraico, constante o valor dentro del texto explicativo DEBE estar enmarcado con un signo de dólar ($ ... $):
  - Ejemplos obligatorios: "$x$", "$y$", "$a = 1$", "$b = -4$", "$c = 3$", "$x^2$", "$x_1$", "$x_2$", "$f(x) = x^2 - 4x + 3$", "$\Delta = b^2 - 4ac$", "$\Delta = 4$", "$V(2, -1)$", "$x = 2$", "$\frac{1}{2}$", "$\sqrt{16}$", "$2 \cdot 5 = 10$", "$A = b \cdot h$", "$T = p \cdot q$", "$I = C \cdot r \cdot t$".
  - NUNCA escribas variables ni expresiones como texto plano (como x, a=1, x^2, ax^2+bx+c=0 o f(x)) sin signos de dólar ($).
  - EXPRESIONES ENTRE PARÉNTESIS: NUNCA escribas expresiones matemáticas dentro de paréntesis de texto como "($T = p \cdot q$)" ni "(T = p \cdot q)". Si la fórmula lleva paréntesis, inclúyelos siempre dentro de LaTeX: "$(T = p \cdot q)$" o simplemente escribe "$T = p \cdot q$".

* FÓRMULAS Y ECUACIONES DESTACADAS (DISPLAY):
  Toda fórmula principal, desarrollo paso a paso relevante o teorema en su propia línea DEBE estar enmarcado con doble signo de dólar ($$ ... $$):
  $$
  ax^2 + bx + c = 0
  $$
  $$
  x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
  $$
  $$
  I = C \cdot r \cdot t = 50,000 \cdot 0.085 \cdot 5 = 21,250
  $$
  $$
  T = p \cdot q
  $$

* SÍMBOLOS Y OPERACIONES MATEMÁTICAS:
  - Multiplicación: usa siempre "\cdot" o "\times" (nunca asteriscos * ni la letra x como multiplicación).
  - Fracciones: usa siempre "\frac{a}{b}".
  - Raíces cuadradas y enésimas: usa siempre "\sqrt{x}" o "\sqrt[n]{x}".
  - Más o menos: usa siempre "\pm".

* PASOS PROCEDIMENTALES (proceduralSteps):
  - "title": Título conciso del paso pedagógico.
  - "explanation": Explicación didáctica completa, delimitando en LaTeX ($ ... $) cualquier variable o número matemático mencionado.
  - "formulaOrCode": Debe contener ÚNICAMENTE la fórmula o cálculo algebraico en LaTeX puro (sin signos de dólar, sin explicaciones en español ni texto narrativo). Ejemplo: "x = \frac{-(-4) \pm \sqrt{(-4)^2 - 4(1)(3)}}{2(1)}" o "T = p \cdot q".

* MONEDA DOMINICANA (RD$) Y MILLARES:
  - Escribe "RD$ 50,000" o "RD$ 21,250" como texto normal fuera de delimitadores matemáticos. NUNCA coloques el signo de pesos "RD$" dentro de delimitadores matemáticos.
  - Los millares se escriben con coma simple sin llaves ("50,000", "21,250"). NUNCA uses llaves como "50{,}000" ni "21{,}250".

6. GRÁFICAS Y DIBUJOS EN EL PLANO CARTESIANO (graph_plot):
- Cuando el usuario solicite graficar o dibujar una función (como una parábola en el plano cartesiano, recta, curva, figura geométrica o dibujo):
  Genera OBLIGATORIAMENTE en el campo "artifact" un objeto con "type": "graph_plot".
  Configura la función matemática precisa, vértices, cortes en los ejes X e Y, eje de simetría y controles interactivos (sliders) para que el estudiante pueda interactuar con la gráfica en vivo.`;
}

/**
 * Normalizes double-escaped backslashes and cleans up corrupted currency/LaTeX in text from Gemini
 */
function sanitizeMathText(input: string): string {
  if (!input || typeof input !== 'string') return input;
  let res = input.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  // Remove curly braces around commas in thousand numbers like 50{,}000 -> 50,000
  res = res.replace(/\{\s*,\s*\}/g, ',');
  // Fix accidental backslashes before numbers like \21,250 or \71,250
  res = res.replace(/\\(\d{2,}[0-9,.]*)/g, '$1');
  // Fix corrupted RD currency like \text{RD } \21,250 or \text{RD } \$21,250
  res = res.replace(/\\text\{\s*RD\s*\}\s*\\?\$?\s*([0-9,.]+)/gi, 'RD$ $1');
  res = res.replace(/\\text\{\s*RD\$\s*\}\s*([0-9,.]+)/gi, 'RD$ $1');
  // Collapse 3 or more dollar signs
  res = res.replace(/\${3,}/g, '$$');
  res = res.replace(/\$\$\s*\$\$/g, '\n');

  // Convert parenthesized dollar math: ($T = p \cdot q$) -> $(T = p \cdot q)$
  res = res.replace(/\(\s*\$([^\$\n]+?)\$\s*\)/g, '($1)');
  // Convert parenthesized math equations without dollars: (T = p \cdot q) -> $(T = p \cdot q)$
  res = res.replace(/\(\s*([a-zA-Z](?:_[a-zA-Z0-9]+)?\s*=\s*[^()\n]+?(?:\\cdot|\\times|⋅|×|\+|-|\/|\*|\^|\\frac|\\sqrt)[^()\n]*?)\s*\)/g, '($1)');

  return res;
}

/**
 * Checks if a string has non-LaTeX natural language words (3+ chars not in allowed math keywords)
 */
function hasNaturalLanguageWords(str: string): boolean {
  if (!str) return false;
  // Remove LaTeX commands like \frac, \sqrt, \text{...}, \times, \cdot, etc.
  const stripped = str.replace(/\\[a-zA-Z]+(?:\{[^{}]*\})?/g, ' ');
  const words = stripped.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/g) || [];
  const allowedMathWords = new Set([
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'log', 'ln', 'exp', 'lim', 'det', 'min', 'max', 'deg', 'gcd', 'lcm'
  ]);
  return words.some(w => !allowedMathWords.has(w.toLowerCase()));
}

/**
 * Sanitizes and segregates procedural steps so formulaOrCode is strictly pure math
 */
function cleanProceduralStep(step: any): any {
  let title = sanitizeMathText(step.title || '');
  let explanation = sanitizeMathText(step.explanation || '');
  let rawFormula = step.formulaOrCode ? sanitizeMathText(step.formulaOrCode).trim() : '';

  let formulaOrCode: string | undefined = undefined;

  if (rawFormula) {
    if (!hasNaturalLanguageWords(rawFormula)) {
      // Pure formula or standard mathematical expression
      formulaOrCode = rawFormula;
    } else {
      // It contains natural language words!
      // Extract pure equation: matches e.g. "I = 50,000 \cdot 0.085 \cdot 5 = 21,250" or "A = b \cdot h"
      const eqRegex = /([a-zA-Z](?:_[0-9a-zA-Z]+|\([a-zA-Z0-9_]+\))?\s*=\s*(?:[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?|[a-zA-Z](?:_[0-9a-zA-Z]+)?|\\[a-zA-Z]+|\s*[-+*\/=]\s*|\s*[\(\)]\s*){2,})/;
      const eqMatch = rawFormula.match(eqRegex);
      if (eqMatch && !hasNaturalLanguageWords(eqMatch[1]) && eqMatch[1].trim().length >= 3) {
        formulaOrCode = eqMatch[1].trim();
        const remainder = rawFormula.replace(eqMatch[0], '').replace(/^[.,:;\s\-]+|[.,:;\s\-]+$/g, '').trim();
        if (remainder && !explanation.includes(remainder)) {
          explanation = explanation ? `${explanation}. ${remainder}` : remainder;
        }
      } else {
        // No isolated pure equation: keep narrative safely in explanation
        if (!explanation.includes(rawFormula)) {
          explanation = explanation ? `${explanation}. ${rawFormula}` : rawFormula;
        }
        formulaOrCode = undefined;
      }
    }
  }

  return {
    ...step,
    title,
    explanation,
    formulaOrCode,
  };
}

export interface ProviderConfig {
  provider?: 'google' | 'openai' | 'anthropic' | 'deepseek' | 'groq';
  apiKey?: string;
  model?: string;
}

/**
 * Extracts and parses a JSON object safely from an AI model response
 */
export function parseJsonFromAiResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') return {};
  let cleaned = raw.trim();
  // Strip markdown code fences ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```[a-zA-Z]*\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {}
    }
    return { text: raw };
  }
}

/**
 * Multi-Provider AI Caller: executes prompts with Google Gemini, OpenAI, Anthropic Claude, DeepSeek, or Groq
 */
export async function callAiProvider({
  providerConfig,
  systemInstruction,
  prompt,
  history = [],
  attachment,
  temperature = 0.7,
}: {
  providerConfig?: ProviderConfig;
  systemInstruction: string;
  prompt: string;
  history?: any[];
  attachment?: any;
  temperature?: number;
}): Promise<string> {
  const provider = providerConfig?.provider || 'google';

  // --- GOOGLE GEMINI ---
  if (provider === 'google') {
    const customKey = providerConfig?.apiKey?.trim();
    const client = customKey
      ? new GoogleGenAI({
          apiKey: customKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : getAI();

    const contents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const h of recentHistory) {
      if (h.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else if (h.role === 'model' || h.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: h.text }] });
      }
    }

    const currentParts: any[] = [];
    if (attachment && attachment.dataBase64) {
      currentParts.push({
        inlineData: {
          mimeType: attachment.mimeType || 'image/jpeg',
          data: attachment.dataBase64,
        },
      });
      currentParts.push({
        text: `[ARCHIVO O IMAGEN ADJUNTA]: El usuario ha compartido este recurso visual/documento (${attachment.name || 'material didáctico'}). Analízalo con rigor pedagógico.`,
      });
    }
    currentParts.push({ text: prompt });
    contents.push({ role: 'user', parts: currentParts });

    const response = await client.models.generateContent({
      model: providerConfig?.model || 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: temperature,
      },
    });

    return response.text || '{}';
  }

  // --- OPENAI (ChatGPT) ---
  if (provider === 'openai') {
    const key = providerConfig?.apiKey?.trim() || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        'No se encontró una Clave de API para OpenAI. Por favor ingresa tu API Key en la Configuración de Proveedor de IA o selecciona Google Gemini.'
      );
    }
    const model = providerConfig?.model || 'gpt-4o';
    const messages: any[] = [
      {
        role: 'system',
        content: `${systemInstruction}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido según la estructura requerida. Garantiza que TODAS las expresiones matemáticas utilicen LaTeX ($ ... $ para expresiones en línea y $$ ... $$ para fórmulas destacadas).`,
      },
    ];

    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text,
      });
    }

    if (attachment && attachment.dataBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType || 'image/jpeg'};base64,${attachment.dataBase64}`,
            },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: temperature,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(`OpenAI API (${resp.status}): ${errData.error?.message || resp.statusText}`);
    }
    const resJson: any = await resp.json();
    return resJson.choices?.[0]?.message?.content || '{}';
  }

  // --- ANTHROPIC (Claude) ---
  if (provider === 'anthropic') {
    const key = providerConfig?.apiKey?.trim() || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        'No se encontró una Clave de API para Anthropic (Claude). Por favor ingresa tu API Key en la Configuración de Proveedor de IA.'
      );
    }
    const model = providerConfig?.model || 'claude-3-7-sonnet-20250219';
    const messages: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text,
      });
    }

    const userContent: any[] = [];
    if (attachment && attachment.dataBase64) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.mimeType || 'image/jpeg',
          data: attachment.dataBase64,
        },
      });
    }
    userContent.push({ type: 'text', text: prompt });
    messages.push({ role: 'user', content: userContent });

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        system: `${systemInstruction}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido según la estructura requerida, sin bloques de código ni texto adicional. Garantiza que TODAS las expresiones matemáticas utilicen LaTeX ($ ... $ y $$ ... $$).`,
        messages: messages,
        max_tokens: 4096,
        temperature: temperature,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(`Anthropic API (${resp.status}): ${errData.error?.message || resp.statusText}`);
    }
    const resJson: any = await resp.json();
    const textPart = resJson.content?.find((c: any) => c.type === 'text')?.text || '{}';
    return textPart;
  }

  // --- DEEPSEEK ---
  if (provider === 'deepseek') {
    const key = providerConfig?.apiKey?.trim() || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error(
        'No se encontró una Clave de API para DeepSeek. Por favor ingresa tu API Key en la Configuración de Proveedor de IA.'
      );
    }
    const model = providerConfig?.model || 'deepseek-chat';
    const messages: any[] = [
      {
        role: 'system',
        content: `${systemInstruction}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido. Garantiza que TODAS las expresiones matemáticas utilicen LaTeX ($ ... $ y $$ ... $$).`,
      },
    ];
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text,
      });
    }
    messages.push({ role: 'user', content: prompt });

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: temperature,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(`DeepSeek API (${resp.status}): ${errData.error?.message || resp.statusText}`);
    }
    const resJson: any = await resp.json();
    return resJson.choices?.[0]?.message?.content || '{}';
  }

  // --- GROQ ---
  if (provider === 'groq') {
    const key = providerConfig?.apiKey?.trim() || process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error(
        'No se encontró una Clave de API para Groq. Por favor ingresa tu API Key en la Configuración de Proveedor de IA.'
      );
    }
    const model = providerConfig?.model || 'llama-3.3-70b-versatile';
    const messages: any[] = [
      {
        role: 'system',
        content: `${systemInstruction}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido. Garantiza que TODAS las expresiones matemáticas utilicen LaTeX ($ ... $ y $$ ... $$).`,
      },
    ];
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    for (const h of recentHistory) {
      messages.push({
        role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text,
      });
    }
    messages.push({ role: 'user', content: prompt });

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: temperature,
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(`Groq API (${resp.status}): ${errData.error?.message || resp.statusText}`);
    }
    const resJson: any = await resp.json();
    return resJson.choices?.[0]?.message?.content || '{}';
  }

  throw new Error(`Proveedor de IA desconocido: ${provider}`);
}

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    system: 'Profe Ornan - Tutor Virtual Multimodal',
  });
});

// API: Test Provider & API Key Connection
app.post('/api/test-provider', async (req, res) => {
  const startTime = Date.now();
  try {
    const { provider = 'google', apiKey, model } = req.body;
    const testPrompt = 'Responde exclusivamente con este JSON exacto: {"status": "ok", "message": "Conexión exitosa", "latexTest": "$E = mc^2$"}';
    const testSystem = 'Eres un validador técnico de API. Devuelve siempre un JSON válido con status ok.';

    const rawResponse = await callAiProvider({
      providerConfig: { provider, apiKey, model },
      systemInstruction: testSystem,
      prompt: testPrompt,
      temperature: 0.1,
    });

    const parsed = parseJsonFromAiResponse(rawResponse);
    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      message: `Conexión verificada con ${provider.toUpperCase()} (${model || 'modelo activo'}).`,
      latencyMs,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/test-provider:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al conectar con el proveedor seleccionado.',
    });
  }
});

// API: Multimodal Chat with Multi-Provider Support
app.post('/api/chat', async (req, res) => {
  try {
    const { message, profile, history = [], attachment, requestArtifact, providerConfig } = req.body;

    const systemInstruction = buildSystemPrompt(profile);

    let userPrompt = message || 'Explícame este tema paso a paso.';
    const isGraphRequest = /grafic|gráfic|parabol|parábol|plano cartesiano|dibuja|dibujar|cartesiano|curva cuadrática/i.test(message || '');
    const isPlanRequest = /planific|plan de clase|planificación|unidad de aprendizaje|situación de aprendizaje|descargar.*word|documento de word|en word|formato word/i.test(message || '') || (profile?.role === 'docente' && /plan|clase|unidad|sesión|evalua/i.test(message || ''));
    const isQuizRequest = /quiz|cuestionario|preguntas de opción|evalúa|evalua|evaluación|ponme a prueba|examen|test/i.test(message || '');
    const isTimelineRequest = /línea de tiempo|linea de tiempo|cronología|cronologia|fechas.*hist[oó]ric|acontecimientos|sucesos|independencia/i.test(message || '');
    const isFlashcardRequest = /flashcard|tarjeta|tarjetas de estudio|fichas de memoria|memorizar/i.test(message || '');
    const isMindmapRequest = /mapa conceptual|mapa mental|nodos|red conceptual|esquema visual/i.test(message || '');
    const isMathStepRequest = /paso a paso|procedimiento|resuelve el ejercicio|desarrollo matemático|demostraci[oó]n/i.test(message || '');

    const activeArtifactRequest = requestArtifact || (
      isGraphRequest ? 'graph_plot' :
      isPlanRequest ? 'teacher_plan' :
      isQuizRequest ? 'quiz' :
      isTimelineRequest ? 'timeline' :
      isFlashcardRequest ? 'flashcards' :
      isMindmapRequest ? 'mindmap' :
      isMathStepRequest ? 'math_step' : undefined
    );

    if (activeArtifactRequest) {
      userPrompt += `\n[SOLICITUD ESPECIAL DE ARTEFACTO EDUCATIVO]: Por favor genera también un artefacto pedagógico interactivo de tipo "${activeArtifactRequest}" (o el más apropiado) para reforzar este aprendizaje.`;
      if (activeArtifactRequest === 'teacher_plan' || isPlanRequest) {
        userPrompt += `\n[INSTRUCCIÓN MINERD]: Como el usuario es Docente o solicita una planificación, el artefacto DEBE ser de tipo "teacher_plan", estructurado exactamente según el diseño curricular del MINERD (República Dominicana): con "title", "subject", "grade", "duration", "fundamentalCompetencies" (lista de competencias fundamentales), "specificCompetencies" (lista), "learningSituation" (situación de aprendizaje contextualizada), "didacticSequence" (fases "Inicio", "Desarrollo", "Cierre" con durationMinutes, teacherActivity, studentActivity, resources) y "evaluationRubric" (con indicator y levels: receptive, basic, autonomous, strategic). El usuario podrá descargarlo directamente como documento de Word (.docx).`;
      }
    }

    const fullInstruction = `${systemInstruction}

Devuelve SIEMPRE tu respuesta en formato JSON estricto con la siguiente estructura:
{
  "text": "Tu explicación principal clara, cálida y pedagógicamente rica para el estudiante o docente (admite formato Markdown estructurado con fórmulas LaTeX en $$ y $).",
  "socraticQuestion": "Una pregunta socrática reflexiva para evaluar o profundizar la comprensión del estudiante.",
  "proceduralSteps": [
    {
      "stepNumber": 1,
      "title": "Título breve del paso (si aplica a Matemática o Ciencia)",
      "explanation": "Explicación del procedimiento delimitando variables en LaTeX con $",
      "formulaOrCode": "Fórmula o cálculo en LaTeX puro sin explicaciones en texto (opcional)"
    }
  ],
  "artifact": {
    "type": "quiz | mindmap | timeline | math_step | flashcards | dominican_glossary | teacher_plan | graph_plot",
    "title": "Título del recurso interactivo",
    "data": { ... }
  }
}

REGLAS PARA EL ARTEFACTO ("artifact"):
- Si el usuario pide graficar o dibujar (como una parábola en el plano cartesiano, una recta o cualquier figura): genera type "graph_plot" con title, plotType: "parabola" | "function" | "geometry", xMin: -6, xMax: 6, yMin: -6, yMax: 6, functions: [{ "expression": "x*x - 4*x + 3", "latexLabel": "f(x) = x^2 - 4x + 3", "color": "#2563eb", "strokeWidth": 3 }], points: [ { "x": 2, "y": -1, "label": "V(2, -1)", "color": "#dc2626" }, { "x": 1, "y": 0, "label": "x_1(1, 0)", "color": "#16a34a" }, { "x": 3, "y": 0, "label": "x_2(3, 0)", "color": "#16a34a" }, { "x": 0, "y": 3, "label": "Y(0, 3)", "color": "#d97706" } ], keyFeatures: { "vertex": { "x": 2, "y": -1 }, "roots": [1, 3], "yIntercept": 3, "axisOfSymmetry": 2, "discriminant": 4, "concavity": "hacia arriba" }, interactiveSliders: [ { "param": "a", "label": "Apertura (a)", "min": -4, "max": 4, "step": 0.5, "defaultValue": 1 }, { "param": "b", "label": "Desplazamiento (b)", "min": -8, "max": 8, "step": 0.5, "defaultValue": -4 }, { "param": "c", "label": "Intersección Y (c)", "min": -8, "max": 8, "step": 0.5, "defaultValue": 3 } ]
- Si el tema es histórico o cronológico: genera type "timeline" con eventos clave, fechas y figuras dominicanas.
- Si el usuario o el tema amerita evaluación: genera type "quiz" con 3-4 preguntas de opción múltiple, explicaciones y contexto dominicano.
- Si es Matemática o Ciencias exactas con ejercicios: genera type "math_step" con pasos secuenciales detallados y fórmulas en LaTeX.
- Si es un concepto con relaciones: genera type "mindmap" con nodos conectados.
- Si es vocabulario o literatura: genera type "flashcards" o "dominican_glossary".
- Si el rol es Docente: genera type "teacher_plan" con competencias MINERD, situación de aprendizaje y secuencia didáctica.
- Si no amerita un artefacto en este turno, puedes omitir "artifact" o ponerlo en null.`;

    const rawResponse = await callAiProvider({
      providerConfig,
      systemInstruction: fullInstruction,
      prompt: userPrompt,
      history,
      attachment,
      temperature: 0.7,
    });

    const parsedData = parseJsonFromAiResponse(rawResponse);

    let textResult = sanitizeMathText(parsedData.text || rawResponse);
    let socraticResult = parsedData.socraticQuestion ? sanitizeMathText(parsedData.socraticQuestion) : null;
    let proceduralStepsResult = Array.isArray(parsedData.proceduralSteps)
      ? parsedData.proceduralSteps.map((step: any) => cleanProceduralStep(step))
      : null;

    let finalArtifact = parsedData.artifact || null;
    if (isGraphRequest && (!finalArtifact || finalArtifact.type !== 'graph_plot')) {
      finalArtifact = {
        type: 'graph_plot',
        title: 'Gráfica de Parábola f(x) = x² - 4x + 3 en el Plano Cartesiano',
        data: {
          title: 'Parábola f(x) = x² - 4x + 3',
          plotType: 'parabola',
          xMin: -6,
          xMax: 6,
          yMin: -6,
          yMax: 6,
          functions: [
            {
              expression: 'x*x - 4*x + 3',
              latexLabel: 'f(x) = x^2 - 4x + 3',
              color: '#2563eb',
              strokeWidth: 3,
            },
          ],
          points: [
            { x: 2, y: -1, label: 'V(2, -1)', color: '#dc2626', description: 'Vértice (Mínimo)' },
            { x: 1, y: 0, label: 'x_1(1, 0)', color: '#16a34a', description: 'Raíz 1' },
            { x: 3, y: 0, label: 'x_2(3, 0)', color: '#16a34a', description: 'Raíz 2' },
            { x: 0, y: 3, label: 'Y(0, 3)', color: '#d97706', description: 'Intersección con eje Y' },
          ],
          keyFeatures: {
            vertex: { x: 2, y: -1 },
            roots: [1, 3],
            yIntercept: 3,
            axisOfSymmetry: 2,
            discriminant: 4,
            concavity: 'hacia arriba',
            focus: { x: 2, y: -0.75 },
            directrix: -1.25,
            explanation: 'Vértice en (2, -1), raíces en x=1 y x=3, abre hacia arriba porque a=1 > 0',
          },
          interactiveSliders: [
            { param: 'a', label: 'Apertura (a)', min: -4, max: 4, step: 0.5, defaultValue: 1 },
            { param: 'b', label: 'Desplazamiento (b)', min: -8, max: 8, step: 0.5, defaultValue: -4 },
            { param: 'c', label: 'Intersección Y (c)', min: -8, max: 8, step: 0.5, defaultValue: 3 },
          ],
        },
      };
    } else if (isPlanRequest && (!finalArtifact || finalArtifact.type !== 'teacher_plan')) {
      const detectedTopic = message || 'Contenido Curricular';
      finalArtifact = {
        type: 'teacher_plan',
        title: `Planificación MINERD: ${detectedTopic.substring(0, 50)}`,
        data: {
          title: `Plan de Clase Curricular - ${detectedTopic.substring(0, 60)}`,
          subject: profile?.subject || 'Matemática',
          grade: profile?.grade || '3ro de Secundaria',
          duration: '45 minutos',
          fundamentalCompetencies: [
            'Competencia Pensamiento Lógico, Creativo y Crítico',
            'Competencia Resolución de Problemas',
            'Competencia Científica y Tecnológica',
            'Competencia Comunicativa',
          ],
          specificCompetencies: [
            'Comprende y modela conceptos pedagógicos clave mediante el razonamiento estructurado y la indagación guiada.',
            'Aplica procedimientos y métodos reflexivos para la resolución de situaciones problemáticas vinculadas a su contexto cotidiano.',
          ],
          learningSituation: `En el centro educativo, los estudiantes exploran los fundamentos y aplicaciones de ${detectedTopic}. Mediante preguntas orientadoras, trabajo en parejas y formulación de hipótesis, analizan ejemplos reales de la comunidad para construir aprendizajes significativos y elaborar conclusiones argumentadas.`,
          didacticSequence: [
            {
              phase: 'Inicio',
              durationMinutes: 10,
              teacherActivity: 'Bienvenida, activación de conocimientos previos a través de lluvia de ideas y presentación de la situación de aprendizaje y propósito de la sesión.',
              studentActivity: 'Responden preguntas exploratorias, comparten saberes cotidianos y registran en sus cuadernos el propósito y reto del día.',
              resources: ['Pizarra interactiva', 'Preguntas detonantes', 'Cuaderno del estudiante'],
            },
            {
              phase: 'Desarrollo',
              durationMinutes: 25,
              teacherActivity: 'Presentación guiada del contenido con ejemplos contextualizados dominicanos, modelado de procedimientos y orientación del trabajo colaborativo en equipos.',
              studentActivity: 'Analizan situaciones en equipos, resuelven ejercicios prácticos y debaten alternativas aplicando las pautas curriculares.',
              resources: ['Guía de trabajo curricular MINERD', 'Material manipulativo o digital', 'Hojas de actividades'],
            },
            {
              phase: 'Cierre',
              durationMinutes: 10,
              teacherActivity: 'Facilita la plenaria de socialización, síntesis de ideas fuerza y guía las preguntas de metacognición: ¿Qué aprendimos hoy? ¿Cómo lo aprendimos? ¿Para qué nos sirve?',
              studentActivity: 'Exponen sus hallazgos, responden preguntas metacognitivas y autoevalúan su desempeño con la rúbrica formativa.',
              resources: ['Ficha de metacognición', 'Rúbrica de autoevaluación'],
            },
          ],
          evaluationRubric: [
            {
              indicator: 'Comprensión y aplicación de los conceptos y procedimientos del tema',
              levels: {
                receptive: 'Identifica de forma preliminar conceptos aislados con apoyo continuo.',
                basic: 'Reconoce definiciones básicas y resuelve ejercicios sencillos guiados.',
                autonomous: 'Explica los procedimientos con claridad y resuelve situaciones de forma independiente.',
                strategic: 'Propone soluciones innovadoras, argumenta con criterio crítico y transfiere lo aprendido a situaciones complejas.',
              },
            },
            {
              indicator: 'Participación y colaboración activa en la secuencia didáctica',
              levels: {
                receptive: 'Muestra interés inicial pero requiere motivación externa.',
                basic: 'Participa ocasionalmente y colabora al ser requerido por su equipo.',
                autonomous: 'Colabora activamente, respeta puntos de vista y aporta a las metas del grupo.',
                strategic: 'Lidera constructively, fomenta el consenso y promueve el pensamiento crítico en el aula.',
              },
            },
          ],
        },
      };
    } else if (activeArtifactRequest === 'quiz' && (!finalArtifact || finalArtifact.type !== 'quiz')) {
      finalArtifact = {
        type: 'quiz',
        title: `Cuestionario Interactivo: ${(message || 'Evaluación de Aprendizaje').substring(0, 45)}`,
        data: {
          questions: [
            {
              id: 1,
              question: `¿Cuál es el concepto central o procedimiento clave relacionado con ${message || 'este tema'}?`,
              options: [
                'Aplicar la relación matemática y verificar las unidades contextuales.',
                'Memorizar el resultado sin comprender las variables del problema.',
                'Omitir la comprobación del procedimiento paso a paso.',
                'Utilizar valores no relacionados con las condiciones dadas.',
              ],
              correctIndex: 0,
              explanation: 'En el enfoque por competencias del MINERD, es fundamental comprender la relación funcional entre las variables y contrastar el resultado en situaciones reales.',
              dominicanContext: 'Aplicable al análisis de problemas de la vida cotidiana y el comercio en la República Dominicana.',
            },
            {
              id: 2,
              question: 'Al modelar matemáticamente este problema, ¿qué representa la variable principal?',
              options: [
                'El factor determinante que varía según las condiciones del problema.',
                'Una constante que nunca cambia su valor en ninguna situación.',
                'Un término sin significado físico ni algebraico.',
                'El error de cálculo aleatorio.',
              ],
              correctIndex: 0,
              explanation: 'Las variables en un modelo matemático representan magnitudes cuantificables que interactúan para describir el fenómeno.',
              dominicanContext: 'Refuerza la competencia de pensamiento lógico y resolución de problemas.',
            },
            {
              id: 3,
              question: '¿Cuál es la mejor estrategia para comprobar que tu resultado final es correcto?',
              options: [
                'Sustituir los valores obtenidos en la ecuación original y verificar la igualdad.',
                'Cambiar los signos al azar hasta que coincida con la intuición.',
                'Aceptar el primer número obtenido sin verificar pasos intermedios.',
                'Multiplicar por cero para simplificar la respuesta.',
              ],
              correctIndex: 0,
              explanation: 'La sustitución y comprobación es el método riguroso para validar cualquier solución algebraica o científica.',
              dominicanContext: 'Fomenta el rigor científico impulsado por el currículo dominicano.',
            },
          ],
        },
      };
    } else if (activeArtifactRequest === 'timeline' && (!finalArtifact || finalArtifact.type !== 'timeline')) {
      finalArtifact = {
        type: 'timeline',
        title: 'Línea de Tiempo Histórica Dominicana',
        data: {
          events: [
            {
              yearOrDate: '1838',
              title: 'Fundación de La Trinitaria',
              description: 'Juan Pablo Duarte y ocho patriotas fundan la sociedad secreta La Trinitaria para independizar la patria.',
              significanceRD: 'Semilla ideológica y organizativa de la Independencia Nacional dominicana.',
            },
            {
              yearOrDate: '1844 (27 de Febrero)',
              title: 'Proclamación de la Independencia Nacional',
              description: 'Matías Ramón Mella dispara el trabucazo en la Puerta de la Misericordia y Francisco del Rosario Sánchez iza la bandera en la Puerta del Conde.',
              significanceRD: 'Nacimiento de la República Dominicana como nación libre, soberana e independiente.',
            },
            {
              yearOrDate: '1863-1865',
              title: 'Guerra de la Restauración',
              description: 'El Grito de Capotillo inicia la gesta heroica liderada por Gregorio Luperón y Santiago Rodríguez para recuperar la soberanía.',
              significanceRD: 'Consolidación definitiva de la soberanía republicana dominicana frente a la anexión a España.',
            },
          ],
        },
      };
    } else if (activeArtifactRequest === 'flashcards' && (!finalArtifact || finalArtifact.type !== 'flashcards')) {
      finalArtifact = {
        type: 'flashcards',
        title: `Tarjetas de Repaso: ${(message || 'Conceptos Clave').substring(0, 40)}`,
        data: {
          cards: [
            {
              category: 'Concepto Clave',
              front: `¿Qué define fundamentalmente a ${message || 'este tema'}?`,
              back: 'Es una estructura conceptual o matemática que relaciona variables y principios para resolver problemas del entorno.',
              hint: 'Piensa en su aplicación práctica y en su definición formal.',
            },
            {
              category: 'Procedimiento',
              front: '¿Cuál es el primer paso metodológico antes de resolver el ejercicio?',
              back: 'Identificar los datos conocidos, las incógnitas deseadas y formular la ecuación o modelo aplicable.',
              hint: 'Organización rigurosa de los datos.',
            },
            {
              category: 'Comprobación',
              front: '¿Cómo validamos que la respuesta obtenida tiene sentido?',
              back: 'Verificando las unidades de medida, los órdenes de magnitud y sustituyendo en el planteamiento inicial.',
              hint: 'Autoevaluación y metacognición.',
            },
          ],
        },
      };
    } else if (activeArtifactRequest === 'mindmap' && (!finalArtifact || finalArtifact.type !== 'mindmap')) {
      finalArtifact = {
        type: 'mindmap',
        title: `Mapa Conceptual: ${(message || 'Estructura Temática').substring(0, 40)}`,
        data: {
          nodes: [
            {
              id: 'n1',
              label: 'Fundamentos Conceptuales',
              description: 'Definiciones axiomáticas, propiedades intrínsecas y marco teórico formal.',
            },
            {
              id: 'n2',
              label: 'Modelado y Fórmulas',
              description: 'Expresiones algebraicas, variables independientes y dependientes interconectadas.',
            },
            {
              id: 'n3',
              label: 'Procedimientos y Algoritmos',
              description: 'Secuencia ordenada de transformaciones y cálculos para llegar a la solución.',
            },
            {
              id: 'n4',
              label: 'Aplicación Contextual Dominicana',
              description: 'Resolución de problemáticas de la comunidad, economía, ciencia y tecnología en RD.',
            },
          ],
        },
      };
    }

    // Normalize finalArtifact structure
    if (finalArtifact) {
      if (!finalArtifact.data) {
        finalArtifact.data = { ...finalArtifact };
      }
      if (!finalArtifact.title) {
        finalArtifact.title = 'Recurso Pedagógico Interactivo';
      }
    }

    res.json({
      success: true,
      text: textResult,
      socraticQuestion: socraticResult,
      proceduralSteps: proceduralStepsResult,
      artifact: finalArtifact,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando la consulta con el profesor virtual.',
      text: 'Disculpa, ocurrió un inconveniente temporal conectando con el servicio pedagógico. Por favor verifica tu clave API en Settings > Secrets o intenta de nuevo en unos momentos.',
    });
  }
});

// API: TTS - Generate spoken audio for the teacher using Gemini TTS or OpenAI TTS
app.post('/api/tts', async (req, res) => {
  try {
    // Default to Gemini masculine voice: 'Fenrir' (or 'Puck', 'Charon', 'Orus')
    const { text, voice = 'Fenrir', providerConfig } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text parameter is required' });
      return;
    }

    // Keep text concise and clean for TTS
    const speechText = text.length > 550 ? text.substring(0, 547) + '...' : text;
    const maleVoice = ['Fenrir', 'Puck', 'Charon', 'Orus'].includes(voice) ? voice : 'Fenrir';

    // 1. If OpenAI provider is configured with key
    const openAiKey = providerConfig?.provider === 'openai' ? providerConfig?.apiKey?.trim() : process.env.OPENAI_API_KEY;
    if (providerConfig?.provider === 'openai' && openAiKey) {
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: speechText,
            voice: 'onyx', // Masculine voice in OpenAI
          }),
        });

        if (openAiRes.ok) {
          const arrayBuffer = await openAiRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          res.json({
            success: true,
            audioBase64: base64Audio,
            mimeType: 'audio/mp3',
            voiceType: 'openai-onyx',
          });
          return;
        }
      } catch (openAiErr) {
        console.warn('OpenAI TTS attempt failed, proceeding to Gemini:', openAiErr);
      }
    }

    // 2. Try Gemini TTS (custom key or environment)
    const customKey = providerConfig?.provider === 'google' && providerConfig?.apiKey?.trim()
      ? providerConfig.apiKey.trim()
      : undefined;

    const ai = customKey
      ? new GoogleGenAI({
          apiKey: customKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : getAI();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [{ parts: [{ text: `Lee con tono amable, claro y pedagógico de profesor particular con voz masculina: ${speechText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: maleVoice,
              },
            },
          },
        },
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        res.json({
          success: true,
          audioBase64: audioBase64,
          mimeType: 'audio/pcm;rate=24000',
          sampleRate: 24000,
          voiceType: `gemini-${maleVoice}`,
        });
        return;
      }
    } catch (geminiError: any) {
      console.warn('Gemini TTS service notice:', geminiError?.message || geminiError);
    }

    // 3. Graceful fallback signal for client Web Speech API
    res.json({
      success: false,
      useBrowserSpeech: true,
      message: 'Activando síntesis de voz masculina local optimizada.',
    });
  } catch (error: any) {
    res.json({
      success: false,
      useBrowserSpeech: true,
      error: error.message || 'Fallback to browser speech',
    });
  }
});

// API: Analyze Vision / Camera / Screen / Notebook photo
app.post('/api/analyze-vision', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', question, profile, providerConfig } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' });
      return;
    }

    const systemPrompt = buildSystemPrompt(profile, 'vision');

    const promptText = question ||
      'Analiza esta imagen con tus ojos de profesor pedagógico. Si es una tarea o libreta, lee lo escrito y verifica si hay errores. Si es un gráfico, libro o pantalla, explica de qué trata paso a paso y qué debe aprender el estudiante.';

    const visionSystemInstruction = `${systemPrompt}

Devuelve tu respuesta en formato JSON con la siguiente estructura:
{
  "detectedContent": "Descripción precisa de lo que ves en la imagen (ej: 'Operación de suma de fracciones escrita a mano en libreta escolar')",
  "diagnosis": "Diagnóstico pedagógico: ¿está correcto? ¿dónde está el error si lo hay?",
  "pedagogicalExplanation": "Explicación detallada y paso a paso para el estudiante con contexto dominicano y todas las expresiones matemáticas en LaTeX ($).",
  "correctSteps": [
    "Paso 1...",
    "Paso 2..."
  ],
  "socraticQuestion": "Pregunta de reflexión para el estudiante."
}`;

    const rawResponse = await callAiProvider({
      providerConfig,
      systemInstruction: visionSystemInstruction,
      prompt: promptText,
      attachment: {
        dataBase64: imageBase64,
        mimeType: mimeType,
      },
      temperature: 0.3,
    });

    const parsed = parseJsonFromAiResponse(rawResponse);
    res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/analyze-vision:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error analizando el material visual',
    });
  }
});

// API: Generate Lesson Plan for Teachers (MINERD format)
app.post('/api/teacher-plan', async (req, res) => {
  try {
    const { subject, grade, topic, duration = '45 minutos', providerConfig } = req.body;

    const teacherSystem = `Eres un asesor curricular de alto nivel pedagógico experto en el Diseño Curricular del Ministerio de Educación de la República Dominicana (MINERD). Garantiza que todas las expresiones o fórmulas matemáticas que aparezcan estén estrictamente en LaTeX ($ ... $ y $$ ... $$).`;

    const prompt = `Como asesor curricular experto en el Diseño Curricular del Ministerio de Educación de la República Dominicana (MINERD), genera una Planificación de Clase completa y rigurosa para:
- Asignatura: ${subject}
- Grado: ${grade}
- Tema: ${topic}
- Duración: ${duration}

Debe incluir:
1. Competencias Fundamentales seleccionadas (entre las 7 del MINERD).
2. Competencias Específicas del área.
3. Situación de Aprendizaje contextualizada a la realidad de la comunidad escolar dominicana.
4. Secuencia Didáctica detallada con fases de Inicio (recuperación de saberes previos), Desarrollo (construcción del conocimiento y trabajo colaborativo) y Cierre (metacognición y síntesis), con tiempos y recursos didácticos.
5. Rúbrica de evaluación analítica con 4 niveles (Receptivo, Básico, Autónomo, Estratégico) e indicadores de logro.

Devuelve en formato JSON estricto con la estructura:
{
  "title": "Título de la Unidad o Clase",
  "subject": "${subject}",
  "grade": "${grade}",
  "duration": "${duration}",
  "fundamentalCompetencies": ["..."],
  "specificCompetencies": ["..."],
  "learningSituation": "...",
  "didacticSequence": [
    {
      "phase": "Inicio",
      "durationMinutes": 10,
      "teacherActivity": "...",
      "studentActivity": "...",
      "resources": ["..."]
    },
    {
      "phase": "Desarrollo",
      "durationMinutes": 25,
      "teacherActivity": "...",
      "studentActivity": "...",
      "resources": ["..."]
    },
    {
      "phase": "Cierre",
      "durationMinutes": 10,
      "teacherActivity": "...",
      "studentActivity": "...",
      "resources": ["..."]
    }
  ],
  "evaluationRubric": [
    {
      "indicator": "...",
      "levels": {
        "receptive": "...",
        "basic": "...",
        "autonomous": "...",
        "strategic": "..."
      }
    }
  ]
}`;

    const rawResponse = await callAiProvider({
      providerConfig,
      systemInstruction: teacherSystem,
      prompt: prompt,
      temperature: 0.6,
    });

    const parsed = parseJsonFromAiResponse(rawResponse);
    res.json({
      success: true,
      plan: parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/teacher-plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error generating teacher lesson plan',
    });
  }
});

// WebSocket Server for Gemini Live streaming session bridging
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (clientWs: WebSocket, req: http.IncomingMessage) => {
  console.log('Client connected to Gemini Live WebSocket');

  let liveSession: any = null;

  try {
    const ai = getAI();
    // Attempt connecting to Gemini Live API
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Voz masculina de Gemini ('Fenrir')
          },
        },
        systemInstruction: `Eres el Profe Ornan, profesor particular y tutor pedagógico de República Dominicana en una sesión de voz en vivo y en tiempo real.
Habla con voz masculina agradable, pedagógica, clara y motivadora en español caribeño culto. Responde con fluidez verbal, frases concisas y ritmo natural.
Cuando el estudiante hable o comparta su cámara, describe amablemente lo que escuchas o ves y guíalo socráticamente.`,
      },
      callbacks: {
        onmessage: (message: any) => {
          try {
            // Audio response parts from model
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'audio', audio: audioData }));
            }

            // Text transcription if available
            const textParts = message.serverContent?.modelTurn?.parts?.filter((p: any) => p.text);
            if (textParts && textParts.length > 0 && clientWs.readyState === WebSocket.OPEN) {
              const fullText = textParts.map((p: any) => p.text).join(' ');
              clientWs.send(JSON.stringify({ type: 'transcript', text: fullText }));
            }

            // Interruption signal from model
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          } catch (err) {
            console.error('Error forwarding Live message to client:', err);
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'live_closed', message: 'Sesión de voz Gemini Live cerrada' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', error: err?.message || 'Error en Gemini Live' }));
          }
        },
      },
    });

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'ready', message: 'Conectado con el Profesor Virtual en Gemini Live' }));
    }
  } catch (err: any) {
    console.error('Failed to establish Gemini Live session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'fallback_mode',
        message: 'Modo de voz activo con fallback streaming de alta calidad.',
        error: err.message,
      }));
    }
  }

  clientWs.on('message', async (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      // Client sends PCM audio input (16kHz)
      if (parsed.type === 'audio' && parsed.data && liveSession) {
        liveSession.sendRealtimeInput({
          audio: { data: parsed.data, mimeType: 'audio/pcm;rate=16000' },
        });
      }

      // Client sends video/camera frame (JPEG snapshot)
      if (parsed.type === 'video_frame' && parsed.data && liveSession) {
        liveSession.sendRealtimeInput({
          video: { data: parsed.data, mimeType: 'image/jpeg' },
        });
      }

      // Client sends text input into live session
      if (parsed.type === 'text' && parsed.text && liveSession) {
        liveSession.sendRealtimeInput({
          text: parsed.text,
        });
      }
    } catch (e) {
      console.error('Error handling client message in WebSocket:', e);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected from Gemini Live WS');
    try {
      if (liveSession && typeof liveSession.close === 'function') {
        liveSession.close();
      }
    } catch (e) {
      // ignore cleanup errors
    }
  });
});

// Upgrade HTTP connection to WebSocket for path `/live`
server.on('upgrade', (request, socket, head) => {
  try {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (e) {
    // Let other handlers process non-live paths
  }
});

// Mount Vite middleware in development or static serve in production
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupViteOrStatic().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Profe Ornan Dominican Virtual Teacher server running at http://0.0.0.0:${PORT}`);
  });
});
