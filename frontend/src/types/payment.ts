export type PaymentMethod = 'efectivo' | 'transferencia';

export interface Payment {
  _id: string;
  driverId: string;
  vehicleId: string;
  paymentDate: string;
  weekStart: string;
  weekEnd: string;
  previousBalance: number;
  amountDue: number;
  amountPaid: number;
  remainingBalance: number;
  method: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  driverId: string;
  paymentDate: string;
  amountPaid: number;
  method: PaymentMethod;
}

export interface UpdatePaymentInput {
  paymentDate?: string;
  amountPaid?: number;
  method?: PaymentMethod;
}

export interface DriverPaymentStatus {
  driverId: string;
  fullName: string;
  photo: string | null;
  weeklyAmount: number;
  lastPayment: {
    weekStart: string;
    weekEnd: string;
    remainingBalance: number;
  } | null;
  currentAmountDue: number;
  pendingBalance: number;
  hasPaidCurrentWeek: boolean;
  inGracePeriod: boolean;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
};
