'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  createPayment,
  deletePayment,
  getPaymentsByDriver,
  getPendingWeeks,
  updatePayment,
} from '@/lib/payments';
import type {
  CreatePaymentInput,
  Payment,
  PaymentMethod,
  PendingWeek,
} from '@/types/payment';
import { PAYMENT_METHOD_LABELS } from '@/types/payment';

const METHOD_OPTIONS: PaymentMethod[] = ['efectivo', 'transferencia'];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-CR', { timeZone: 'UTC' });
}

function formatCRC(value: number): string {
  return `₡${value.toLocaleString('es-CR')}`;
}

function paymentStatusLabel(payment: Payment): string {
  // Se distingue la semana negociada de la pagada completa: el ingreso real
  // fue menor y conviene que se vea en el historial.
  if (payment.forgivenAmount > 0) {
    return `Saldada · ${formatCRC(payment.forgivenAmount)} condonados`;
  }
  // El saldo negativo es crédito a favor: aparece cuando el conductor paga de
  // más para ponerse al día y el excedente cubre las semanas siguientes.
  if (payment.remainingBalance < 0) return 'Pagado, con saldo a favor';
  if (payment.remainingBalance === 0) return 'Pagado completo';
  if (payment.amountPaid > 0) return 'Pago parcial';
  return 'No pagado';
}

function weekLabel(week: PendingWeek): string {
  const rango = `${formatDate(week.weekStart)} – ${formatDate(week.weekEnd)}`;
  if (week.isOverdue) return `${rango} · vencida el ${formatDate(week.dueDate)}`;
  if (week.isCurrent) return `${rango} · en curso, vence ${formatDate(week.dueDate)}`;
  return `${rango} · vence ${formatDate(week.dueDate)}`;
}

interface PaymentEditorProps {
  driverId: string;
  weeklyAmount: number;
  pendingWeeks: PendingWeek[];
  initialValues?: Payment;
  onSaved: () => void;
  onClose: () => void;
}

function PaymentEditor({
  driverId,
  weeklyAmount,
  pendingWeeks,
  initialValues,
  onSaved,
  onClose,
}: PaymentEditorProps) {
  // Al editar, la semana propia del pago no está entre las pendientes (ya
  // tiene registro), así que se agrega para poder dejarla o cambiarla.
  const weekOptions: PendingWeek[] = initialValues
    ? [
        {
          weekStart: initialValues.weekStart,
          weekEnd: initialValues.weekEnd,
          dueDate: initialValues.weekEnd,
          weeklyAmount: initialValues.weeklyAmount ?? weeklyAmount,
          previousBalance: initialValues.previousBalance,
          amountDue: initialValues.amountDue,
          isOverdue: false,
          isCurrent: false,
        },
        ...pendingWeeks,
      ]
    : pendingWeeks;

  const [weekStart, setWeekStart] = useState(
    initialValues?.weekStart ?? weekOptions[0]?.weekStart ?? '',
  );
  const selectedWeek =
    weekOptions.find((w) => w.weekStart === weekStart) ?? weekOptions[0];

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
  const [settled, setSettled] = useState(initialValues?.settled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountDue = selectedWeek?.amountDue ?? weeklyAmount;
  const paidNum = Number(amountPaid) || 0;
  const remainingPreview = amountDue - paidNum;
  const forgivenPreview = settled ? Math.max(0, remainingPreview) : 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (initialValues) {
        await updatePayment(initialValues._id, {
          paymentDate,
          weekStart,
          amountPaid: paidNum,
          method,
          settled,
        });
      } else {
        const input: CreatePaymentInput = {
          driverId,
          paymentDate,
          weekStart,
          amountPaid: paidNum,
          method,
          settled,
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

  if (weekOptions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          No hay semanas pendientes de registrar para este conductor.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Semana que se paga
          <select
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="input mt-1"
          >
            {weekOptions.map((week) => (
              <option key={week.weekStart} value={week.weekStart}>
                {weekLabel(week)}
              </option>
            ))}
          </select>
        </label>

        <p className="text-sm text-gray-700">
          Monto adeudado: <strong>{formatCRC(amountDue)}</strong> (
          {formatCRC(selectedWeek?.weeklyAmount ?? weeklyAmount)} semanal
          {(selectedWeek?.previousBalance ?? 0) > 0 &&
            ` + ${formatCRC(selectedWeek.previousBalance)} de saldo arrastrado`}
          {(selectedWeek?.previousBalance ?? 0) < 0 &&
            ` − ${formatCRC(-selectedWeek.previousBalance)} de saldo a favor`}
          )
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Fecha en que se recibió
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

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settled}
            onChange={(e) => setSettled(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Pago completo
            <span className="block text-xs text-gray-500">
              Da la semana por saldada aunque se haya cobrado menos de lo
              acordado. Para las semanas que negociás con el conductor: el
              faltante queda registrado como condonado y no se le arrastra.
            </span>
          </span>
        </label>

        <p className="text-sm text-gray-500">
          {forgivenPreview > 0
            ? `Se condonan ${formatCRC(forgivenPreview)} y la semana queda saldada.`
            : remainingPreview > 0
              ? `Queda debiendo ${formatCRC(remainingPreview)}, que se arrastra a la semana siguiente.`
              : remainingPreview < 0
                ? `Queda ${formatCRC(-remainingPreview)} a favor, que cubre las semanas siguientes.`
                : 'Queda al día con esta semana.'}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
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
  const [pendingWeeks, setPendingWeeks] = useState<PendingWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    Promise.all([getPaymentsByDriver(driverId), getPendingWeeks(driverId)])
      .then(([historial, semanas]) => {
        if (!ignore) {
          setPayments(historial);
          setPendingWeeks(semanas);
        }
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
            pendingWeeks={pendingWeeks}
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
                        pendingWeeks={pendingWeeks}
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
