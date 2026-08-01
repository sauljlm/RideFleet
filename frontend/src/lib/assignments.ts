import { apiGet, apiPost } from './api';
import type { Assignment, CreateAssignmentInput } from '@/types/assignment';

export function createAssignment(
  data: CreateAssignmentInput,
): Promise<Assignment> {
  return apiPost<Assignment>('/assignments', data);
}

export function getAssignmentsByVehicle(
  vehicleId: string,
): Promise<Assignment[]> {
  return apiGet<Assignment[]>(`/assignments/vehicle/${vehicleId}`);
}

export function getAssignmentsByDriver(
  driverId: string,
): Promise<Assignment[]> {
  return apiGet<Assignment[]>(`/assignments/driver/${driverId}`);
}

export function unassignVehicle(vehicleId: string): Promise<{ success: true }> {
  return apiPost<{ success: true }>(`/assignments/vehicle/${vehicleId}/unassign`, {});
}

export function unassignDriver(driverId: string): Promise<{ success: true }> {
  return apiPost<{ success: true }>(`/assignments/driver/${driverId}/unassign`, {});
}
