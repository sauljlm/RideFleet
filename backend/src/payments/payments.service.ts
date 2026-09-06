import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssignmentsService } from '../assignments/assignments.service';
import { DriverDocument, DriverStatus } from '../drivers/schemas/driver.schema';
import { DriversService } from '../drivers/drivers.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  buildLedger,
  DriverLedger,
  getFirstBillingWeek,
  LedgerPayment,
  LedgerWeek,
} from './ledger.util';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { getTodayUTC, getWeekRange } from './week-range.util';

/** Ventana en la que un vencimiento próximo se anuncia como "pendiente". */
const DUE_SOON_HOURS = 48;

export type DriverStatusLabel = 'al-dia' | 'pendiente' | 'atraso';

export interface DriverPaymentStatus {
  driverId: string;
  fullName: string;
  photo: string | null;
  weeklyAmount: number;
  /**
   * El estado se calcula en el backend, no en la pantalla: tenerlo duplicado
   * en ambos lados hacía que dos definiciones distintas de "atrasado"
   * convivieran y se desincronizaran.
   */
  status: DriverStatusLabel;
  /** Deuda de semanas que ya pasaron su día de cobro. */
  overdueAmount: number;
  /** Semanas de renta que debe, derivadas del monto adeudado. */
  weeksBehind: number;
  /** Posición neta: negativa significa crédito a favor. */
  currentBalance: number;
  /** Total que se le condonó al conductor en semanas negociadas. */
  forgivenTotal: number;
  /** Lo que hay que cobrar en el próximo vencimiento (o ya hoy). */
  dueSoonAmount: number;
  /** Cuándo es ese cobro. */
  nextDueDate: Date;
  oldestOverdueWeekStart: Date | null;
  currentWeekStart: Date;
  currentWeekEnd: Date;
  hasPaidCurrentWeek: boolean;
  inGracePeriod: boolean;
  lastPayment: {
    weekStart: Date;
    weekEnd: Date;
    paymentDate: Date;
    amountPaid: number;
  } | null;
}

export interface PendingWeek {
  weekStart: Date;
  weekEnd: Date;
  dueDate: Date;
  weeklyAmount: number;
  /** Saldo acumulado que entra a esa semana. */
  previousBalance: number;
  amountDue: number;
  isOverdue: boolean;
  isCurrent: boolean;
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

    const { weekStart, weekEnd } = this.resolveWeek(driver, dto);

    const existing = await this.paymentModel
      .findOne({ driverId: dto.driverId, ownerId, weekStart })
      .exec();
    if (existing) {
      throw new BadRequestException(
        'Ya existe un pago registrado para esa semana de este conductor',
      );
    }

    const payment = new this.paymentModel({
      ownerId,
      driverId: dto.driverId,
      vehicleId: activeAssignment.vehicleId,
      paymentDate: dto.paymentDate,
      weekStart,
      weekEnd,
      weeklyAmount: driver.weeklyAmount,
      amountPaid: dto.amountPaid,
      settled: dto.settled ?? false,
      // Valores provisionales: rebuildDerived los reescribe enseguida a
      // partir del ledger completo del conductor.
      previousBalance: 0,
      amountDue: driver.weeklyAmount,
      remainingBalance: 0,
      method: dto.method,
    });
    await payment.save();

    await this.rebuildDerived(dto.driverId, ownerId);
    return this.findOne(payment._id.toString(), ownerId);
  }

  /**
   * Determina a qué semana se imputa un pago. La semana explícita manda; sin
   * ella se usa la que contiene la fecha de pago, que con renta por
   * adelantado es justamente la que el conductor está pagando.
   */
  private resolveWeek(
    driver: DriverDocument,
    dto: { paymentDate: string; weekStart?: string },
  ): { weekStart: Date; weekEnd: Date } {
    if (!dto.weekStart) {
      return getWeekRange(new Date(dto.paymentDate), driver.weekStartDay);
    }

    const requested = new Date(dto.weekStart);
    const range = getWeekRange(requested, driver.weekStartDay);
    if (range.weekStart.getTime() !== requested.getTime()) {
      throw new BadRequestException(
        'La semana indicada no coincide con el día de pago del conductor',
      );
    }

    const firstWeek = getFirstBillingWeek(driver);
    if (range.weekStart.getTime() < firstWeek.weekStart.getTime()) {
      throw new BadRequestException(
        'La semana indicada es anterior al inicio del contrato',
      );
    }

    // Se permite adelantar una semana: con pago anticipado, pagar la semana
    // que viene el día antes de que empiece es lo normal.
    const currentWeek = getWeekRange(getTodayUTC(), driver.weekStartDay);
    const limit = new Date(currentWeek.weekStart.getTime() + 7 * 86_400_000);
    if (range.weekStart.getTime() > limit.getTime()) {
      throw new BadRequestException(
        'No se puede registrar un pago de una semana tan adelantada',
      );
    }

    return range;
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
    const driverId = payment.driverId.toString();

    if (dto.paymentDate !== undefined) {
      payment.paymentDate = new Date(dto.paymentDate);
    }
    if (dto.method !== undefined) {
      payment.method = dto.method;
    }
    if (dto.amountPaid !== undefined) {
      payment.amountPaid = dto.amountPaid;
    }
    if (dto.settled !== undefined) {
      payment.settled = dto.settled;
    }

    // Mover un pago de semana ahora es posible: con el ledger la cadena de
    // saldos se recalcula entera, así que no hay nada que reordenar a mano.
    // Es la única forma de reparar un pago que quedó imputado a la semana
    // equivocada.
    if (dto.weekStart !== undefined) {
      const driver = await this.driversService.findOne(driverId, ownerId);
      const { weekStart, weekEnd } = this.resolveWeek(driver, {
        paymentDate: payment.paymentDate.toISOString(),
        weekStart: dto.weekStart,
      });
      if (weekStart.getTime() !== payment.weekStart.getTime()) {
        const clash = await this.paymentModel
          .findOne({ driverId, ownerId, weekStart, _id: { $ne: payment._id } })
          .exec();
        if (clash) {
          throw new BadRequestException(
            'Ya existe un pago registrado para esa semana de este conductor',
          );
        }
        payment.weekStart = weekStart;
        payment.weekEnd = weekEnd;
      }
    }

    await payment.save();
    await this.rebuildDerived(driverId, ownerId);
    return this.findOne(id, ownerId);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const payment = await this.findOne(id, ownerId);
    const driverId = payment.driverId.toString();
    await this.paymentModel.findOneAndDelete({ _id: id, ownerId }).exec();
    await this.rebuildDerived(driverId, ownerId);
  }

  async getCurrentStatus(ownerId: string): Promise<DriverPaymentStatus[]> {
    const allDrivers = await this.driversService.findAll(ownerId);
    const activeDrivers = allDrivers.filter(
      (driver) => driver.status === DriverStatus.ACTIVO,
    );

    const today = getTodayUTC();
    const now = Date.now();

    const results: DriverPaymentStatus[] = [];
    for (const driver of activeDrivers) {
      const { ledger, payments } = await this.loadLedger(
        driver,
        ownerId,
        today,
      );
      const currentWeek = ledger.currentWeek;
      const nextWeek = ledger.nextWeek;

      // Lo que quedará por cobrar cuando arranque la semana siguiente: su
      // renta más el saldo que venga arrastrado, menos lo ya adelantado.
      const nextWeekAmount = nextWeek
        ? nextWeek.previousBalance + nextWeek.weeklyAmount - nextWeek.amountPaid
        : 0;
      const hoursUntilNextDue = nextWeek
        ? (nextWeek.dueDate.getTime() - now) / (1000 * 60 * 60)
        : Number.POSITIVE_INFINITY;

      // `currentDueAmount` incluye la semana que empieza hoy: con pago por
      // adelantado, el día que arranca la semana ya se debe.
      const dueToday = ledger.currentDueAmount;

      let status: DriverStatusLabel;
      if (ledger.overdueAmount > 0) {
        status = 'atraso';
      } else if (dueToday > 0) {
        status = 'pendiente';
      } else if (nextWeekAmount > 0 && hoursUntilNextDue <= DUE_SOON_HOURS) {
        status = 'pendiente';
      } else {
        status = 'al-dia';
      }

      const dueSoonAmount =
        dueToday > 0 ? dueToday : Math.max(0, nextWeekAmount);
      const nextDueDate =
        dueToday > 0
          ? (currentWeek?.dueDate ?? today)
          : (nextWeek?.dueDate ?? today);

      const lastPayment = payments[payments.length - 1] ?? null;

      results.push({
        driverId: driver._id.toString(),
        fullName: driver.fullName,
        photo: driver.photo,
        weeklyAmount: driver.weeklyAmount,
        status,
        overdueAmount: ledger.overdueAmount,
        weeksBehind: ledger.weeksBehind,
        currentBalance: ledger.currentBalance,
        forgivenTotal: ledger.weeks.reduce(
          (total, week) => total + week.forgivenAmount,
          0,
        ),
        dueSoonAmount,
        nextDueDate,
        oldestOverdueWeekStart: ledger.oldestOverdueWeek?.weekStart ?? null,
        currentWeekStart: currentWeek?.weekStart ?? today,
        currentWeekEnd: currentWeek?.weekEnd ?? today,
        hasPaidCurrentWeek: (currentWeek?.amountPaid ?? 0) > 0,
        inGracePeriod: currentWeek?.status === 'gracia',
        lastPayment: lastPayment
          ? {
              weekStart: lastPayment.weekStart,
              weekEnd: lastPayment.weekEnd,
              paymentDate: lastPayment.paymentDate,
              amountPaid: lastPayment.amountPaid,
            }
          : null,
      });
    }

    return results;
  }

  /**
   * Semanas a las que se puede imputar un pago: las que ya arrancaron sin
   * registro, más la siguiente (para poder adelantar). La primera de la
   * lista es la más antigua sin pagar, que es la que el formulario
   * preselecciona.
   */
  async getPendingWeeks(
    driverId: string,
    ownerId: string,
  ): Promise<PendingWeek[]> {
    const driver = await this.driversService.findOne(driverId, ownerId);
    const today = getTodayUTC();
    const { ledger } = await this.loadLedger(driver, ownerId, today);

    return ledger.weeks
      .filter((week) => week.paymentId === null && week.status !== 'gracia')
      .map((week) => this.toPendingWeek(week, ledger));
  }

  private toPendingWeek(week: LedgerWeek, ledger: DriverLedger): PendingWeek {
    return {
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      dueDate: week.dueDate,
      weeklyAmount: week.weeklyAmount,
      previousBalance: week.previousBalance,
      // En la semana que todavía no arranca, `amountDue` no incluye su renta
      // (el ledger la carga el día que empieza), pero el formulario sí tiene
      // que mostrar lo que corresponde pagar por ella.
      amountDue: week.isChargeable
        ? week.amountDue
        : week.previousBalance + week.weeklyAmount,
      isOverdue: week.isOverdue,
      isCurrent:
        ledger.currentWeek?.weekStart.getTime() === week.weekStart.getTime(),
    };
  }

  private async loadLedger(
    driver: DriverDocument,
    ownerId: string,
    today: Date,
  ): Promise<{ ledger: DriverLedger; payments: PaymentDocument[] }> {
    const payments = await this.paymentModel
      .find({ driverId: driver._id, ownerId })
      .sort({ weekStart: 1 })
      .exec();

    const ledgerPayments: LedgerPayment[] = payments.map((payment) => ({
      id: payment._id.toString(),
      weekStart: payment.weekStart,
      amountPaid: payment.amountPaid,
      settled: payment.settled,
      weeklyAmount:
        payment.weeklyAmount ?? payment.amountDue - payment.previousBalance,
    }));

    return {
      ledger: buildLedger(driver, ledgerPayments, today),
      payments,
    };
  }

  /**
   * Reescribe los campos derivados (`previousBalance`, `amountDue`,
   * `remainingBalance`) de todos los pagos de un conductor a partir del
   * ledger. Sustituye al encadenado anterior entre registros consecutivos,
   * que ignoraba las semanas sin pago y por eso perdía la deuda.
   */
  private async rebuildDerived(
    driverId: string,
    ownerId: string,
  ): Promise<void> {
    const driver = await this.driversService.findOne(driverId, ownerId);
    const { ledger, payments } = await this.loadLedger(
      driver,
      ownerId,
      getTodayUTC(),
    );

    const weekByStart = new Map(
      ledger.weeks.map((week) => [week.weekStart.getTime(), week]),
    );

    for (const payment of payments) {
      const week = weekByStart.get(payment.weekStart.getTime());
      if (!week) continue;
      payment.previousBalance = week.previousBalance;
      payment.amountDue = week.isChargeable
        ? week.amountDue
        : week.previousBalance + week.weeklyAmount;
      payment.forgivenAmount = week.forgivenAmount;
      payment.remainingBalance = week.remainingBalance;
      if (payment.weeklyAmount === undefined) {
        payment.weeklyAmount = week.weeklyAmount;
      }
      await payment.save();
    }
  }
}
