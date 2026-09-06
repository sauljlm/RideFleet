import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreatePaymentDto {
  @IsMongoId({ message: 'driverId no es un ID válido' })
  driverId: string;

  /** Cuándo se recibió el dinero. */
  @IsDateString({}, { message: 'La fecha de pago no es válida' })
  paymentDate: string;

  /**
   * A qué semana se imputa el pago (su primer día). Es lo que el formulario
   * envía ahora: deducir la semana de `paymentDate` hacía que un pago hecho
   * un día tarde se imputara a la semana siguiente y la semana realmente
   * adeudada quedara sin cobrar. Si no viene, se sigue deduciendo de la
   * fecha para no romper clientes viejos.
   */
  @IsOptional()
  @IsDateString({}, { message: 'La semana indicada no es válida' })
  weekStart?: string;

  @IsNumber({}, { message: 'El monto pagado debe ser un número' })
  @Min(0, { message: 'El monto pagado no puede ser negativo' })
  amountPaid: number;

  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  method: PaymentMethod;

  /**
   * Da la semana por saldada aunque se haya cobrado menos de lo acordado.
   * El faltante queda registrado como condonado, no se arrastra.
   */
  @IsOptional()
  @IsBoolean({ message: 'El indicador de pago completo no es válido' })
  settled?: boolean;
}
