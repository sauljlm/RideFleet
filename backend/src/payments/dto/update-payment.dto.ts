import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

/**
 * Se puede editar cuándo se recibió el pago, cuánto, el método y a qué semana
 * se imputa. Mover un pago de semana antes era imposible porque los saldos se
 * encadenaban de un registro al siguiente; con el ledger la cadena se
 * reconstruye entera desde el calendario, así que reimputar un pago mal
 * asignado es solo cambiarle la semana.
 *
 * `previousBalance`, `amountDue` y `remainingBalance` no se editan: son
 * derivados y los recalcula el ledger.
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

  @IsOptional()
  @IsDateString({}, { message: 'La semana indicada no es válida' })
  weekStart?: string;

  @IsOptional()
  @IsBoolean({ message: 'El indicador de pago completo no es válido' })
  settled?: boolean;
}
