'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { requestPasswordReset } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      // El backend responde igual exista o no el correo, así que un error
      // aquí nunca revela si la cuenta existe: es un fallo real (el correo
      // no pudo enviarse, o no hubo conexión). Mostrarlo importa porque en
      // ese caso la contraseña NO se cambió y hay que reintentar.
      setError(
        err instanceof ApiError
          ? err.message
          : 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">
          Recuperar contraseña
        </h1>

        {submitted ? (
          <p className="text-center text-sm text-gray-700">
            Si el correo existe en nuestro sistema, te enviamos una nueva
            contraseña. Revisa tu bandeja de entrada.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Correo
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar nueva contraseña'}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-gray-900 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
