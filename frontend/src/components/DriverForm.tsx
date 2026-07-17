'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import type {
  CreateDriverInput,
  Driver,
  DriverStatus,
} from '@/types/driver';
import { DRIVER_STATUS_LABELS, WEEKDAY_LABELS } from '@/types/driver';

interface DriverFormProps {
  initialValues?: Driver;
  onSubmit: (data: CreateDriverInput) => Promise<unknown>;
  submitLabel: string;
  onSuccessRedirect: (id: string) => string;
}

const STATUS_OPTIONS: DriverStatus[] = ['activo', 'inactivo', 'suspendido'];

function toDateInputValue(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function DriverForm({
  initialValues,
  onSubmit,
  submitLabel,
  onSuccessRedirect,
}: DriverFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialValues?.fullName ?? '');
  const [idNumber, setIdNumber] = useState(initialValues?.idNumber ?? '');
  const [phone, setPhone] = useState(initialValues?.phone ?? '');
  const [email, setEmail] = useState(initialValues?.email ?? '');
  const [address, setAddress] = useState(initialValues?.address ?? '');
  const [contractStartDate, setContractStartDate] = useState(
    toDateInputValue(initialValues?.contractStartDate) ||
      new Date().toISOString().slice(0, 10),
  );
  const [weeklyAmount, setWeeklyAmount] = useState(
    initialValues?.weeklyAmount?.toString() ?? '',
  );
  const [weekStartDay, setWeekStartDay] = useState(
    initialValues?.weekStartDay?.toString() ?? '0',
  );
  const [deposit, setDeposit] = useState(
    initialValues?.deposit?.toString() ?? '',
  );
  const [status, setStatus] = useState<DriverStatus>(
    initialValues?.status ?? 'activo',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = (await onSubmit({
        fullName,
        idNumber,
        phone,
        email: email || undefined,
        address: address || undefined,
        contractStartDate,
        weeklyAmount: Number(weeklyAmount),
        weekStartDay: Number(weekStartDay),
        deposit: deposit ? Number(deposit) : undefined,
        status,
      })) as { _id: string };
      router.push(onSuccessRedirect(result._id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo guardar el conductor',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre completo">
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Cédula / identificación">
          <input
            required
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Teléfono">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Correo (opcional)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Dirección (opcional)">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Fecha de inicio de contrato">
          <input
            type="date"
            required
            value={contractStartDate}
            onChange={(e) => setContractStartDate(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Monto semanal (CRC)">
          <input
            type="number"
            min={0}
            required
            value={weeklyAmount}
            onChange={(e) => setWeeklyAmount(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Día de inicio de semana de pago">
          <select
            value={weekStartDay}
            onChange={(e) => setWeekStartDay(e.target.value)}
            className="input"
          >
            {WEEKDAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Depósito de garantía (CRC, opcional)">
          <input
            type="number"
            min={0}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Estado">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DriverStatus)}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DRIVER_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Guardando…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push('/conductores')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
