'use client';

import { SERIES } from './chart-theme';

const VIEW_W = 240;
const VIEW_H = 44;
const PAD = 4;

/**
 * La forma de la serie, sin ejes ni rótulos: acompaña a una cifra grande para
 * decir de dónde viene, no para leer valores. Los números están en la gráfica
 * de abajo y en su tabla.
 */
export function Sparkline({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const x = (index: number) =>
    PAD + (index / (values.length - 1)) * (VIEW_W - PAD * 2);
  const y = (value: number) =>
    PAD + (1 - value / max) * (VIEW_H - PAD * 2);

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const lastIndex = values.length - 1;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-11 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path
        d={`${line} L ${x(lastIndex)} ${VIEW_H} L ${x(0)} ${VIEW_H} Z`}
        fill={SERIES.revenue}
        fillOpacity={0.1}
      />
      <path
        d={line}
        fill="none"
        stroke={SERIES.revenue}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
