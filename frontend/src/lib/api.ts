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

// `hadToken` distingue dos casos que ambos llegan como HTTP 401:
// - Había un token y el servidor lo rechazó: la sesión expiró o dejó de
//   ser válida, así que forzamos logout y redirigimos a /login.
// - No había token (ej. intento de login con credenciales incorrectas):
//   no es una sesión expirada, es un error propio del endpoint. Se deja
//   que el llamador (el formulario de login, etc.) muestre el mensaje.
async function handleResponse<T>(res: Response, hadToken: boolean): Promise<T> {
  if (res.status === 401 && hadToken) {
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

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders(token) });
  return handleResponse<T>(res, Boolean(token));
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res, Boolean(token));
}

export async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(data),
  });
  return handleResponse<T>(res, Boolean(token));
}

// `data` es opcional porque casi todos los DELETE identifican el recurso por
// la URL; los que borran una parte de un recurso (una foto suelta de un
// vehículo, por ejemplo) necesitan indicar cuál en el cuerpo.
export async function apiDelete<T>(path: string, data?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers:
      data === undefined
        ? authHeaders(token)
        : { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return handleResponse<T>(res, Boolean(token));
}

export async function apiUpload<T>(
  path: string,
  files: FileList | File[],
  fieldName = 'files',
): Promise<T> {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append(fieldName, file));

  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  return handleResponse<T>(res, Boolean(token));
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

  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  });
  return handleResponse<T>(res, Boolean(token));
}
