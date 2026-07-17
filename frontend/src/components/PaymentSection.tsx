'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  createPayment,
  deletePayment,
  getPaymentsByDriver,
  updatePayment,
} from '@/lib/payments';
import type { CreatePaymentInput, Payment, PaymentMethod } from '@/types/payment';
import { PAYMENT_METHOD_LABELS } from '@/types/payment';

const METHOD_OPTIONS: PaymentMethod[] = ['efectivo', 'transferencia'];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR');
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

function paymentStatusLabel(payment: Payment): string {
  if (payment.remainingBalance === 0) return 'Pagado completo';
  if (payment.amountPaid > 0) return 'Pago parcial';
  return 'No pagado';
}

interface PaymentEditorProps {
  driverId: string;
  weeklyAmount: number;
  previewAmountDue: number;
  initialValues?: Payment;
  onSaved: () => void;
  onClose: () => void;
}

function PaymentEditor({
  driverId,
  weeklyAmount,
  previewAmountDue,
  initialValues,
  onSaved,
  onClose,
}: PaymentEditorProps) {
  const [paymentDate, setPaymentDate] = useState(
    initialValues?.paymentDate.slice(0, 10) ??
      new Date().toISOString().slice(0, 10),
  );
  const [amountPaid, setAmountPaid] = useState(
    initialValues?.amountPaid?.toString() ?? '',
  );
  const [method, setMethod] = useState<PaymentMethod>(
    initialValues?.method ?? 'efectivo',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountDue = initialValues?.amountDue ?? previewAmountDue;
  const paidNum = Number(amountPaid) || 0;
  const remainingPreview = Math.max(0, amountDue - paidNum);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (initialValues) {
        await updatePayment(initialValues._id, {
          paymentDate,
          amountPaid: paidNum,
          method,
        });
      } else {
        const input: CreatePaymentInput = {
          driverId,
          paymentDate,
          amountPaid: paidNum,
          method,
        };
        await createPayment(input);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo guardar el pago',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
      <p className="mb-3 text-sm text-gray-700">
        Monto adeudado: <strong>{formatCRC(amountDue)}</strong> (
        {formatCRC(weeklyAmount)} semanal
        {amountDue > weeklyAmount &&
          ` + ${formatCRC(amountDue - weeklyAmount)} de saldo pendiente`}
        )
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Fecha de pago
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Método
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="input mt-1"
            >
              {METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PAYMENT_METHOD_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Monto pagado (CRC)
            <input
              type="number"
              min={0}
              required
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        <p className="text-sm text-gray-500">
          Saldo pendiente resultante: {formatCRC(remainingPreview)}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving
              ? 'Guardando…'
              : initialValues
                ? 'Guardar cambios'
                : 'Registrar pago'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export function PaymentSection({
  driverId,
  weeklyAmount,
}: {
  driverId: string;
  weeklyAmount: number;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    getPaymentsByDriver(driverId)
      .then((data) => {
        if (!ignore) setPayments(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el historial de pagos',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [driverId, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        '¿Eliminar este pago? Los pagos posteriores de este conductor se recalcularán. Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    try {
      await deletePayment(id);
      if (editingId === id) setEditingId(null);
      refresh();
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : 'No se pudo eliminar el pago',
      );
    }
  }

  const previewAmountDue = weeklyAmount + (payments[0]?.remainingBalance ?? 0);

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Pagos</h2>
        {!showNewForm && (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Nuevo pago
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showNewForm && (
        <div className="mb-4">
          <PaymentEditor
            driverId={driverId}
            weeklyAmount={weeklyAmount}
            previewAmountDue={previewAmountDue}
            onSaved={refresh}
            onClose={() => setShowNewForm(false)}
          />
        </div>
      )}

      {!loading && !error && payments.length === 0 && !showNewForm && (
        <p className="text-sm text-gray-500">
          Todavía no hay pagos registrados para este conductor.
        </p>
      )}

      {payments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Semana</Th>
                <Th>Fecha de pago</Th>
                <Th>Adeudado</Th>
                <Th>Pagado</Th>
                <Th>Saldo</Th>
                <Th>Método</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {payments.map((payment) =>
                editingId === payment._id ? (
                  <tr key={payment._id}>
                    <td colSpan={8} className="px-4 py-3">
                      <PaymentEditor
                        driverId={driverId}
                        weeklyAmount={weeklyAmount}
                        previewAmountDue={payment.amountDue}
                        initialValues={payment}
                        onSaved={refresh}
                        onClose={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={payment._id}>
                    <Td>
                      {formatDate(payment.weekStart)} –{' '}
                      {formatDate(payment.weekEnd)}
                    </Td>
                    <Td>{formatDate(payment.paymentDate)}</Td>
                    <Td>{formatCRC(payment.amountDue)}</Td>
                    <Td>{formatCRC(payment.amountPaid)}</Td>
                    <Td>{formatCRC(payment.remainingBalance)}</Td>
                    <Td>{PAYMENT_METHOD_LABELS[payment.method]}</Td>
                    <Td>{paymentStatusLabel(payment)}</Td>
                    <Td>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditingId(payment._id)}
                          className="text-sm font-medium text-gray-700 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(payment._id)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </Td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
