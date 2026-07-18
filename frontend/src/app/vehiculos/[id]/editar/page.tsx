'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { MaintenanceSection } from '@/components/MaintenanceSection';
import { VehicleForm } from '@/components/VehicleForm';
import { ApiError } from '@/lib/api';
import { createAssignment } from '@/lib/assignments';
import { getDrivers } from '@/lib/drivers';
import { getVehicle, updateVehicle, uploadVehiclePhotos } from '@/lib/vehicles';
import type { Driver } from '@/types/driver';
import type { PopulatedDriverRef, Vehicle } from '@/types/vehicle';

function EditVehicleContent() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getVehicle(params.id)
      .then((data) => {
        if (!ignore) setVehicle(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el vehículo',
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
    getDrivers()
      .then((data) => {
        if (!ignore) setDrivers(data);
      })
      .catch(() => {
        // La lista de conductores es auxiliar; si falla, el selector queda vacío.
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const updated = await uploadVehiclePhotos(params.id, files);
      setVehicle(updated);
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : 'No se pudo subir la foto',
      );
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  }

  async function handleAssign() {
    if (!selectedDriverId) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await createAssignment({
        vehicleId: params.id,
        driverId: selectedDriverId,
      });
      const updated = await getVehicle(params.id);
      setVehicle(updated);
      setSelectedDriverId('');
    } catch (err) {
      setAssignError(
        err instanceof ApiError ? err.message : 'No se pudo asignar el conductor',
      );
    } finally {
      setAssigning(false);
    }
  }

  const currentDriver: PopulatedDriverRef | null =
    vehicle && typeof vehicle.currentDriverId === 'object'
      ? vehicle.currentDriverId
      : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Editar vehículo
      </h1>
      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {vehicle && (
        <>
          <VehicleForm
            initialValues={vehicle}
            submitLabel="Guardar cambios"
            onSubmit={(data) => updateVehicle(params.id, data)}
          />

          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Fotos del vehículo
            </h2>
            {vehicle.photos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-3">
                {vehicle.photos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={url}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      width={112}
                      height={112}
                      className="h-28 w-28 rounded-md object-cover"
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
              className="file-input"
            />
            {photoUploading && (
              <p className="mt-1 text-sm text-gray-500">Subiendo…</p>
            )}
            {photoError && (
              <p className="mt-1 text-sm text-red-600">{photoError}</p>
            )}
          </section>

          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Conductor asignado
            </h2>
            <p className="mb-3 text-sm text-gray-700">
              {currentDriver
                ? `Actual: ${currentDriver.fullName} (${currentDriver.phone})`
                : 'Este vehículo no tiene conductor asignado.'}
            </p>
            <div className="flex gap-3">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="input max-w-xs"
              >
                <option value="">Selecciona un conductor…</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.fullName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!selectedDriverId || assigning}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {assigning ? 'Asignando…' : 'Asignar / reasignar'}
              </button>
            </div>
            {assignError && (
              <p className="mt-2 text-sm text-red-600">{assignError}</p>
            )}
          </section>

          <MaintenanceSection vehicleId={params.id} />
        </>
      )}
    </main>
  );
}

export default function EditVehiclePage() {
  return (
    <AuthGuard>
      <EditVehicleContent />
    </AuthGuard>
  );
}
