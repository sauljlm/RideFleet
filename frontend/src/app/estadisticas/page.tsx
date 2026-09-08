'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { ChartCard } from '@/components/charts/ChartCard';
import { ColumnChart } from '@/components/charts/ColumnChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import { LineChart } from '@/components/charts/LineChart';
import { ShareBar } from '@/components/charts/ShareBar';
import { StatTile } from '@/components/charts/StatTile';
import {
  CATEGORICAL,
  CHROME,
  SERIES,
  formatCompactCRC,
  formatCRC,
  formatDateShort,
  formatMonthFull,
  formatMonthLong,
  formatMonthShort,
} from '@/components/charts/chart-theme';
import { ApiError } from '@/lib/api';
import { getStatistics } from '@/lib/dashboard';
import { MAINTENANCE_TYPE_LABELS } from '@/types/maintenance';
import { PAYMENT_METHOD_LABELS } from '@/types/payment';
import { STATISTICS_RANGES, type Statistics } from '@/types/statistics';

const REVENUE_SERIES = [
  { key: 'revenue', name: 'Ingresos', color: SERIES.revenue },
  { key: 'maintenanceCost', name: 'Mantenimiento', color: SERIES.maintenance },
];

function StatisticsContent() {
  const [months, setMonths] = useState<number | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El período lo cambia el usuario, así que el estado de carga se marca en
  // el mismo click: hacerlo dentro del efecto encadena un render de más.
  function selectRange(next: number | null) {
    if (next === months) return;
    setLoading(true);
    setError(null);
    setMonths(next);
  }

  useEffect(() => {
    let ignore = false;

    getStatistics(months)
      .then((data) => {
        if (!ignore) setStats(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudieron cargar las estadísticas',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [months]);

  const totals = stats?.totals;
  const monthly = stats?.monthly ?? [];
  const hasMovement =
    (totals?.totalRevenue ?? 0) > 0 || (totals?.totalMaintenanceCost ?? 0) > 0;

  const linePoints = monthly.map((point) => ({
    label: formatMonthShort(point.month),
    fullLabel: formatMonthFull(point.month),
    values: {
      revenue: point.revenue,
      maintenanceCost: point.maintenanceCost,
    },
  }));

  const netPoints = monthly.map((point) => ({
    label: formatMonthShort(point.month),
    fullLabel: formatMonthFull(point.month),
    value: point.net,
  }));

  const maintenanceSlices = (stats?.maintenanceByType ?? []).map(
    (row, index) => ({
      key: row.type,
      name: MAINTENANCE_TYPE_LABELS[row.type],
      value: row.total,
      color: CATEGORICAL[index % CATEGORICAL.length],
      detail: `${row.count} ${row.count === 1 ? 'servicio' : 'servicios'}`,
    }),
  );

  const methodSegments = (stats?.paymentMethods ?? []).map((row, index) => ({
    key: row.method,
    name: PAYMENT_METHOD_LABELS[row.method],
    value: row.total,
    color: CATEGORICAL[index % CATEGORICAL.length],
    detail: `${row.count} ${row.count === 1 ? 'pago' : 'pagos'}`,
  }));

  const vehicleRows = (stats?.byVehicle ?? []).map((vehicle) => ({
    key: vehicle.vehicleId,
    label: `${vehicle.brand} ${vehicle.model}`,
    // En móvil basta el modelo y la placa; la marca aprieta la fila contra
    // la ganancia, igual que en las tablas del dashboard.
    shortLabel: vehicle.model,
    sublabel: vehicle.plate,
    trailing: {
      label: 'Ganancia',
      value: formatCRC(vehicle.profit),
      tone: (vehicle.profit < 0 ? 'negative' : 'positive') as
        | 'negative'
        | 'positive',
    },
    bars: [
      { seriesKey: 'revenue', value: vehicle.totalRevenue },
      { seriesKey: 'maintenanceCost', value: vehicle.totalMaintenanceCost },
    ],
  }));

  const driverRows = (stats?.byDriver ?? [])
    .filter((driver) => driver.totalPaid > 0)
    .map((driver) => ({
      key: driver.driverId,
      label: driver.fullName,
      sublabel: `${driver.paymentsCount} ${
        driver.paymentsCount === 1 ? 'pago' : 'pagos'
      }`,
      bars: [{ seriesKey: 'revenue', value: driver.totalPaid }],
    }));

  const rangeLabel = stats
    ? `${formatDateShort(stats.range.start)} – ${formatDateShort(stats.range.end)} · ${stats.range.months} ${stats.range.months === 1 ? 'mes' : 'meses'}`
    : '';

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-900 hover:underline"
        >
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          Estadísticas
        </h1>
        {stats && <p className="mt-1 text-sm text-gray-500">{rangeLabel}</p>}
      </div>

      {/* Un solo filtro, arriba de todo lo que afecta: las cifras de la
          pantalla siempre corresponden al mismo período y por eso concuerdan
          entre sí. La única excepción está rotulada como tal (la deuda
          vencida, que es de hoy). */}
      <div className="mb-6 flex w-fit max-w-full flex-wrap rounded-lg border border-gray-200 bg-white p-1">
        {STATISTICS_RANGES.map((range) => (
          <button
            key={range.label}
            type="button"
            onClick={() => selectRange(range.months)}
            aria-pressed={months === range.months}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              months === range.months
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && !stats && <p className="text-sm text-gray-500">Cargando…</p>}

      {stats && totals && (
        // Durante una recarga se mantiene el render anterior atenuado en vez
        // de vaciar la pantalla: no hay salto de layout ni parpadeo.
        <div
          className={`space-y-6 transition-opacity ${loading ? 'opacity-50' : ''}`}
        >
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <StatTile
                hero
                label="Ingresos totales"
                value={formatCRC(totals.totalRevenue)}
                hint={`${totals.paymentsCount} ${
                  totals.paymentsCount === 1
                    ? 'pago registrado'
                    : 'pagos registrados'
                } · ${formatCRC(totals.averageMonthlyRevenue)} por mes en promedio`}
                trend={monthly.map((point) => point.revenue)}
                trendLabel="Forma de los ingresos mes a mes"
              />
            </div>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:col-span-2">
              <StatTile
                label="Costos de mantenimiento"
                value={formatCRC(totals.totalMaintenanceCost)}
                hint={`${
                  totals.totalRevenue > 0
                    ? Math.round(
                        (totals.totalMaintenanceCost / totals.totalRevenue) *
                          100,
                      )
                    : 0
                }% de los ingresos`}
              />
              <StatTile
                label="Ingresos menos reparaciones"
                value={formatCRC(totals.netProfit)}
                tone={totals.netProfit < 0 ? 'negative' : 'positive'}
                hint={
                  totals.bestMonth
                    ? `Mejor mes: ${formatMonthLong(totals.bestMonth.month)} (${formatCompactCRC(totals.bestMonth.revenue)})`
                    : undefined
                }
              />
              <StatTile
                label="Deuda vencida hoy"
                value={formatCRC(totals.currentOverdueDebt)}
                tone={totals.currentOverdueDebt > 0 ? 'negative' : 'neutral'}
                hint="Lo que los conductores deben ahora mismo, sin importar el período elegido"
              />
              <StatTile
                label="Condonado"
                value={formatCRC(totals.totalForgiven)}
                hint="Faltantes de semanas dadas por saldadas, que no se cobraron"
              />
            </div>
          </div>

          <ChartCard
            title="Ingresos y costos por mes"
            subtitle="Lo cobrado y lo gastado en mantenimiento, mes a mes"
            series={REVENUE_SERIES}
            legendShape="line"
            isEmpty={!hasMovement}
            table={{
              columns: ['Mes', 'Ingresos', 'Mantenimiento', 'Neto'],
              rows: monthly.map((point) => [
                formatMonthLong(point.month),
                formatCRC(point.revenue),
                formatCRC(point.maintenanceCost),
                formatCRC(point.net),
              ]),
            }}
          >
            <LineChart
              points={linePoints}
              series={REVENUE_SERIES}
              extraTooltipRow={(point) => ({
                color: CHROME.muted,
                name: 'Neto',
                value: formatCRC(
                  point.values.revenue - point.values.maintenanceCost,
                ),
                muted: true,
              })}
            />
          </ChartCard>

          <ChartCard
            title="Ganancia neta por mes"
            subtitle="Ingresos del mes menos lo gastado en mantenimiento ese mes"
            isEmpty={!hasMovement}
            table={{
              columns: ['Mes', 'Neto'],
              rows: monthly.map((point) => [
                formatMonthLong(point.month),
                formatCRC(point.net),
              ]),
            }}
          >
            <ColumnChart points={netPoints} valueName="Ganancia neta" />
          </ChartCard>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <ChartCard
              title="Mantenimiento por tipo"
              subtitle="En qué se fue el gasto de taller"
              isEmpty={maintenanceSlices.length === 0}
              emptyMessage="No hay mantenimientos registrados en este período."
              table={{
                columns: ['Tipo', 'Servicios', 'Costo'],
                rows: (stats.maintenanceByType ?? []).map((row) => [
                  MAINTENANCE_TYPE_LABELS[row.type],
                  String(row.count),
                  formatCRC(row.total),
                ]),
              }}
            >
              <DonutChart slices={maintenanceSlices} centerLabel="en taller" />
            </ChartCard>

            <ChartCard
              title="Cómo pagan los conductores"
              subtitle="Reparto de lo cobrado según el método de pago"
              isEmpty={methodSegments.length === 0}
              emptyMessage="No hay pagos registrados en este período."
              table={{
                columns: ['Método', 'Pagos', 'Total'],
                rows: (stats.paymentMethods ?? []).map((row) => [
                  PAYMENT_METHOD_LABELS[row.method],
                  String(row.count),
                  formatCRC(row.total),
                ]),
              }}
            >
              <ShareBar segments={methodSegments} />
            </ChartCard>
          </div>

          <ChartCard
            title="Ingresos y costos por vehículo"
            subtitle="Ordenado por ganancia, de la mayor a la menor"
            series={REVENUE_SERIES}
            isEmpty={vehicleRows.length === 0}
            emptyMessage="Todavía no hay vehículos registrados."
            table={{
              columns: ['Vehículo', 'Ingresos', 'Mantenimiento', 'Ganancia'],
              rows: (stats.byVehicle ?? []).map((vehicle) => [
                `${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
                formatCRC(vehicle.totalRevenue),
                formatCRC(vehicle.totalMaintenanceCost),
                formatCRC(vehicle.profit),
              ]),
            }}
          >
            <HorizontalBarChart rows={vehicleRows} series={REVENUE_SERIES} />
          </ChartCard>

          <ChartCard
            title="Ingresos por conductor"
            subtitle="Total cobrado a cada conductor en el período"
            isEmpty={driverRows.length === 0}
            emptyMessage="Ningún conductor registró pagos en este período."
            table={{
              columns: ['Conductor', 'Pagos', 'Total cobrado', 'Condonado'],
              rows: (stats.byDriver ?? [])
                .filter((driver) => driver.totalPaid > 0)
                .map((driver) => [
                  driver.fullName,
                  String(driver.paymentsCount),
                  formatCRC(driver.totalPaid),
                  formatCRC(driver.forgivenTotal),
                ]),
            }}
          >
            <HorizontalBarChart
              rows={driverRows}
              series={[
                { key: 'revenue', name: 'Cobrado', color: SERIES.revenue },
              ]}
            />
          </ChartCard>
        </div>
      )}
    </main>
  );
}

export default function StatisticsPage() {
  return (
    <AuthGuard>
      <StatisticsContent />
    </AuthGuard>
  );
}
