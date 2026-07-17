import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from './api';
import type {
  CreateMaintenanceInput,
  Maintenance,
  UpdateMaintenanceInput,
} from '@/types/maintenance';

export function getMaintenancesByVehicle(
  vehicleId: string,
): Promise<Maintenance[]> {
  return apiGet<Maintenance[]>(`/maintenances/vehicle/${vehicleId}`);
}

export function createMaintenance(
  data: CreateMaintenanceInput,
): Promise<Maintenance> {
  return apiPost<Maintenance>('/maintenances', data);
}

export function updateMaintenance(
  id: string,
  data: UpdateMaintenanceInput,
): Promise<Maintenance> {
  return apiPatch<Maintenance>(`/maintenances/${id}`, data);
}

export function deleteMaintenance(id: string): Promise<void> {
  return apiDelete<void>(`/maintenances/${id}`);
}

export function uploadMaintenancePhotos(
  id: string,
  files: FileList | File[],
): Promise<Maintenance> {
  return apiUpload<Maintenance>(`/maintenances/${id}/photos`, files);
}
