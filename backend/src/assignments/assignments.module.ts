import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriversModule } from '../drivers/drivers.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Assignment.name, schema: AssignmentSchema },
    ]),
    VehiclesModule,
    DriversModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
