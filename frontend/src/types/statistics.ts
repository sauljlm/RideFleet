import type { MaintenanceType } from './maintenance';
import type { PaymentMethod } from './payment';
import type { VehicleStatus } from './vehicle';

export interface MonthlyPoint {
  /** 'YYYY-MM' en UTC. */
  month: string;
  revenue: number;
  maintenanceCost: number;
  net: number;
}

export interface VehicleStatistics {
  vehicleId: string;
  brand: string;
  model: string;
  plate: string;
  photo: string | null;
  status: VehicleStatus;
  totalRevenue: number;
  totalMaintenanceCost: number;
  profit: number;
}

export interface DriverStatistics {
  driverId: string;
  fullName: string;
  photo: string | null;
  totalPaid: number;
  paymentsCount: number;
  forgivenTotal: number;
}

export interface MaintenanceTypeStatistics {
  type: MaintenanceType;
  total: number;
  count: number;
}

export interface PaymentMethodStatistics {
  method: PaymentMethod;
  total: number;
  count: number;
}

export interface StatisticsTotals {
  totalRevenue: number;
  totalMaintenanceCost: number;
  netProfit: number;
  totalForgiven: number;
  paymentsCount: number;
  averageMonthlyRevenue: number;
  bestMonth: MonthlyPoint | null;
  /** Foto del presente, no un acumulado del rango consultado. */
  currentOverdueDebt: number;
}

export interface Statistics {
  range: { start: string; end: string; months: number };
  totals: StatisticsTotals;
  monthly: MonthlyPoint[];
  byVehicle: VehicleStatistics[];
  byDriver: DriverStatistics[];
  maintenanceByType: MaintenanceTypeStatistics[];
  paymentMethods: PaymentMethodStatistics[];
}

/** Rangos que ofrece la pantalla. `null` es todo el historial. */
export const STATISTICS_RANGES: { label: string; months: number | null }[] = [
  { label: 'Últimos 6 meses', months: 6 },
  { label: 'Últimos 12 meses', months: 12 },
  { label: 'Todo el historial', months: null },
];
