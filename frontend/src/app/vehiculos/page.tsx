'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ApiError } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { deleteVehicle, getVehicles } from '@/lib/vehicles';
import { VEHICLE_STATUS_LABELS, type Vehicle } from '@/types/vehicle';
import { useRouter } from 'next/navigation';

function VehiclesPageContent() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getVehicles()
      .then((data) => {
        if (!ignore) setVehicles(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError ? err.message : 'No se pudo cargar la flota',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este vehículo? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await deleteVehicle(id);
      setVehicles((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : 'No se pudo eliminar el vehículo',
      );
    }
  }

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Flota de vehículos</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <Link
            href="/conductores"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Conductores
          </Link>
          <Link
            href="/vehiculos/nuevo"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo vehículo
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && vehicles.length === 0 && (
        <p className="text-sm text-gray-500">
          Todavía no hay vehículos registrados.
        </p>
      )}

      {!loading && vehicles.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Marca / Modelo</Th>
                <Th>Placa</Th>
                <Th>Año</Th>
                <Th>Kilometraje</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {vehicles.map((vehicle) => (
                <tr key={vehicle._id}>
                  <Td>
                    {vehicle.brand} {vehicle.model}
                  </Td>
                  <Td>{vehicle.plate}</Td>
                  <Td>{vehicle.year}</Td>
                  <Td>{vehicle.currentMileage.toLocaleString('es-CR')} km</Td>
                  <Td>
                    <StatusBadge status={vehicle.status} />
                  </Td>
                  <Td>
                    <div className="flex gap-3">
                      <Link
                        href={`/vehiculos/${vehicle._id}/editar`}
                        className="text-sm font-medium text-gray-700 hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(vehicle._id)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{children}</td>;
}

function StatusBadge({ status }: { status: Vehicle['status'] }) {
  const colors: Record<Vehicle['status'], string> = {
    activo: 'bg-green-100 text-green-800',
    en_mantenimiento: 'bg-yellow-100 text-yellow-800',
    inactivo: 'bg-gray-100 text-gray-800',
    vendido: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}>
      {VEHICLE_STATUS_LABELS[status]}
    </span>
  );
}

export default function VehiclesPage() {
  return (
    <AuthGuard>
      <VehiclesPageContent />
    </AuthGuard>
  );
}
