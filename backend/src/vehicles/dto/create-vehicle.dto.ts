import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../schemas/vehicle.schema';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  brand: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  model: string;

  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1990, { message: 'El año no puede ser anterior a 1990' })
  @Max(new Date().getFullYear() + 1, {
    message: 'El año no puede ser tan lejano en el futuro',
  })
  year: number;

  @IsString()
  @IsNotEmpty({ message: 'El color es obligatorio' })
  color: string;

  @IsString()
  @IsNotEmpty({ message: 'La placa es obligatoria' })
  plate: string;

  @IsOptional()
  @IsNumber({}, { message: 'El kilometraje debe ser un número' })
  @Min(0, { message: 'El kilometraje no puede ser negativo' })
  currentMileage?: number;

  @IsOptional()
  @IsEnum(VehicleStatus, { message: 'Estado de vehículo inválido' })
  status?: VehicleStatus;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de compra no es válida' })
  purchaseDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El valor de compra debe ser un número' })
  @Min(0, { message: 'El valor de compra no puede ser negativo' })
  purchaseValue?: number;
}
