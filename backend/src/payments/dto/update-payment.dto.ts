import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

/**
 * Solo se puede editar cuándo se registró el pago, cuánto se pagó y el
 * método. `driverId`, `weekStart`/`weekEnd` y `previousBalance`/`amountDue`
 * quedan fijos desde la creación: mover un pago de semana implicaría
 * reordenar toda la cadena entre semanas distintas.
 */
export class UpdatePaymentDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de pago no es válida' })
  paymentDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto pagado debe ser un número' })
  @Min(0, { message: 'El monto pagado no puede ser negativo' })
  amountPaid?: number;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  method?: PaymentMethod;
}
