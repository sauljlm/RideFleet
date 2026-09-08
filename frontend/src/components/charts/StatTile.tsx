import { Sparkline } from './Sparkline';

export type StatTone = 'neutral' | 'positive' | 'negative';

const TONE_CLASS: Record<StatTone, string> = {
  neutral: 'text-gray-900',
  positive: 'text-green-700',
  negative: 'text-red-700',
};

/**
 * Cuando el dato es un solo número, el número es la gráfica.
 *
 * Las cifras grandes van con las cifras proporcionales de la tipografía, no
 * con `tabular-nums`: los dígitos de ancho fijo son para columnas que se
 * alinean verticalmente, y a tamaño grande dejan el número suelto.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  hero = false,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  hero?: boolean;
  /** Serie de apoyo: dibuja la forma del dato bajo la cifra. */
  trend?: number[];
  trendLabel?: string;
}) {
  return (
    // `h-full` + columna flexible: la tarjeta ocupa toda su celda de la
    // rejilla. En la cifra principal el bloque del número se centra en el
    // espacio sobrante, así no queda un hueco arriba ni abajo cuando las
    // tarjetas vecinas son más altas.
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium text-gray-500 sm:text-sm">{label}</p>
      <div className={hero ? 'flex flex-1 flex-col justify-center pt-3' : ''}>
        <p
          className={`mt-1 font-semibold ${TONE_CLASS[tone]} ${
            hero ? 'text-3xl sm:text-5xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {value}
        </p>
        {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
      </div>
      {trend && (
        <div className="mt-3">
          <Sparkline values={trend} label={trendLabel ?? label} />
        </div>
      )}
    </div>
  );
}
