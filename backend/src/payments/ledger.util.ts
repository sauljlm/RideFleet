import { getWeekRange } from './week-range.util';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Tope defensivo al enumerar semanas: un contractStartDate corrupto (año
// 1970, por ejemplo) generaría decenas de miles de iteraciones por conductor.
const MAX_WEEKS = 520;

export type LedgerWeekStatus =
  | 'gracia' // cubierta por el depósito, no se cobra
  | 'pagada' // el saldo de la semana quedó en cero (o a favor)
  | 'parcial' // se recibió algo pero quedó saldo
  | 'saldada' // se cobró menos, pero se dio por saldada de común acuerdo
  | 'sin_pagar' // ya venció y no se recibió nada
  | 'por_venir'; // todavía no empieza, así que aún no se cobra

export interface LedgerWeek {
  weekStart: Date;
  weekEnd: Date;
  /**
   * Día en que se cobra la semana. La renta se paga POR ADELANTADO, así que
   * coincide con `weekStart`: el conductor paga el primer día de la semana
   * que va a usar el carro. Se expone como campo propio para que quien lo
   * consuma no tenga que conocer esa regla.
   */
  dueDate: Date;
  /** Tarifa aplicada a esta semana. 0 en la semana de gracia. */
  weeklyAmount: number;
  /** Saldo que entra a la semana. Negativo = crédito a favor del conductor. */
  previousBalance: number;
  /** weeklyAmount cobrable + previousBalance. */
  amountDue: number;
  amountPaid: number;
  /**
   * Lo que se dejó de cobrar al dar la semana por saldada. Es lo que el
   * dueño negoció con el conductor, y se registra aparte en vez de inflar
   * `amountPaid`: el ingreso real fue el que fue.
   */
  forgivenAmount: number;
  /** Saldo que sale de la semana. Negativo = crédito a favor. */
  remainingBalance: number;
  /** La semana ya llegó a su día de cobro (ya empezó). */
  isChargeable: boolean;
  /** Su día de cobro quedó atrás y sigue debiendo. */
  isOverdue: boolean;
  status: LedgerWeekStatus;
  paymentId: string | null;
}

export interface DriverLedger {
  weeks: LedgerWeek[];
  /**
   * Posición neta del conductor hoy: >0 debe, <0 tiene crédito a favor.
   * Incluye los pagos adelantados a la semana en curso, que todavía no se
   * cobra pero cuyo dinero ya entró.
   */
  currentBalance: number;
  /** Parte del saldo que corresponde a semanas ya vencidas. */
  overdueAmount: number;
  /**
   * Cuántas semanas de renta debe, redondeado hacia arriba. Se deriva del
   * dinero (overdueAmount / tarifa) y no de contar semanas marcadas: tras un
   * atraso, todas las semanas siguientes cierran con saldo positivo aunque el
   * dinero adeudado siga siendo el de una sola.
   */
  weeksBehind: number;
  /** Semana más antigua que venció y sigue sin cubrirse. */
  oldestOverdueWeek: LedgerWeek | null;
  /** Lo que se debe hoy, incluida la semana que empieza hoy. */
  currentDueAmount: number;
  /** Semana en curso: la que contiene a `today`; ya se cobró al empezar. */
  currentWeek: LedgerWeek | null;
  /** Semana siguiente, todavía sin cobrar. Es el próximo vencimiento. */
  nextWeek: LedgerWeek | null;
}

export interface LedgerDriver {
  contractStartDate: Date;
  weekStartDay: number;
  weeklyAmount: number;
  depositCoversFirstWeek: boolean;
}

export interface LedgerPayment {
  id: string;
  weekStart: Date;
  amountPaid: number;
  /**
   * La semana se da por saldada aunque se haya cobrado menos de lo debido.
   * Sirve para las semanas que el dueño negocia con el conductor ante una
   * situación adversa: el faltante no se arrastra a la semana siguiente.
   */
  settled?: boolean;
  /**
   * Tarifa vigente cuando se registró el pago. Los pagos anteriores a este
   * campo la reconstruyen desde `amountDue - previousBalance`, que es como
   * el modelo viejo guardaba la "porción semanal" histórica.
   */
  weeklyAmount?: number | null;
}

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * ONE_DAY_MS);
}

/**
 * Reconstruye, semana a semana, el estado de cuenta de un conductor desde el
 * inicio de su contrato hasta la semana que contiene a `today`.
 *
 * A diferencia del modelo anterior -que encadenaba saldos de un registro de
 * pago al siguiente-, aquí el calendario manda: una semana sin registro de
 * pago existe igual y arrastra su deuda. Esa era la razón por la que una
 * semana saltada desaparecía sin dejar rastro y el conductor volvía a
 * aparecer "al día" al día siguiente de no pagar.
 *
 * El saldo es con signo: positivo es deuda, negativo es crédito a favor
 * (alguien que paga de más para ponerse al día cubre las semanas que siguen).
 */
export function buildLedger(
  driver: LedgerDriver,
  payments: LedgerPayment[],
  today: Date,
): DriverLedger {
  const paymentsByWeek = new Map<number, LedgerPayment>();
  for (const payment of payments) {
    const key = payment.weekStart.getTime();
    const existing = paymentsByWeek.get(key);
    // Defensivo: el índice único (driverId, weekStart) impide duplicados,
    // pero datos heredados podrían tenerlos. Se suman en vez de perderse.
    paymentsByWeek.set(
      key,
      existing
        ? {
            ...existing,
            amountPaid: existing.amountPaid + payment.amountPaid,
            settled: existing.settled || payment.settled,
          }
        : payment,
    );
  }

  const firstWeek = getFirstBillingWeek(driver);
  const currentWeekRange = getWeekRange(today, driver.weekStartDay);
  // Se enumera una semana más allá de la actual: con pago por adelantado la
  // semana en curso ya se cobró al empezar, así que el próximo vencimiento
  // es el arranque de la siguiente.
  const lastWeekStart = addDaysUTC(currentWeekRange.weekStart, 7);

  const weeks: LedgerWeek[] = [];
  let balance = 0;
  let cursor = firstWeek.weekStart;

  for (let i = 0; i < MAX_WEEKS; i += 1) {
    if (cursor.getTime() > lastWeekStart.getTime()) break;

    const { weekEnd } = getWeekRange(cursor, driver.weekStartDay);
    const dueDate = cursor;
    const isGrace =
      driver.depositCoversFirstWeek &&
      cursor.getTime() === firstWeek.weekStart.getTime();
    const isChargeable = dueDate.getTime() <= today.getTime();

    const payment = paymentsByWeek.get(cursor.getTime());
    const weeklyAmount = isGrace
      ? 0
      : (payment?.weeklyAmount ?? driver.weeklyAmount);

    // La semana entra al saldo el día que empieza. Un pago recibido antes de
    // esa fecha igual se acredita y queda como saldo a favor.
    const charge = isChargeable ? weeklyAmount : 0;
    const amountPaid = payment?.amountPaid ?? 0;
    const previousBalance = balance;
    const amountDue = charge + previousBalance;
    const remainingBalance = amountDue - amountPaid;

    // Dar la semana por saldada corta el arrastre: lo que faltaba no pasa a
    // la semana siguiente. Un sobrepago sí se conserva como crédito, por eso
    // se toma el mínimo con cero en vez de fijarlo en cero.
    const settled = payment?.settled === true;
    const forgivenAmount = settled ? Math.max(0, remainingBalance) : 0;
    balance = settled ? Math.min(0, remainingBalance) : remainingBalance;

    const isOverdue = dueDate.getTime() < today.getTime() && balance > 0;

    let status: LedgerWeekStatus;
    if (isGrace) status = 'gracia';
    else if (!isChargeable) status = 'por_venir';
    else if (forgivenAmount > 0) status = 'saldada';
    else if (remainingBalance <= 0) status = 'pagada';
    else if (amountPaid > 0) status = 'parcial';
    else status = 'sin_pagar';

    weeks.push({
      weekStart: cursor,
      weekEnd,
      dueDate,
      weeklyAmount,
      previousBalance,
      amountDue,
      amountPaid,
      forgivenAmount,
      remainingBalance: balance,
      isChargeable,
      isOverdue,
      status,
      paymentId: payment?.id ?? null,
    });

    cursor = addDaysUTC(cursor, 7);
  }

  const pastDue = weeks.filter((w) => w.dueDate.getTime() < today.getTime());
  const dueByToday = weeks.filter(
    (w) => w.dueDate.getTime() <= today.getTime(),
  );

  // `balance` quedó con el saldo tras la última semana enumerada, que incluye
  // la semana en curso y por tanto cualquier pago adelantado.
  const currentBalance = balance;
  const overdueAmount =
    pastDue.length > 0
      ? Math.max(0, pastDue[pastDue.length - 1].remainingBalance)
      : 0;

  const overdueList = weeks.filter((w) => w.isOverdue);
  const rate = driver.weeklyAmount > 0 ? driver.weeklyAmount : 0;

  return {
    weeks,
    currentBalance,
    overdueAmount,
    currentDueAmount:
      dueByToday.length > 0
        ? Math.max(0, dueByToday[dueByToday.length - 1].remainingBalance)
        : 0,
    weeksBehind: rate > 0 ? Math.ceil(overdueAmount / rate) : 0,
    oldestOverdueWeek: overdueList[0] ?? null,
    currentWeek:
      weeks.find(
        (w) => w.weekStart.getTime() === currentWeekRange.weekStart.getTime(),
      ) ?? null,
    nextWeek:
      weeks.find((w) => w.weekStart.getTime() === lastWeekStart.getTime()) ??
      null,
  };
}

/**
 * Primera semana que se le cobra al conductor: la primera que empieza en su
 * fecha de contrato o después.
 *
 * No es la semana que *contiene* contractStartDate, que es lo que se usaba
 * antes: con pago por adelantado eso facturaba una semana que arrancó antes
 * de que el conductor tuviera el carro. Andres firmó un jueves con día de
 * pago viernes, y esa regla le cobraba desde el viernes anterior.
 */
export function getFirstBillingWeek(driver: LedgerDriver): {
  weekStart: Date;
  weekEnd: Date;
} {
  const contractStart = new Date(driver.contractStartDate);
  contractStart.setUTCHours(0, 0, 0, 0);
  const containing = getWeekRange(contractStart, driver.weekStartDay);
  if (containing.weekStart.getTime() >= contractStart.getTime()) {
    return containing;
  }
  return getWeekRange(addDaysUTC(containing.weekStart, 7), driver.weekStartDay);
}
