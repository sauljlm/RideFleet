'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { ApiError } from '@/lib/api';
import { deleteDriver, getDrivers } from '@/lib/drivers';
import { getPaymentsStatus } from '@/lib/payments';
import { getVehicles } from '@/lib/vehicles';
import { WEEKDAY_LABELS, type Driver } from '@/types/driver';
import type { DriverPaymentStatus } from '@/types/payment';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR', { timeZone: 'UTC' });
}

function paymentDayLabel(weekStartDay: number): string {
  return WEEKDAY_LABELS[weekStartDay];
}

function DriversPageContent() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<
    Record<string, DriverPaymentStatus>
  >({});
  const [plateByDriver, setPlateByDriver] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    Promise.all([getDrivers(), getPaymentsStatus(), getVehicles()])
      .then(([driversData, statusData, vehiclesData]) => {
        if (ignore) return;
        setDrivers(driversData);

        const map: Record<string, DriverPaymentStatus> = {};
        statusData.forEach((s) => {
          map[s.driverId] = s;
        });
        setPaymentStatus(map);

        const plates: Record<string, string> = {};
        vehiclesData.forEach((vehicle) => {
          if (!vehicle.currentDriverId) return;
          const driverId =
            typeof vehicle.currentDriverId === 'string'
              ? vehicle.currentDriverId
              : vehicle.currentDriverId._id;
          plates[driverId] = vehicle.plate;
        });
        setPlateByDriver(plates);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar la lista de conductores',
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
    if (!confirm('¿Eliminar este conductor? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await deleteDriver(id);
      setDrivers((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : 'No se pudo eliminar el conductor',
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Conductores</h1>
        <Link
          href="/conductores/nuevo"
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nuevo conductor
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && drivers.length === 0 && (
        <p className="text-sm text-gray-500">
          Todavía no hay conductores registrados.
        </p>
      )}

      {!loading && drivers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Conductor</Th>
                <Th>Día de pago</Th>
                <Th>Fecha de último pago</Th>
                <Th>Placa</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {drivers.map((driver) => {
                const status = paymentStatus[driver._id];
                const plate = plateByDriver[driver._id];
                return (
                  <tr key={driver._id}>
                    <Td>
                      <Link
                        href={`/conductores/${driver._id}`}
                        className="flex items-center gap-3 font-medium text-gray-900 hover:underline"
                      >
                        <PhotoThumbnail
                          src={driver.photo}
                          alt={driver.fullName}
                          rounded="full"
                        />
                        {driver.fullName}
                      </Link>
                    </Td>
                    <Td>{paymentDayLabel(driver.weekStartDay)}</Td>
                    <Td>
                      {status?.lastPayment
                        ? formatDate(status.lastPayment.paymentDate)
                        : '—'}
                    </Td>
                    <Td>{plate ?? '—'}</Td>
                    <Td>
                      <div className="flex gap-3">
                        <Link
                          href={`/conductores/${driver._id}`}
                          className="text-sm font-medium text-gray-700 hover:underline"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/conductores/${driver._id}/editar`}
                          className="text-sm font-medium text-gray-700 hover:underline"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(driver._id)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
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

export default function DriversPage() {
  return (
    <AuthGuard>
      <DriversPageContent />
    </AuthGuard>
  );
}
