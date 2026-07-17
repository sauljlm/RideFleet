import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type MaintenanceDocument = HydratedDocument<Maintenance>;

export enum MaintenanceType {
  PREVENTIVO = 'preventivo',
  REPARACION = 'reparacion',
  LLANTAS = 'llantas',
  OTRO = 'otro',
}

@Schema({ timestamps: true })
export class Maintenance {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: String, enum: MaintenanceType, required: true })
  type: MaintenanceType;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  cost: number;

  @Prop({ required: true, trim: true })
  provider: string;

  @Prop({ required: true, min: 0 })
  mileageAtService: number;

  @Prop({ type: [String], default: [] })
  photos: string[];
}

export const MaintenanceSchema = SchemaFactory.createForClass(Maintenance);
