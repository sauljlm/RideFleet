export type VehicleStatus =
  | 'activo'
  | 'en_mantenimiento'
  | 'inactivo'
  | 'vendido';

export interface MileageEntry {
  date: string;
  mileage: number;
}

export interface PopulatedDriverRef {
  _id: string;
  fullName: string;
  phone: string;
  status: string;
}

export interface Vehicle {
  _id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  photos: string[];
  currentMileage: number;
  mileageHistory: MileageEntry[];
  documents: string[];
  status: VehicleStatus;
  currentDriverId: string | PopulatedDriverRef | null;
  purchaseDate?: string;
  purchaseValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleInput {
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  currentMileage?: number;
  status?: VehicleStatus;
  purchaseDate?: string;
  purchaseValue?: number;
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  activo: 'Activo',
  en_mantenimiento: 'En mantenimiento',
  inactivo: 'Inactivo',
  vendido: 'Vendido',
};
