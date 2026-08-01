import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../auth/strategies/jwt.strategy';
import {
  imageUploadOptions,
  MAX_FILES_PER_UPLOAD,
} from '../common/image-upload.options';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenancesService } from './maintenances.service';

@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Post()
  create(
    @Body() createMaintenanceDto: CreateMaintenanceDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.maintenancesService.create(createMaintenanceDto, user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.maintenancesService.findAll(user.userId);
  }

  @Get('vehicle/:vehicleId')
  findByVehicle(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.maintenancesService.findByVehicle(vehicleId, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.maintenancesService.findOne(id, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.maintenancesService.update(
      id,
      updateMaintenanceDto,
      user.userId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.maintenancesService.remove(id, user.userId);
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.maintenancesService.addPhotos(id, files, user.userId);
  }
}
