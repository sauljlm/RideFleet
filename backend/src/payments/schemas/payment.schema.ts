import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentMethod {
  EFECTIVO = 'efectivo',
  TRANSFERENCIA = 'transferencia',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  ownerId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Driver', required: true })
  driverId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ required: true })
  paymentDate: Date;

  @Prop({ required: true })
  weekStart: Date;

  @Prop({ required: true })
  weekEnd: Date;

  /**
   * Tarifa semanal vigente cuando se registró el pago. Se guarda para que un
   * cambio posterior de tarifa no reescriba la historia. Opcional porque los
   * pagos anteriores a este campo la reconstruyen desde
   * `amountDue - previousBalance` (ver ledger.util).
   */
  @Prop({ min: 0 })
  weeklyAmount?: number;

  @Prop({ required: true, min: 0 })
  amountPaid: number;

  /**
   * La semana se da por saldada aunque se haya cobrado menos de lo debido.
   * Es para las semanas que el dueño negocia con el conductor ante una
   * situación adversa: el faltante no se arrastra ni lo deja atrasado.
   */
  @Prop({ type: Boolean, default: false })
  settled: boolean;

  /** Derivado: cuánto se dejó de cobrar al darla por saldada. */
  @Prop({ default: 0 })
  forgivenAmount: number;

  // Los tres campos siguientes son DERIVADOS: los recalcula el ledger a
  // partir del calendario de semanas del conductor cada vez que cambia algo.
  // Se guardan solo para que el historial se pueda listar sin recalcular.
  // Admiten negativos, que representan saldo a favor del conductor cuando
  // pagó de más para ponerse al día.
  @Prop({ required: true })
  previousBalance: number;

  @Prop({ required: true })
  amountDue: number;

  @Prop({ required: true })
  remainingBalance: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ driverId: 1, weekStart: 1 }, { unique: true });
