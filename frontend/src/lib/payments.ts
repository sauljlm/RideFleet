import { apiDelete, apiGet, apiPatch, apiPost } from './api';
import type {
  CreatePaymentInput,
  DriverPaymentStatus,
  Payment,
  PendingWeek,
  UpdatePaymentInput,
} from '@/types/payment';

export function getPaymentsByDriver(driverId: string): Promise<Payment[]> {
  return apiGet<Payment[]>(`/payments/driver/${driverId}`);
}

export function getPendingWeeks(driverId: string): Promise<PendingWeek[]> {
  return apiGet<PendingWeek[]>(`/payments/driver/${driverId}/pending-weeks`);
}

export function getPaymentsStatus(): Promise<DriverPaymentStatus[]> {
  return apiGet<DriverPaymentStatus[]>('/payments/status');
}

export function createPayment(data: CreatePaymentInput): Promise<Payment> {
  return apiPost<Payment>('/payments', data);
}

export function updatePayment(
  id: string,
  data: UpdatePaymentInput,
): Promise<Payment> {
  return apiPatch<Payment>(`/payments/${id}`, data);
}

export function deletePayment(id: string): Promise<void> {
  return apiDelete<void>(`/payments/${id}`);
}
