'use client';

import { useId, useState } from 'react';
import type { ChartSeries } from './chart-theme';

export interface ChartTableData {
  columns: string[];
  /** Ya formateadas: la tabla es una vista, no recalcula nada. */
  rows: string[][];
}

/**
 * Marco común de las gráficas: título, leyenda y vista de tabla.
 *
 * La tabla no es un extra. Los colores de serie no llegan a 3:1 de contraste
 * contra el fondo blanco, y una gráfica es inservible con lector de pantalla,
 * así que cada gráfica tiene su equivalente en texto y ningún dato queda
 * accesible solo por color o solo al pasar el puntero.
 */
export function ChartCard({
  title,
  subtitle,
  series,
  legendShape = 'rect',
  table,
  isEmpty,
  emptyMessage = 'No hay datos en este período.',
  children,
}: {
  title: string;
  subtitle?: string;
  series?: ChartSeries[];
  legendShape?: 'rect' | 'line';
  table?: ChartTableData;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {/* Con una sola serie el título ya dice qué se grafica: una leyenda
            de un solo elemento repite el título y gasta espacio. */}
        {series && series.length > 1 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <span
                  aria-hidden
                  className={
                    legendShape === 'line'
                      ? 'block h-0.5 w-4 rounded-full'
                      : 'block h-2.5 w-2.5 rounded-sm'
                  }
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isEmpty ? (
        <p className="py-10 text-center text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        children
      )}

      {table && !isEmpty && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            aria-controls={tableId}
            className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline"
          >
            {showTable ? 'Ocultar tabla' : 'Ver tabla'}
          </button>
          {showTable && (
            <div id={tableId} className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {table.columns.map((column, index) => (
                      <th
                        key={column}
                        scope="col"
                        className={`py-2 text-xs font-medium uppercase tracking-wider text-gray-500 ${
                          index === 0 ? 'pr-4 text-left' : 'px-4 text-right'
                        }`}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, index) => (
                        <td
                          key={table.columns[index]}
                          className={`py-2 text-gray-900 ${
                            index === 0
                              ? 'pr-4 text-left'
                              : 'px-4 text-right tabular-nums'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
