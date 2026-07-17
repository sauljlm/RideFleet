import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriversModule } from '../drivers/drivers.module';
import {
  Maintenance,
  MaintenanceSchema,
} from '../maintenances/schemas/maintenance.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { PaymentsModule } from '../payments/payments.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Maintenance.name, schema: MaintenanceSchema },
    ]),
    VehiclesModule,
    DriversModule,
    PaymentsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
