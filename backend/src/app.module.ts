import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { DriversModule } from './drivers/drivers.module';
import { MaintenancesModule } from './maintenances/maintenances.module';
import { PaymentsModule } from './payments/payments.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    UsersModule,
    AuthModule,
    VehiclesModule,
    DriversModule,
    AssignmentsModule,
    MaintenancesModule,
    PaymentsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
