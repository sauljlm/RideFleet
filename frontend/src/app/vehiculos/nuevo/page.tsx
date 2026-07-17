'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { VehicleForm } from '@/components/VehicleForm';
import { createVehicle } from '@/lib/vehicles';

function NewVehicleContent() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Nuevo vehículo
      </h1>
      <VehicleForm onSubmit={createVehicle} submitLabel="Crear vehículo" />
    </main>
  );
}

export default function NewVehiclePage() {
  return (
    <AuthGuard>
      <NewVehicleContent />
    </AuthGuard>
  );
}
