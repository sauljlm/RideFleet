import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DriverDocument = HydratedDocument<Driver>;

export enum DriverStatus {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  SUSPENDIDO = 'suspendido',
}

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true, unique: true })
  idNumber: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ type: String, default: null })
  photo: string | null;

  @Prop({ type: [String], default: [] })
  contractPhotos: string[];

  @Prop({ required: true })
  contractStartDate: Date;

  @Prop({ required: true, min: 0 })
  weeklyAmount: number;

  @Prop({ required: true, min: 0, max: 6 })
  weekStartDay: number;

  @Prop({ min: 0 })
  deposit?: number;

  /**
   * Si es true, la primera semana de contrato (la que contiene
   * contractStartDate) se considera cubierta por el depósito: no se espera
   * pago de renta esa semana, y no debe marcarse como atrasada.
   */
  @Prop({ type: Boolean, default: false })
  depositCoversFirstWeek: boolean;

  @Prop({
    type: String,
    enum: DriverStatus,
    default: DriverStatus.ACTIVO,
  })
  status: DriverStatus;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
