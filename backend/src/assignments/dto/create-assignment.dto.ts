import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class CreateAssignmentDto {
  @IsMongoId({ message: 'vehicleId no es un ID válido' })
  vehicleId: string;

  @IsMongoId({ message: 'driverId no es un ID válido' })
  driverId: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  startDate?: string;
}
