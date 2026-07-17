import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type AssignmentDocument = HydratedDocument<Assignment>;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Driver', required: true })
  driverId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
