import React, { useState, useMemo, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Table as TableIcon,
  Calculator,
  Download,
  Sparkles,
  Info,
  ChevronRight,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { GraphPlotArtifactData, PlotFunctionCurve, PlotPoint } from '../types';
import { MathFormula, MathMarkdown } from './MathRenderer';

interface GraphPlotterProps {
  data: GraphPlotArtifactData;
  onAskAboutGraph?: (question: string) => void;
}

/**
 * Safely evaluates a math expression string for a given x value.
 * Converts common notation: x^2 -> (x**2), 4x -> 4*x, sen/sin, etc.
 */
export function evaluateMathExpression(expr: string, x: number): number {
  if (!expr || typeof expr !== 'string') return NaN;
  try {
    let sanitized = expr.trim();

    // Replace unicode minus or multiplication
    sanitized = sanitized.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');

    // Replace implicit multiplication like 4x -> 4*x or 2(x) -> 2*(x)
    sanitized = sanitized.replace(/(\d)\s*([a-zA-Z\(])/g, '$1*$2');
    sanitized = sanitized.replace(/(\))\s*([a-zA-Z\d\(])/g, '$1*$2');

    // Replace power notation x^2 -> (x)**2
    sanitized = sanitized.replace(/([a-zA-Z0-9_\)]+)\^([a-zA-Z0-9_\-]+|\([^\)]+\))/g, 'Math.pow($1, $2)');

    // Replace common math functions
    sanitized = sanitized.replace(/\bsen\b/g, 'Math.sin');
    sanitized = sanitized.replace(/\bsin\b/g, 'Math.sin');
    sanitized = sanitized.replace(/\bcos\b/g, 'Math.cos');
    sanitized = sanitized.replace(/\btan\b/g, 'Math.tan');
    sanitized = sanitized.replace(/\bsqrt\b/g, 'Math.sqrt');
    sanitized = sanitized.replace(/\babs\b/g, 'Math.abs');
    sanitized = sanitized.replace(/\bln\b/g, 'Math.log');
    sanitized = sanitized.replace(/\bexp\b/g, 'Math.exp');
    sanitized = sanitized.replace(/\bpi\b/gi, 'Math.PI');
    sanitized = sanitized.replace(/\be\b/g, 'Math.E');

    // Evaluate in safe function context with x injected
    const fn = new Function('x', 'Math', `"use strict"; return (${sanitized});`);
    const res = fn(x, Math);
    return typeof res === 'number' && !isNaN(res) && isFinite(res) ? res : NaN;
  } catch (err) {
    return NaN;
  }
}

export const GraphPlotter: React.FC<GraphPlotterProps> = ({ data, onAskAboutGraph }) => {
  // Viewport domain / range state
  const [domain, setDomain] = useState({
    xMin: data.xMin ?? -6,
    xMax: data.xMax ?? 6,
    yMin: data.yMin ?? -6,
    yMax: data.yMax ?? 6,
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'graph' | 'table' | 'analysis' | 'custom'>('graph');

  // Parabola / curve interactive parameter values (e.g. a, b, c)
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (data.interactiveSliders && data.interactiveSliders.length > 0) {
      data.interactiveSliders.forEach((s) => {
        init[s.param] = s.defaultValue;
      });
    } else if (data.plotType === 'parabola') {
      init['a'] = 1;
      init['b'] = -4;
      init['c'] = 3;
    }
    return init;
  });

  // Toggles for visual guidelines
  const [showGrid, setShowGrid] = useState(true);
  const [showAxisOfSymmetry, setShowAxisOfSymmetry] = useState(true);
  const [showKeyPoints, setShowKeyPoints] = useState(true);
  const [showFocusDirectrix, setShowFocusDirectrix] = useState(false);

  // Custom user function input
  const [customFunctionExpr, setCustomFunctionExpr] = useState('');
  const [customCurves, setCustomCurves] = useState<PlotFunctionCurve[]>([]);

  // Hover coordinate state
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Canvas coordinate mapping dimensions
  const width = 500;
  const height = 380;
  const padding = 40;

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setDomain((prev) => {
      const xSpan = (prev.xMax - prev.xMin) * factor;
      const ySpan = (prev.yMax - prev.yMin) * factor;
      const xMid = (prev.xMax + prev.xMin) / 2;
      const yMid = (prev.yMax + prev.yMin) / 2;
      return {
        xMin: Number((xMid - xSpan / 2).toFixed(2)),
        xMax: Number((xMid + xSpan / 2).toFixed(2)),
        yMin: Number((yMid - ySpan / 2).toFixed(2)),
        yMax: Number((yMid + ySpan / 2).toFixed(2)),
      };
    });
  };

  const handleResetView = () => {
    setDomain({
      xMin: data.xMin ?? -6,
      xMax: data.xMax ?? 6,
      yMin: data.yMin ?? -6,
      yMax: data.yMax ?? 6,
    });
  };

  // Convert mathematical coordinate (x, y) to SVG pixel coordinate (px, py)
  const mathToSvg = (x: number, y: number): { px: number; py: number } => {
    const px = padding + ((x - domain.xMin) / (domain.xMax - domain.xMin)) * (width - 2 * padding);
    const py = height - padding - ((y - domain.yMin) / (domain.yMax - domain.yMin)) * (height - 2 * padding);
    return { px, py };
  };

  // Convert SVG pixel coordinate back to math coordinate
  const svgToMath = (px: number, py: number): { x: number; y: number } => {
    const x = domain.xMin + ((px - padding) / (width - 2 * padding)) * (domain.xMax - domain.xMin);
    const y = domain.yMin + ((height - padding - py) / (height - 2 * padding)) * (domain.yMax - domain.yMin);
    return { x, y };
  };

  // Dynamic calculations when sliders are used for a parabola (y = ax^2 + bx + c)
  const isDynamicParabola = data.plotType === 'parabola' && paramValues['a'] !== undefined;
  const dynamicParabolaCalc = useMemo(() => {
    if (!isDynamicParabola) return null;
    const a = paramValues['a'] ?? 1;
    const b = paramValues['b'] ?? 0;
    const c = paramValues['c'] ?? 0;

    // Vertex: h = -b / (2a), k = c - b^2 / (4a)
    const h = a !== 0 ? -b / (2 * a) : 0;
    const k = a !== 0 ? a * h * h + b * h + c : c;

    // Discriminant: Delta = b^2 - 4ac
    const delta = b * b - 4 * a * c;

    // Roots
    let roots: number[] = [];
    if (a !== 0) {
      if (delta > 0) {
        roots = [(-b + Math.sqrt(delta)) / (2 * a), (-b - Math.sqrt(delta)) / (2 * a)].sort((r1, r2) => r1 - r2);
      } else if (Math.abs(delta) < 1e-9) {
        roots = [-b / (2 * a)];
      }
    }

    // Focus and Directrix for vertical parabola
    const p = a !== 0 ? 1 / (4 * a) : 0;
    const focus = { x: h, y: k + p };
    const directrix = k - p;

    return {
      a,
      b,
      c,
      vertex: { x: Number(h.toFixed(2)), y: Number(k.toFixed(2)) },
      discriminant: Number(delta.toFixed(2)),
      roots: roots.map((r) => Number(r.toFixed(2))),
      yIntercept: Number(c.toFixed(2)),
      axisOfSymmetry: Number(h.toFixed(2)),
      concavity: a > 0 ? ('hacia arriba' as const) : ('hacia abajo' as const),
      focus: { x: Number(focus.x.toFixed(2)), y: Number(focus.y.toFixed(2)) },
      directrix: Number(directrix.toFixed(2)),
      expression: `${a !== 1 ? (a === -1 ? '-' : a) : ''}x^2 ${b >= 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`} ${
        c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`
      }`,
    };
  }, [isDynamicParabola, paramValues]);

  // Primary functions to plot
  const activeFunctions = useMemo(() => {
    let list: PlotFunctionCurve[] = [];

    if (isDynamicParabola && dynamicParabolaCalc) {
      const a = dynamicParabolaCalc.a;
      const b = dynamicParabolaCalc.b;
      const c = dynamicParabolaCalc.c;
      list.push({
        id: 'dynamic-parabola',
        expression: `${a}*x*x + ${b}*x + ${c}`,
        latexLabel: `f(x) = ${dynamicParabolaCalc.expression.replace(/\s+/g, ' ')}`,
        color: '#2563eb', // blue-600
        strokeWidth: 3,
      });
    } else if (data.functions && data.functions.length > 0) {
      list = [...data.functions];
    } else if (data.plotType === 'parabola') {
      // Fallback default parabola
      list.push({
        id: 'default-parabola',
        expression: 'x*x - 4*x + 3',
        latexLabel: 'f(x) = x^2 - 4x + 3',
        color: '#2563eb',
        strokeWidth: 3,
      });
    }

    return [...list, ...customCurves];
  }, [isDynamicParabola, dynamicParabolaCalc, data.functions, data.plotType, customCurves]);

  // Generate SVG path for a function curve
  const generateFunctionPath = (fnExpr: string): string => {
    const steps = 240;
    const xStep = (domain.xMax - domain.xMin) / steps;
    let pathD = '';
    let isDrawing = false;

    for (let i = 0; i <= steps; i++) {
      const x = domain.xMin + i * xStep;
      const y = evaluateMathExpression(fnExpr, x);

      // Check for valid number and within reasonable visual boundary
      if (isNaN(y) || y < domain.yMin - 15 || y > domain.yMax + 15) {
        isDrawing = false;
        continue;
      }

      const { px, py } = mathToSvg(x, y);

      if (!isDrawing) {
        pathD += ` M ${px.toFixed(1)} ${py.toFixed(1)}`;
        isDrawing = true;
      } else {
        pathD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
    }

    return pathD;
  };

  // Generate Axis Grid lines and ticks
  const { xTicks, yTicks } = useMemo(() => {
    const xSpan = domain.xMax - domain.xMin;
    const ySpan = domain.yMax - domain.yMin;

    const xStep = xSpan > 20 ? 5 : xSpan > 10 ? 2 : 1;
    const yStep = ySpan > 20 ? 5 : ySpan > 10 ? 2 : 1;

    const xt: number[] = [];
    const firstX = Math.ceil(domain.xMin / xStep) * xStep;
    for (let x = firstX; x <= domain.xMax; x += xStep) {
      xt.push(Number(x.toFixed(2)));
    }

    const yt: number[] = [];
    const firstY = Math.ceil(domain.yMin / yStep) * yStep;
    for (let y = firstY; y <= domain.yMax; y += yStep) {
      yt.push(Number(y.toFixed(2)));
    }

    return { xTicks: xt, yTicks: yt };
  }, [domain]);

  // Key highlighted points (vertex, roots, y-intercept)
  const highlightedPoints = useMemo(() => {
    const pts: PlotPoint[] = [];

    if (isDynamicParabola && dynamicParabolaCalc) {
      // Vertex
      pts.push({
        x: dynamicParabolaCalc.vertex.x,
        y: dynamicParabolaCalc.vertex.y,
        label: `V(${dynamicParabolaCalc.vertex.x}, ${dynamicParabolaCalc.vertex.y})`,
        color: '#dc2626', // rose-600
        description: 'Vértice de la parábola',
      });

      // Roots
      dynamicParabolaCalc.roots.forEach((r, idx) => {
        pts.push({
          x: r,
          y: 0,
          label: `x_${idx + 1}(${r}, 0)`,
          color: '#16a34a', // emerald-600
          description: `Raíz / Corte en X`,
        });
      });

      // Y-intercept
      pts.push({
        x: 0,
        y: dynamicParabolaCalc.yIntercept,
        label: `Y(0, ${dynamicParabolaCalc.yIntercept})`,
        color: '#d97706', // amber-600
        description: 'Corte con el eje Y',
      });
    } else {
      if (data.keyFeatures?.vertex) {
        pts.push({
          x: data.keyFeatures.vertex.x,
          y: data.keyFeatures.vertex.y,
          label: `V(${data.keyFeatures.vertex.x}, ${data.keyFeatures.vertex.y})`,
          color: '#dc2626',
          description: 'Vértice',
        });
      }
      if (data.keyFeatures?.roots) {
        data.keyFeatures.roots.forEach((r, i) => {
          pts.push({
            x: r,
            y: 0,
            label: `x_${i + 1}(${r}, 0)`,
            color: '#16a34a',
            description: 'Corte eje X',
          });
        });
      }
      if (data.keyFeatures?.yIntercept !== undefined) {
        pts.push({
          x: 0,
          y: data.keyFeatures.yIntercept,
          label: `Y(0, ${data.keyFeatures.yIntercept})`,
          color: '#d97706',
          description: 'Corte eje Y',
        });
      }
      if (data.points) {
        pts.push(...data.points);
      }
    }

    return pts;
  }, [isDynamicParabola, dynamicParabolaCalc, data.keyFeatures, data.points]);

  // Values table calculation
  const tableData = useMemo(() => {
    if (activeFunctions.length === 0) return [];
    const primaryFn = activeFunctions[0];
    const rows: { x: number; y: number }[] = [];

    const min = Math.max(-10, Math.floor(domain.xMin));
    const max = Math.min(10, Math.ceil(domain.xMax));

    for (let x = min; x <= max; x++) {
      const y = evaluateMathExpression(primaryFn.expression, x);
      if (!isNaN(y) && isFinite(y)) {
        rows.push({ x, y: Number(y.toFixed(2)) });
      }
    }

    return rows;
  }, [activeFunctions, domain]);

  // Handle adding custom curve
  const handleAddCustomCurve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFunctionExpr.trim()) return;
    const newCurve: PlotFunctionCurve = {
      id: 'custom-' + Date.now(),
      expression: customFunctionExpr.trim(),
      latexLabel: `g(x) = ${customFunctionExpr.trim()}`,
      color: '#9333ea', // purple-600
      strokeWidth: 2.5,
    };
    setCustomCurves((prev) => [...prev, newCurve]);
    setCustomFunctionExpr('');
    setActiveTab('graph');
  };

  // Download SVG
  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `Profe-Ornan-grafica-${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Mouse move handler for interactive coordinate inspection
  const handleMouseMoveOnCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;

    if (px >= padding && px <= width - padding && py >= padding && py <= height - padding) {
      const { x, y } = svgToMath(px, py);
      setHoverCoord({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
    } else {
      setHoverCoord(null);
    }
  };

  // Axis positions in pixels
  const origin = mathToSvg(0, 0);
  const xAxisY = Math.min(Math.max(origin.py, padding), height - padding);
  const yAxisX = Math.min(Math.max(origin.px, padding), width - padding);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <Calculator className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              {data.title || 'Gráfica Matemática en el Plano Cartesiano'}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Representación visual e interactiva • Sistema de Coordenadas MINERD
            </span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownloadSVG}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs flex items-center gap-1"
            title="Descargar imagen SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'graph' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Plano Cartesiano</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'analysis' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Análisis y Fórmulas</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'table' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Tabla de Valores</span>
        </button>

        <button
          onClick={() => setActiveTab('custom')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'custom' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Otra Función</span>
        </button>
      </div>

      {/* 1. TAB: INTERACTIVE GRAPH CANVAS */}
      {activeTab === 'graph' && (
        <div className="space-y-3">
          {/* Active formula display banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900">Ecuación activa:</span>
              <div className="text-sm font-bold text-blue-950">
                <MathFormula
                  formula={
                    activeFunctions[0]?.latexLabel ||
                    `f(x) = ${activeFunctions[0]?.expression || 'x^2'}`
                  }
                  displayMode={false}
                />
              </div>
            </div>

            {/* Live Hover coordinates pill */}
            <div className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-blue-200 text-blue-900 shadow-2xs">
              {hoverCoord ? (
                <span>
                  Coordenadas: (x: {hoverCoord.x}, y: {hoverCoord.y})
                </span>
              ) : (
                <span className="text-slate-400">Pasa el cursor sobre el plano</span>
              )}
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="relative border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden shadow-inner">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-h-[420px] select-none cursor-crosshair block"
              onMouseMove={handleMouseMoveOnCanvas}
              onMouseLeave={() => setHoverCoord(null)}
            >
              <defs>
                {/* Arrowheads for X and Y axes */}
                <marker id="axis-arrow-x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
                </marker>
                <marker id="axis-arrow-y" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 1.5 10 L 5 2 L 8.5 10 z" fill="#475569" />
                </marker>
              </defs>

              {/* Grid Lines */}
              {showGrid && (
                <g className="grid-lines" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2">
                  {xTicks.map((xVal) => {
                    const { px } = mathToSvg(xVal, 0);
                    return <line key={`gx-${xVal}`} x1={px} y1={padding} x2={px} y2={height - padding} />;
                  })}
                  {yTicks.map((yVal) => {
                    const { py } = mathToSvg(0, yVal);
                    return <line key={`gy-${yVal}`} x1={padding} y1={py} x2={width - padding} y2={py} />;
                  })}
                </g>
              )}

              {/* Cartesian Axes: X Axis */}
              <line
                x1={padding - 10}
                y1={xAxisY}
                x2={width - padding + 10}
                y2={xAxisY}
                stroke="#334155"
                strokeWidth="2"
                markerEnd="url(#axis-arrow-x)"
              />
              <text x={width - padding + 15} y={xAxisY + 4} fill="#334155" fontSize="11" fontWeight="bold">
                X
              </text>

              {/* Cartesian Axes: Y Axis */}
              <line
                x1={yAxisX}
                y1={height - padding + 10}
                x2={yAxisX}
                y2={padding - 10}
                stroke="#334155"
                strokeWidth="2"
                markerEnd="url(#axis-arrow-y)"
              />
              <text x={yAxisX - 5} y={padding - 15} fill="#334155" fontSize="11" fontWeight="bold">
                Y
              </text>

              {/* Ticks and numerical numbers */}
              <g className="ticks" fontSize="9" fill="#64748b" textAnchor="middle">
                {xTicks.map((xVal) => {
                  if (xVal === 0) return null;
                  const { px } = mathToSvg(xVal, 0);
                  return (
                    <g key={`tx-${xVal}`}>
                      <line x1={px} y1={xAxisY - 3} x2={px} y2={xAxisY + 3} stroke="#475569" strokeWidth="1.5" />
                      <text x={px} y={xAxisY + 14}>
                        {xVal}
                      </text>
                    </g>
                  );
                })}

                {yTicks.map((yVal) => {
                  if (yVal === 0) return null;
                  const { py } = mathToSvg(0, yVal);
                  return (
                    <g key={`ty-${yVal}`}>
                      <line x1={yAxisX - 3} y1={py} x2={yAxisX + 3} stroke="#475569" strokeWidth="1.5" />
                      <text x={yAxisX - 10} y={py + 3} textAnchor="end">
                        {yVal}
                      </text>
                    </g>
                  );
                })}

                {/* Origin label */}
                <text x={yAxisX - 8} y={xAxisY + 12} fontSize="9" fill="#64748b">
                  0
                </text>
              </g>

              {/* Axis of Symmetry (if Parabola) */}
              {showAxisOfSymmetry && (isDynamicParabola || data.keyFeatures?.axisOfSymmetry !== undefined) && (
                (() => {
                  const symX = isDynamicParabola ? dynamicParabolaCalc?.axisOfSymmetry ?? 0 : data.keyFeatures?.axisOfSymmetry ?? 0;
                  const { px } = mathToSvg(symX, 0);
                  return (
                    <g>
                      <line
                        x1={px}
                        y1={padding}
                        x2={px}
                        y2={height - padding}
                        stroke="#9333ea"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <text x={px + 4} y={padding + 12} fill="#9333ea" fontSize="9" fontWeight="bold">
                        Eje x = {symX}
                      </text>
                    </g>
                  );
                })()
              )}

              {/* Directrix line (if enabled) */}
              {showFocusDirectrix && isDynamicParabola && dynamicParabolaCalc && (
                (() => {
                  const { py } = mathToSvg(0, dynamicParabolaCalc.directrix);
                  const focusSvg = mathToSvg(dynamicParabolaCalc.focus.x, dynamicParabolaCalc.focus.y);
                  return (
                    <g>
                      {/* Directrix */}
                      <line
                        x1={padding}
                        y1={py}
                        x2={width - padding}
                        y2={py}
                        stroke="#0891b2"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      <text x={padding + 5} y={py - 4} fill="#0891b2" fontSize="9" fontWeight="bold">
                        Directriz y = {dynamicParabolaCalc.directrix}
                      </text>
                      {/* Focus */}
                      <circle cx={focusSvg.px} cy={focusSvg.py} r="4" fill="#0891b2" stroke="#fff" strokeWidth="1.5" />
                      <text x={focusSvg.px + 6} y={focusSvg.py - 4} fill="#0891b2" fontSize="9" fontWeight="bold">
                        Foco ({dynamicParabolaCalc.focus.x}, {dynamicParabolaCalc.focus.y})
                      </text>
                    </g>
                  );
                })()
              )}

              {/* Function Curves */}
              {activeFunctions.map((fn, idx) => {
                const pathD = generateFunctionPath(fn.expression);
                return (
                  <path
                    key={fn.id || idx}
                    d={pathD}
                    fill="none"
                    stroke={fn.color || '#2563eb'}
                    strokeWidth={fn.strokeWidth || 3}
                    strokeDasharray={fn.isDashed ? '5 5' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

              {/* Geometric Elements (if any) */}
              {data.elements &&
                data.elements.map((elem, eIdx) => {
                  if (elem.type === 'circle' && elem.center && elem.radius) {
                    const centerSvg = mathToSvg(elem.center.x, elem.center.y);
                    const rPx = (elem.radius / (domain.xMax - domain.xMin)) * (width - 2 * padding);
                    return (
                      <circle
                        key={`elem-${eIdx}`}
                        cx={centerSvg.px}
                        cy={centerSvg.py}
                        r={rPx}
                        fill="none"
                        stroke={elem.color || '#059669'}
                        strokeWidth="2"
                        strokeDasharray={elem.isDashed ? '4 4' : undefined}
                      />
                    );
                  }
                  if (elem.type === 'polygon' && elem.points && elem.points.length > 2) {
                    const ptsStr = elem.points
                      .map((p) => {
                        const s = mathToSvg(p.x, p.y);
                        return `${s.px},${s.py}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={`elem-${eIdx}`}
                        points={ptsStr}
                        fill={elem.color ? `${elem.color}22` : '#3b82f622'}
                        stroke={elem.color || '#3b82f6'}
                        strokeWidth="2"
                      />
                    );
                  }
                  if (elem.type === 'segment' && elem.points && elem.points.length === 2) {
                    const p1 = mathToSvg(elem.points[0].x, elem.points[0].y);
                    const p2 = mathToSvg(elem.points[1].x, elem.points[1].y);
                    return (
                      <line
                        key={`elem-${eIdx}`}
                        x1={p1.px}
                        y1={p1.py}
                        x2={p2.px}
                        y2={p2.py}
                        stroke={elem.color || '#059669'}
                        strokeWidth="2"
                      />
                    );
                  }
                  return null;
                })}

              {/* Highlighted Critical Points (Vertex, Roots, Y-Intercept) */}
              {showKeyPoints &&
                highlightedPoints.map((pt, pIdx) => {
                  const { px, py } = mathToSvg(pt.x, pt.y);
                  if (px < padding - 5 || px > width - padding + 5 || py < padding - 5 || py > height - padding + 5) {
                    return null;
                  }
                  return (
                    <g key={`pt-${pIdx}`} className="cursor-pointer group">
                      {/* Pulse outer ring */}
                      <circle cx={px} cy={py} r="8" fill={pt.color || '#dc2626'} fillOpacity="0.25" />
                      {/* Center dot */}
                      <circle cx={px} cy={py} r="4.5" fill={pt.color || '#dc2626'} stroke="#ffffff" strokeWidth="2" />
                      {/* Label badge */}
                      <rect
                        x={px + 6}
                        y={py - 16}
                        width={(pt.label?.length || 6) * 6 + 10}
                        height="16"
                        rx="4"
                        fill="#0f172a"
                        fillOpacity="0.85"
                      />
                      <text x={px + 10} y={py - 4} fill="#ffffff" fontSize="9" fontWeight="bold">
                        {pt.label}
                      </text>
                    </g>
                  );
                })}

              {/* Interactive Hover Marker and Coordinates */}
              {hoverCoord && (
                (() => {
                  const { px, py } = mathToSvg(hoverCoord.x, hoverCoord.y);
                  return (
                    <g pointerEvents="none">
                      {/* Crosshair lines */}
                      <line x1={px} y1={padding} x2={px} y2={height - padding} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1={padding} y1={py} x2={width - padding} y2={py} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx={px} cy={py} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                })()
              )}
            </svg>

            {/* Canvas Zoom & View Controls Overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                onClick={() => handleZoom(0.8)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700"
                title="Acercar (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(1.25)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700"
                title="Alejar (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700"
                title="Centrar y reajustar vista"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Sliders (When plotting a Parabola y = ax^2 + bx + c) */}
          {isDynamicParabola && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Laboratorio Dinámico de Parámetros: Modifica a, b, c
                </span>
                <span className="text-[11px] text-blue-700 font-semibold">Observa la transformación en tiempo real</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Slider A */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Parámetro a (Apertura):</span>
                    <span className="font-bold text-blue-700">{paramValues['a']}</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.5"
                    value={paramValues['a'] ?? 1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setParamValues((prev) => ({ ...prev, a: val === 0 ? 0.1 : val }));
                    }}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {paramValues['a'] > 0 ? 'Abre hacia arriba' : 'Abre hacia abajo'}
                  </span>
                </div>

                {/* Slider B */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Parámetro b (Desplazamiento):</span>
                    <span className="font-bold text-blue-700">{paramValues['b']}</span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.5"
                    value={paramValues['b'] ?? -4}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, b: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Vértice h = {-((paramValues['b'] ?? 0) / (2 * (paramValues['a'] || 1))).toFixed(1)}
                  </span>
                </div>

                {/* Slider C */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Parámetro c (Corte en Y):</span>
                    <span className="font-bold text-blue-700">{paramValues['c']}</span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.5"
                    value={paramValues['c'] ?? 3}
                    onChange={(e) => setParamValues((prev) => ({ ...prev, c: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Intersección (0, {paramValues['c']})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Guidelines Toggles and Key Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 ${
                  showGrid ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                {showGrid ? <Eye className="w-3 h-3 text-blue-600" /> : <EyeOff className="w-3 h-3" />}
                <span>Cuadrícula</span>
              </button>

              <button
                onClick={() => setShowKeyPoints(!showKeyPoints)}
                className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 ${
                  showKeyPoints ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Puntos Clave</span>
              </button>

              <button
                onClick={() => setShowAxisOfSymmetry(!showAxisOfSymmetry)}
                className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 ${
                  showAxisOfSymmetry
                    ? 'bg-purple-50 border-purple-200 text-purple-800'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Eje de Simetría</span>
              </button>

              {isDynamicParabola && (
                <button
                  onClick={() => setShowFocusDirectrix(!showFocusDirectrix)}
                  className={`px-2 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 ${
                    showFocusDirectrix ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Foco y Directriz</span>
                </button>
              )}
            </div>

            {/* Quick Inquiry CTA */}
            {onAskAboutGraph && (
              <button
                onClick={() =>
                  onAskAboutGraph(
                    `Profesor, explícame paso a paso cómo se determinó la gráfica de esta función (${
                      activeFunctions[0]?.latexLabel || 'parábola'
                    }) y qué significa cada punto en el plano cartesiano.`
                  )
                }
                className="text-blue-700 hover:text-blue-900 font-bold text-[11px] flex items-center gap-1"
              >
                <span>Pedirle al profesor que me explique esta gráfica</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. TAB: MATHEMATICAL ANALYSIS & STEP-BY-STEP FORMULAS */}
      {activeTab === 'analysis' && (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <h4 className="font-bold text-blue-950 text-sm mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Elementos Clave de la Función Cuadrática (Parábola)
            </h4>
            <p className="text-blue-800 leading-relaxed">
              En el diseño curricular dominicano del MINERD, el estudio de la función cuadrática{' '}
              <MathFormula formula="f(x) = ax^2 + bx + c" displayMode={false} /> comprende el cálculo del vértice, eje de
              simetría, discriminante y raíces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Card: Vértice */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="font-bold text-rose-800 uppercase tracking-wider text-[11px] block">
                1. Vértice V(h, k)
              </span>
              <p className="text-slate-600">
                Punto donde la parábola alcanza su valor máximo o mínimo:
              </p>
              <MathFormula formula="h = -\frac{b}{2a}, \quad k = f(h) = c - \frac{b^2}{4a}" displayMode={true} />
              {dynamicParabolaCalc && (
                <div className="p-2 rounded-lg bg-white border border-rose-200 font-medium text-rose-900">
                  Resultado actual:{' '}
                  <strong>
                    V({dynamicParabolaCalc.vertex.x}, {dynamicParabolaCalc.vertex.y})
                  </strong>{' '}
                  ({dynamicParabolaCalc.a > 0 ? 'Punto Mínimo' : 'Punto Máximo'})
                </div>
              )}
            </div>

            {/* Card: Discriminante y Raíces */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px] block">
                2. Discriminante y Cortes con el Eje X
              </span>
              <p className="text-slate-600">
                Determina cuántas veces corta la parábola al eje horizontal:
              </p>
              <MathFormula formula="\Delta = b^2 - 4ac" displayMode={true} />
              {dynamicParabolaCalc && (
                <div className="p-2 rounded-lg bg-white border border-emerald-200 font-medium text-emerald-900">
                  <span className="block font-bold">
                    Δ = {dynamicParabolaCalc.discriminant}
                  </span>
                  <span className="text-[11px]">
                    {dynamicParabolaCalc.discriminant > 0
                      ? 'Tiene 2 raíces reales diferentes (corta 2 veces al eje X).'
                      : dynamicParabolaCalc.discriminant === 0
                      ? 'Tiene 1 raíz real doble (el vértice toca el eje X).'
                      : 'Δ < 0: No tiene raíces reales (no corta al eje X).'}
                  </span>
                </div>
              )}
            </div>

            {/* Card: Concavidad y Orientación */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px] block">
                3. Concavidad y Apertura (Signo de a)
              </span>
              <p className="text-slate-600">
                El coeficiente principal <MathFormula formula="a" displayMode={false} /> define hacia dónde se abre la
                curva:
              </p>
              <div className="p-2 rounded-lg bg-white border border-amber-200 font-medium text-amber-900 space-y-1">
                <div>
                  <strong>Si a &gt; 0:</strong> Parábola cóncava hacia arriba (forma de ∪, tiene mínimo).
                </div>
                <div>
                  <strong>Si a &lt; 0:</strong> Parábola cóncava hacia abajo (forma de ∩, tiene máximo).
                </div>
              </div>
            </div>

            {/* Card: Eje de Simetría */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <span className="font-bold text-purple-800 uppercase tracking-wider text-[11px] block">
                4. Eje de Simetría
              </span>
              <p className="text-slate-600">Línea vertical que divide a la parábola en dos mitades simétricas:</p>
              <MathFormula formula="x = h = -\frac{b}{2a}" displayMode={true} />
              {dynamicParabolaCalc && (
                <div className="p-2 rounded-lg bg-white border border-purple-200 font-medium text-purple-900">
                  Ecuación del eje:{' '}
                  <strong>x = {dynamicParabolaCalc.axisOfSymmetry}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: VALUE TABLE */}
      {activeTab === 'table' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Tabla de Coordenadas (x, y) de la función actual:
            </span>
            <span className="text-slate-500">Puntos evaluados en el dominio</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="p-2.5 border-b border-slate-200">Variable x</th>
                  <th className="p-2.5 border-b border-slate-200">Función f(x) = y</th>
                  <th className="p-2.5 border-b border-slate-200">Par Ordenado (x, y)</th>
                  <th className="p-2.5 border-b border-slate-200">Propiedad Notoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableData.map((row) => {
                  const isVertex =
                    dynamicParabolaCalc &&
                    Math.abs(row.x - dynamicParabolaCalc.vertex.x) < 0.1 &&
                    Math.abs(row.y - dynamicParabolaCalc.vertex.y) < 0.1;

                  const isRoot = Math.abs(row.y) < 1e-6;
                  const isYIntercept = row.x === 0;

                  return (
                    <tr
                      key={row.x}
                      className={`hover:bg-slate-50 ${
                        isVertex ? 'bg-rose-50/60 font-bold' : isRoot ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="p-2.5 font-mono">{row.x}</td>
                      <td className="p-2.5 font-mono text-blue-700">{row.y}</td>
                      <td className="p-2.5 font-mono">
                        ({row.x}, {row.y})
                      </td>
                      <td className="p-2.5">
                        {isVertex ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                            Vértice V
                          </span>
                        ) : isRoot ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Raíz (Corte X)
                          </span>
                        ) : isYIntercept ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                            Corte Y
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB: CUSTOM FUNCTION INPUT */}
      {activeTab === 'custom' && (
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
            <span className="font-bold block mb-1">¡Grafica tu propia función en el plano!</span>
            <p className="text-[11px] leading-relaxed">
              Escribe cualquier función matemática usando <code className="font-bold">x</code> como variable.
              Ejemplos: <code className="bg-white px-1 py-0.5 rounded">2*x + 1</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded">-x^2 + 4</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded">x^3 - 3*x</code>,{' '}
              <code className="bg-white px-1 py-0.5 rounded">sin(x)</code>.
            </p>
          </div>

          <form onSubmit={handleAddCustomCurve} className="flex gap-2">
            <input
              type="text"
              value={customFunctionExpr}
              onChange={(e) => setCustomFunctionExpr(e.target.value)}
              placeholder="Ej: -x^2 + 5 o 2*x - 3"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Dibujar en Plano</span>
            </button>
          </form>

          {customCurves.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-slate-700 block">Curvas añadidas por el usuario:</span>
              <div className="space-y-1.5">
                {customCurves.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/40 flex items-center justify-between">
                    <span className="font-mono font-bold text-purple-950">{c.latexLabel || c.expression}</span>
                    <button
                      onClick={() => setCustomCurves((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-rose-600 hover:text-rose-800 font-semibold text-[11px]"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
