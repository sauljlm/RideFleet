import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  create(@Body() createAssignmentDto: CreateAssignmentDto) {
    return this.assignmentsService.create(createAssignmentDto);
  }

  @Get('vehicle/:vehicleId')
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.assignmentsService.findByVehicle(vehicleId);
  }

  @Get('driver/:driverId')
  findByDriver(@Param('driverId') driverId: string) {
    return this.assignmentsService.findByDriver(driverId);
  }
}
