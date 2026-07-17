import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsModule } from '../assignments/assignments.module';
import { DriversModule } from '../drivers/drivers.module';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    DriversModule,
    AssignmentsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
