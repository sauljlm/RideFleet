'use client';

import { useRef, useState } from 'react';
import { ChartTooltip, type TooltipRow, type TooltipState } from './ChartTooltip';
import {
  CHROME,
  formatCompactCRC,
  formatCRC,
  niceTicks,
  type ChartSeries,
} from './chart-theme';
import { useMeasuredWidth } from './useMeasuredWidth';

const HEIGHT = 300;
const PAD_TOP = 14;
const PAD_BOTTOM = 34;
const PAD_LEFT = 62;
/** Ancho mínimo bajo el cual no caben las etiquetas del extremo derecho. */
const END_LABEL_MIN_WIDTH = 560;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;

export interface LinePoint {
  /** Etiqueta corta para el eje. */
  label: string;
  /** Etiqueta larga para el tooltip. */
  fullLabel: string;
  values: Record<string, number>;
}

/**
 * Líneas sobre un único eje de valor. Todas las series comparten escala
 * porque comparten unidad (colones): dos escalas en una misma gráfica
 * inventan una correlación que no está en los datos.
 */
export function LineChart({
  points,
  series,
  extraTooltipRow,
}: {
  points: LinePoint[];
  series: ChartSeries[];
  /** Fila derivada que se agrega al tooltip, ej. el neto del mes. */
  extraTooltipRow?: (point: LinePoint) => TooltipRow;
}) {
  const [wrapperRef, width] = useMeasuredWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showEndLabels = width >= END_LABEL_MIN_WIDTH;
  const padRight = showEndLabels ? 78 : 14;
  const plotW = Math.max(width - PAD_LEFT - padRight, 10);

  const allValues = points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0));
  const ticks = niceTicks(0, Math.max(...allValues, 0), 4);
  const maxTick = ticks[ticks.length - 1] || 1;

  const x = (index: number) =>
    points.length === 1
      ? PAD_LEFT + plotW / 2
      : PAD_LEFT + (index / (points.length - 1)) * plotW;
  const y = (value: number) => PAD_TOP + PLOT_H - (value / maxTick) * PLOT_H;

  // Con muchos meses las etiquetas del eje se pisan; se muestra una de cada
  // N y el resto sigue disponible en el tooltip y en la tabla. El divisor
  // sale del ancho real: en un teléfono caben menos etiquetas que en un
  // escritorio.
  const maxLabels = Math.max(Math.floor(plotW / 44), 2);
  const labelStride = Math.ceil(points.length / maxLabels);

  function showIndex(index: number, pointerPx?: number) {
    const point = points[index];
    setActiveIndex(index);
    setTooltip({
      x: pointerPx ?? x(index),
      y: 8,
      title: point.fullLabel,
      rows: [
        ...series.map((s) => ({
          color: s.color,
          name: s.name,
          value: formatCRC(point.values[s.key] ?? 0),
        })),
        ...(extraTooltipRow ? [extraTooltipRow(point)] : []),
      ],
    });
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const pointerPx = event.clientX - rect.left;
    const ratio = (pointerPx - PAD_LEFT) / plotW;
    const index = Math.round(ratio * Math.max(points.length - 1, 1));
    showIndex(Math.min(Math.max(index, 0), points.length - 1), pointerPx);
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = Math.min(
      Math.max((activeIndex ?? 0) + step, 0),
      points.length - 1,
    );
    showIndex(next);
  }

  function clear() {
    setActiveIndex(null);
    setTooltip(null);
  }

  // Las etiquetas del extremo derecho se apilarían si las series terminan
  // juntas; en ese caso solo se rotula la primera y la otra queda en el
  // tooltip y en la tabla, que es donde nadie la pierde.
  const endLabels = series
    .map((s) => ({
      series: s,
      value: points[points.length - 1]?.values[s.key] ?? 0,
    }))
    .filter((entry, index, all) =>
      all
        .slice(0, index)
        .every((other) => Math.abs(y(other.value) - y(entry.value)) >= 14),
    );

  return (
    <div className="relative" ref={wrapperRef}>
      {width === 0 ? (
        // Antes de medir se reserva el alto exacto: así el resto de la
        // pantalla no salta cuando la gráfica aparece.
        <div style={{ height: HEIGHT }} />
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          className="touch-none"
          role="img"
          aria-label={`Gráfica de líneas: ${series.map((s) => s.name).join(' y ')} por mes`}
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerLeave={clear}
          onBlur={clear}
          onKeyDown={handleKeyDown}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + plotW}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? CHROME.axis : CHROME.grid}
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 10}
                y={y(tick) + 4}
                textAnchor="end"
                fontSize={12}
                fill={CHROME.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCompactCRC(tick)}
              </text>
            </g>
          ))}

          {points.map((point, index) =>
            index % labelStride === 0 ? (
              <text
                key={point.label + index}
                x={x(index)}
                y={HEIGHT - 12}
                textAnchor="middle"
                fontSize={12}
                fill={CHROME.muted}
              >
                {point.label}
              </text>
            ) : null,
          )}

          {activeIndex !== null && (
            <line
              x1={x(activeIndex)}
              x2={x(activeIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + PLOT_H}
              stroke={CHROME.axis}
              strokeWidth={1}
            />
          )}

          {/* La primera serie lleva un lavado de área: marca cuál es la
              principal sin agregar un color nuevo a la paleta. */}
          {points.length > 1 && (
            <path
              d={`M ${x(0)} ${y(0)} ${points
                .map((p, i) => `L ${x(i)} ${y(p.values[series[0].key] ?? 0)}`)
                .join(' ')} L ${x(points.length - 1)} ${y(0)} Z`}
              fill={series[0].color}
              fillOpacity={0.1}
            />
          )}

          {series.map((s) => (
            <path
              key={s.key}
              d={points
                .map(
                  (p, i) =>
                    `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.values[s.key] ?? 0)}`,
                )
                .join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {series.map((s) => {
            const lastIndex = points.length - 1;
            if (lastIndex < 0) return null;
            return (
              <circle
                key={s.key}
                cx={x(lastIndex)}
                cy={y(points[lastIndex].values[s.key] ?? 0)}
                r={4}
                fill={s.color}
                stroke={CHROME.surface}
                strokeWidth={2}
              />
            );
          })}

          {showEndLabels &&
            endLabels.map((entry) => (
              <text
                key={entry.series.key}
                x={x(points.length - 1) + 12}
                y={y(entry.value) + 4}
                fontSize={12}
                fontWeight={600}
                fill={CHROME.secondary}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCompactCRC(entry.value)}
              </text>
            ))}

          {activeIndex !== null &&
            series.map((s) => (
              <circle
                key={s.key}
                cx={x(activeIndex)}
                cy={y(points[activeIndex].values[s.key] ?? 0)}
                r={4.5}
                fill={s.color}
                stroke={CHROME.surface}
                strokeWidth={2}
              />
            ))}
        </svg>
      )}

      <ChartTooltip state={tooltip} width={width} />
    </div>
  );
}
