import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { MaintenanceType } from '../schemas/maintenance.schema';

export class CreateMaintenanceDto {
  @IsMongoId({ message: 'vehicleId no es un ID válido' })
  vehicleId: string;

  @IsDateString({}, { message: 'La fecha no es válida' })
  date: string;

  @IsEnum(MaintenanceType, { message: 'Tipo de mantenimiento inválido' })
  type: MaintenanceType;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description: string;

  @IsNumber({}, { message: 'El costo debe ser un número' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  cost: number;

  @IsString()
  @IsNotEmpty({ message: 'El taller/proveedor es obligatorio' })
  provider: string;

  @IsNumber({}, { message: 'El kilometraje debe ser un número' })
  @Min(0, { message: 'El kilometraje no puede ser negativo' })
  mileageAtService: number;
}
