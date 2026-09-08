'use client';

import { CHROME, formatCRC } from './chart-theme';

const SIZE = 200;
const CENTER = SIZE / 2;
const R_OUTER = 92;
const R_INNER = 60;
/** Longitud del corte entre segmentos, en px de la circunferencia. */
const GAP_PX = 2;

export interface DonutSlice {
  key: string;
  name: string;
  value: number;
  color: string;
  /** Texto pequeño bajo el nombre en la lista, ej. "3 servicios". */
  detail?: string;
}

function polar(angle: number, radius: number): [number, number] {
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

function slicePath(start: number, end: number): string {
  const largeArc = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = polar(start, R_OUTER);
  const [x2, y2] = polar(end, R_OUTER);
  const [x3, y3] = polar(end, R_INNER);
  const [x4, y4] = polar(start, R_INNER);
  return `M ${x1} ${y1} A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${x4} ${y4} Z`;
}

/**
 * Composición de un total, con la cifra al centro y la lista de segmentos al
 * lado. La lista lleva el valor de cada segmento: los colores de la paleta no
 * alcanzan 3:1 contra el blanco, así que el color nunca es el único canal.
 *
 * Para comparar valores parecidos una barra es mejor que un anillo; esto es
 * para ver de un vistazo cuánto pesa cada parte del total.
 */
export function DonutChart({
  slices,
  centerLabel,
}: {
  slices: DonutSlice[];
  centerLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const gapAngle = GAP_PX / R_OUTER;

  // El arranque de cada segmento sale de la suma de los anteriores, no de un
  // acumulador que se va reasignando: el render queda sin estado mutable.
  const arcs = slices.map((slice, index) => {
    const share = total > 0 ? slice.value / total : 0;
    const before =
      total > 0
        ? slices.slice(0, index).reduce((sum, s) => sum + s.value, 0) / total
        : 0;
    const start = -Math.PI / 2 + before * Math.PI * 2;
    // Con un solo segmento el arco de 360° degenera en un punto; ese caso se
    // dibuja aparte como un anillo completo.
    return {
      slice,
      start: start + gapAngle / 2,
      end: start + share * Math.PI * 2 - gapAngle / 2,
      share,
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={`Composición de ${centerLabel}: ${slices
          .map((s) => `${s.name} ${formatCRC(s.value)}`)
          .join(', ')}`}
      >
        {slices.length === 1 ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={(R_OUTER + R_INNER) / 2}
            fill="none"
            stroke={slices[0].color}
            strokeWidth={R_OUTER - R_INNER}
          />
        ) : (
          arcs.map((arc) => (
            <path
              key={arc.slice.key}
              d={slicePath(arc.start, arc.end)}
              fill={arc.slice.color}
            />
          ))
        )}
        <text
          x={CENTER}
          y={CENTER - 2}
          textAnchor="middle"
          fontSize={18}
          fontWeight={600}
          fill={CHROME.primary}
        >
          {formatCRC(total)}
        </text>
        <text
          x={CENTER}
          y={CENTER + 16}
          textAnchor="middle"
          fontSize={11}
          fill={CHROME.muted}
        >
          {centerLabel}
        </text>
      </svg>

      <ul className="w-full min-w-0 space-y-2.5">
        {arcs.map((arc) => (
          <li key={arc.slice.key} className="flex items-center gap-3">
            <span
              aria-hidden
              className="block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: arc.slice.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-gray-900">
                {arc.slice.name}
              </span>
              {arc.slice.detail && (
                <span className="block text-xs text-gray-500">
                  {arc.slice.detail}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-gray-900">
                {formatCRC(arc.slice.value)}
              </span>
              <span className="block text-xs tabular-nums text-gray-500">
                {Math.round(arc.share * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
