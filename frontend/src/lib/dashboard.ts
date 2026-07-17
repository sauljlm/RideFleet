import { apiGet } from './api';
import type {
  DashboardSummary,
  MaintenanceAlert,
  VehicleProfitability,
} from '@/types/dashboard';
import type { DriverPaymentStatus } from '@/types/payment';

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>('/dashboard/summary');
}

export function getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
  return apiGet<MaintenanceAlert[]>('/dashboard/maintenance-alerts');
}

export function getLatePayments(): Promise<DriverPaymentStatus[]> {
  return apiGet<DriverPaymentStatus[]>('/dashboard/late-payments');
}

export function getProfitability(
  startDate: string,
  endDate: string,
): Promise<VehicleProfitability[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiGet<VehicleProfitability[]>(`/dashboard/profitability?${params.toString()}`);
}
