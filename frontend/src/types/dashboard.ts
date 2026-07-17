export interface DashboardSummary {
  activeVehicles: number;
  activeDrivers: number;
  weekRevenue: number;
  monthRevenue: number;
}

export type MaintenanceAlertStatus = 'proximo' | 'vencido';

export interface MaintenanceAlert {
  vehicleId: string;
  brand: string;
  model: string;
  plate: string;
  currentMileage: number;
  lastPreventiveMileage: number;
  lastPreventiveDate: string;
  kmSinceLastPreventive: number;
  status: MaintenanceAlertStatus;
}

export interface VehicleProfitability {
  vehicleId: string;
  brand: string;
  model: string;
  plate: string;
  totalRevenue: number;
  totalMaintenanceCost: number;
  profit: number;
}

export const MAINTENANCE_ALERT_LABELS: Record<MaintenanceAlertStatus, string> = {
  proximo: 'Próximo',
  vencido: 'Vencido',
};
