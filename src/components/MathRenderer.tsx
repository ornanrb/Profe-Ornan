import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
  showCopy?: boolean;
}

/**
 * Detects whether a string has non-LaTeX natural language words (3+ chars not in math dictionary)
 */
export function isNaturalLanguageText(str: string): boolean {
  if (!str) return false;
  // Remove LaTeX commands (\frac, \sqrt, \text{...}, \times, \cdot, \Delta, etc.)
  const stripped = str.replace(/\\[a-zA-Z]+(?:\{[^{}]*\})?/g, ' ');
  // Remove any internal tokens
  const noTokens = stripped.replace(/@@[A-Z0-9_]+@@/g, ' ');
  // Find words of length 3+
  const words = noTokens.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/g) || [];
  const allowedMathWords = new Set([
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'log', 'ln', 'exp', 'lim', 'det', 'min', 'max', 'deg', 'gcd', 'lcm',
    'var', 'cov'
  ]);
  return words.some((w) => !allowedMathWords.has(w.toLowerCase()));
}

/**
 * Clean formula strings from surrounding delimiters and normalize escaping
 */
export function cleanFormulaString(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // Strip any leftover internal tokens
  str = str.replace(/@@[A-Z0-9_]+@@/g, '');

  // Strip repeated $$ ... $$ or $ ... $ in a loop
  let changed = true;
  while (changed && str.length >= 2) {
    changed = false;
    if (str.startsWith('$$') && str.endsWith('$$') && str.length >= 4) {
      str = str.slice(2, -2).trim();
      changed = true;
    } else if (str.startsWith('$') && str.endsWith('$') && str.length >= 2) {
      str = str.slice(1, -1).trim();
      changed = true;
    } else if (str.startsWith('\\[') && str.endsWith('\\]') && str.length >= 4) {
      str = str.slice(2, -2).trim();
      changed = true;
    } else if (str.startsWith('\\(') && str.endsWith('\\)') && str.length >= 4) {
      str = str.slice(2, -2).trim();
      changed = true;
    } else if (str.startsWith('(') && str.endsWith(')') && (str.includes('$') || str.includes('\\') || str.includes('='))) {
      // Handles ($T = p \cdot q$) or (T = p \cdot q) passed directly to cleanFormulaString
      str = str.slice(1, -1).trim();
      changed = true;
    } else if (str.startsWith('[') && str.endsWith(']') && (str.includes('$') || str.includes('\\') || str.includes('='))) {
      str = str.slice(1, -1).trim();
      changed = true;
    }
  }

  // Strip accidental surrounding quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Remove any remaining raw '$' delimiters because KaTeX throws an error if '$' exists inside formula mode
  // Preserves escaped currency \text{RD\$ } or \$
  str = str.replace(/(?<!\\)\$/g, '');

  // Remove curly braces around commas in thousand numbers like 50{,}000 -> 50,000 or 21{,}250 -> 21,250
  str = str.replace(/\{\s*,\s*\}/g, ',');

  // Normalize double-escaped backslashes for all LaTeX commands: e.g. \\frac -> \frac, \\Delta -> \Delta
  str = str.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Fix accidental backslashes before numbers (e.g. \21,250 or \71,250)
  str = str.replace(/\\(\d{2,}[0-9,.]*)/g, '$1');

  // Fix Dominican currency inside formula e.g. RD$ 21,250 or \text{RD } \21,250 -> \text{RD\$ } 21,250
  str = str.replace(/\\text\{\s*RD\s*\}\s*\\?\$?\s*([0-9,.]+)/gi, '\\text{RD\\$ }$1');
  str = str.replace(/\bRD\s*\$\s*([0-9,.]+)/gi, '\\text{RD\\$ }$1');

  // Convert unicode characters to LaTeX commands
  str = str.replace(/±/g, '\\pm ');
  str = str.replace(/×/g, '\\times ');
  str = str.replace(/÷/g, '\\div ');
  str = str.replace(/≠/g, '\\neq ');
  str = str.replace(/≤/g, '\\le ');
  str = str.replace(/≥/g, '\\ge ');
  str = str.replace(/Δ/g, '\\Delta ');
  str = str.replace(/π/g, '\\pi ');
  str = str.replace(/²/g, '^2');
  str = str.replace(/³/g, '^3');
  str = str.replace(/⁴/g, '^4');
  str = str.replace(/⁻¹/g, '^{-1}');

  // Convert Unicode square roots like √(b^2 - 4ac) or √4 -> \sqrt{...}
  str = str.replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}');
  str = str.replace(/√\s*([0-9a-zA-Z]+)/g, '\\sqrt{$1}');

  return str.trim();
}

/**
 * Render a single LaTeX formula with KaTeX. If natural language text is passed,
 * renders with MathMarkdown safely without butchering letters.
 */
export const MathFormula: React.FC<MathFormulaProps> = ({
  formula,
  displayMode = false,
  className = '',
  showCopy = false,
}) => {
  const [copied, setCopied] = useState(false);
  const clean = cleanFormulaString(formula);

  // If the string contains full Spanish narrative sentences outside LaTeX commands,
  // do not force KaTeX math mode which would break each letter vertically.
  if (isNaturalLanguageText(clean)) {
    return (
      <div className={`my-2 p-3 rounded-xl bg-slate-900/[0.03] border border-slate-200/90 text-xs text-slate-800 leading-relaxed ${className}`}>
        <MathMarkdown content={clean} />
      </div>
    );
  }

  const html = useMemo(() => {
    if (!clean) return '';
    try {
      return katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch (err) {
      // Fallback: try secondary sanitized rendering
      try {
        const sanitized = clean.replace(/([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
        return katex.renderToString(sanitized, {
          displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
        });
      } catch (e2) {
        console.warn('KaTeX fallback render notice:', clean);
        return `<span class="font-serif italic text-slate-800 font-medium px-1">${clean}</span>`;
      }
    }
  }, [clean, displayMode]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!clean) return null;

  if (displayMode) {
    return (
      <div className={`relative group my-2.5 p-3 rounded-xl bg-slate-900/[0.03] dark:bg-slate-800/40 border border-slate-200/90 text-center overflow-x-auto shadow-2xs ${className}`}>
        <div
          className="katex-display-wrapper inline-block max-w-full text-slate-900 py-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {showCopy && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1 rounded-md bg-white border border-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-900 hover:bg-slate-50 text-[10px] flex items-center gap-1 shadow-2xs"
            title="Copiar fórmula LaTeX"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span className="sr-only">Copiar LaTeX</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <span
      className={`inline-math align-baseline px-0.5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const nestedGroup = "\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}";

/**
 * Pre-processes text to standardize math delimiters ($$ and $) and wrap raw LaTeX expressions
 */
export function normalizeMathInText(rawText: string): string {
  if (!rawText) return '';

  // Remove curly braces around commas in thousand numbers like 50{,}000 -> 50,000 or 21{,}250 -> 21,250
  let text = rawText.replace(/\{\s*,\s*\}/g, ',');

  // 0. Protect Dominican currency (RD$ or RD $) so its '$' is never mistaken for a LaTeX math delimiter
  const protectedCurrency: string[] = [];
  text = text.replace(/\b(RD\s*\$\s*[0-9]+(?:[.,][0-9]+)*(?:\s*(?:millones|mil|pesos))?)/gi, (m) => {
    const idx = protectedCurrency.length;
    protectedCurrency.push(m);
    return `@@DOM_CURR_${idx}@@`;
  });

  // Also clean accidental backslashes before numbers (e.g. \21,250 or \71,250)
  text = text.replace(/\\(\d{2,}[0-9,.]*)/g, '$1');
  text = text.replace(/\\text\{\s*RD\s*\}\s*\\?\$?\s*([0-9,.]+)/gi, 'RD$ $1');
  text = text.replace(/\\text\{\s*RD\$\s*\}\s*([0-9,.]+)/gi, 'RD$ $1');

  // 1. Normalize double-escaped backslashes for all LaTeX commands
  text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // 2. Collapse 3 or more dollar signs and remove consecutive empty dollar blocks ($$ $$)
  text = text.replace(/\${3,}/g, '$$');
  text = text.replace(/\$\$\s*\$\$/g, '\n');
  text = text.replace(/\$([ \t]*)\$/g, ' ');

  // 3. Convert unicode math symbols to standard LaTeX
  text = text.replace(/±/g, '\\pm ');
  text = text.replace(/×/g, '\\times ');
  text = text.replace(/÷/g, '\\div ');
  text = text.replace(/≠/g, '\\neq ');
  text = text.replace(/≤/g, '\\le ');
  text = text.replace(/≥/g, '\\ge ');
  text = text.replace(/²/g, '^2');
  text = text.replace(/³/g, '^3');
  text = text.replace(/⁴/g, '^4');
  text = text.replace(/⁻¹/g, '^{-1}');

  // Convert Unicode roots like √(b^2 - 4ac) or √4 -> \sqrt{...}
  text = text.replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}');
  text = text.replace(/√\s*([0-9a-zA-Z]+)/g, '\\sqrt{$1}');

  // 4. Standardize \\[ ... \\] to $$ ... $$ and \\( ... \\) to $ ... $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

  // 4.1. Standardize parenthesized math expressions like ($T = p \cdot q$), ($...$), ($$...$$)
  // or ( $T = p \cdot q$ ) or [ $T = p \cdot q$ ]
  // Brings parentheses INSIDE LaTeX delimiters so $(T = p \cdot q)$ is rendered as a unified KaTeX formula
  text = text.replace(/\(\s*\$([^\$\n]+?)\$\s*\)/g, (_, math) => `$(${math.trim()})$`);
  text = text.replace(/\[\s*\$([^\$\n]+?)\$\s*\]/g, (_, math) => `$[${math.trim()}]$`);
  text = text.replace(/\(\s*\$\$([\s\S]*?)\$\$\s*\)/g, (_, math) => `\n$$\n(${math.trim()})\n$$\n`);

  // 4.2 Standardize parenthesized equations without dollar signs: (T = p \cdot q) or (A = b \cdot h)
  text = text.replace(/\(\s*([a-zA-Z](?:_[a-zA-Z0-9]+)?\s*=\s*[^()\n]+?(?:\\cdot|\\times|⋅|×|\+|-|\/|\*|\^|\\frac|\\sqrt)[^()\n]*?)\s*\)/g, (full, math) => {
    if (isNaturalLanguageText(math)) return full;
    return `$(${math.trim()})$`;
  });

  // 5. Protect existing $$ ... $$ and $ ... $ blocks
  const protectedMath: { content: string; isBlock: boolean }[] = [];
  const protect = (mathContent: string, isBlock = false): string => {
    const trimmed = mathContent.trim();
    if (!trimmed) return '';
    // Prevent nesting: if trimmed already starts and ends with a token, avoid wrapping again
    if (/^@@MATH_TOKEN_\d+@@$/.test(trimmed)) return trimmed;
    const idx = protectedMath.length;
    protectedMath.push({ content: trimmed, isBlock });
    return `@@MATH_TOKEN_${idx}@@`;
  };

  // Protect block math ($$ ... $$)
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
    if (!inner.trim()) return '';
    return protect(inner, true);
  });

  // Protect inline math ($ ... $)
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return '';
    // If the content is purely natural language words without any math symbols, don't wrap as math
    if (isNaturalLanguageText(trimmed) && !/\\|[=+\-*/^<>]/.test(trimmed)) {
      return trimmed;
    }
    return protect(trimmed, false);
  });

  // 6. Scan line by line for unwrapped formulas, equations, or expressions
  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    let l = line;
    if (!l.trim()) return l;

    // A. Check for list prefix: "- ", "* ", "1. ", etc.
    const listMatch = l.match(/^(\s*(?:[-*+]|\d+\.)\s+)(.*)$/);
    const listPrefix = listMatch ? listMatch[1] : '';
    let content = listMatch ? listMatch[2] : l;

    // B. Check for label prefix: "**Vértice:** ", "Vértice: ", "Fórmula: ", etc.
    const labelMatch = content.match(/^((?:\*\*)?[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s()_-]+(?:\*\*)?:\s*)(.*)$/);
    const labelPrefix = labelMatch ? labelMatch[1] : '';
    let mathCandidate = labelMatch ? labelMatch[2].trim() : content.trim();

    // Check if mathCandidate is an isolated mathematical equation:
    const hasTokens = mathCandidate.includes('@@');
    const isPureCandidate = !isNaturalLanguageText(mathCandidate);
    const hasEqualsOrRel = /=|<|>|\\le|\\ge|\\neq|\\pm/.test(mathCandidate);
    const hasMathVars = /[a-zA-Z]/.test(mathCandidate);

    if (!hasTokens && isPureCandidate && hasEqualsOrRel && hasMathVars && mathCandidate.length >= 3 && mathCandidate.length <= 150) {
      // It's a clean standalone math equation!
      if (!listPrefix && !labelPrefix) {
        return protect(mathCandidate, true);
      } else {
        return `${listPrefix}${labelPrefix}${protect(mathCandidate, false)}`;
      }
    }

    // Process inline expressions within content
    let processedContent = content;

    // Pattern 1: Fractions like \frac{...}{...} or x = \frac{...}{...}
    const fracPattern = new RegExp(
      `(?:(?:[a-zA-Z](?:_[a-zA-Z0-9]+|\\^[a-zA-Z0-9]+)?|\\\\[a-zA-Z]+)\\s*=\\s*)?\\\\frac\\s*${nestedGroup}\\s*${nestedGroup}`,
      'g'
    );
    processedContent = processedContent.replace(fracPattern, (m) => {
      if (m.includes('@@')) return m;
      return protect(m, false);
    });

    // Pattern 2: Delta expressions: \Delta = b^2 - 4ac, \Delta > 0, etc.
    const deltaRegex = /(?:\\Delta|Δ)(?:\s*(?:=|<|>|\\le|\\ge|\\neq)\s*[-+0-9a-zA-Z_\^\(\)\{\}\\\/]+(?:\s*[-+*\/]\s*[-+0-9a-zA-Z_\^\(\)\{\}\\\/]+)*)?/g;
    processedContent = processedContent.replace(deltaRegex, (m) => {
      if (m.includes('@@')) return m;
      const normalizedM = m.replace(/Δ/g, '\\Delta');
      return protect(normalizedM, false);
    });

    // Pattern 3: Sqrt expressions: \sqrt{...} or \pm \sqrt{...}
    const sqrtPattern = new RegExp(
      `(?:(?:\\\\pm|[+\\-])\\s*)?\\\\sqrt(?:\\[[^\\]]*\\])?\\s*${nestedGroup}`,
      'g'
    );
    processedContent = processedContent.replace(sqrtPattern, (m) => {
      if (m.includes('@@')) return m;
      return protect(m, false);
    });

    // Pattern 4: Function notation: f(x) = ..., g(x) = ..., f(h) = ...
    const functionNotationRegex = /\b([fgphFGPH])\(([a-zA-Z0-9_]+)\)\s*=\s*([a-zA-Z0-9_\^+\-*/\s().]+)(?=[,.;\s]|$)/g;
    processedContent = processedContent.replace(functionNotationRegex, (match, fn, arg, body) => {
      if (match.includes('@@')) return match;
      if (isNaturalLanguageText(body)) return match;
      return protect(`${fn}(${arg}) = ${body.trim()}`, false);
    });

    // Pattern 5: Coordinate points: V(h, k), V(2, -1), (3, 0), (0, 3)
    const coordinateRegex = /\b([VvA-Za-z])?\((-?\d+(?:\.\d+)?|-?[a-zA-Z]),\s*(-?\d+(?:\.\d+)?|-?[a-zA-Z])\)/g;
    processedContent = processedContent.replace(coordinateRegex, (match) => {
      if (match.includes('@@')) return match;
      return protect(match, false);
    });

    // Pattern 5.4: Multiplication equations with \cdot or \times or ⋅ or × (e.g. "T = p \cdot q", "I = C \cdot r \cdot t")
    const cdotEqRegex = /(?:^|(?<=[\s(]))([a-zA-Z](?:_[a-zA-Z0-9]+)?\s*=\s*[-+0-9a-zA-Z_()^.]+(?:\s*(?:\\cdot|\\times|⋅|×)\s*[-+0-9a-zA-Z_()^.]+)+)(?=[,.;\s)]|$)/g;
    processedContent = processedContent.replace(cdotEqRegex, (match) => {
      if (match.includes('@@')) return match;
      if (isNaturalLanguageText(match)) return match;
      return protect(match.trim(), false);
    });

    // Pattern 5.5: Multi-term arithmetic / algebra equations with \cdot, \times, =, etc.
    // e.g. "I = 50,000 \cdot 0.085 \cdot 5 = 21,250" or "A = b \cdot h = 10 \cdot 5 = 50"
    const multiTermEqRegex = /\b([a-zA-Z](?:_[0-9a-zA-Z]+)?\s*=\s*(?:[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?|[a-zA-Z](?:_[0-9a-zA-Z]+)?|\\cdot|\\times|⋅|×|\s*[-+*\/=]\s*|\s*[\(\)]\s*){2,})/g;
    processedContent = processedContent.replace(multiTermEqRegex, (match) => {
      if (match.includes('@@')) return match;
      if (isNaturalLanguageText(match)) return match;
      return protect(match.trim(), false);
    });

    // Pattern 5.6: Multiplication terms like "p \cdot q", "2 \cdot \pi \cdot r", "m \cdot a"
    const cdotTermRegex = /(?:^|(?<=[\s(]))([a-zA-Z0-9_()]+(?:\^[0-9a-zA-Z]+)?\s*(?:\\cdot|\\times|⋅|×)\s*[a-zA-Z0-9_()]+(?:\^[0-9a-zA-Z]+)?(?:\s*(?:\\cdot|\\times|⋅|×)\s*[a-zA-Z0-9_()]+(?:\^[0-9a-zA-Z]+)?)*)(?=[,.;\s)]|$)/g;
    processedContent = processedContent.replace(cdotTermRegex, (match) => {
      if (match.includes('@@')) return match;
      if (isNaturalLanguageText(match)) return match;
      return protect(match.trim(), false);
    });

    // Pattern 6: Variable assignments like "a = 1", "b = -4", "c = 3", "x = 2", "y = -1", "x = -b/(2a)"
    const varAssignRegex = /\b([a-zA-Z](?:_[0-9a-zA-Z]+)?)\s*=\s*(-?\d+(?:\.\d+)?|-?[a-zA-Z0-9_()+\-*/^]+)(?=[,.;\s]|$)/g;
    processedContent = processedContent.replace(varAssignRegex, (match) => {
      if (match.includes('@@')) return match;
      return protect(match, false);
    });

    // Pattern 6.5: Algebraic / polynomial equations like "ax^2 + bx + c = 0" or "x^2 - 4x + 3 = 0" or "y = 2x + 1"
    const polyEqRegex = /\b([a-zA-Z0-9_()]+(?:\^[0-9]+)?(?:\s*[-+*\/]\s*[a-zA-Z0-9_()]+(?:\^[0-9]+)?)*\s*=\s*[-+0-9a-zA-Z_()]+(?:\^[0-9]+)?(?:\s*[-+*\/]\s*[a-zA-Z0-9_()]+(?:\^[0-9]+)?)*)(?=[,.;\s]|$)/g;
    processedContent = processedContent.replace(polyEqRegex, (match) => {
      if (match.includes('@@')) return match;
      if (isNaturalLanguageText(match)) return match;
      if (!/[a-zA-Z]/.test(match) || !/=/.test(match)) return match;
      return protect(match.trim(), false);
    });

    // Pattern 7: Exponent variables: x^2, y^3, (x - 2)^2
    const exponentRegex = /\b([a-zA-Z]|\([a-zA-Z0-9_\s+-]+\))\^([a-zA-Z0-9_-]+|\([^\)]+\))/g;
    processedContent = processedContent.replace(exponentRegex, (match) => {
      if (match.includes('@@')) return match;
      return protect(match, false);
    });

    // Pattern 8: Subscript variables: x_1, x_2, y_0, a_n
    const subscriptRegex = /\b([a-zA-Z])_([0-9a-zA-Z]+|\{[0-9a-zA-Z]+\})/g;
    processedContent = processedContent.replace(subscriptRegex, (match) => {
      if (match.includes('@@')) return match;
      return protect(match, false);
    });

    // Pattern 9: Any remaining LaTeX commands: \pm, \times, \div, \alpha, etc.
    const generalLatex = /\\[a-zA-Z]+(?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?(?:\{[^{}]*\})?/g;
    processedContent = processedContent.replace(generalLatex, (m) => {
      if (m.includes('@@')) return m;
      return protect(m, false);
    });

    return listPrefix ? `${listPrefix}${processedContent}` : processedContent;
  });

  text = processedLines.join('\n');

  // 7. Restore protected tokens recursively to handle any nesting
  let restorePasses = 0;
  while (text.includes('@@MATH_TOKEN_') && restorePasses++ < 10) {
    text = text.replace(/@@MATH_TOKEN_(\d+)@@/g, (_, idx) => {
      const item = protectedMath[Number(idx)];
      if (!item || !item.content) return '';
      if (item.isBlock) {
        return `\n$$\n${item.content}\n$$\n`;
      }
      return `$${item.content}$`;
    });
  }

  // Clear any corrupted or orphaned leftover tokens
  text = text.replace(/@@MATH_TOKEN_\d+@@/g, '');

  // 8. Restore protected Dominican currency
  text = text.replace(/@@DOM_CURR_(\d+)@@/g, (_, idx) => {
    return protectedCurrency[Number(idx)] || '';
  });

  return text;
}

/**
 * Render inline tokens: bold, italic, inline math ($...$), code, plain text
 */
function parseInlineContent(
  text: string,
  keyPrefix: string
): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Token regex for:
  // 1. Inline math: $...$ (must not be empty, must not span across newlines)
  // 2. Bold: **...** or __...__
  // 3. Italic: *...* or _..._
  // 4. Code: `...`
  // 5. Strikethrough: ~~...~~
  const tokenRegex = /(\$([^\$\n]+?)\$)|\*\*([^\*]+?)\*\*|__([^_]+?)__|(?:\*([^\*]+?)\*)|(?:_([^_]+?)_)|`([^`]+?)`|~~([^~]+?)~~/;

  while (remaining) {
    const match = remaining.match(tokenRegex);
    if (!match || match.index === undefined) {
      nodes.push(<React.Fragment key={`${keyPrefix}-t-${keyIdx++}`}>{remaining}</React.Fragment>);
      break;
    }

    // Text before match
    if (match.index > 0) {
      const before = remaining.substring(0, match.index);
      nodes.push(<React.Fragment key={`${keyPrefix}-t-${keyIdx++}`}>{before}</React.Fragment>);
    }

    const matchedStr = match[0];

    // Case 1: Inline Math $...$
    if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      const math = match[2];
      // If math has natural language words and no math operators/escapes, render as normal text
      if (isNaturalLanguageText(math) && !/\\|[=+\-*/^<>]/.test(math)) {
        nodes.push(<React.Fragment key={`${keyPrefix}-t-${keyIdx++}`}>{math}</React.Fragment>);
      } else {
        nodes.push(
          <MathFormula
            key={`${keyPrefix}-m-${keyIdx++}`}
            formula={math}
            displayMode={false}
          />
        );
      }
    }
    // Case 2: Bold **...** or __...__
    else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      const inner = match[3];
      nodes.push(
        <strong key={`${keyPrefix}-b-${keyIdx++}`} className="font-bold text-inherit">
          {parseInlineContent(inner, `${keyPrefix}-b-sub-${keyIdx}`)}
        </strong>
      );
    } else if (matchedStr.startsWith('__') && matchedStr.endsWith('__')) {
      const inner = match[4];
      nodes.push(
        <strong key={`${keyPrefix}-b-${keyIdx++}`} className="font-bold text-inherit">
          {parseInlineContent(inner, `${keyPrefix}-b-sub-${keyIdx}`)}
        </strong>
      );
    }
    // Case 3: Italic *...* or _..._
    else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      const inner = match[5];
      nodes.push(
        <em key={`${keyPrefix}-i-${keyIdx++}`} className="italic text-inherit">
          {parseInlineContent(inner, `${keyPrefix}-i-sub-${keyIdx}`)}
        </em>
      );
    } else if (matchedStr.startsWith('_') && matchedStr.endsWith('_')) {
      const inner = match[6];
      nodes.push(
        <em key={`${keyPrefix}-i-${keyIdx++}`} className="italic text-inherit">
          {parseInlineContent(inner, `${keyPrefix}-i-sub-${keyIdx}`)}
        </em>
      );
    }
    // Case 4: Inline Code `...`
    else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      const inner = match[7];
      nodes.push(
        <code
          key={`${keyPrefix}-c-${keyIdx++}`}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900/10 text-emerald-800 dark:text-emerald-300 font-semibold"
        >
          {inner}
        </code>
      );
    }
    // Case 5: Strikethrough ~~...~~
    else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
      const inner = match[8];
      nodes.push(
        <del key={`${keyPrefix}-d-${keyIdx++}`} className="line-through text-slate-400">
          {parseInlineContent(inner, `${keyPrefix}-d-sub-${keyIdx}`)}
        </del>
      );
    }

    remaining = remaining.substring(match.index + matchedStr.length);
  }

  return nodes;
}

/**
 * Full Markdown + Math component that supports block math $$...$$,
 * inline math $...$, lists, quotes, headings, and bold/italics.
 */
interface MathMarkdownProps {
  content: string;
  className?: string;
}

export const MathMarkdown: React.FC<MathMarkdownProps> = ({
  content,
  className = '',
}) => {
  const normalized = useMemo(() => normalizeMathInText(content), [content]);

  // Split content by $$ ... $$ blocks
  const parts = useMemo(() => {
    const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const pieces: { type: 'text' | 'math'; content: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = displayMathRegex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        pieces.push({
          type: 'text',
          content: normalized.substring(lastIndex, match.index),
        });
      }
      const mathContent = match[1].trim();
      if (mathContent) {
        pieces.push({
          type: 'math',
          content: mathContent,
        });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < normalized.length) {
      pieces.push({
        type: 'text',
        content: normalized.substring(lastIndex),
      });
    }

    return pieces;
  }, [normalized]);

  return (
    <div className={`math-markdown leading-relaxed space-y-2.5 ${className}`}>
      {parts.map((part, partIdx) => {
        if (part.type === 'math') {
          return (
            <MathFormula
              key={`block-math-${partIdx}`}
              formula={part.content}
              displayMode={true}
              showCopy={true}
            />
          );
        }

        // Parse standard markdown text block into paragraphs, lists, headers, etc.
        const lines = part.content.split('\n');
        const renderedBlocks: React.ReactNode[] = [];
        let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

        const flushList = (keySuffix: number) => {
          if (!listBuffer) return;
          if (listBuffer.type === 'ul') {
            renderedBlocks.push(
              <ul
                key={`ul-${partIdx}-${keySuffix}`}
                className="list-disc list-outside pl-5 space-y-1.5 my-2 text-slate-800"
              >
                {listBuffer.items.map((item, itemIdx) => (
                  <li key={`li-${itemIdx}`}>
                    {parseInlineContent(item, `li-${partIdx}-${keySuffix}-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );
          } else {
            renderedBlocks.push(
              <ol
                key={`ol-${partIdx}-${keySuffix}`}
                className="list-decimal list-outside pl-5 space-y-1.5 my-2 text-slate-800"
              >
                {listBuffer.items.map((item, itemIdx) => (
                  <li key={`oli-${itemIdx}`}>
                    {parseInlineContent(item, `oli-${partIdx}-${keySuffix}-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );
          }
          listBuffer = null;
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();

          // Empty line
          if (!trimmed) {
            flushList(lineIdx);
            return;
          }

          // Unordered list item
          const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
          if (ulMatch) {
            if (listBuffer && listBuffer.type !== 'ul') {
              flushList(lineIdx);
            }
            if (!listBuffer) {
              listBuffer = { type: 'ul', items: [] };
            }
            listBuffer.items.push(ulMatch[1]);
            return;
          }

          // Ordered list item
          const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
          if (olMatch) {
            if (listBuffer && listBuffer.type !== 'ol') {
              flushList(lineIdx);
            }
            if (!listBuffer) {
              listBuffer = { type: 'ol', items: [] };
            }
            listBuffer.items.push(olMatch[1]);
            return;
          }

          // Not a list item: flush any pending list
          flushList(lineIdx);

          // Headings
          if (trimmed.startsWith('### ')) {
            renderedBlocks.push(
              <h4
                key={`h3-${lineIdx}`}
                className="font-bold text-slate-900 text-sm mt-3 mb-1"
              >
                {parseInlineContent(trimmed.slice(4), `h3-${partIdx}-${lineIdx}`)}
              </h4>
            );
            return;
          }
          if (trimmed.startsWith('## ')) {
            renderedBlocks.push(
              <h3
                key={`h2-${lineIdx}`}
                className="font-bold text-slate-900 text-base mt-3.5 mb-1.5 border-b border-slate-100 pb-1"
              >
                {parseInlineContent(trimmed.slice(3), `h2-${partIdx}-${lineIdx}`)}
              </h3>
            );
            return;
          }
          if (trimmed.startsWith('# ')) {
            renderedBlocks.push(
              <h2
                key={`h1-${lineIdx}`}
                className="font-extrabold text-slate-900 text-lg mt-4 mb-2"
              >
                {parseInlineContent(trimmed.slice(2), `h1-${partIdx}-${lineIdx}`)}
              </h2>
            );
            return;
          }

          // Blockquote
          if (trimmed.startsWith('> ')) {
            renderedBlocks.push(
              <blockquote
                key={`bq-${lineIdx}`}
                className="pl-3 border-l-3 border-blue-500 italic text-slate-600 my-2"
              >
                {parseInlineContent(trimmed.slice(2), `bq-${partIdx}-${lineIdx}`)}
              </blockquote>
            );
            return;
          }

          // Regular paragraph
          renderedBlocks.push(
            <p key={`p-${lineIdx}`} className="my-1.5 text-slate-800">
              {parseInlineContent(trimmed, `p-${partIdx}-${lineIdx}`)}
            </p>
          );
        });

        // Flush any remaining list at the end of the text block
        flushList(lines.length);

        return <React.Fragment key={`block-${partIdx}`}>{renderedBlocks}</React.Fragment>;
      })}
    </div>
  );
};

/**
 * Safe component to render procedural step formulaOrCode.
 * If pure math, renders KaTeX display block with copy button.
 * If contains natural language text, renders via MathMarkdown without letter breakage.
 */
export const StepFormulaView: React.FC<{
  formulaOrCode?: string;
  className?: string;
}> = ({ formulaOrCode, className = '' }) => {
  if (!formulaOrCode || !formulaOrCode.trim()) return null;
  const trimmed = formulaOrCode.trim();

  // If it's a pure math formula (no natural language words), render KaTeX formula
  if (!isNaturalLanguageText(trimmed)) {
    return (
      <div className={`mt-1.5 ${className}`}>
        <MathFormula
          formula={trimmed}
          displayMode={true}
          showCopy={true}
        />
      </div>
    );
  }

  // If it has natural language text/sentences, render via MathMarkdown
  return (
    <div className={`mt-1.5 p-3 rounded-xl bg-slate-900/[0.03] border border-slate-200/90 text-xs text-slate-800 leading-relaxed font-sans ${className}`}>
      <MathMarkdown content={trimmed} />
    </div>
  );
};

export { LaTeXRenderer } from './LaTeXRenderer';

