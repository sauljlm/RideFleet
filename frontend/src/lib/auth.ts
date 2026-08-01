import { apiPatch, apiPost, apiUploadForm } from './api';

const TOKEN_KEY = 'ridefleet_token';

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface RegisterFields {
  [key: string]: string;
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: { id: string; username: string };
}

export function registerUser(
  fields: RegisterFields,
  photo?: File | null,
): Promise<AuthResponse> {
  return apiUploadForm<AuthResponse>('/auth/register', fields, photo);
}

export function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/auth/forgot-password', { email });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiPatch<{ message: string }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
}
