import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from './api';
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  Vehicle,
} from '@/types/vehicle';

export function getVehicles(): Promise<Vehicle[]> {
  return apiGet<Vehicle[]>('/vehicles');
}

export function getVehicle(id: string): Promise<Vehicle> {
  return apiGet<Vehicle>(`/vehicles/${id}`);
}

export function createVehicle(data: CreateVehicleInput): Promise<Vehicle> {
  return apiPost<Vehicle>('/vehicles', data);
}

export function updateVehicle(
  id: string,
  data: UpdateVehicleInput,
): Promise<Vehicle> {
  return apiPatch<Vehicle>(`/vehicles/${id}`, data);
}

export function deleteVehicle(id: string): Promise<void> {
  return apiDelete<void>(`/vehicles/${id}`);
}

export function updateMileage(id: string, mileage: number): Promise<Vehicle> {
  return apiPatch<Vehicle>(`/vehicles/${id}/mileage`, { mileage });
}

export function uploadVehiclePhotos(
  id: string,
  files: FileList | File[],
): Promise<Vehicle> {
  return apiUpload<Vehicle>(`/vehicles/${id}/photos`, files);
}

export function uploadVehicleDocuments(
  id: string,
  files: FileList | File[],
): Promise<Vehicle> {
  return apiUpload<Vehicle>(`/vehicles/${id}/documents`, files);
}
