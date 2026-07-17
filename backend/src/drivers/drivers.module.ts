import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }]),
    CloudinaryModule,
  ],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
