'use client';

import { CHROME } from './chart-theme';

export interface TooltipRow {
  color: string;
  name: string;
  value: string;
  /** Filas de resumen (totales, netos) que no corresponden a una serie. */
  muted?: boolean;
}

export interface TooltipState {
  /** Posición en píxeles CSS dentro del contenedor de la gráfica. */
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
}

/**
 * El valor manda y el nombre de la serie acompaña: al llegar acá el lector ya
 * sabe qué serie está mirando y lo que busca es la cifra.
 */
export function ChartTooltip({
  state,
  width,
}: {
  state: TooltipState | null;
  width: number;
}) {
  if (!state) return null;

  const TOOLTIP_WIDTH = 176;
  const left = Math.min(
    Math.max(state.x - TOOLTIP_WIDTH / 2, 4),
    Math.max(width - TOOLTIP_WIDTH - 4, 4),
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
      style={{ left, top: state.y, width: TOOLTIP_WIDTH }}
    >
      <p className="mb-1.5 text-xs font-medium text-gray-500">{state.title}</p>
      <ul className="space-y-1">
        {state.rows.map((row) => (
          <li key={row.name} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="mt-1 block h-0.5 w-3 shrink-0 rounded-full"
              style={{
                backgroundColor: row.muted ? CHROME.axis : row.color,
              }}
            />
            <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
              {row.name}
            </span>
            <span className="text-sm font-semibold tabular-nums text-gray-900">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
