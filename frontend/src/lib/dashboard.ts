import { apiGet } from './api';
import type {
  DashboardSummary,
  MaintenanceAlert,
  VehicleProfitability,
} from '@/types/dashboard';
import type { DriverPaymentStatus } from '@/types/payment';
import type { Statistics } from '@/types/statistics';

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/dashboard/summary');
}

export function getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
  return apiGet<MaintenanceAlert[]>('/dashboard/maintenance-alerts');
}

export function getUpcomingPayments(): Promise<DriverPaymentStatus[]> {
  return apiGet<DriverPaymentStatus[]>('/dashboard/upcoming-payments');
}

export function getProfitability(
  startDate: string,
  endDate: string,
): Promise<VehicleProfitability[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiGet<VehicleProfitability[]>(`/dashboard/profitability?${params.toString()}`);
}

/** `months` a null pide todo el historial (el backend omite el recorte). */
export function getStatistics(months: number | null): Promise<Statistics> {
  const query = months === null ? '' : `?months=${months}`;
  return apiGet<Statistics>(`/dashboard/statistics${query}`);
}
