import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from './api';
import type { CreateDriverInput, Driver, UpdateDriverInput } from '@/types/driver';

export function getDrivers(): Promise<Driver[]> {
  return apiGet<Driver[]>('/drivers');
}

export function getDriver(id: string): Promise<Driver> {
  return apiGet<Driver>(`/drivers/${id}`);
}

export function createDriver(data: CreateDriverInput): Promise<Driver> {
  return apiPost<Driver>('/drivers', data);
}

export function updateDriver(
  id: string,
  data: UpdateDriverInput,
): Promise<Driver> {
  return apiPatch<Driver>(`/drivers/${id}`, data);
}

export function deleteDriver(id: string): Promise<void> {
  return apiDelete<void>(`/drivers/${id}`);
}

export function uploadDriverPhoto(id: string, file: File): Promise<Driver> {
  return apiUpload<Driver>(`/drivers/${id}/photo`, [file], 'file');
}

export function uploadDriverContractPhotos(
  id: string,
  files: FileList | File[],
): Promise<Driver> {
  return apiUpload<Driver>(`/drivers/${id}/contract-photos`, files);
}
