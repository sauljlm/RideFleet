'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ApiError } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import {
  getDashboardSummary,
  getLatePayments,
  getMaintenanceAlerts,
  getProfitability,
} from '@/lib/dashboard';
import {
  MAINTENANCE_ALERT_LABELS,
  type DashboardSummary,
  type MaintenanceAlert,
  type VehicleProfitability,
} from '@/types/dashboard';
import type { DriverPaymentStatus } from '@/types/payment';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR');
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

function DashboardContent() {
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const [latePayments, setLatePayments] = useState<DriverPaymentStatus[]>([]);
  const [latePaymentsLoading, setLatePaymentsLoading] = useState(true);
  const [latePaymentsError, setLatePaymentsError] = useState<string | null>(null);

  const defaultRange = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [profitability, setProfitability] = useState<VehicleProfitability[]>([]);
  const [profitabilityLoading, setProfitabilityLoading] = useState(true);
  const [profitabilityError, setProfitabilityError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;
    getDashboardSummary()
      .then((data) => {
        if (!ignore) setSummary(data);
      })
      .catch((err) => {
        if (!ignore) {
          setSummaryError(
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar los totales',
          );
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    getMaintenanceAlerts()
      .then((data) => {
        if (!ignore) setAlerts(data);
      })
      .catch((err) => {
        if (!ignore) {
          setAlertsError(
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar las alertas de mantenimiento',
          );
        }
      })
      .finally(() => {
        if (!ignore) setAlertsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    getLatePayments()
      .then((data) => {
        if (!ignore) setLatePayments(data);
      })
      .catch((err) => {
        if (!ignore) {
          setLatePaymentsError(
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar los pagos atrasados',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLatePaymentsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const initialRange = currentMonthRange();

    getProfitability(initialRange.start, initialRange.end)
      .then((data) => {
        if (!ignore) setProfitability(data);
      })
      .catch((err) => {
        if (!ignore) {
          setProfitabilityError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar la rentabilidad',
          );
        }
      })
      .finally(() => {
        if (!ignore) setProfitabilityLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  function handleProfitabilitySubmit(event: FormEvent) {
    event.preventDefault();
    setProfitabilityLoading(true);
    setProfitabilityError(null);
    getProfitability(startDate, endDate)
      .then(setProfitability)
      .catch((err) => {
        setProfitabilityError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo cargar la rentabilidad',
        );
      })
      .finally(() => setProfitabilityLoading(false));
  }

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/vehiculos"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Vehículos
          </Link>
          <Link
            href="/conductores"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Conductores
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {summaryError && <p className="mb-4 text-sm text-red-600">{summaryError}</p>}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Vehículos activos" value={summary?.activeVehicles} />
        <SummaryCard label="Conductores activos" value={summary?.activeDrivers} />
        <SummaryCard
          label="Ingresos de la semana"
          value={summary ? formatCRC(summary.weekRevenue) : undefined}
        />
        <SummaryCard
          label="Ingresos del mes"
          value={summary ? formatCRC(summary.monthRevenue) : undefined}
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Mantenimiento próximo o vencido
        </h2>
        {alertsLoading && <p className="text-sm text-gray-500">Cargando…</p>}
        {alertsError && <p className="text-sm text-red-600">{alertsError}</p>}
        {!alertsLoading && !alertsError && alerts.length === 0 && (
          <p className="text-sm text-gray-500">
            Ningún vehículo tiene mantenimiento próximo o vencido.
          </p>
        )}
        {alerts.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Vehículo</Th>
                  <Th>Kilometraje actual</Th>
                  <Th>Último preventivo</Th>
                  <Th>Km desde el último</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {alerts.map((alert) => (
                  <tr key={alert.vehicleId}>
                    <Td>
                      <Link
                        href={`/vehiculos/${alert.vehicleId}/editar`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {alert.brand} {alert.model} ({alert.plate})
                      </Link>
                    </Td>
                    <Td>{alert.currentMileage.toLocaleString('es-CR')} km</Td>
                    <Td>
                      {alert.lastPreventiveMileage.toLocaleString('es-CR')} km ·{' '}
                      {formatDate(alert.lastPreventiveDate)}
                    </Td>
                    <Td>{alert.kmSinceLastPreventive.toLocaleString('es-CR')} km</Td>
                    <Td>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          alert.status === 'vencido'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {MAINTENANCE_ALERT_LABELS[alert.status]}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Conductores con pagos atrasados
        </h2>
        {latePaymentsLoading && <p className="text-sm text-gray-500">Cargando…</p>}
        {latePaymentsError && (
          <p className="text-sm text-red-600">{latePaymentsError}</p>
        )}
        {!latePaymentsLoading && !latePaymentsError && latePayments.length === 0 && (
          <p className="text-sm text-gray-500">
            Ningún conductor activo tiene pagos atrasados.
          </p>
        )}
        {latePayments.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Conductor</Th>
                  <Th>¿Pagó esta semana?</Th>
                  <Th>Adeudado actual</Th>
                  <Th>Saldo pendiente</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {latePayments.map((status) => (
                  <tr key={status.driverId}>
                    <Td>
                      <Link
                        href={`/conductores/${status.driverId}/editar`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {status.fullName}
                      </Link>
                    </Td>
                    <Td>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          status.hasPaidCurrentWeek
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {status.hasPaidCurrentWeek ? 'Sí' : 'No'}
                      </span>
                    </Td>
                    <Td>{formatCRC(status.currentAmountDue)}</Td>
                    <Td>
                      {status.pendingBalance > 0 ? (
                        <span className="font-medium text-red-600">
                          {formatCRC(status.pendingBalance)}
                        </span>
                      ) : (
                        formatCRC(0)
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Rentabilidad por vehículo
        </h2>
        <form
          onSubmit={handleProfitabilitySubmit}
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <label className="block text-sm font-medium text-gray-700">
            Desde
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Hasta
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Consultar
          </button>
        </form>

        {profitabilityLoading && <p className="text-sm text-gray-500">Cargando…</p>}
        {profitabilityError && (
          <p className="text-sm text-red-600">{profitabilityError}</p>
        )}
        {!profitabilityLoading && !profitabilityError && profitability.length === 0 && (
          <p className="text-sm text-gray-500">No hay vehículos registrados.</p>
        )}
        {profitability.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Vehículo</Th>
                  <Th>Ingresos</Th>
                  <Th>Costos de mantenimiento</Th>
                  <Th>Rentabilidad</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {profitability.map((row) => (
                  <tr key={row.vehicleId}>
                    <Td>
                      <Link
                        href={`/vehiculos/${row.vehicleId}/editar`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {row.brand} {row.model} ({row.plate})
                      </Link>
                    </Td>
                    <Td>{formatCRC(row.totalRevenue)}</Td>
                    <Td>{formatCRC(row.totalMaintenanceCost)}</Td>
                    <Td>
                      <span
                        className={
                          row.profit >= 0
                            ? 'font-medium text-green-700'
                            : 'font-medium text-red-600'
                        }
                      >
                        {formatCRC(row.profit)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {value === undefined ? '—' : value}
      </p>
    </div>
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
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
      {children}
    </td>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
