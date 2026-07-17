'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  createMaintenance,
  deleteMaintenance,
  getMaintenancesByVehicle,
  updateMaintenance,
  uploadMaintenancePhotos,
} from '@/lib/maintenances';
import type {
  CreateMaintenanceInput,
  Maintenance,
  MaintenanceType,
} from '@/types/maintenance';
import { MAINTENANCE_TYPE_LABELS } from '@/types/maintenance';

const TYPE_OPTIONS: MaintenanceType[] = [
  'preventivo',
  'reparacion',
  'llantas',
  'otro',
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR');
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

interface MaintenanceEditorProps {
  vehicleId: string;
  initialValues?: Maintenance;
  onSaved: (maintenance: Maintenance) => void;
  onClose: () => void;
}

function MaintenanceEditor({
  vehicleId,
  initialValues,
  onSaved,
  onClose,
}: MaintenanceEditorProps) {
  const [id, setId] = useState(initialValues?._id ?? null);
  const [photos, setPhotos] = useState<string[]>(initialValues?.photos ?? []);

  const [date, setDate] = useState(
    initialValues?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [type, setType] = useState<MaintenanceType>(
    initialValues?.type ?? 'preventivo',
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );
  const [cost, setCost] = useState(initialValues?.cost?.toString() ?? '');
  const [provider, setProvider] = useState(initialValues?.provider ?? '');
  const [mileageAtService, setMileageAtService] = useState(
    initialValues?.mileageAtService?.toString() ?? '',
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fields: CreateMaintenanceInput = {
        vehicleId,
        date,
        type,
        description,
        cost: Number(cost),
        provider,
        mileageAtService: Number(mileageAtService),
      };
      const result = id
        ? await updateMaintenance(id, fields)
        : await createMaintenance(fields);
      setId(result._id);
      setPhotos(result.photos);
      onSaved(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo guardar el mantenimiento',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0 || !id) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const result = await uploadMaintenancePhotos(id, files);
      setPhotos(result.photos);
      onSaved(result);
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : 'No se pudieron subir las fotos',
      );
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Fecha
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Tipo
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
              className="input mt-1"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {MAINTENANCE_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
            Descripción
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Costo (CRC)
            <input
              type="number"
              min={0}
              required
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Taller / proveedor
            <input
              required
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Kilometraje al momento del servicio
            <input
              type="number"
              min={0}
              required
              value={mileageAtService}
              onChange={(e) => setMileageAtService(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear mantenimiento'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            {id ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </form>

      {id && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Fotos (facturas / evidencia)
          </p>
          {photos.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <Image
                    src={url}
                    alt="Evidencia de mantenimiento"
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                </a>
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosChange}
            disabled={photoUploading}
            className="text-sm"
          />
          {photoUploading && (
            <p className="mt-1 text-sm text-gray-500">Subiendo…</p>
          )}
          {photoError && (
            <p className="mt-1 text-sm text-red-600">{photoError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MaintenanceSection({ vehicleId }: { vehicleId: string }) {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getMaintenancesByVehicle(vehicleId)
      .then((data) => {
        if (!ignore) setMaintenances(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el historial de mantenimientos',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [vehicleId]);

  function handleSaved(maintenance: Maintenance) {
    setMaintenances((prev) => {
      const exists = prev.some((m) => m._id === maintenance._id);
      const next = exists
        ? prev.map((m) => (m._id === maintenance._id ? maintenance : m))
        : [maintenance, ...prev];
      return [...next].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este mantenimiento? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await deleteMaintenance(id);
      setMaintenances((prev) => prev.filter((m) => m._id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar el mantenimiento',
      );
    }
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Mantenimientos</h2>
        {!showNewForm && (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Nuevo mantenimiento
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showNewForm && (
        <div className="mb-4">
          <MaintenanceEditor
            vehicleId={vehicleId}
            onSaved={handleSaved}
            onClose={() => setShowNewForm(false)}
          />
        </div>
      )}

      {!loading && !error && maintenances.length === 0 && !showNewForm && (
        <p className="text-sm text-gray-500">
          Todavía no hay mantenimientos registrados para este vehículo.
        </p>
      )}

      {maintenances.length > 0 && (
        <ul className="space-y-3">
          {maintenances.map((maintenance) =>
            editingId === maintenance._id ? (
              <li key={maintenance._id}>
                <MaintenanceEditor
                  vehicleId={vehicleId}
                  initialValues={maintenance}
                  onSaved={handleSaved}
                  onClose={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={maintenance._id}
                className="rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(maintenance.date)} ·{' '}
                      {MAINTENANCE_TYPE_LABELS[maintenance.type]}
                    </p>
                    <p className="text-sm text-gray-700">
                      {maintenance.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      {maintenance.provider} · {formatCRC(maintenance.cost)} ·{' '}
                      {maintenance.mileageAtService.toLocaleString('es-CR')} km
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => setEditingId(maintenance._id)}
                      className="text-sm font-medium text-gray-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(maintenance._id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
