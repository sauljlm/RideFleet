import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreatePaymentDto {
  @IsMongoId({ message: 'driverId no es un ID válido' })
  driverId: string;

  @IsDateString({}, { message: 'La fecha de pago no es válida' })
  paymentDate: string;

  @IsNumber({}, { message: 'El monto pagado debe ser un número' })
  @Min(0, { message: 'El monto pagado no puede ser negativo' })
  amountPaid: number;

  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  method: PaymentMethod;
}
