import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
    CloudinaryModule,
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
