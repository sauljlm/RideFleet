'use client';

import { useState } from 'react';
import { ChartTooltip, type TooltipState } from './ChartTooltip';
import {
  CHROME,
  formatCompactCRC,
  formatCRC,
  niceTicks,
  SERIES,
  STATUS,
} from './chart-theme';
import { useMeasuredWidth } from './useMeasuredWidth';

const HEIGHT = 260;
const PAD_TOP = 22;
const PAD_RIGHT = 14;
const PAD_BOTTOM = 34;
const PAD_LEFT = 62;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const MAX_COLUMN_W = 24;
const CORNER = 4;

export interface ColumnPoint {
  label: string;
  fullLabel: string;
  value: number;
}

/**
 * Barra con la esquina redondeada solo del lado del dato: el extremo pegado a
 * la línea de cero queda cuadrado, así la barra se lee anclada a la base y no
 * flotando.
 */
function columnPath(
  x: number,
  width: number,
  baseline: number,
  end: number,
): string {
  const height = Math.abs(end - baseline);
  const radius = Math.min(CORNER, height, width / 2);
  if (height === 0) return '';

  if (end < baseline) {
    return `M ${x} ${baseline} L ${x} ${end + radius} Q ${x} ${end} ${x + radius} ${end} L ${x + width - radius} ${end} Q ${x + width} ${end} ${x + width} ${end + radius} L ${x + width} ${baseline} Z`;
  }
  return `M ${x} ${baseline} L ${x} ${end - radius} Q ${x} ${end} ${x + radius} ${end} L ${x + width - radius} ${end} Q ${x + width} ${end} ${x + width} ${end - radius} L ${x + width} ${baseline} Z`;
}

/**
 * Columnas con línea de cero: los valores negativos bajan de la base en el
 * color de estado "crítico". Es una polaridad real (ganancia contra pérdida),
 * no una serie más, y por eso usa el color de estado y no uno categórico.
 */
export function ColumnChart({
  points,
  valueName,
}: {
  points: ColumnPoint[];
  valueName: string;
}) {
  const [wrapperRef, width] = useMeasuredWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const plotW = Math.max(width - PAD_LEFT - PAD_RIGHT, 10);
  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values, 0), Math.max(...values, 0), 4);
  const minTick = ticks[0];
  const maxTick = ticks[ticks.length - 1];
  const span = maxTick - minTick || 1;

  const bandWidth = plotW / Math.max(points.length, 1);
  const columnWidth = Math.min(MAX_COLUMN_W, Math.max(bandWidth - 2, 2));

  const y = (value: number) => PAD_TOP + PLOT_H - ((value - minTick) / span) * PLOT_H;
  const bandCenter = (index: number) => PAD_LEFT + bandWidth * (index + 0.5);
  const baseline = y(0);

  const maxLabels = Math.max(Math.floor(plotW / 44), 2);
  const labelStride = Math.ceil(points.length / maxLabels);
  const best = points.reduce((a, b) => (b.value > a.value ? b : a), points[0]);
  const worst = points.reduce((a, b) => (b.value < a.value ? b : a), points[0]);

  function showIndex(index: number) {
    const point = points[index];
    setActiveIndex(index);
    setTooltip({
      x: bandCenter(index),
      y: 4,
      title: point.fullLabel,
      rows: [
        {
          color: point.value < 0 ? STATUS.critical : CHROME.primary,
          name: valueName,
          value: formatCRC(point.value),
        },
      ],
    });
  }

  function clear() {
    setActiveIndex(null);
    setTooltip(null);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {width === 0 ? (
        <div style={{ height: HEIGHT }} />
      ) : (
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width={width}
          height={HEIGHT}
          className="touch-none"
          role="img"
          aria-label={`Gráfica de columnas: ${valueName} por mes`}
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

          {points.map((point, index) => {
            const color = point.value < 0 ? STATUS.critical : SERIES.net;
            // El mejor y el peor mes van rotulados; el resto lo carga el eje
            // y el tooltip. Un cero no se rotula: es la línea de base, ya se
            // ve. Tampoco se rotula si no cabe el número bajo la columna.
            const isExtreme =
              points.length > 2 &&
              point.value !== 0 &&
              bandWidth >= 42 &&
              (point === best || point === worst);
            return (
              <g key={point.label + index}>
                <path
                  d={columnPath(
                    bandCenter(index) - columnWidth / 2,
                    columnWidth,
                    baseline,
                    y(point.value),
                  )}
                  fill={color}
                  fillOpacity={
                    activeIndex === null || activeIndex === index ? 1 : 0.55
                  }
                />
                {isExtreme && (
                  <text
                    x={bandCenter(index)}
                    y={point.value < 0 ? y(point.value) + 15 : y(point.value) - 7}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={CHROME.secondary}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCompactCRC(point.value)}
                  </text>
                )}
                {index % labelStride === 0 && (
                  <text
                    x={bandCenter(index)}
                    y={HEIGHT - 12}
                    textAnchor="middle"
                    fontSize={12}
                    fill={CHROME.muted}
                  >
                    {point.label}
                  </text>
                )}
                {/* El área sensible cubre toda la franja del mes, no solo la
                    barra: acertarle a una columna de 24 px es incómodo, y una
                    barra de valor cero no tendría dónde apuntar. */}
                <rect
                  x={PAD_LEFT + bandWidth * index}
                  y={PAD_TOP}
                  width={bandWidth}
                  height={PLOT_H}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.fullLabel}: ${formatCRC(point.value)}`}
                  onPointerEnter={() => showIndex(index)}
                  onPointerLeave={clear}
                  onFocus={() => showIndex(index)}
                  onBlur={clear}
                  className="cursor-default outline-none"
                />
              </g>
            );
          })}
        </svg>
      )}

      <ChartTooltip state={tooltip} width={width} />
    </div>
  );
}
