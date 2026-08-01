import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/strategies/jwt.strategy';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  create(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.assignmentsService.create(createAssignmentDto, user.userId);
  }

  @Get('vehicle/:vehicleId')
  findByVehicle(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.assignmentsService.findByVehicle(vehicleId, user.userId);
  }

  @Get('driver/:driverId')
  findByDriver(
    @Param('driverId') driverId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.assignmentsService.findByDriver(driverId, user.userId);
  }

  @Post('vehicle/:vehicleId/unassign')
  unassignVehicle(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.assignmentsService.unassignVehicle(vehicleId, user.userId);
  }

  @Post('driver/:driverId/unassign')
  unassignDriver(
    @Param('driverId') driverId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.assignmentsService.unassignDriver(driverId, user.userId);
  }
}
