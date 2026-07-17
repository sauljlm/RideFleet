import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { Maintenance, MaintenanceSchema } from './schemas/maintenance.schema';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Maintenance.name, schema: MaintenanceSchema },
    ]),
    CloudinaryModule,
    VehiclesModule,
  ],
  controllers: [MaintenancesController],
  providers: [MaintenancesService],
})
export class MaintenancesModule {}
