export type PaymentMethod = 'efectivo' | 'transferencia';

export interface Payment {
  _id: string;
  driverId: string;
  vehicleId: string;
  /** Cuándo se recibió el dinero. */
  paymentDate: string;
  /** A qué semana se imputa. */
  weekStart: string;
  weekEnd: string;
  /** Tarifa vigente en esa semana. Ausente en pagos antiguos. */
  weeklyAmount?: number;
  amountPaid: number;
  /** La semana se dio por saldada aunque se cobrara menos de lo debido. */
  settled: boolean;
  /** Cuánto se dejó de cobrar al darla por saldada. */
  forgivenAmount: number;
  method: PaymentMethod;
  // Derivados del ledger. `previousBalance` y `remainingBalance` pueden ser
  // negativos: eso es saldo a favor del conductor.
  previousBalance: number;
  amountDue: number;
  remainingBalance: number;
  createdAt: string;
  updatedAt: string;
}

/** Semana a la que se puede imputar un pago. */
export interface PendingWeek {
  weekStart: string;
  weekEnd: string;
  /** Día en que se cobra la semana. */
  dueDate: string;
  weeklyAmount: number;
  previousBalance: number;
  amountDue: number;
  isOverdue: boolean;
  isCurrent: boolean;
}

export interface CreatePaymentInput {
  driverId: string;
  paymentDate: string;
  /** Semana a la que se imputa; sin ella el backend la deduce de la fecha. */
  weekStart?: string;
  amountPaid: number;
  method: PaymentMethod;
  /** Da la semana por saldada aunque se haya cobrado menos. */
  settled?: boolean;
}

export interface UpdatePaymentInput {
  paymentDate?: string;
  weekStart?: string;
  amountPaid?: number;
  method?: PaymentMethod;
  settled?: boolean;
}

export type DriverStatusLabel = 'al-dia' | 'pendiente' | 'atraso';

export interface DriverPaymentStatus {
  driverId: string;
  fullName: string;
  photo: string | null;
  weeklyAmount: number;
  /** Lo calcula el backend a partir del ledger; la pantalla solo lo pinta. */
  status: DriverStatusLabel;
  /** Deuda de semanas que ya pasaron su día de cobro. */
  overdueAmount: number;
  weeksBehind: number;
  /** Posición neta; negativa es crédito a favor. */
  currentBalance: number;
  /** Total condonado en semanas negociadas. */
  forgivenTotal: number;
  /** Lo que toca cobrar en el próximo vencimiento (o ya hoy). */
  dueSoonAmount: number;
  /** Cuándo es ese cobro. La renta se paga por adelantado, así que es el
   *  primer día de la semana correspondiente. */
  nextDueDate: string;
  oldestOverdueWeekStart: string | null;
  currentWeekStart: string;
  currentWeekEnd: string;
  hasPaidCurrentWeek: boolean;
  inGracePeriod: boolean;
  lastPayment: {
    weekStart: string;
    weekEnd: string;
    paymentDate: string;
    amountPaid: number;
  } | null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
};
