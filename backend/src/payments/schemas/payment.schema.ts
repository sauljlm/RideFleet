import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentMethod {
  EFECTIVO = 'efectivo',
  TRANSFERENCIA = 'transferencia',
}

@Schema({ timestamps: true })
export class Payment {
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

  @Prop({ required: true, min: 0 })
  previousBalance: number;

  @Prop({ required: true, min: 0 })
  amountDue: number;

  @Prop({ required: true, min: 0 })
  amountPaid: number;

  @Prop({ required: true, min: 0 })
  remainingBalance: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ driverId: 1, weekStart: 1 }, { unique: true });
