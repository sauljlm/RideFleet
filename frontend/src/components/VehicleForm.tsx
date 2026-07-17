'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import type {
  CreateVehicleInput,
  Vehicle,
  VehicleStatus,
} from '@/types/vehicle';
import { VEHICLE_STATUS_LABELS } from '@/types/vehicle';

interface VehicleFormProps {
  initialValues?: Vehicle;
  onSubmit: (data: CreateVehicleInput) => Promise<unknown>;
  submitLabel: string;
}

const STATUS_OPTIONS: VehicleStatus[] = [
  'activo',
  'en_mantenimiento',
  'inactivo',
  'vendido',
];

export function VehicleForm({
  initialValues,
  onSubmit,
  submitLabel,
}: VehicleFormProps) {
  const router = useRouter();
  const [brand, setBrand] = useState(initialValues?.brand ?? '');
  const [model, setModel] = useState(initialValues?.model ?? '');
  const [year, setYear] = useState(
    initialValues?.year?.toString() ?? new Date().getFullYear().toString(),
  );
  const [color, setColor] = useState(initialValues?.color ?? '');
  const [plate, setPlate] = useState(initialValues?.plate ?? '');
  const [currentMileage, setCurrentMileage] = useState(
    initialValues?.currentMileage?.toString() ?? '0',
  );
  const [status, setStatus] = useState<VehicleStatus>(
    initialValues?.status ?? 'activo',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        brand,
        model,
        year: Number(year),
        color,
        plate,
        currentMileage: Number(currentMileage),
        status,
      });
      router.push('/vehiculos');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo guardar el vehículo',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Marca">
          <input
            required
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Modelo">
          <input
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Año">
          <input
            type="number"
            required
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Color">
          <input
            required
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Placa">
          <input
            required
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Kilometraje actual">
          <input
            type="number"
            min={0}
            required
            value={currentMileage}
            onChange={(e) => setCurrentMileage(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Estado">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VehicleStatus)}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {VEHICLE_STATUS_LABELS[option]}
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
          onClick={() => router.push('/vehiculos')}
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
