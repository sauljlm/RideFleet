'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { ApiError } from '@/lib/api';
import {
  getDashboardSummary,
  getMaintenanceAlerts,
  getProfitability,
  getUpcomingPayments,
} from '@/lib/dashboard';
import { getPaymentsStatus } from '@/lib/payments';
import {
  MAINTENANCE_ALERT_LABELS,
  type DashboardSummary,
  type MaintenanceAlert,
  type VehicleProfitability,
} from '@/types/dashboard';
import { WEEKDAY_LABELS } from '@/types/driver';
import type { DriverPaymentStatus } from '@/types/payment';

type DriverOverallStatus = 'al-dia' | 'pendiente' | 'atraso';

const DRIVER_STATUS_ORDER: Record<DriverOverallStatus, number> = {
  atraso: 0,
  pendiente: 1,
  'al-dia': 2,
};

const DRIVER_STATUS_LABELS: Record<DriverOverallStatus, string> = {
  'al-dia': 'Al día',
  pendiente: 'Pendiente',
  atraso: 'Atraso',
};

const DRIVER_STATUS_COLORS: Record<DriverOverallStatus, string> = {
  'al-dia': 'bg-green-100 text-green-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  atraso: 'bg-red-100 text-red-800',
};

const PENDING_STATUS_WINDOW_HOURS = 48;

// El conductor paga el día que empieza la semana siguiente (weekStartDay),
// no el último día de la semana que se está usando el carro: currentWeekEnd
// es ese último día, así que el vencimiento real es un día después.
function effectiveDueDate(currentWeekEndIso: string): Date {
  const due = new Date(currentWeekEndIso);
  due.setUTCDate(due.getUTCDate() + 1);
  return due;
}

function driverOverallStatus(status: DriverPaymentStatus): DriverOverallStatus {
  if (status.inGracePeriod || status.hasPaidCurrentWeek) return 'al-dia';
  if (status.pendingBalance > 0) return 'atraso';
  // Todavía no pagó esta semana, pero mientras falte más de 48 horas para
  // el vencimiento no está atrasado ni es urgente: sigue "al día".
  const hoursUntilDue =
    (effectiveDueDate(status.currentWeekEnd).getTime() - Date.now()) /
    (1000 * 60 * 60);
  return hoursUntilDue <= PENDING_STATUS_WINDOW_HOURS ? 'pendiente' : 'al-dia';
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

function paymentDayLabel(weekEndIso: string): string {
  // weekEnd es el último día de la semana de pago; el día de inicio (el que
  // configura el conductor y que mostramos como "día de pago") es el
  // siguiente día de la semana.
  const weekEndDay = new Date(weekEndIso).getUTCDay();
  return WEEKDAY_LABELS[(weekEndDay + 1) % 7];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR', { timeZone: 'UTC' });
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

function formatDueLabel(value: string): string {
  const due = new Date(value);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  return `Vence el ${formatDate(value)}`;
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

const PROFITABILITY_RANGE_STORAGE_KEY = 'ridefleet:profitability-range';

function loadStoredProfitabilityRange(): { start: string; end: string } {
  if (typeof window === 'undefined') return currentMonthRange();
  try {
    const raw = window.localStorage.getItem(PROFITABILITY_RANGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (typeof parsed?.start === 'string' && typeof parsed?.end === 'string') {
      return { start: parsed.start, end: parsed.end };
    }
  } catch {
    // localStorage corrupto o inaccesible: usar el rango por defecto
  }
  return currentMonthRange();
}

function storeProfitabilityRange(start: string, end: string): void {
  window.localStorage.setItem(
    PROFITABILITY_RANGE_STORAGE_KEY,
    JSON.stringify({ start, end }),
  );
}

function DashboardContent() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const [driverStatuses, setDriverStatuses] = useState<DriverPaymentStatus[]>(
    [],
  );
  const [driverStatusesLoading, setDriverStatusesLoading] = useState(true);
  const [driverStatusesError, setDriverStatusesError] = useState<
    string | null
  >(null);

  const [upcomingPayments, setUpcomingPayments] = useState<DriverPaymentStatus[]>([]);
  const [upcomingPaymentsLoading, setUpcomingPaymentsLoading] = useState(true);
  const [upcomingPaymentsError, setUpcomingPaymentsError] = useState<
    string | null
  >(null);

  const [startDate, setStartDate] = useState(
    () => loadStoredProfitabilityRange().start,
  );
  const [endDate, setEndDate] = useState(
    () => loadStoredProfitabilityRange().end,
  );
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
    getPaymentsStatus()
      .then((data) => {
        if (!ignore) setDriverStatuses(data);
      })
      .catch((err) => {
        if (!ignore) {
          setDriverStatusesError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar la lista de conductores',
          );
        }
      })
      .finally(() => {
        if (!ignore) setDriverStatusesLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    getUpcomingPayments()
      .then((data) => {
        if (!ignore) setUpcomingPayments(data);
      })
      .catch((err) => {
        if (!ignore) {
          setUpcomingPaymentsError(
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar los pagos próximos',
          );
        }
      })
      .finally(() => {
        if (!ignore) setUpcomingPaymentsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    getProfitability(startDate, endDate)
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
    storeProfitabilityRange(startDate, endDate);
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

  const sortedDriverStatuses = [...driverStatuses].sort(
    (a, b) =>
      DRIVER_STATUS_ORDER[driverOverallStatus(a)] -
      DRIVER_STATUS_ORDER[driverOverallStatus(b)],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      {summaryError && <p className="mb-4 text-sm text-red-600">{summaryError}</p>}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
          Pagos próximos (menos de 48 horas)
        </h2>
        {upcomingPaymentsLoading && (
          <p className="text-sm text-gray-500">Cargando…</p>
        )}
        {upcomingPaymentsError && (
          <p className="text-sm text-red-600">{upcomingPaymentsError}</p>
        )}
        {!upcomingPaymentsLoading &&
          !upcomingPaymentsError &&
          upcomingPayments.length === 0 && (
            <p className="text-sm text-gray-500">
              Ningún conductor tiene pagos por vencer en las próximas 48 horas.
            </p>
          )}
        {upcomingPayments.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Conductor</Th>
                  <Th>Vencimiento</Th>
                  <Th>Monto a pagar</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {upcomingPayments.map((status) => (
                  <tr key={status.driverId}>
                    <Td>
                      <Link
                        href={`/conductores/${status.driverId}/editar`}
                        className="flex items-center gap-3 font-medium text-gray-900 hover:underline"
                      >
                        <PhotoThumbnail
                          src={status.photo}
                          alt={status.fullName}
                          size={40}
                          rounded="full"
                        />
                        <span className="sm:hidden">
                          {firstName(status.fullName)}
                        </span>
                        <span className="hidden sm:inline">
                          {status.fullName}
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                        {formatDueLabel(
                          effectiveDueDate(status.currentWeekEnd).toISOString(),
                        )}
                      </span>
                    </Td>
                    <Td>{formatCRC(status.currentAmountDue)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Conductores
        </h2>
        {driverStatusesLoading && (
          <p className="text-sm text-gray-500">Cargando…</p>
        )}
        {driverStatusesError && (
          <p className="text-sm text-red-600">{driverStatusesError}</p>
        )}
        {!driverStatusesLoading &&
          !driverStatusesError &&
          sortedDriverStatuses.length === 0 && (
            <p className="text-sm text-gray-500">
              Todavía no hay conductores activos registrados.
            </p>
          )}
        {sortedDriverStatuses.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Conductor</Th>
                  <Th>Día de pago</Th>
                  <Th>Fecha de último pago</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedDriverStatuses.map((status) => {
                  const overallStatus = driverOverallStatus(status);
                  return (
                    <tr key={status.driverId}>
                      <Td>
                        <Link
                          href={`/conductores/${status.driverId}`}
                          className="flex items-center gap-3 font-medium text-gray-900 hover:underline"
                        >
                          <PhotoThumbnail
                            src={status.photo}
                            alt={status.fullName}
                            size={40}
                            rounded="full"
                          />
                          <span className="sm:hidden">
                            {firstName(status.fullName)}
                          </span>
                          <span className="hidden sm:inline">
                            {status.fullName}
                          </span>
                        </Link>
                      </Td>
                      <Td>{paymentDayLabel(status.currentWeekEnd)}</Td>
                      <Td>
                        {status.lastPayment
                          ? formatDate(status.lastPayment.paymentDate)
                          : '—'}
                      </Td>
                      <Td>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${DRIVER_STATUS_COLORS[overallStatus]}`}
                        >
                          {DRIVER_STATUS_LABELS[overallStatus]}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                        className="flex items-center gap-3 font-medium text-gray-900 hover:underline"
                      >
                        <PhotoThumbnail
                          src={alert.photo}
                          alt={`${alert.brand} ${alert.model}`}
                          size={40}
                        />
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
                  <Th>Rentabilidad</Th>
                  <Th>Ingresos</Th>
                  <Th>Costos de mantenimiento</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {profitability.map((row) => (
                  <tr key={row.vehicleId}>
                    <Td>
                      <Link
                        href={`/vehiculos/${row.vehicleId}/editar`}
                        className="flex items-center gap-3 font-medium text-gray-900 hover:underline"
                      >
                        <PhotoThumbnail
                          src={row.photo}
                          alt={`${row.brand} ${row.model}`}
                          size={40}
                        />
                        {row.brand} {row.model} ({row.plate})
                      </Link>
                    </Td>
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
                    <Td>{formatCRC(row.totalRevenue)}</Td>
                    <Td>{formatCRC(row.totalMaintenanceCost)}</Td>
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
    <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <p className="text-xs text-gray-500 sm:text-sm">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900 sm:text-2xl">
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
