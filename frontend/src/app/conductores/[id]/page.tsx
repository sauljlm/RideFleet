'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { PaymentSection } from '@/components/PaymentSection';
import { ApiError } from '@/lib/api';
import { getAssignmentsByDriver } from '@/lib/assignments';
import { getDriver } from '@/lib/drivers';
import { getPaymentsStatus } from '@/lib/payments';
import type { Assignment, PopulatedVehicleRef } from '@/types/assignment';
import {
  DRIVER_STATUS_LABELS,
  WEEKDAY_LABELS,
  type Driver,
} from '@/types/driver';
import type { DriverPaymentStatus } from '@/types/payment';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR', { timeZone: 'UTC' });
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

function paymentDayLabel(weekStartDay: number): string {
  return WEEKDAY_LABELS[(weekStartDay + 6) % 7];
}

function StatusBadge({ status }: { status: Driver['status'] }) {
  const colors: Record<Driver['status'], string> = {
    activo: 'bg-green-100 text-green-800',
    inactivo: 'bg-gray-100 text-gray-800',
    suspendido: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}
    >
      {DRIVER_STATUS_LABELS[status]}
    </span>
  );
}

function DriverDetailContent() {
  const params = useParams<{ id: string }>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const [paymentStatus, setPaymentStatus] = useState<DriverPaymentStatus | null>(
    null,
  );

  useEffect(() => {
    let ignore = false;

    getDriver(params.id)
      .then((data) => {
        if (!ignore) setDriver(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el conductor',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [params.id]);

  useEffect(() => {
    let ignore = false;

    getAssignmentsByDriver(params.id)
      .then((data) => {
        if (!ignore) setAssignments(data);
      })
      .catch(() => {
        // El historial es informativo; si falla, simplemente se omite.
      })
      .finally(() => {
        if (!ignore) setAssignmentsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [params.id]);

  useEffect(() => {
    let ignore = false;

    getPaymentsStatus()
      .then((data) => {
        if (!ignore) {
          setPaymentStatus(data.find((s) => s.driverId === params.id) ?? null);
        }
      })
      .catch(() => {
        // El estado de pago es informativo; si falla, simplemente se omite.
      });

    return () => {
      ignore = true;
    };
  }, [params.id]);

  const activeAssignment = assignments.find((a) => !a.endDate) ?? null;
  const currentVehicle: PopulatedVehicleRef | null =
    activeAssignment && typeof activeAssignment.vehicleId === 'object'
      ? activeAssignment.vehicleId
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {driver && (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {driver.photo ? (
                <Image
                  src={driver.photo}
                  alt={driver.fullName}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-xl font-medium text-gray-500">
                  {driver.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {driver.fullName}
                </h1>
                <div className="mt-1">
                  <StatusBadge status={driver.status} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/conductores"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver
              </Link>
              <Link
                href={`/conductores/${params.id}/editar`}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Editar
              </Link>
            </div>
          </div>

          <section className="mb-8 rounded-lg border border-gray-200">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
              Datos personales
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
              <InfoField label="Cédula" value={driver.idNumber} />
              <InfoField label="Teléfono" value={driver.phone} />
              <InfoField label="Correo" value={driver.email || '—'} />
              <InfoField label="Dirección" value={driver.address || '—'} />
            </dl>
          </section>

          <section className="mb-8 rounded-lg border border-gray-200">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
              Datos de contrato
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
              <InfoField
                label="Fecha de inicio"
                value={formatDate(driver.contractStartDate)}
              />
              <InfoField
                label="Monto semanal"
                value={formatCRC(driver.weeklyAmount)}
              />
              <InfoField
                label="Día de pago"
                value={paymentDayLabel(driver.weekStartDay)}
              />
              <InfoField
                label="Depósito"
                value={driver.deposit ? formatCRC(driver.deposit) : '—'}
              />
              <InfoField
                label="¿Depósito cubre primera semana?"
                value={driver.depositCoversFirstWeek ? 'Sí' : 'No'}
              />
            </dl>
          </section>

          <section className="mb-8 rounded-lg border border-gray-200">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
              Estado de pago actual
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
              {paymentStatus ? (
                <>
                  <InfoField
                    label="¿Pagó esta semana?"
                    value={paymentStatus.hasPaidCurrentWeek ? 'Sí' : 'No'}
                  />
                  <InfoField
                    label="Adeudado actual"
                    value={
                      paymentStatus.inGracePeriod
                        ? `${formatCRC(0)} (período de gracia)`
                        : formatCRC(paymentStatus.currentAmountDue)
                    }
                  />
                  <InfoField
                    label="Saldo pendiente"
                    value={formatCRC(paymentStatus.pendingBalance)}
                  />
                  <InfoField
                    label="Fecha de último pago"
                    value={
                      paymentStatus.lastPayment
                        ? formatDate(paymentStatus.lastPayment.paymentDate)
                        : '—'
                    }
                  />
                </>
              ) : (
                <p className="text-sm text-gray-500 sm:col-span-2">
                  No hay seguimiento de pagos para este conductor.
                </p>
              )}
            </dl>
          </section>

          <section className="mb-8 rounded-lg border border-gray-200">
            <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
              Vehículo asignado
            </h2>
            <div className="p-4">
              <p className="mb-3 text-sm text-gray-700">
                {currentVehicle
                  ? `Actual: ${currentVehicle.brand} ${currentVehicle.model} (${currentVehicle.plate})`
                  : 'Este conductor no tiene vehículo asignado.'}
              </p>
              {assignmentsLoading && (
                <p className="text-sm text-gray-500">Cargando historial…</p>
              )}
              {!assignmentsLoading && assignments.length > 0 && (
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                  {assignments.map((assignment) => {
                    const vehicle =
                      typeof assignment.vehicleId === 'string'
                        ? null
                        : (assignment.vehicleId as PopulatedVehicleRef);
                    return (
                      <li
                        key={assignment._id}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <span className="text-gray-900">
                          {vehicle
                            ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`
                            : 'Vehículo eliminado'}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(assignment.startDate)} —{' '}
                          {assignment.endDate
                            ? formatDate(assignment.endDate)
                            : 'activo'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {driver.contractPhotos.length > 0 && (
            <section className="mb-8 rounded-lg border border-gray-200">
              <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                Fotos del contrato
              </h2>
              <div className="flex flex-wrap gap-3 p-4">
                {driver.contractPhotos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={url}
                      alt="Contrato"
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-md object-cover"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          <PaymentSection driverId={params.id} weeklyAmount={driver.weeklyAmount} />
        </>
      )}
    </main>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function DriverDetailPage() {
  return (
    <AuthGuard>
      <DriverDetailContent />
    </AuthGuard>
  );
}
