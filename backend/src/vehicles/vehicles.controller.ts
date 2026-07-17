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
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateMileageDto } from './dto/update-mileage.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id, true);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }

  @Patch(':id/mileage')
  updateMileage(
    @Param('id') id: string,
    @Body() updateMileageDto: UpdateMileageDto,
  ) {
    return this.vehiclesService.updateMileage(id, updateMileageDto);
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.vehiclesService.addPhotos(id, files);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions),
  )
  addDocuments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.vehiclesService.addDocuments(id, files);
  }
}
