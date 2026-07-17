'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { DriverForm } from '@/components/DriverForm';
import { createDriver } from '@/lib/drivers';

function NewDriverContent() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">
        Nuevo conductor
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Después de crear el conductor podrás subir su foto y las fotos del
        contrato.
      </p>
      <DriverForm
        onSubmit={createDriver}
        submitLabel="Crear conductor"
        onSuccessRedirect={(id) => `/conductores/${id}/editar`}
      />
    </main>
  );
}

export default function NewDriverPage() {
  return (
    <AuthGuard>
      <NewDriverContent />
    </AuthGuard>
  );
}
