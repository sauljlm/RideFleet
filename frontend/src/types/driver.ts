export type DriverStatus = 'activo' | 'inactivo' | 'suspendido';

export interface Driver {
  _id: string;
  fullName: string;
  idNumber: string;
  phone: string;
  email?: string;
  address?: string;
  photo: string | null;
  contractPhotos: string[];
  contractStartDate: string;
  weeklyAmount: number;
  weekStartDay: number;
  deposit?: number;
  depositCoversFirstWeek: boolean;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverInput {
  fullName: string;
  idNumber: string;
  phone: string;
  email?: string;
  address?: string;
  contractStartDate: string;
  weeklyAmount: number;
  weekStartDay: number;
  deposit?: number;
  depositCoversFirstWeek?: boolean;
  status?: DriverStatus;
}

export type UpdateDriverInput = Partial<CreateDriverInput>;

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  suspendido: 'Suspendido',
};

export const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
