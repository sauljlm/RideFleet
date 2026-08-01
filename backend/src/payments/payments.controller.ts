import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/strategies/jwt.strategy';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.paymentsService.create(createPaymentDto, user.userId);
  }

  @Get('status')
  getCurrentStatus(@CurrentUser() user: JwtPayloadUser) {
    return this.paymentsService.getCurrentStatus(user.userId);
  }

  @Get('driver/:driverId')
  findByDriver(
    @Param('driverId') driverId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.paymentsService.findByDriver(driverId, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.paymentsService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.paymentsService.update(id, updatePaymentDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.paymentsService.remove(id, user.userId);
  }
}
