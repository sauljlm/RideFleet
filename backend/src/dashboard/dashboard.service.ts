import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DriverStatus } from '../drivers/schemas/driver.schema';
import { DriversService } from '../drivers/drivers.service';
import {
  Maintenance,
  MaintenanceDocument,
  MaintenanceType,
} from '../maintenances/schemas/maintenance.schema';
import {
  DriverPaymentStatus,
  PaymentsService,
} from '../payments/payments.service';
import {
  Payment,
  PaymentDocument,
  PaymentMethod,
} from '../payments/schemas/payment.schema';
import { getTodayUTC, getWeekRange } from '../payments/week-range.util';
import { VehicleStatus } from '../vehicles/schemas/vehicle.schema';
import { VehiclesService } from '../vehicles/vehicles.service';

const MAINTENANCE_DUE_SOON_KM = 4000;
const MAINTENANCE_OVERDUE_KM = 5000;
const UPCOMING_PAYMENT_WINDOW_HOURS = 48;

export interface DashboardSummary {
  activeVehicles: number;
  activeDrivers: number;
  weekRevenue: number;
  monthRevenue: number;
}

export interface MaintenanceAlert {
  vehicleId: string;
  brand: string;
  model: string;
  plate: string;
  photo: string | null;
  currentMileage: number;
  lastPreventiveMileage: number;
  lastPreventiveDate: Date;
  kmSinceLastPreventive: number;
  status: 'proximo' | 'vencido';
}

export interface VehicleProfitability {
  vehicleId: string;
  brand: string;
  model: string;
  plate: string;
  photo: string | null;
  totalRevenue: number;
  totalMaintenanceCost: number;
  profit: number;
}


/** Un mes del historial, con lo cobrado y lo gastado dentro de él. */
export interface MonthlyPoint {
  /** 'YYYY-MM', en UTC, igual que el resto de fechas de la aplicación. */
  month: string;
  revenue: number;
  maintenanceCost: number;
  net: number;
}

export interface VehicleStatistics {
  vehicleId: string;
  brand: string;
  model: string;
  plate: string;
  photo: string | null;
  status: VehicleStatus;
  totalRevenue: number;
  totalMaintenanceCost: number;
  profit: number;
}

export interface DriverStatistics {
  driverId: string;
  fullName: string;
  photo: string | null;
  totalPaid: number;
  paymentsCount: number;
  forgivenTotal: number;
}

export interface MaintenanceTypeStatistics {
  type: MaintenanceType;
  total: number;
  count: number;
}

export interface PaymentMethodStatistics {
  method: PaymentMethod;
  total: number;
  count: number;
}

export interface StatisticsTotals {
  totalRevenue: number;
  totalMaintenanceCost: number;
  netProfit: number;
  totalForgiven: number;
  paymentsCount: number;
  averageMonthlyRevenue: number;
  bestMonth: MonthlyPoint | null;
  /**
   * Deuda vencida al día de hoy. A diferencia del resto, NO depende del rango
   * consultado: es una foto del presente, no un acumulado del período, y la
   * pantalla la rotula como tal.
   */
  currentOverdueDebt: number;
}

export interface Statistics {
  range: { start: Date; end: Date; months: number };
  totals: StatisticsTotals;
  monthly: MonthlyPoint[];
  byVehicle: VehicleStatistics[];
  byDriver: DriverStatistics[];
  maintenanceByType: MaintenanceTypeStatistics[];
  paymentMethods: PaymentMethodStatistics[];
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Serie continua mes a mes entre dos meses, con los huecos rellenos en cero.
 * Los meses sin movimiento tienen que aparecer: son parte de la historia, y
 * omitirlos haría que una gráfica de líneas uniera dos meses no consecutivos
 * como si fueran vecinos.
 */
function buildMonthlySeries(
  firstMonth: Date,
  lastMonth: Date,
  revenueByMonth: Map<string, number>,
  costByMonth: Map<string, number>,
): MonthlyPoint[] {
  const series: MonthlyPoint[] = [];
  const cursor = new Date(firstMonth);

  while (cursor.getTime() <= lastMonth.getTime()) {
    const key = monthKey(cursor);
    const revenue = revenueByMonth.get(key) ?? 0;
    const maintenanceCost = costByMonth.get(key) ?? 0;
    series.push({
      month: key,
      revenue,
      maintenanceCost,
      net: revenue - maintenanceCost,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return series;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
    private readonly paymentsService: PaymentsService,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,
  ) {}

  async getSummary(ownerId: string): Promise<DashboardSummary> {
    const ownerObjectId = new Types.ObjectId(ownerId);

    const [vehicles, drivers] = await Promise.all([
      this.vehiclesService.findAll(ownerId),
      this.driversService.findAll(ownerId),
    ]);

    const activeVehicles = vehicles.filter(
      (v) => v.status === VehicleStatus.ACTIVO,
    ).length;
    const activeDrivers = drivers.filter(
      (d) => d.status === DriverStatus.ACTIVO,
    ).length;

    const today = getTodayUTC();

    // Semana calendario lunes-domingo (weekStartDay 1), independiente del
    // día de pago de cada conductor: cada conductor tiene su propia ventana
    // de pago (weekStart/weekEnd en Payment), así que sumar por esa ventana
    // mezclaría pagos de "semanas de pago" distintas bajo una sola etiqueta
    // de "esta semana". En cambio filtramos por paymentDate, igual que
    // monthRevenue, para que ambos reflejen lo efectivamente cobrado dentro
    // del período calendario mostrado.
    const { weekStart, weekEnd } = getWeekRange(today, 1);

    const weekRevenueResult = await this.paymentModel.aggregate<{
      total: number;
    }>([
      {
        $match: {
          ownerId: ownerObjectId,
          paymentDate: { $gte: weekStart, $lte: weekEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]);

    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );
    const monthRevenueResult = await this.paymentModel.aggregate<{
      total: number;
    }>([
      {
        $match: {
          ownerId: ownerObjectId,
          paymentDate: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]);

    return {
      activeVehicles,
      activeDrivers,
      weekRevenue: weekRevenueResult[0]?.total ?? 0,
      monthRevenue: monthRevenueResult[0]?.total ?? 0,
    };
  }

  async getMaintenanceAlerts(ownerId: string): Promise<MaintenanceAlert[]> {
    const ownerObjectId = new Types.ObjectId(ownerId);

    const lastPreventiveByVehicle = await this.maintenanceModel.aggregate<{
      _id: unknown;
      lastMileageAtService: number;
      lastDate: Date;
    }>([
      { $match: { ownerId: ownerObjectId, type: MaintenanceType.PREVENTIVO } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$vehicleId',
          lastMileageAtService: { $first: '$mileageAtService' },
          lastDate: { $first: '$date' },
        },
      },
    ]);

    const lastPreventiveMap = new Map(
      lastPreventiveByVehicle.map((r) => [String(r._id), r]),
    );

    const vehicles = await this.vehiclesService.findAll(ownerId);
    const alerts: MaintenanceAlert[] = [];

    for (const vehicle of vehicles) {
      if (
        vehicle.status === VehicleStatus.VENDIDO ||
        vehicle.status === VehicleStatus.INACTIVO
      ) {
        continue;
      }

      const last = lastPreventiveMap.get(vehicle._id.toString());
      if (!last) {
        continue;
      }

      const kmSinceLastPreventive =
        vehicle.currentMileage - last.lastMileageAtService;

      if (kmSinceLastPreventive < MAINTENANCE_DUE_SOON_KM) {
        continue;
      }

      alerts.push({
        vehicleId: vehicle._id.toString(),
        brand: vehicle.brand,
        model: vehicle.model,
        plate: vehicle.plate,
        photo: vehicle.photos[0] ?? null,
        currentMileage: vehicle.currentMileage,
        lastPreventiveMileage: last.lastMileageAtService,
        lastPreventiveDate: last.lastDate,
        kmSinceLastPreventive,
        status:
          kmSinceLastPreventive >= MAINTENANCE_OVERDUE_KM
            ? 'vencido'
            : 'proximo',
      });
    }

    return alerts.sort(
      (a, b) => b.kmSinceLastPreventive - a.kmSinceLastPreventive,
    );
  }

  /**
   * Conductores que requieren cobro: los que ya están atrasados y los que
   * vencen dentro de la ventana próxima.
   *
   * Antes esta lista solo miraba el vencimiento de la semana en curso, así
   * que un conductor que no pagaba desaparecía de ella al día siguiente:
   * la semana avanzaba, el vencimiento pasaba a estar a 7 días y el atraso
   * dejaba de anunciarse. Ahora el atraso lo determina el ledger y no
   * caduca hasta que se salda.
   */
  async getUpcomingPayments(ownerId: string): Promise<DriverPaymentStatus[]> {
    const statuses = await this.paymentsService.getCurrentStatus(ownerId);
    const now = Date.now();

    return statuses
      .filter((s) => {
        if (s.status === 'atraso') return true;
        if (s.inGracePeriod || s.dueSoonAmount <= 0) return false;
        const hoursUntilDue =
          (s.nextDueDate.getTime() - now) / (1000 * 60 * 60);
        return hoursUntilDue <= UPCOMING_PAYMENT_WINDOW_HOURS;
      })
      .sort((a, b) => {
        // Primero los atrasados, y dentro de cada grupo el vencimiento más
        // antiguo arriba.
        if (a.status !== b.status) return a.status === 'atraso' ? -1 : 1;
        return a.nextDueDate.getTime() - b.nextDueDate.getTime();
      });
  }

  async getProfitability(
    startDate: Date,
    endDate: Date,
    ownerId: string,
  ): Promise<VehicleProfitability[]> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const vehicles = await this.vehiclesService.findAll(ownerId);

    const revenueByVehicle = await this.paymentModel.aggregate<{
      _id: unknown;
      total: number;
    }>([
      {
        $match: {
          ownerId: ownerObjectId,
          paymentDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: '$vehicleId', total: { $sum: '$amountPaid' } } },
    ]);
    const costByVehicle = await this.maintenanceModel.aggregate<{
      _id: unknown;
      total: number;
    }>([
      {
        $match: {
          ownerId: ownerObjectId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: '$vehicleId', total: { $sum: '$cost' } } },
    ]);

    const revenueMap = new Map(
      revenueByVehicle.map((r) => [String(r._id), r.total]),
    );
    const costMap = new Map(costByVehicle.map((r) => [String(r._id), r.total]));

    return vehicles
      .map((vehicle) => {
        const id = vehicle._id.toString();
        const totalRevenue = revenueMap.get(id) ?? 0;
        const totalMaintenanceCost = costMap.get(id) ?? 0;
        return {
          vehicleId: id,
          brand: vehicle.brand,
          model: vehicle.model,
          plate: vehicle.plate,
          photo: vehicle.photos[0] ?? null,
          totalRevenue,
          totalMaintenanceCost,
          profit: totalRevenue - totalMaintenanceCost,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  /**
   * Todo lo que alimenta la pantalla de estadísticas, en una sola llamada:
   * la serie mensual, los totales y los desgloses por vehículo, conductor,
   * tipo de mantenimiento y método de pago.
   *
   * `months` recorta el período a los últimos N meses (incluido el actual).
   * Sin él se devuelve el historial completo, desde el primer movimiento
   * registrado. Todos los cortes se calculan sobre el mismo rango para que
   * las cifras de la pantalla concuerden entre sí.
   */
  async getStatistics(ownerId: string, months?: number): Promise<Statistics> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const today = getTodayUTC();
    const currentMonthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );
    const periodEnd = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );

    const periodStart =
      months === undefined
        ? await this.findFirstActivityMonth(ownerObjectId, currentMonthStart)
        : new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth() - (months - 1),
              1,
            ),
          );

    const paymentMatch = {
      ownerId: ownerObjectId,
      paymentDate: { $gte: periodStart, $lte: periodEnd },
    };
    const maintenanceMatch = {
      ownerId: ownerObjectId,
      date: { $gte: periodStart, $lte: periodEnd },
    };

    const [
      revenueByMonth,
      costByMonth,
      paymentTotals,
      revenueByVehicle,
      costByVehicle,
      paidByDriver,
      costByType,
      revenueByMethod,
      vehicles,
      drivers,
      driverStatuses,
    ] = await Promise.all([
      this.paymentModel.aggregate<{ _id: string; total: number }>([
        { $match: paymentMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$paymentDate',
                timezone: 'UTC',
              },
            },
            total: { $sum: '$amountPaid' },
          },
        },
      ]),
      this.maintenanceModel.aggregate<{ _id: string; total: number }>([
        { $match: maintenanceMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$date',
                timezone: 'UTC',
              },
            },
            total: { $sum: '$cost' },
          },
        },
      ]),
      this.paymentModel.aggregate<{
        total: number;
        forgiven: number;
        count: number;
      }>([
        { $match: paymentMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$amountPaid' },
            forgiven: { $sum: '$forgivenAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.paymentModel.aggregate<{ _id: unknown; total: number }>([
        { $match: paymentMatch },
        { $group: { _id: '$vehicleId', total: { $sum: '$amountPaid' } } },
      ]),
      this.maintenanceModel.aggregate<{ _id: unknown; total: number }>([
        { $match: maintenanceMatch },
        { $group: { _id: '$vehicleId', total: { $sum: '$cost' } } },
      ]),
      this.paymentModel.aggregate<{
        _id: unknown;
        total: number;
        count: number;
        forgiven: number;
      }>([
        { $match: paymentMatch },
        {
          $group: {
            _id: '$driverId',
            total: { $sum: '$amountPaid' },
            count: { $sum: 1 },
            forgiven: { $sum: '$forgivenAmount' },
          },
        },
      ]),
      this.maintenanceModel.aggregate<{
        _id: MaintenanceType;
        total: number;
        count: number;
      }>([
        { $match: maintenanceMatch },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$cost' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.paymentModel.aggregate<{
        _id: PaymentMethod;
        total: number;
        count: number;
      }>([
        { $match: paymentMatch },
        {
          $group: {
            _id: '$method',
            total: { $sum: '$amountPaid' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.vehiclesService.findAll(ownerId),
      this.driversService.findAll(ownerId),
      this.paymentsService.getCurrentStatus(ownerId),
    ]);

    const monthly = buildMonthlySeries(
      periodStart,
      currentMonthStart,
      new Map(revenueByMonth.map((r) => [r._id, r.total])),
      new Map(costByMonth.map((r) => [r._id, r.total])),
    );

    const totalRevenue = paymentTotals[0]?.total ?? 0;
    const totalMaintenanceCost = costByType.reduce((s, r) => s + r.total, 0);

    const revenueVehicleMap = new Map(
      revenueByVehicle.map((r) => [String(r._id), r.total]),
    );
    const costVehicleMap = new Map(
      costByVehicle.map((r) => [String(r._id), r.total]),
    );
    const driverMap = new Map(paidByDriver.map((r) => [String(r._id), r]));

    const byVehicle: VehicleStatistics[] = vehicles
      .map((vehicle) => {
        const id = vehicle._id.toString();
        const vehicleRevenue = revenueVehicleMap.get(id) ?? 0;
        const vehicleCost = costVehicleMap.get(id) ?? 0;
        return {
          vehicleId: id,
          brand: vehicle.brand,
          model: vehicle.model,
          plate: vehicle.plate,
          photo: vehicle.photos[0] ?? null,
          status: vehicle.status,
          totalRevenue: vehicleRevenue,
          totalMaintenanceCost: vehicleCost,
          profit: vehicleRevenue - vehicleCost,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const byDriver: DriverStatistics[] = drivers
      .map((driver) => {
        const row = driverMap.get(driver._id.toString());
        return {
          driverId: driver._id.toString(),
          fullName: driver.fullName,
          photo: driver.photo ?? null,
          totalPaid: row?.total ?? 0,
          paymentsCount: row?.count ?? 0,
          forgivenTotal: row?.forgiven ?? 0,
        };
      })
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Solo los tipos y métodos con movimiento: un segmento de valor cero en
    // una gráfica de composición no aporta nada y ensucia la leyenda.
    const maintenanceByType: MaintenanceTypeStatistics[] = costByType
      .filter((r) => r.total > 0)
      .map((r) => ({ type: r._id, total: r.total, count: r.count }))
      .sort((a, b) => b.total - a.total);

    const paymentMethods: PaymentMethodStatistics[] = revenueByMethod
      .filter((r) => r.total > 0)
      .map((r) => ({ method: r._id, total: r.total, count: r.count }))
      .sort((a, b) => b.total - a.total);

    const bestMonth =
      totalRevenue > 0
        ? monthly.reduce((best, point) =>
            point.revenue > best.revenue ? point : best,
          )
        : null;

    return {
      range: { start: periodStart, end: periodEnd, months: monthly.length },
      totals: {
        totalRevenue,
        totalMaintenanceCost,
        netProfit: totalRevenue - totalMaintenanceCost,
        totalForgiven: paymentTotals[0]?.forgiven ?? 0,
        paymentsCount: paymentTotals[0]?.count ?? 0,
        averageMonthlyRevenue:
          monthly.length > 0 ? totalRevenue / monthly.length : 0,
        bestMonth,
        currentOverdueDebt: driverStatuses.reduce(
          (sum, status) => sum + Math.max(status.overdueAmount, 0),
          0,
        ),
      },
      monthly,
      byVehicle,
      byDriver,
      maintenanceByType,
      paymentMethods,
    };
  }

  /**
   * Primer mes con movimiento (pago o mantenimiento). Si la cuenta todavía no
   * tiene ninguno, el historial arranca en el mes en curso: así la pantalla
   * siempre tiene un rango que rotular en vez de un estado vacío aparte.
   */
  private async findFirstActivityMonth(
    ownerObjectId: Types.ObjectId,
    fallback: Date,
  ): Promise<Date> {
    const [firstPayment, firstMaintenance] = await Promise.all([
      this.paymentModel
        .findOne({ ownerId: ownerObjectId })
        .sort({ paymentDate: 1 })
        .select('paymentDate')
        .lean(),
      this.maintenanceModel
        .findOne({ ownerId: ownerObjectId })
        .sort({ date: 1 })
        .select('date')
        .lean(),
    ]);

    const dates = [firstPayment?.paymentDate, firstMaintenance?.date].filter(
      (d): d is Date => d instanceof Date,
    );
    if (dates.length === 0) return fallback;

    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    return new Date(
      Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1),
    );
  }
}
