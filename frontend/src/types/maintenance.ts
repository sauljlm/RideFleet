export type MaintenanceType = 'preventivo' | 'reparacion' | 'llantas' | 'otro';

export interface Maintenance {
  _id: string;
  vehicleId: string;
  date: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  provider: string;
  mileageAtService: number;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceInput {
  vehicleId: string;
  date: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  provider: string;
  mileageAtService: number;
}

export type UpdateMaintenanceInput = Partial<
  Omit<CreateMaintenanceInput, 'vehicleId'>
>;

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventivo: 'Preventivo',
  reparacion: 'Reparación',
  llantas: 'Cambio de llantas',
  otro: 'Otro',
};
