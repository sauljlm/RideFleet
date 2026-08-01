'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { DriverForm } from '@/components/DriverForm';
import { PaymentSection } from '@/components/PaymentSection';
import {
  createAssignment,
  getAssignmentsByDriver,
  unassignDriver,
} from '@/lib/assignments';
import { ApiError } from '@/lib/api';
import {
  getDriver,
  updateDriver,
  uploadDriverContractPhotos,
  uploadDriverPhoto,
} from '@/lib/drivers';
import { getVehicles } from '@/lib/vehicles';
import type { Assignment, PopulatedVehicleRef } from '@/types/assignment';
import type { Driver } from '@/types/driver';
import type { Vehicle } from '@/types/vehicle';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR');
}

function EditDriverContent() {
  const params = useParams<{ id: string }>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [pendingContractPhotos, setPendingContractPhotos] = useState<File[]>(
    [],
  );
  const [contractUploading, setContractUploading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  const pendingPhotoPreview = useMemo(
    () => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : null),
    [pendingPhoto],
  );
  useEffect(() => {
    return () => {
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview);
    };
  }, [pendingPhotoPreview]);

  const pendingContractPreviews = useMemo(
    () => pendingContractPhotos.map((file) => URL.createObjectURL(file)),
    [pendingContractPhotos],
  );
  useEffect(() => {
    return () => {
      pendingContractPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingContractPreviews]);

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
    getVehicles()
      .then((data) => {
        if (!ignore) setVehicles(data);
      })
      .catch(() => {
        // La lista de vehículos es auxiliar; si falla, el selector queda vacío.
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleAssignVehicle() {
    if (!selectedVehicleId) return;
    setAssignError(null);
    setAssigning(true);
    try {
      await createAssignment({
        vehicleId: selectedVehicleId,
        driverId: params.id,
      });
      const [updatedAssignments, updatedVehicles] = await Promise.all([
        getAssignmentsByDriver(params.id),
        getVehicles(),
      ]);
      setAssignments(updatedAssignments);
      setVehicles(updatedVehicles);
      setSelectedVehicleId('');
    } catch (err) {
      setAssignError(
        err instanceof ApiError ? err.message : 'No se pudo asignar el vehículo',
      );
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassignVehicle() {
    setAssignError(null);
    setAssigning(true);
    try {
      await unassignDriver(params.id);
      const [updatedAssignments, updatedVehicles] = await Promise.all([
        getAssignmentsByDriver(params.id),
        getVehicles(),
      ]);
      setAssignments(updatedAssignments);
      setVehicles(updatedVehicles);
    } catch (err) {
      setAssignError(
        err instanceof ApiError ? err.message : 'No se pudo quitar la asignación',
      );
    } finally {
      setAssigning(false);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPendingPhoto(file);
    event.target.value = '';
  }

  async function handleSavePhoto() {
    if (!pendingPhoto) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const updated = await uploadDriverPhoto(params.id, pendingPhoto);
      setDriver(updated);
      setPendingPhoto(null);
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : 'No se pudo subir la foto',
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleContractChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setContractError(null);
    setPendingContractPhotos((prev) => [...prev, ...Array.from(files)]);
    event.target.value = '';
  }

  function handleRemovePendingContractPhoto(index: number) {
    setPendingContractPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveContractPhotos() {
    if (pendingContractPhotos.length === 0) return;
    setContractError(null);
    setContractUploading(true);
    try {
      const updated = await uploadDriverContractPhotos(
        params.id,
        pendingContractPhotos,
      );
      setDriver(updated);
      setPendingContractPhotos([]);
    } catch (err) {
      setContractError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo subir el contrato',
      );
    } finally {
      setContractUploading(false);
    }
  }

  const activeAssignment = assignments.find((a) => !a.endDate) ?? null;
  const currentVehicle: PopulatedVehicleRef | null =
    activeAssignment && typeof activeAssignment.vehicleId === 'object'
      ? activeAssignment.vehicleId
      : null;
  const availableVehicles = vehicles.filter((v) => !v.currentDriverId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Editar conductor
      </h1>
      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {driver && (
        <>
          <DriverForm
            initialValues={driver}
            submitLabel="Guardar cambios"
            onSuccessRedirect={() => `/conductores/${params.id}/editar`}
            onSubmit={(data) => updateDriver(params.id, data)}
          />

          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Foto del conductor
            </h2>
            {driver.photo && (
              <Image
                src={driver.photo}
                alt={driver.fullName}
                width={128}
                height={128}
                className="mb-3 h-32 w-32 rounded-md object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={photoUploading}
              className="file-input"
            />

            {pendingPhoto && pendingPhotoPreview && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-gray-500">Foto por guardar:</p>
                <div className="relative mb-3 w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingPhotoPreview}
                    alt=""
                    className="h-32 w-32 rounded-md object-cover opacity-75"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingPhoto(null)}
                    disabled={photoUploading}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
                    aria-label="Quitar foto"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={photoUploading}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {photoUploading ? 'Guardando…' : 'Guardar foto'}
                </button>
              </div>
            )}

            {photoError && (
              <p className="mt-1 text-sm text-red-600">{photoError}</p>
            )}
          </section>

          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Fotos del contrato
            </h2>
            {driver.contractPhotos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-3">
                {driver.contractPhotos.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleContractChange}
              disabled={contractUploading}
              className="file-input"
            />

            {pendingContractPhotos.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-gray-500">
                  Fotos por guardar:
                </p>
                <div className="mb-3 flex flex-wrap gap-3">
                  {pendingContractPreviews.map((url, index) => (
                    <div key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="h-24 w-24 rounded-md object-cover opacity-75"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePendingContractPhoto(index)}
                        disabled={contractUploading}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
                        aria-label="Quitar foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSaveContractPhotos}
                  disabled={contractUploading}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {contractUploading ? 'Guardando…' : 'Guardar fotos'}
                </button>
              </div>
            )}

            {contractError && (
              <p className="mt-1 text-sm text-red-600">{contractError}</p>
            )}
          </section>

          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Vehículo asignado
            </h2>
            <p className="mb-3 text-sm text-gray-700">
              {currentVehicle
                ? `Actual: ${currentVehicle.brand} ${currentVehicle.model} (${currentVehicle.plate})`
                : 'Este conductor no tiene vehículo asignado.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {availableVehicles.length > 0 && (
                <>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="input max-w-xs"
                  >
                    <option value="">Selecciona un vehículo…</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle._id} value={vehicle._id}>
                        {vehicle.brand} {vehicle.model} ({vehicle.plate})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignVehicle}
                    disabled={!selectedVehicleId || assigning}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {assigning ? 'Asignando…' : 'Asignar / reasignar'}
                  </button>
                </>
              )}
              {currentVehicle && (
                <button
                  type="button"
                  onClick={handleUnassignVehicle}
                  disabled={assigning}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {assigning ? 'Quitando…' : 'Quitar asignación'}
                </button>
              )}
            </div>
            {availableVehicles.length === 0 && (
              <p className="mt-3 text-sm text-gray-500">
                No hay vehículos disponibles.{' '}
                <Link
                  href="/vehiculos/nuevo"
                  className="font-medium text-gray-900 hover:underline"
                >
                  Registrar un vehículo
                </Link>
              </p>
            )}
            {assignError && (
              <p className="mt-2 text-sm text-red-600">{assignError}</p>
            )}
          </section>

          <section className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Historial de vehículos asignados
            </h2>
            {assignmentsLoading && (
              <p className="text-sm text-gray-500">Cargando…</p>
            )}
            {!assignmentsLoading && assignments.length === 0 && (
              <p className="text-sm text-gray-500">
                Este conductor no tiene asignaciones registradas.
              </p>
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
          </section>

          <PaymentSection driverId={params.id} weeklyAmount={driver.weeklyAmount} />
        </>
      )}
    </main>
  );
}

export default function EditDriverPage() {
  return (
    <AuthGuard>
      <EditDriverContent />
    </AuthGuard>
  );
}
