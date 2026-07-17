import { IsNumber, Min } from 'class-validator';

export class UpdateMileageDto {
  @IsNumber({}, { message: 'El kilometraje debe ser un número' })
  @Min(0, { message: 'El kilometraje no puede ser negativo' })
  mileage: number;
}
