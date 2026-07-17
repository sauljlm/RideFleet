import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { getTodayUTC } from '../payments/week-range.util';
import { VehicleStatus } from '../vehicles/schemas/vehicle.schema';
import { VehiclesService } from '../vehicles/vehicles.service';

const MAINTENANCE_DUE_SOON_KM = 4000;
const MAINTENANCE_OVERDUE_KM = 5000;

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
  totalRevenue: number;
  totalMaintenanceCost: number;
  profit: number;
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

  async getSummary(): Promise<DashboardSummary> {
    const [vehicles, drivers] = await Promise.all([
      this.vehiclesService.findAll(),
      this.driversService.findAll(),
    ]);

    const activeVehicles = vehicles.filter(
      (v) => v.status === VehicleStatus.ACTIVO,
    ).length;
    const activeDrivers = drivers.filter(
      (d) => d.status === DriverStatus.ACTIVO,
    ).length;

    const today = getTodayUTC();

    const weekRevenueResult = await this.paymentModel.aggregate<{
      total: number;
    }>([
      { $match: { weekStart: { $lte: today }, weekEnd: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    );
    const monthRevenueResult = await this.paymentModel.aggregate<{
      total: number;
    }>([
      { $match: { paymentDate: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]);

    return {
      activeVehicles,
      activeDrivers,
      weekRevenue: weekRevenueResult[0]?.total ?? 0,
      monthRevenue: monthRevenueResult[0]?.total ?? 0,
    };
  }

  async getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    const lastPreventiveByVehicle = await this.maintenanceModel.aggregate<{
      _id: unknown;
      lastMileageAtService: number;
      lastDate: Date;
    }>([
      { $match: { type: MaintenanceType.PREVENTIVO } },
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

    const vehicles = await this.vehiclesService.findAll();
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

  async getLatePayments(): Promise<DriverPaymentStatus[]> {
    const statuses = await this.paymentsService.getCurrentStatus();
    return statuses.filter(
      (s) => !s.hasPaidCurrentWeek || s.pendingBalance > 0,
    );
  }

  async getProfitability(
    startDate: Date,
    endDate: Date,
  ): Promise<VehicleProfitability[]> {
    const vehicles = await this.vehiclesService.findAll();

    const revenueByVehicle = await this.paymentModel.aggregate<{
      _id: unknown;
      total: number;
    }>([
      { $match: { paymentDate: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$vehicleId', total: { $sum: '$amountPaid' } } },
    ]);
    const costByVehicle = await this.maintenanceModel.aggregate<{
      _id: unknown;
      total: number;
    }>([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
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
          totalRevenue,
          totalMaintenanceCost,
          profit: totalRevenue - totalMaintenanceCost,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }
}
