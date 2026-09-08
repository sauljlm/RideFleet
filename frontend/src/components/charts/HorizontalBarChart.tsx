'use client';

import { CHROME, formatCRC, type ChartSeries } from './chart-theme';

export interface BarRow {
  key: string;
  label: string;
  sublabel?: string;
  /** Cifra destacada a la derecha del nombre, ej. la ganancia del vehículo. */
  trailing?: { label: string; value: string; tone?: 'positive' | 'negative' };
  bars: { seriesKey: string; value: number }[];
}

/**
 * Barras horizontales sobre una escala común a todas las filas, con el valor
 * rotulado al final de cada barra. Se construye con HTML y no con SVG: los
 * nombres de vehículos y conductores son largos y variables, y en HTML el
 * texto se acomoda y se trunca solo, sin medirlo a mano.
 */
export function HorizontalBarChart({
  rows,
  series,
}: {
  rows: BarRow[];
  series: ChartSeries[];
}) {
  const max = Math.max(
    ...rows.flatMap((row) => row.bars.map((bar) => Math.abs(bar.value))),
    1,
  );
  const colorOf = (key: string) =>
    series.find((s) => s.key === key)?.color ?? CHROME.muted;
  const nameOf = (key: string) =>
    series.find((s) => s.key === key)?.name ?? key;

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-gray-900">
              {row.label}
              {row.sublabel && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {row.sublabel}
                </span>
              )}
            </p>
            {row.trailing && (
              <p className="shrink-0 text-xs text-gray-500">
                {row.trailing.label}{' '}
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    row.trailing.tone === 'negative'
                      ? 'text-red-700'
                      : row.trailing.tone === 'positive'
                        ? 'text-green-700'
                        : 'text-gray-900'
                  }`}
                >
                  {row.trailing.value}
                </span>
              </p>
            )}
          </div>

          {/* Gap de 2 px entre barras vecinas: es el fondo el que separa, no
              un borde dibujado alrededor de la marca. */}
          <div className="space-y-0.5">
            {row.bars.map((bar) => (
              <div key={bar.seriesKey} className="flex items-center gap-3">
                <div className="h-2.5 min-w-0 flex-1 rounded-sm bg-gray-100">
                  <div
                    className="h-2.5 rounded-r-[4px]"
                    style={{
                      width: `${Math.max((Math.abs(bar.value) / max) * 100, bar.value === 0 ? 0 : 1)}%`,
                      backgroundColor: colorOf(bar.seriesKey),
                    }}
                    title={`${nameOf(bar.seriesKey)}: ${formatCRC(bar.value)}`}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-600">
                  {formatCRC(bar.value)}
                </span>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
