'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ChangeEvent, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { DriverForm } from '@/components/DriverForm';
import { PaymentSection } from '@/components/PaymentSection';
import { getAssignmentsByDriver } from '@/lib/assignments';
import { ApiError } from '@/lib/api';
import {
  getDriver,
  updateDriver,
  uploadDriverContractPhotos,
  uploadDriverPhoto,
} from '@/lib/drivers';
import type { Assignment, PopulatedVehicleRef } from '@/types/assignment';
import type { Driver } from '@/types/driver';

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

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [contractUploading, setContractUploading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

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

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const updated = await uploadDriverPhoto(params.id, file);
      setDriver(updated);
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : 'No se pudo subir la foto',
      );
    } finally {
      setPhotoUploading(false);
      event.target.value = '';
    }
  }

  async function handleContractChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setContractError(null);
    setContractUploading(true);
    try {
      const updated = await uploadDriverContractPhotos(params.id, files);
      setDriver(updated);
    } catch (err) {
      setContractError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo subir el contrato',
      );
    } finally {
      setContractUploading(false);
      event.target.value = '';
    }
  }

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
              className="text-sm"
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
              className="text-sm"
            />
            {contractUploading && (
              <p className="mt-1 text-sm text-gray-500">Subiendo…</p>
            )}
            {contractError && (
              <p className="mt-1 text-sm text-red-600">{contractError}</p>
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
