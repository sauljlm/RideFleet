/**
 * Paleta y utilidades compartidas por las gráficas.
 *
 * Los colores de serie son categóricos: identifican una magnitud (ingresos,
 * costos, ganancia), no su tamaño. El orden es fijo y cada concepto conserva
 * su color en todas las gráficas de la pantalla, así que un lector que
 * aprendió "ingresos es azul" no se pierde al cambiar de gráfica.
 *
 * La paleta está validada para daltonismo sobre fondo blanco (ΔE CVD ≥ 9 en
 * los pares que se tocan). Los tres colores de serie quedan por debajo de 3:1
 * de contraste contra el blanco, así que ninguna gráfica depende solo del
 * color: todas llevan leyenda, etiquetas directas y una vista de tabla.
 */
export const SERIES = {
  revenue: '#2a78d6',
  maintenance: '#eb6834',
  net: '#1baf7a',
} as const;

/** Orden fijo para desgloses categóricos (tipos de mantenimiento, métodos). */
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

/** Reservados para estado, nunca para identidad de una serie. */
export const STATUS = {
  good: '#0ca30c',
  critical: '#d03b3b',
} as const;

export const CHROME = {
  surface: '#ffffff',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  secondary: '#52514e',
  primary: '#0b0b0b',
} as const;

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

export function formatCRC(value: number): string {
  return `₡${Math.round(value).toLocaleString('es-CR')}`;
}

/** Para ejes y etiquetas dentro de las marcas, donde no cabe la cifra entera. */
export function formatCompactCRC(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}₡${(abs / 1_000_000).toLocaleString('es-CR', {
      maximumFractionDigits: 1,
    })} M`;
  }
  if (abs >= 1_000) {
    return `${sign}₡${(abs / 1_000).toLocaleString('es-CR', {
      maximumFractionDigits: abs >= 100_000 ? 0 : 1,
    })} k`;
  }
  return `${sign}₡${Math.round(abs)}`;
}

const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** '2026-03' → 'mar'. */
export function formatMonthShort(key: string): string {
  return MONTH_SHORT[Number(key.slice(5, 7)) - 1] ?? key;
}

/** '2026-03' → 'mar 2026'. */
export function formatMonthLong(key: string): string {
  return `${formatMonthShort(key)} ${key.slice(0, 4)}`;
}

/** '2026-03' → 'marzo de 2026', para textos corridos. */
export function formatMonthFull(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('es-CR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CR', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const snapped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return snapped * magnitude;
}

/**
 * Marcas de eje en números redondos que cubren [min, max]. Se prefieren
 * valores redondos a repartir el rango en partes iguales: el lector saca la
 * escala de la marca, y "₡250 k" se lee de un vistazo y "₡237.512" no.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [0, Math.max(max, 1)];
  }
  const step = niceStep((max - min) / count);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // El acumulador se reconstruye desde `start` en cada vuelta en vez de
  // sumarse: sumar un paso fraccionario arrastra error de coma flotante y
  // produce marcas como 249.999,9999 en lugar de 250.000.
  for (let i = 0; start + i * step <= end + step * 1e-9; i += 1) {
    ticks.push(start + i * step);
  }
  return ticks;
}
