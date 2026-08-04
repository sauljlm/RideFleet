export interface WeekRange {
  weekStart: Date;
  weekEnd: Date;
}

/**
 * Calcula la ventana de la semana de pago que contiene `date`, según el
 * `weekStartDay` (0-6, 0 = domingo) de cada conductor.
 *
 * Usa métodos UTC en vez de hora local: las fechas de pago llegan como
 * strings "YYYY-MM-DD" (date-only), que `Date` parsea como medianoche UTC.
 * Si aquí se usara hora local en un servidor con offset negativo (p. ej.
 * Costa Rica, UTC-6), la fecha retrocedería un día y podía calcular la
 * semana equivocada.
 */
export function getWeekRange(date: Date, weekStartDay: number): WeekRange {
  const weekStart = new Date(date);
  weekStart.setUTCHours(0, 0, 0, 0);

  let diff = weekStart.getUTCDay() - weekStartDay;
  if (diff < 0) diff += 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/**
 * "Hoy" normalizado a medianoche UTC del día calendario en Costa Rica
 * (no del servidor: en Railway el contenedor corre en UTC, así que usar
 * el día calendario del servidor adelantaría "hoy" hasta 6 horas cada
 * tarde/noche, rompiendo el cálculo de la semana de pago). Se puede
 * comparar directamente contra `weekStart`/`weekEnd` u otras fechas
 * "date-only" (ver nota en `getWeekRange`).
 */
/**
 * Calcula la ventana de la semana de pago que corresponde cobrar en
 * `date`. A diferencia de `getWeekRange`, en el día exacto en que cae
 * `weekStartDay` (el día de pago) esta función todavía devuelve la semana
 * que acaba de terminar -la que hay que cobrar hoy-, no la que empieza
 * ese mismo día. Recién al día siguiente avanza a la semana nueva (en
 * curso, cuyo vencimiento es en 7 días).
 *
 * Sin este ajuste, el mismo día en que el conductor debe pagar, el estado
 * de pagos ya calculaba la semana siguiente (con vencimiento lejano) y el
 * conductor aparecía "al día" aunque todavía no hubiera pagado nada.
 */
export function getBillingWeekRange(
  date: Date,
  weekStartDay: number,
): WeekRange {
  const reference = new Date(date);
  reference.setUTCDate(reference.getUTCDate() - 1);
  return getWeekRange(reference, weekStartDay);
}

export function getTodayUTC(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = parts.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
