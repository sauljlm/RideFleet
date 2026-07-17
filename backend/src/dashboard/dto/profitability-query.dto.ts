import { IsDateString } from 'class-validator';

export class ProfitabilityQueryDto {
  @IsDateString({}, { message: 'startDate no es una fecha válida' })
  startDate: string;

  @IsDateString({}, { message: 'endDate no es una fecha válida' })
  endDate: string;
}
