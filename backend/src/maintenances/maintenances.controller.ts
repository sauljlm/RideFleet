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
  create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenancesService.create(createMaintenanceDto);
  }

  @Get()
  findAll() {
    return this.maintenancesService.findAll();
  }

  @Get('vehicle/:vehicleId')
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.maintenancesService.findByVehicle(vehicleId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.maintenancesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
  ) {
    return this.maintenancesService.update(id, updateMaintenanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.maintenancesService.remove(id);
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.maintenancesService.addPhotos(id, files);
  }
}
