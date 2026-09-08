import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class StatisticsQueryDto {
  /**
   * Cantidad de meses hacia atrás (incluyendo el mes en curso) que abarca el
   * reporte. Sin este parámetro se devuelve todo el historial, que es la
   * vista por defecto de la pantalla de estadísticas.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'months debe ser un número entero de meses' })
  @Min(1, { message: 'months debe ser al menos 1' })
  @Max(600, { message: 'months no puede superar 600' })
  months?: number;
}
