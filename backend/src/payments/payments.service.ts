import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssignmentsService } from '../assignments/assignments.service';
import { DriverStatus } from '../drivers/schemas/driver.schema';
import { DriversService } from '../drivers/drivers.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import {
  getBillingWeekRange,
  getTodayUTC,
  getWeekRange,
} from './week-range.util';

export interface DriverPaymentStatus {
  driverId: string;
  fullName: string;
  photo: string | null;
  weeklyAmount: number;
  lastPayment: {
    weekStart: Date;
    weekEnd: Date;
    paymentDate: Date;
    remainingBalance: number;
  } | null;
  currentAmountDue: number;
  pendingBalance: number;
  hasPaidCurrentWeek: boolean;
  inGracePeriod: boolean;
  currentWeekEnd: Date;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly driversService: DriversService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  async create(
    dto: CreatePaymentDto,
    ownerId: string,
  ): Promise<PaymentDocument> {
    const driver = await this.driversService.findOne(dto.driverId, ownerId);

    const activeAssignment = await this.assignmentsService.findActiveByDriver(
      dto.driverId,
      ownerId,
    );
    if (!activeAssignment) {
      throw new BadRequestException(
        'El conductor no tiene un vehículo asignado actualmente',
      );
    }

    // Un pago hecho el día exacto de vencimiento (weekStartDay) salda la
    // semana que acaba de terminar, no la que empieza ese mismo día: debe
    // usarse el mismo criterio "de cobro" que getCurrentStatus, o el pago
    // quedaría registrado bajo una semana distinta a la que el estado
    // considera pendiente.
    const { weekStart, weekEnd } = getBillingWeekRange(
      new Date(dto.paymentDate),
      driver.weekStartDay,
    );

    const existing = await this.paymentModel
      .findOne({ driverId: dto.driverId, ownerId, weekStart })
      .exec();
    if (existing) {
      throw new BadRequestException(
        'Ya existe un pago registrado para esa semana de este conductor',
      );
    }

    const previousPayment = await this.paymentModel
      .findOne({
        driverId: dto.driverId,
        ownerId,
        weekStart: { $lt: weekStart },
      })
      .sort({ weekStart: -1 })
      .exec();
    const previousBalance = previousPayment?.remainingBalance ?? 0;
    const amountDue = driver.weeklyAmount + previousBalance;
    const remainingBalance = Math.max(0, amountDue - dto.amountPaid);

    const payment = new this.paymentModel({
      ownerId,
      driverId: dto.driverId,
      vehicleId: activeAssignment.vehicleId,
      paymentDate: dto.paymentDate,
      weekStart,
      weekEnd,
      previousBalance,
      amountDue,
      amountPaid: dto.amountPaid,
      remainingBalance,
      method: dto.method,
    });
    await payment.save();

    // Si se está registrando un pago retroactivo (semana anterior a pagos ya
    // existentes), la cadena de saldos de las semanas posteriores cambia.
    const nextPayment = await this.paymentModel
      .findOne({
        driverId: dto.driverId,
        ownerId,
        weekStart: { $gt: weekStart },
      })
      .sort({ weekStart: 1 })
      .exec();
    if (nextPayment) {
      await this.recalculateFrom(
        dto.driverId,
        ownerId,
        nextPayment.weekStart,
        remainingBalance,
      );
    }

    return payment;
  }

  findByDriver(driverId: string, ownerId: string): Promise<PaymentDocument[]> {
    return this.paymentModel
      .find({ driverId, ownerId })
      .sort({ weekStart: -1 })
      .exec();
  }

  async findOne(id: string, ownerId: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findOne({ _id: id, ownerId })
      .exec();
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }
    return payment;
  }

  async update(
    id: string,
    dto: UpdatePaymentDto,
    ownerId: string,
  ): Promise<PaymentDocument> {
    const payment = await this.findOne(id, ownerId);

    if (dto.paymentDate !== undefined) {
      payment.paymentDate = new Date(dto.paymentDate);
    }
    if (dto.method !== undefined) {
      payment.method = dto.method;
    }
    if (dto.amountPaid !== undefined) {
      payment.amountPaid = dto.amountPaid;
    }
    await payment.save();

    // Recalcula este mismo pago (por si cambió amountPaid) y cascada hacia
    // los pagos posteriores del conductor.
    await this.recalculateFrom(
      payment.driverId.toString(),
      ownerId,
      payment.weekStart,
      payment.previousBalance,
    );

    return this.findOne(id, ownerId);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const payment = await this.findOne(id, ownerId);
    const driverId = payment.driverId.toString();
    const weekStart = payment.weekStart;

    await this.paymentModel.findOneAndDelete({ _id: id, ownerId }).exec();

    const nextPayment = await this.paymentModel
      .findOne({ driverId, ownerId, weekStart: { $gt: weekStart } })
      .sort({ weekStart: 1 })
      .exec();

    if (nextPayment) {
      const prevPayment = await this.paymentModel
        .findOne({ driverId, ownerId, weekStart: { $lt: weekStart } })
        .sort({ weekStart: -1 })
        .exec();
      const initialPreviousBalance = prevPayment?.remainingBalance ?? 0;
      await this.recalculateFrom(
        driverId,
        ownerId,
        nextPayment.weekStart,
        initialPreviousBalance,
      );
    }
  }

  async getCurrentStatus(ownerId: string): Promise<DriverPaymentStatus[]> {
    const allDrivers = await this.driversService.findAll(ownerId);
    const activeDrivers = allDrivers.filter(
      (driver) => driver.status === DriverStatus.ACTIVO,
    );

    const results: DriverPaymentStatus[] = [];
    for (const driver of activeDrivers) {
      const lastPayment = await this.paymentModel
        .findOne({ driverId: driver._id, ownerId })
        .sort({ weekStart: -1 })
        .exec();

      const pendingBalance = lastPayment?.remainingBalance ?? 0;

      const { weekStart: todayWeekStart, weekEnd: todayWeekEnd } =
        getBillingWeekRange(getTodayUTC(), driver.weekStartDay);

      // Si el depósito cubre la primera semana de contrato, esa semana (la
      // que contiene contractStartDate) no cuenta como atrasada ni se
      // espera pago: es la única semana en la que puede activarse.
      let inGracePeriod = false;
      if (driver.depositCoversFirstWeek) {
        const { weekStart: firstWeekStart } = getWeekRange(
          driver.contractStartDate,
          driver.weekStartDay,
        );
        inGracePeriod = firstWeekStart.getTime() === todayWeekStart.getTime();
      }

      const hasPaidCurrentWeek = inGracePeriod
        ? true
        : Boolean(
            await this.paymentModel.exists({
              driverId: driver._id,
              ownerId,
              weekStart: todayWeekStart,
            }),
          );

      const currentAmountDue = inGracePeriod
        ? 0
        : driver.weeklyAmount + pendingBalance;

      results.push({
        driverId: driver._id.toString(),
        fullName: driver.fullName,
        photo: driver.photo,
        weeklyAmount: driver.weeklyAmount,
        lastPayment: lastPayment
          ? {
              weekStart: lastPayment.weekStart,
              weekEnd: lastPayment.weekEnd,
              paymentDate: lastPayment.paymentDate,
              remainingBalance: lastPayment.remainingBalance,
            }
          : null,
        currentAmountDue,
        pendingBalance,
        hasPaidCurrentWeek,
        inGracePeriod,
        currentWeekEnd: todayWeekEnd,
      });
    }

    return results;
  }

  /**
   * Recalcula, en orden cronológico, todos los pagos de un conductor desde
   * `fromWeekStart` en adelante, arrastrando `initialPreviousBalance` como
   * saldo pendiente de entrada. Para cada pago se aísla su "porción
   * semanal" fija (amountDue - previousBalance, tal como quedó calculada en
   * su momento) para no perder el weeklyAmount histórico si el conductor
   * cambia de tarifa más adelante.
   */
  private async recalculateFrom(
    driverId: string,
    ownerId: string,
    fromWeekStart: Date,
    initialPreviousBalance: number,
  ): Promise<void> {
    const payments = await this.paymentModel
      .find({ driverId, ownerId, weekStart: { $gte: fromWeekStart } })
      .sort({ weekStart: 1 })
      .exec();

    let previousBalance = initialPreviousBalance;
    for (const payment of payments) {
      const weeklyPortion = payment.amountDue - payment.previousBalance;
      payment.previousBalance = previousBalance;
      payment.amountDue = weeklyPortion + previousBalance;
      payment.remainingBalance = Math.max(
        0,
        payment.amountDue - payment.amountPaid,
      );
      await payment.save();
      previousBalance = payment.remainingBalance;
    }
  }
}
