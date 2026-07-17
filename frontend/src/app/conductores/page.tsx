'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ApiError } from '@/lib/api';
import { deleteDriver, getDrivers } from '@/lib/drivers';
import { getPaymentsStatus } from '@/lib/payments';
import { DRIVER_STATUS_LABELS, type Driver } from '@/types/driver';
import type { DriverPaymentStatus } from '@/types/payment';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR');
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

function DriversPageContent() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<
    Record<string, DriverPaymentStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    Promise.all([getDrivers(), getPaymentsStatus()])
      .then(([driversData, statusData]) => {
        if (ignore) return;
        setDrivers(driversData);
        const map: Record<string, DriverPaymentStatus> = {};
        statusData.forEach((s) => {
          map[s.driverId] = s;
        });
        setPaymentStatus(map);
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Conductores</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <Link
            href="/vehiculos"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Vehículos
          </Link>
          <Link
            href="/conductores/nuevo"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nuevo conductor
          </Link>
        </div>
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
                <Th>Nombre</Th>
                <Th>Cédula</Th>
                <Th>Teléfono</Th>
                <Th>Monto semanal</Th>
                <Th>Estado</Th>
                <Th>Última semana pagada</Th>
                <Th>Adeudado actual</Th>
                <Th>Saldo pendiente</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {drivers.map((driver) => {
                const status = paymentStatus[driver._id];
                return (
                  <tr key={driver._id}>
                    <Td>{driver.fullName}</Td>
                    <Td>{driver.idNumber}</Td>
                    <Td>{driver.phone}</Td>
                    <Td>{formatCRC(driver.weeklyAmount)}</Td>
                    <Td>
                      <StatusBadge status={driver.status} />
                    </Td>
                    <Td>
                      {status?.lastPayment
                        ? formatDate(status.lastPayment.weekEnd)
                        : '—'}
                    </Td>
                    <Td>{status ? formatCRC(status.currentAmountDue) : '—'}</Td>
                    <Td>
                      {status ? (
                        status.pendingBalance > 0 ? (
                          <span className="font-medium text-red-600">
                            {formatCRC(status.pendingBalance)}
                          </span>
                        ) : (
                          formatCRC(0)
                        )
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-3">
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

function StatusBadge({ status }: { status: Driver['status'] }) {
  const colors: Record<Driver['status'], string> = {
    activo: 'bg-green-100 text-green-800',
    inactivo: 'bg-gray-100 text-gray-800',
    suspendido: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}>
      {DRIVER_STATUS_LABELS[status]}
    </span>
  );
}

export default function DriversPage() {
  return (
    <AuthGuard>
      <DriversPageContent />
    </AuthGuard>
  );
}
