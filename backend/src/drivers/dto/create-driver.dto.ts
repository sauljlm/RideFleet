import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DriverStatus } from '../schemas/driver.schema';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'La cédula/identificación es obligatoria' })
  idNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsDateString({}, { message: 'La fecha de inicio de contrato no es válida' })
  contractStartDate: string;

  @IsNumber({}, { message: 'El monto semanal debe ser un número' })
  @Min(0, { message: 'El monto semanal no puede ser negativo' })
  weeklyAmount: number;

  @IsInt({ message: 'El día de inicio de semana debe ser un número entero' })
  @Min(0, { message: 'El día de inicio de semana debe estar entre 0 y 6' })
  @Max(6, { message: 'El día de inicio de semana debe estar entre 0 y 6' })
  weekStartDay: number;

  @IsOptional()
  @IsNumber({}, { message: 'El depósito debe ser un número' })
  @Min(0, { message: 'El depósito no puede ser negativo' })
  deposit?: number;

  @IsOptional()
  @IsEnum(DriverStatus, { message: 'Estado de conductor inválido' })
  status?: DriverStatus;
}
