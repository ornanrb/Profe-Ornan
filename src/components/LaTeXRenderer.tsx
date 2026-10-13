import React, { useMemo, useState } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';
import { cleanFormulaString, isNaturalLanguageText, normalizeMathInText } from './MathRenderer';

export interface LaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * Safe Inline Math component using react-katex with error fallback
 */
export const SafeInlineMath: React.FC<{ math: string; className?: string }> = ({
  math,
  className = '',
}) => {
  const cleaned = useMemo(() => cleanFormulaString(math), [math]);

  if (!cleaned) return null;

  try {
    return (
      <span className={`inline-math-wrapper inline-block mx-0.5 align-baseline ${className}`}>
        <InlineMath math={cleaned} />
      </span>
    );
  } catch (err) {
    // Graceful fallback to katex string rendering or clean code
    try {
      const html = katex.renderToString(cleaned, { displayMode: false, throwOnError: false });
      return (
        <span
          className={`inline-math-wrapper inline-block mx-0.5 align-baseline ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return (
        <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
          {cleaned}
        </code>
      );
    }
  }
};

/**
 * Safe Block Math component using react-katex with copy button and error fallback
 */
export const SafeBlockMath: React.FC<{
  math: string;
  className?: string;
  showCopy?: boolean;
}> = ({ math, className = '', showCopy = true }) => {
  const [copied, setCopied] = useState(false);
  const cleaned = useMemo(() => cleanFormulaString(math), [math]);

  if (!cleaned) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let mathElement: React.ReactNode;
  try {
    mathElement = <BlockMath math={cleaned} />;
  } catch {
    try {
      const html = katex.renderToString(cleaned, { displayMode: true, throwOnError: false });
      mathElement = <div dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      mathElement = (
        <pre className="font-mono text-xs overflow-x-auto text-slate-800 p-2">
          {cleaned}
        </pre>
      );
    }
  }

  return (
    <div
      className={`katex-display-wrapper relative my-3 p-3.5 rounded-xl bg-slate-900/[0.03] dark:bg-slate-900/30 border border-slate-200/90 dark:border-slate-800 overflow-x-auto group transition-all hover:border-blue-300 ${className}`}
    >
      <div className="flex items-center justify-center min-w-full text-slate-900 dark:text-slate-100 py-1">
        {mathElement}
      </div>

      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-2xs text-xs flex items-center gap-1 cursor-pointer"
          title="Copiar fórmula LaTeX"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] text-emerald-600 font-medium">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Copiar</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

/**
 * Tokenizes inline text to parse $...$ math, bold, italic, code, and plain text
 */
function parseInlineLatex(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. Math: $ ... $ (excluding currency like RD$ 500)
  // 2. Bold: **...** or __...__
  // 3. Italic: *...* or _..._
  // 4. Code: `...`
  // 5. Strikethrough: ~~...~~
  const regex = /(\$([^\$\n]+?)\$)|(\*\*([^*]+?)\*\*)|(__([^_]+?)__)|(\*([^*]+?)\*)|(_([^_]+?)_)|(`([^`]+?)`)|(~~([^~]+?)~~)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-t-${keyIdx++}`}>
          {text.substring(lastIndex, match.index)}
        </React.Fragment>
      );
    }

    const matchedStr = match[0];

    // Case 1: Math $...$
    if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      const math = match[2];
      // If purely natural language and not a formula, display as text
      if (isNaturalLanguageText(math)) {
        nodes.push(<React.Fragment key={`${keyPrefix}-t-${keyIdx++}`}>{math}</React.Fragment>);
      } else {
        nodes.push(
          <SafeInlineMath key={`${keyPrefix}-m-${keyIdx++}`} math={math} />
        );
      }
    }
    // Case 2: Bold
    else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      const inner = match[4];
      nodes.push(
        <strong key={`${keyPrefix}-b-${keyIdx++}`} className="font-bold text-inherit">
          {parseInlineLatex(inner, `${keyPrefix}-b-sub-${keyIdx}`)}
        </strong>
      );
    } else if (matchedStr.startsWith('__') && matchedStr.endsWith('__')) {
      const inner = match[6];
      nodes.push(
        <strong key={`${keyPrefix}-b-${keyIdx++}`} className="font-bold text-inherit">
          {parseInlineLatex(inner, `${keyPrefix}-b-sub-${keyIdx}`)}
        </strong>
      );
    }
    // Case 3: Italic
    else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      const inner = match[8];
      nodes.push(
        <em key={`${keyPrefix}-i-${keyIdx++}`} className="italic text-inherit">
          {parseInlineLatex(inner, `${keyPrefix}-i-sub-${keyIdx}`)}
        </em>
      );
    } else if (matchedStr.startsWith('_') && matchedStr.endsWith('_')) {
      const inner = match[10];
      nodes.push(
        <em key={`${keyPrefix}-i-${keyIdx++}`} className="italic text-inherit">
          {parseInlineLatex(inner, `${keyPrefix}-i-sub-${keyIdx}`)}
        </em>
      );
    }
    // Case 4: Inline Code
    else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      const inner = match[12];
      nodes.push(
        <code
          key={`${keyPrefix}-c-${keyIdx++}`}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-900/10 text-emerald-800 dark:text-emerald-300 font-semibold"
        >
          {inner}
        </code>
      );
    }
    // Case 5: Strikethrough
    else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
      const inner = match[14];
      nodes.push(
        <del key={`${keyPrefix}-d-${keyIdx++}`} className="line-through text-slate-400">
          {parseInlineLatex(inner, `${keyPrefix}-d-sub-${keyIdx}`)}
        </del>
      );
    }

    lastIndex = match.index + matchedStr.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <React.Fragment key={`${keyPrefix}-t-end`}>
        {text.substring(lastIndex)}
      </React.Fragment>
    );
  }

  return nodes;
}

/**
 * LaTeXRenderer Component:
 * Detects and automatically renders LaTeX expressions (both $$...$$ and $...$,
 * as well as parenthesized formulas like ($T = p \cdot q$)) using react-katex.
 */
export const LaTeXRenderer: React.FC<LaTeXRendererProps> = ({
  content,
  className = '',
  displayMode = false,
}) => {
  if (!content) return null;

  // If displayMode is forced and content is a single formula
  if (displayMode) {
    return <SafeBlockMath math={content} className={className} />;
  }

  // Preprocess & normalize formulas, e.g. ($T = p \cdot q$) -> $\left(T = p \cdot q\right)$
  const normalized = useMemo(() => normalizeMathInText(content), [content]);

  // Split content by display math blocks $$...$$
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
    <div className={`latex-renderer leading-relaxed space-y-2.5 ${className}`}>
      {parts.map((part, partIdx) => {
        if (part.type === 'math') {
          return (
            <SafeBlockMath
              key={`block-math-${partIdx}`}
              math={part.content}
              showCopy={true}
            />
          );
        }

        // Break text part into lines and handle markdown paragraphs/lists
        const lines = part.content.split('\n');
        const renderedBlocks: React.ReactNode[] = [];
        let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

        const flushList = (keySuffix: number) => {
          if (!listBuffer) return;
          if (listBuffer.type === 'ul') {
            renderedBlocks.push(
              <ul
                key={`ul-${partIdx}-${keySuffix}`}
                className="list-disc list-outside pl-5 space-y-1.5 my-2 text-inherit"
              >
                {listBuffer.items.map((item, itemIdx) => (
                  <li key={`li-${itemIdx}`}>
                    {parseInlineLatex(item, `li-${partIdx}-${keySuffix}-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );
          } else {
            renderedBlocks.push(
              <ol
                key={`ol-${partIdx}-${keySuffix}`}
                className="list-decimal list-outside pl-5 space-y-1.5 my-2 text-inherit"
              >
                {listBuffer.items.map((item, itemIdx) => (
                  <li key={`oli-${itemIdx}`}>
                    {parseInlineLatex(item, `oli-${partIdx}-${keySuffix}-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );
          }
          listBuffer = null;
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();

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

          flushList(lineIdx);

          // Headings
          if (trimmed.startsWith('### ')) {
            renderedBlocks.push(
              <h4 key={`h3-${lineIdx}`} className="font-bold text-slate-900 text-sm mt-3 mb-1">
                {parseInlineLatex(trimmed.slice(4), `h3-${partIdx}-${lineIdx}`)}
              </h4>
            );
            return;
          }
          if (trimmed.startsWith('## ')) {
            renderedBlocks.push(
              <h3 key={`h2-${lineIdx}`} className="font-bold text-slate-900 text-base mt-3.5 mb-1.5 border-b border-slate-100 pb-1">
                {parseInlineLatex(trimmed.slice(3), `h2-${partIdx}-${lineIdx}`)}
              </h3>
            );
            return;
          }
          if (trimmed.startsWith('# ')) {
            renderedBlocks.push(
              <h2 key={`h1-${lineIdx}`} className="font-extrabold text-slate-900 text-lg mt-4 mb-2">
                {parseInlineLatex(trimmed.slice(2), `h1-${partIdx}-${lineIdx}`)}
              </h2>
            );
            return;
          }

          // Blockquote
          if (trimmed.startsWith('> ')) {
            renderedBlocks.push(
              <blockquote key={`bq-${lineIdx}`} className="pl-3 border-l-3 border-blue-500 italic text-slate-600 my-2">
                {parseInlineLatex(trimmed.slice(2), `bq-${partIdx}-${lineIdx}`)}
              </blockquote>
            );
            return;
          }

          // Regular paragraph
          renderedBlocks.push(
            <p key={`p-${lineIdx}`} className="my-1.5 text-inherit">
              {parseInlineLatex(trimmed, `p-${partIdx}-${lineIdx}`)}
            </p>
          );
        });

        flushList(lines.length);

        return <React.Fragment key={`block-${partIdx}`}>{renderedBlocks}</React.Fragment>;
      })}
    </div>
  );
};

export default LaTeXRenderer;
