import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

export enum VehicleStatus {
  ACTIVO = 'activo',
  EN_MANTENIMIENTO = 'en_mantenimiento',
  INACTIVO = 'inactivo',
  VENDIDO = 'vendido',
}

@Schema({ _id: false })
export class MileageEntry {
  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop({ required: true, min: 0 })
  mileage: number;
}

export const MileageEntrySchema = SchemaFactory.createForClass(MileageEntry);

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true, trim: true })
  brand: string;

  @Prop({ required: true, trim: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, trim: true })
  color: string;

  @Prop({ required: true, trim: true, unique: true })
  plate: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ required: true, min: 0, default: 0 })
  currentMileage: number;

  @Prop({ type: [MileageEntrySchema], default: [] })
  mileageHistory: MileageEntry[];

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop({
    type: String,
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVO,
  })
  status: VehicleStatus;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Driver', default: null })
  currentDriverId: Types.ObjectId | null;

  @Prop()
  purchaseDate?: Date;

  @Prop()
  purchaseValue?: number;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
