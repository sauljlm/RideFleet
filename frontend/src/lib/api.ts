import { clearToken, getToken } from './auth';

// Sin NEXT_PUBLIC_API_URL (caso local, ver README) se usa el proxy interno
// del propio Next.js (frontend/src/app/api/backend/[...path]/route.ts), que
// descubre en tiempo real el puerto real del backend. Así el navegador nunca
// necesita saber a qué puerto cayó el backend tras un fallback de puerto.
// Con NEXT_PUBLIC_API_URL definido (ej. producción, backend en otro host)
// se usa esa URL directamente y el proxy queda sin uso.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError('Sesión expirada, inicia sesión de nuevo', 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body.message ?? 'Ocurrió un error al comunicarse con el servidor';
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      res.status,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse<T>(res);
}

export async function apiUpload<T>(
  path: string,
  files: FileList | File[],
  fieldName = 'files',
): Promise<T> {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append(fieldName, file));

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse<T>(res);
}

export async function apiUploadForm<T>(
  path: string,
  fields: Record<string, string>,
  file?: File | null,
  fileFieldName = 'photo',
): Promise<T> {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  if (file) {
    formData.append(fileFieldName, file);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse<T>(res);
}
