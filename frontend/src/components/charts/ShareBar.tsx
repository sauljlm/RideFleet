'use client';

import { formatCRC } from './chart-theme';

export interface ShareSegment {
  key: string;
  name: string;
  value: number;
  color: string;
  detail?: string;
}

/**
 * Una sola barra repartida entre pocas partes. Con dos o tres categorías un
 * anillo o un pastel es peor que esto: la barra deja comparar longitudes y no
 * ángulos, y las partes quedan rotuladas debajo.
 */
export function ShareBar({ segments }: { segments: ShareSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <div
        className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md"
        role="img"
        aria-label={segments
          .map((s) => `${s.name}: ${formatCRC(s.value)}`)
          .join(', ')}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            style={{
              width: `${total > 0 ? (segment.value / total) * 100 : 0}%`,
              backgroundColor: segment.color,
            }}
          />
        ))}
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-baseline gap-2.5">
            <span
              aria-hidden
              className="mt-1 block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-gray-900">
                {segment.name}
              </span>
              {segment.detail && (
                <span className="block text-xs text-gray-500">
                  {segment.detail}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-gray-900">
                {formatCRC(segment.value)}
              </span>
              <span className="block text-xs tabular-nums text-gray-500">
                {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
